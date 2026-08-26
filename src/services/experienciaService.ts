import { perguntasCatalogo } from '../data/perguntas'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

export type SyncPayload = {
  id: string
  tipo: string
  experiencia_id: string
  sessao_id: string
  inicio?: string
  timestamp: string
  pergunta_catalogo_id?: string
  pergunta?: string
  opcoes?: string[]
  perguntas?: Array<{ id: string; uuid?: string; pergunta: string; opcoes: string[] }>
  opcao?: string
  resposta?: string
  quantidade_cliques?: number
  dados?: Record<string, unknown>
  fim?: string
  duracao_segundos?: number
}

const QUEUE_KEY = 'projeto_ela_sync_v3'

let flushing = false
let flushAgain = false
let listenersBound = false
let rpcDisponivel: boolean | null = null
let garantirPerguntaDisponivel: boolean | null = null

function randomUuid() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const n = (Math.random() * 16) | 0
    const v = char === 'x' ? n : (n & 0x3) | 0x8
    return v.toString(16)
  })
}

function stableUuid(seed: string): string {
  let h1 = 1779033703
  let h2 = 3144134277
  let h3 = 1013904242
  let h4 = 2773480762
  for (let i = 0; i < seed.length; i += 1) {
    const k = seed.charCodeAt(i)
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067)
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233)
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213)
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179)
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067)
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233)
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213)
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179)
  const bytes = [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0].flatMap((n) => [
    (n >>> 24) & 255,
    (n >>> 16) & 255,
    (n >>> 8) & 255,
    n & 255,
  ])
  bytes[6] = (bytes[6] & 0x0f) | 0x50
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = bytes.map((b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}

export function perguntaRowId(experienciaId: string, perguntaId: string) {
  return stableUuid(`pergunta:${experienciaId}:${perguntaId}`)
}

function catalogoPerguntas(experienciaId: string) {
  return Object.values(perguntasCatalogo).map((item) => ({
    id: item.perguntaId,
    uuid: perguntaRowId(experienciaId, item.perguntaId),
    pergunta: item.pergunta,
    opcoes: [...item.opcoes],
  }))
}

function readQueue(): SyncPayload[] {
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as { pendingEvents?: SyncPayload[] } | SyncPayload[]
    if (Array.isArray(parsed)) return parsed
    return Array.isArray(parsed.pendingEvents) ? parsed.pendingEvents : []
  } catch {
    return []
  }
}

function writeQueue(pendingEvents: SyncPayload[]) {
  window.localStorage.setItem(QUEUE_KEY, JSON.stringify({ pendingEvents }))
}

function isDuplicate(error: { code?: string } | null) {
  return error?.code === '23505'
}

function isMissingFn(error: { code?: string; message?: string } | null) {
  const message = (error?.message ?? '').toLowerCase()
  return (
    error?.code === 'PGRST202' ||
    error?.code === '42883' ||
    message.includes('could not find the function')
  )
}

function throwIfError(error: { message?: string; details?: string; hint?: string; code?: string } | null) {
  if (!error) return
  throw new Error([error.message, error.details, error.hint, error.code].filter(Boolean).join(' | '))
}

async function insertIgnore(table: string, row: Record<string, unknown>) {
  if (!supabase) throw new Error('Supabase não configurado')
  const { error } = await supabase.from(table).insert(row)
  if (error && !isDuplicate(error)) throwIfError(error)
}

async function resolvePerguntaUuid(
  experienciaId: string,
  catalogId: string,
  pergunta: string,
  opcoes: string[],
) {
  const desired = perguntaRowId(experienciaId, catalogId)
  if (!supabase) return desired

  if (garantirPerguntaDisponivel !== false) {
    const { data, error } = await supabase.rpc('garantir_pergunta', {
      p_id: desired,
      p_experiencia_id: experienciaId,
      p_pergunta_id: catalogId,
      p_pergunta: pergunta,
      p_opcoes: opcoes,
    })
    if (!error && typeof data === 'string' && data) {
      garantirPerguntaDisponivel = true
      return data
    }
    if (error && isMissingFn(error)) garantirPerguntaDisponivel = false
  }

  await insertIgnore('experiencia_perguntas', {
    id: desired,
    experiencia_id: experienciaId,
    pergunta_id: catalogId,
    pergunta,
    opcoes,
  })
  return desired
}

