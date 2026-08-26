/**
 * Testa o salvamento no Supabase (RPC salvar_evento, com fallback nas tabelas).
 * Uso: node scripts/test-salvar.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function loadEnv() {
  const raw = readFileSync(resolve(process.cwd(), '.env'), 'utf8')
  const env = {}
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.startsWith('#') || !line.includes('=')) continue
    const i = line.indexOf('=')
    env[line.slice(0, i).trim()] = line.slice(i + 1).trim()
  }
  return env
}

function uuid() {
  return crypto.randomUUID()
}

function stableUuid(seed) {
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

function throwIfError(error) {
  if (!error) return
  throw new Error([error.message, error.details, error.hint, error.code].filter(Boolean).join(' | '))
}

async function insertIgnore(supabase, table, row) {
  const { error } = await supabase.from(table).insert(row)
  if (error && error.code !== '23505') throwIfError(error)
}

async function sendViaTables(supabase, item) {
  await insertIgnore(supabase, 'experiencias', {
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
            uuid: stableUuid(`pergunta:${item.experiencia_id}:${item.pergunta_catalogo_id}`),
            pergunta: item.pergunta ?? '',
            opcoes: item.opcoes ?? [],
          },
        ]
      : []),
  ]

  let perguntaUuid = item.pergunta_catalogo_id
    ? stableUuid(`pergunta:${item.experiencia_id}:${item.pergunta_catalogo_id}`)
    : null

  for (const pergunta of perguntas) {
    const id = pergunta.uuid ?? stableUuid(`pergunta:${item.experiencia_id}:${pergunta.id}`)
    if (item.pergunta_catalogo_id === pergunta.id) perguntaUuid = id
    await insertIgnore(supabase, 'experiencia_perguntas', {
      id,
      experiencia_id: item.experiencia_id,
      pergunta_id: pergunta.id,
      pergunta: pergunta.pergunta,
      opcoes: pergunta.opcoes,
    })
    for (const opcao of pergunta.opcoes) {
      await insertIgnore(supabase, 'experiencia_opcoes', {
        pergunta_id: id,
        opcao,
        quantidade_cliques: 0,
      })
    }
  }

  if (item.tipo === 'pergunta_pronta') return

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
    if (retry.error && retry.error.code !== '23505') throwIfError(retry.error)
  } else if (eventoError && eventoError.code !== '23505') {
    throwIfError(eventoError)
  }

  if (item.tipo === 'clique_opcao' && perguntaUuid && item.opcao) {
    const { error } = await supabase
      .from('experiencia_opcoes')
      .update({ quantidade_cliques: item.quantidade_cliques ?? 1 })
      .eq('pergunta_id', perguntaUuid)
      .eq('opcao', item.opcao)
    throwIfError(error)
  }

  if (item.tipo === 'resposta_final' && perguntaUuid) {
    const { error } = await supabase
      .from('experiencia_perguntas')
      .update({
        resposta_final: item.resposta ?? item.opcao,
        timestamp_resposta: item.timestamp,
      })
      .eq('id', perguntaUuid)
    throwIfError(error)
  }

  if (item.tipo === 'experiencia_finalizada') {
    const { error } = await supabase
      .from('experiencias')
      .update({
        fim: item.fim,
        finalizada: true,
        duracao_segundos: item.duracao_segundos,
      })
      .eq('sessao_id', item.sessao_id)
    throwIfError(error)
  }
}

async function send(supabase, item) {
  const { error } = await supabase.rpc('salvar_evento', { p: item })
  if (!error) return 'rpc'
  const message = (error.message ?? '').toLowerCase()
  const missing =
    error.code === 'PGRST202' ||
    error.code === '42883' ||
    message.includes('could not find the function')
  if (!missing) throwIfError(error)
  await sendViaTables(supabase, item)
  return 'tabelas'
}

async function main() {
  const env = loadEnv()
  const url = (env.VITE_SUPABASE_URL ?? '').replace(/\/+$/, '').replace(/\/rest\/v1$/i, '')
  const key = env.VITE_SUPABASE_ANON_KEY ?? ''
  if (!url || !key) throw new Error('Faltam VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY')

  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const sessaoId = uuid()
  const agora = new Date().toISOString()
  const perguntaUuid = stableUuid(`pergunta:${sessaoId}:pergunta_1`)
  const perguntas = [
    {
      id: 'pergunta_1',
      uuid: perguntaUuid,
      pergunta: 'Você pretende continuar falando com esse programador?',
      opcoes: ['Não', 'Talvez', 'Sim 👀'],
    },
  ]

  const modoInicio = await send(supabase, {
    id: stableUuid(`inicio:${sessaoId}`),
    tipo: 'inicio_experiencia',
    experiencia_id: sessaoId,
    sessao_id: sessaoId,
    inicio: agora,
    timestamp: agora,
    perguntas,
  })

  const modoClique = await send(supabase, {
    id: uuid(),
    tipo: 'clique_opcao',
    experiencia_id: sessaoId,
    sessao_id: sessaoId,
    timestamp: agora,
    pergunta_catalogo_id: 'pergunta_1',
    pergunta: perguntas[0].pergunta,
    opcoes: perguntas[0].opcoes,
    opcao: 'Sim 👀',
    quantidade_cliques: 1,
    dados: { pergunta: perguntas[0].pergunta },
  })

  const modoResposta = await send(supabase, {
    id: uuid(),
    tipo: 'resposta_final',
    experiencia_id: sessaoId,
    sessao_id: sessaoId,
    timestamp: agora,
    pergunta_catalogo_id: 'pergunta_1',
    pergunta: perguntas[0].pergunta,
    opcoes: perguntas[0].opcoes,
    resposta: 'Sim 👀',
    opcao: 'Sim 👀',
    dados: { resposta: 'Sim 👀' },
  })

  const modoFim = await send(supabase, {
    id: stableUuid(`fim:${sessaoId}`),
    tipo: 'experiencia_finalizada',
    experiencia_id: sessaoId,
    sessao_id: sessaoId,
    timestamp: agora,
    fim: agora,
    duracao_segundos: 12,
  })

  console.log(
    JSON.stringify(
      {
        ok: true,
        sessaoId,
        modo: { inicio: modoInicio, clique: modoClique, resposta: modoResposta, fim: modoFim },
      },
      null,
      2,
    ),
  )
}

main().catch((error) => {
  console.error(String(error?.stack || error))
  process.exit(1)
})