async function gravarClique(item: SyncPayload, perguntaUuid: string) {
  if (!supabase) throw new Error('Supabase não configurado')
  const opcao = item.opcao
  if (!opcao) return

  const { error: rpcError } = await supabase.rpc('registrar_clique', {
    p_evento_id: item.id,
    p_experiencia_id: item.experiencia_id,
    p_pergunta_id: perguntaUuid,
    p_opcao: opcao,
    p_timestamp: item.timestamp,
    p_dados: item.dados ?? {},
  })
  if (!rpcError) return
  if (!isMissingFn(rpcError) && rpcError.code !== '23503') throwIfError(rpcError)

  await insertIgnore('experiencia_eventos', {
    id: item.id,
    experiencia_id: item.experiencia_id,
    pergunta_id: perguntaUuid,
    tipo: 'clique_opcao',
    opcao,
    dados: { ...(item.dados ?? {}), quantidade_cliques: item.quantidade_cliques ?? 1 },
    timestamp: item.timestamp,
  })

  const quantidade = item.quantidade_cliques ?? 1
  const { error: upsertError } = await supabase.from('experiencia_opcoes').upsert(
    {
      pergunta_id: perguntaUuid,
      opcao,
      quantidade_cliques: quantidade,
    },
    { onConflict: 'pergunta_id,opcao' },
  )
  if (upsertError && upsertError.code === '23503') {
    await insertIgnore('experiencia_opcoes', {
      pergunta_id: perguntaUuid,
      opcao,
      quantidade_cliques: quantidade,
    })
    return
  }
  if (upsertError && !isDuplicate(upsertError)) throwIfError(upsertError)
}

async function sendViaTables(item: SyncPayload) {
  if (!supabase) throw new Error('Supabase não configurado')

  await insertIgnore('experiencias', {
    id: item.experiencia_id,
    sessao_id: item.sessao_id,
    inicio: item.inicio ?? item.timestamp,
  })

  const perguntas = [
    ...(item.perguntas ?? []),
    ...(item.pergunta_catalogo_id
      ? [
          {
            id: item.pergunta_catalogo_id,
            uuid: perguntaRowId(item.experiencia_id, item.pergunta_catalogo_id),
            pergunta: item.pergunta ?? '',
            opcoes: item.opcoes ?? [],
          },
        ]
      : []),
  ]

  let perguntaUuid: string | null = null
  for (const pergunta of perguntas) {
    const id = await resolvePerguntaUuid(
      item.experiencia_id,
      pergunta.id,
      pergunta.pergunta,
      pergunta.opcoes,
    )
    if (item.pergunta_catalogo_id === pergunta.id) perguntaUuid = id
    if (!item.pergunta_catalogo_id) perguntaUuid = id
  }

  if (item.tipo === 'pergunta_pronta') return

  if (item.tipo === 'clique_opcao') {
    if (!perguntaUuid) perguntaUuid = item.pergunta_catalogo_id
      ? perguntaRowId(item.experiencia_id, item.pergunta_catalogo_id)
      : null
    if (!perguntaUuid || !item.opcao) return
    await gravarClique(item, perguntaUuid)
    return
  }

  if (item.tipo === 'resposta_final' && perguntaUuid) {
    const { error } = await supabase.rpc('definir_resposta_final', {
      p_evento_id: item.id,
      p_experiencia_id: item.experiencia_id,
      p_pergunta_id: perguntaUuid,
      p_resposta: item.resposta ?? item.opcao,
      p_timestamp: item.timestamp,
    })
    if (!error) return
    if (!isMissingFn(error) && error.code !== '23503') throwIfError(error)
  }

  const { error: eventoError } = await supabase.from('experiencia_eventos').insert({
    id: item.id,
    experiencia_id: item.experiencia_id,
    pergunta_id: perguntaUuid,
    tipo: item.tipo,
    opcao: item.opcao ?? item.resposta ?? null,
    dados: item.dados ?? {},
    timestamp: item.timestamp,
  })
  if (eventoError && eventoError.code === '23503' && perguntaUuid) {
    const retry = await supabase.from('experiencia_eventos').insert({
      id: item.id,
      experiencia_id: item.experiencia_id,
      pergunta_id: null,
      tipo: item.tipo,
      opcao: item.opcao ?? item.resposta ?? null,
      dados: item.dados ?? {},
      timestamp: item.timestamp,
    })
    if (retry.error && !isDuplicate(retry.error)) throwIfError(retry.error)
  } else if (eventoError && !isDuplicate(eventoError)) {
    throwIfError(eventoError)
  }

  if (item.tipo === 'experiencia_finalizada') {
    const { error } = await supabase.rpc('finalizar_experiencia', {
      p_evento_id: item.id,
      p_sessao_id: item.sessao_id,
      p_fim: item.fim,
      p_duracao_segundos: item.duracao_segundos,
    })
    if (!error) return
    if (!isMissingFn(error)) {
      const { error: updateError } = await supabase
        .from('experiencias')
        .update({
          fim: item.fim,
          finalizada: true,
          duracao_segundos: item.duracao_segundos,
        })
        .eq('sessao_id', item.sessao_id)
      if (updateError) throwIfError(updateError)
    }
  }
}

async function send(item: SyncPayload) {
  if (!supabase) throw new Error('Supabase não configurado')

  if (rpcDisponivel !== false) {
    const { error } = await supabase.rpc('salvar_evento', { p: item })
    if (!error) {
      rpcDisponivel = true
      return
    }
    if (!isMissingFn(error)) throwIfError(error)
    rpcDisponivel = false
  }

  await sendViaTables(item)
}

function enqueue(item: SyncPayload) {
  const queue = readQueue()
  if (queue.some((entry) => entry.id === item.id)) {
    void flushPendingEvents()
    return
  }
  queue.push(item)
  writeQueue(queue)
  void flushPendingEvents()
}

export async function flushPendingEvents() {
  if (!isSupabaseConfigured || typeof window === 'undefined') return
  if (flushing) {
    flushAgain = true
    return
  }

  flushing = true
  try {
    do {
      flushAgain = false
      while (true) {
        const queue = readQueue()
        const item = queue[0]
        if (!item) break
        try {
          await send(item)
          writeQueue(readQueue().filter((entry) => entry.id !== item.id))
        } catch (error) {
          console.warn('[Projeto: Ela] Falha ao enviar para o Supabase. O dado ficou na fila local.', error)
          return
        }
      }
    } while (flushAgain)
  } finally {
    flushing = false
    if (flushAgain) void flushPendingEvents()
  }
}

export function bindExperienciaQueue() {
  if (listenersBound || typeof window === 'undefined') return
  listenersBound = true
  window.addEventListener('online', () => {
    void flushPendingEvents()
  })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void flushPendingEvents()
  })
  window.setInterval(() => {
    void flushPendingEvents()
  }, 12000)
}

export function createExperiencia(sessaoId: string, inicio: string) {
  enqueue({
    id: stableUuid(`inicio:${sessaoId}`),
    tipo: 'inicio_experiencia',
    experiencia_id: sessaoId,
    sessao_id: sessaoId,
    inicio,
    timestamp: inicio,
    perguntas: catalogoPerguntas(sessaoId),
  })
  bindExperienciaQueue()
  return sessaoId
}

export function createPergunta(
  experienciaId: string,
  perguntaId: string,
  pergunta: string,
  opcoes: string[],
) {
  const perguntaUuid = perguntaRowId(experienciaId, perguntaId)
  enqueue({
    id: stableUuid(`pergunta:${experienciaId}:${perguntaId}`),
    tipo: 'pergunta_pronta',
    experiencia_id: experienciaId,
    sessao_id: experienciaId,
    timestamp: new Date().toISOString(),
    pergunta_catalogo_id: perguntaId,
    pergunta,
    opcoes,
    perguntas: [
      {
        id: perguntaId,
        uuid: perguntaUuid,
        pergunta,
        opcoes,
      },
    ],
  })
  return perguntaUuid
}

export function registrarClique(
  experienciaId: string,
  _perguntaUuid: string,
  opcao: string,
  timestamp: string,
  dados: Record<string, unknown> = {},
) {
  const catalogo =
    typeof dados.pergunta_catalogo_id === 'string' ? dados.pergunta_catalogo_id : undefined
  enqueue({
    id: randomUuid(),
    tipo: 'clique_opcao',
    experiencia_id: experienciaId,
    sessao_id: experienciaId,
    timestamp,
    pergunta_catalogo_id: catalogo,
    pergunta: typeof dados.pergunta === 'string' ? dados.pergunta : undefined,
    opcoes: Array.isArray(dados.opcoes) ? dados.opcoes.filter((item) => typeof item === 'string') : undefined,
    opcao,
    quantidade_cliques: typeof dados.quantidade_cliques === 'number' ? dados.quantidade_cliques : 1,
    dados,
  })
}

export function registrarRespostaFinal(
  experienciaId: string,
  _perguntaUuid: string,
  resposta: string,
  timestamp: string,
  extras: Record<string, unknown> = {},
) {
  const catalogo =
    typeof extras.pergunta_catalogo_id === 'string' ? extras.pergunta_catalogo_id : undefined
  enqueue({
    id: randomUuid(),
    tipo: 'resposta_final',
    experiencia_id: experienciaId,
    sessao_id: experienciaId,
    timestamp,
    pergunta_catalogo_id: catalogo,
    pergunta: typeof extras.pergunta === 'string' ? extras.pergunta : undefined,
    opcoes: Array.isArray(extras.opcoes) ? extras.opcoes.filter((item) => typeof item === 'string') : undefined,
    resposta,
    opcao: resposta,
    dados: { resposta },
  })
}

export function registrarEvento(
  experienciaId: string,
  tipo: string,
  options: {
    perguntaUuid?: string
    perguntaCatalogoId?: string
    opcao?: string
    dados?: Record<string, unknown>
    timestamp?: string
  } = {},
) {
  enqueue({
    id: randomUuid(),
    tipo,
    experiencia_id: experienciaId,
    sessao_id: experienciaId,
    timestamp: options.timestamp ?? new Date().toISOString(),
    pergunta_catalogo_id: options.perguntaCatalogoId,
    opcao: options.opcao,
    dados: options.dados,
  })
}

export function finalizarExperiencia(sessaoId: string, inicioIso: string, experienciaId?: string) {
  const fim = new Date()
  const inicio = new Date(inicioIso)
  const duracaoSegundos = Number.isNaN(inicio.getTime())
    ? 0
    : Math.max(0, Math.round((fim.getTime() - inicio.getTime()) / 1000))
  const id = experienciaId ?? sessaoId

  enqueue({
    id: stableUuid(`fim:${sessaoId}`),
    tipo: 'experiencia_finalizada',
    experiencia_id: id,
    sessao_id: sessaoId,
    timestamp: fim.toISOString(),
    fim: fim.toISOString(),
    duracao_segundos: duracaoSegundos,
  })
}

export function registrarCliqueWhatsApp(experienciaId: string, timestamp?: string) {
  registrarEvento(experienciaId, 'whatsapp_clique', { timestamp })
}

export function registrarEasterEgg(experienciaId: string, nome: string) {
  registrarEvento(experienciaId, 'easter_egg', { dados: { nome } })
}

export function registrarEtapa(
  experienciaId: string,
  tipo: 'entrada_etapa' | 'conclusao_etapa',
  etapa: string,
  extra: Record<string, unknown> = {},
) {
  const timestamp = typeof extra.timestamp === 'string' ? extra.timestamp : undefined
  const dados = Object.fromEntries(Object.entries(extra).filter(([key]) => key !== 'timestamp'))
  registrarEvento(experienciaId, tipo, {
    timestamp,
    dados: { etapa, ...dados },
  })
}

export function limparFilaLocal() {
  writeQueue([])
}
