import { siteConfig } from '../config'
import { perguntasCatalogo, type PerguntaId } from '../data/perguntas'
import {
  bindExperienciaQueue,
  createExperiencia,
  createPergunta,
  finalizarExperiencia,
  flushPendingEvents,
  perguntaRowId,
  registrarClique,
  registrarCliqueWhatsApp,
  registrarEasterEgg as syncEasterEgg,
  registrarEtapa,
  registrarEvento,
  registrarRespostaFinal as syncRespostaFinal,
} from './experienciaService'

export const STORAGE_KEY = 'projeto_ela_interacoes'

export type InteractionEvent = {
  tipo: string
  timestamp: string
  perguntaId?: string
  pergunta?: string
  opcao?: string
  resposta?: string
  elemento?: string
  etapa?: string
  duracao_ms?: number
  dados?: Record<string, unknown>
}

export type PerguntaRecord = {
  id: string
  dbId: string
  pergunta: string
  opcoes: string[]
  respostaEscolhida: string
  quantidadeCliques: Record<string, number>
  tentativas: Array<{ opcao: string; quantidade: number }>
  timestampPrimeiroClique: string
  timestampRespostaFinal: string
}

export type SessionRecord = {
  id: string
  experienciaId: string
  sessao: {
    inicio: string
    fim: string
    etapas_visitadas: string[]
    etapas_concluidas: string[]
    tempo_por_etapa: Record<string, number>
    reinicios_etapa: Record<string, number>
  }
  perguntas: Record<string, PerguntaRecord>
  interacoes: {
    tentativas_botao_nao: number
    easter_eggs_encontrados: number
    easter_eggs: string[]
    modo_desenvolvedor_aberto: boolean
    musica_ativada: boolean
    segundo_encontro_selecionado: boolean
  }
  eventos: InteractionEvent[]
}

export type InteractionStore = {
  sessoes: SessionRecord[]
}

const WHATSAPP_MESSAGE = `Então... acho que o sistema encontrou um pequeno bug: fiquei com vontade de te ver de novo 😂❤️

Vamos marcar o próximo encontro?? 👀`

function now() {
  return new Date().toISOString()
}

function newId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `s-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function emptySession(): SessionRecord {
  return {
    id: newId(),
    experienciaId: '',
    sessao: {
      inicio: now(),
      fim: '',
      etapas_visitadas: [],
      etapas_concluidas: [],
      tempo_por_etapa: {},
      reinicios_etapa: {},
    },
    perguntas: {},
    interacoes: {
      tentativas_botao_nao: 0,
      easter_eggs_encontrados: 0,
      easter_eggs: [],
      modo_desenvolvedor_aberto: false,
      musica_ativada: false,
      segundo_encontro_selecionado: false,
    },
    eventos: [],
  }
}

function emptyStore(): InteractionStore {
  return { sessoes: [] }
}

let storeCache: InteractionStore | null = null
let currentSessionId: string | null = null
let currentStage: string | null = null
let stageEnteredAt: number | null = null
let finalizedOnServer = false

function readStore(): InteractionStore {
  if (storeCache) return storeCache
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      storeCache = emptyStore()
      return storeCache
    }
    const parsed = JSON.parse(raw) as InteractionStore
    storeCache = { sessoes: Array.isArray(parsed.sessoes) ? parsed.sessoes : [] }
    return storeCache
  } catch {
    storeCache = emptyStore()
    return storeCache
  }
}

function persist() {
  const store = readStore()
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

function currentSession(): SessionRecord | null {
  const store = readStore()
  if (!currentSessionId) return store.sessoes.at(-1) ?? null
  return store.sessoes.find((item) => item.id === currentSessionId) ?? store.sessoes.at(-1) ?? null
}

function tentativasFrom(cliques: Record<string, number>) {
  return Object.entries(cliques)
    .filter(([, quantidade]) => quantidade > 0)
    .map(([opcao, quantidade]) => ({ opcao, quantidade }))
}

function withSession(updater: (session: SessionRecord) => void) {
  const store = readStore()
  let session = currentSession()
  if (!session) {
    session = emptySession()
    store.sessoes.push(session)
    currentSessionId = session.id
  }
  if (!session.perguntas) session.perguntas = {}
  updater(session)
  persist()
  return session
}

function pushEvent(session: SessionRecord, event: Omit<InteractionEvent, 'timestamp'> & { timestamp?: string }) {
  const timestamp = event.timestamp ?? now()
  session.eventos.push({ ...event, timestamp })
  return timestamp
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

function sessaoAberta(session: SessionRecord | undefined) {
  return Boolean(
    session?.experienciaId &&
      isUuid(session.experienciaId) &&
      isUuid(session.id) &&
      !session.sessao.fim,
  )
}

export function startSession() {
  if (currentSessionId) return currentSessionId

  const store = readStore()
  const last = store.sessoes.at(-1)

  if (sessaoAberta(last) && last) {
    currentSessionId = last.id
    currentStage = null
    stageEnteredAt = null
    finalizedOnServer = false
    bindExperienciaQueue()
    ensurePergunta('pergunta_1')
    ensurePergunta('pergunta_2')
    ensurePergunta('pergunta_3')
    void flushPendingEvents()
    return last.id
  }

  const session = emptySession()
  store.sessoes.push(session)
  currentSessionId = session.id
  currentStage = null
  stageEnteredAt = null
  finalizedOnServer = false
  bindExperienciaQueue()
  session.experienciaId = createExperiencia(session.id, session.sessao.inicio)
  pushEvent(session, { tipo: 'inicio_experiencia' })
  persist()
  ensurePergunta('pergunta_1')
  ensurePergunta('pergunta_2')
  ensurePergunta('pergunta_3')
  return session.id
}

export function ensurePergunta(perguntaId: PerguntaId) {
  const catalogo = perguntasCatalogo[perguntaId]
  withSession((current) => {
    if (!current.experienciaId) return
    const dbId = perguntaRowId(current.experienciaId, catalogo.perguntaId)
    createPergunta(current.experienciaId, catalogo.perguntaId, catalogo.pergunta, [...catalogo.opcoes])
    const existing = current.perguntas[perguntaId]
    if (existing) {
      existing.dbId = dbId
      return
    }
    current.perguntas[perguntaId] = {
      id: catalogo.perguntaId,
      dbId,
      pergunta: catalogo.pergunta,
      opcoes: [...catalogo.opcoes],
      respostaEscolhida: '',
      quantidadeCliques: Object.fromEntries(catalogo.opcoes.map((opcao) => [opcao, 0])),
      tentativas: [],
      timestampPrimeiroClique: '',
      timestampRespostaFinal: '',
    }
  })
}

export function registerOptionClick(perguntaId: PerguntaId, opcao: string) {
  ensurePergunta(perguntaId)
  const timestamp = now()
  const session = withSession((current) => {
    const pergunta = current.perguntas[perguntaId]
    pergunta.quantidadeCliques[opcao] = (pergunta.quantidadeCliques[opcao] ?? 0) + 1
    pergunta.tentativas = tentativasFrom(pergunta.quantidadeCliques)
    if (!pergunta.timestampPrimeiroClique) pergunta.timestampPrimeiroClique = timestamp
    pushEvent(current, {
      tipo: 'clique_opcao',
      perguntaId,
      pergunta: pergunta.pergunta,
      opcao,
      timestamp,
    })
  })
  const pergunta = session.perguntas[perguntaId]
  if (session.experienciaId && pergunta?.dbId) {
    registrarClique(session.experienciaId, pergunta.dbId, opcao, timestamp, {
      pergunta: pergunta.pergunta,
      pergunta_catalogo_id: perguntaId,
      opcoes: pergunta.opcoes,
      quantidade_cliques: pergunta.quantidadeCliques[opcao],
    })
  }
}

export function registerRespostaFinal(perguntaId: PerguntaId, resposta: string) {
  ensurePergunta(perguntaId)
  const timestamp = now()
  const session = withSession((current) => {
    const pergunta = current.perguntas[perguntaId]
    pergunta.respostaEscolhida = resposta
    pergunta.timestampRespostaFinal = timestamp
    pushEvent(current, {
      tipo: 'resposta_final',
      perguntaId,
      pergunta: pergunta.pergunta,
      opcao: resposta,
      resposta,
      timestamp,
    })
  })
  const pergunta = session.perguntas[perguntaId]
  if (session.experienciaId && pergunta?.dbId) {
    syncRespostaFinal(session.experienciaId, pergunta.dbId, resposta, timestamp, {
      pergunta_catalogo_id: perguntaId,
      pergunta: pergunta.pergunta,
      opcoes: pergunta.opcoes,
    })
  }
}

export function enterStage(stage: string) {
  if (currentStage === stage) return

  const existing = currentSession()
  if (!currentStage && existing?.sessao.etapas_visitadas.includes(stage)) {
    currentStage = stage
    stageEnteredAt = Date.now()
    return existing.id
  }

  const session = withSession((current) => {
    if (currentStage && currentStage !== stage && stageEnteredAt) {
      const elapsed = Date.now() - stageEnteredAt
      current.sessao.tempo_por_etapa[currentStage] = (current.sessao.tempo_por_etapa[currentStage] ?? 0) + elapsed
      if (!current.sessao.etapas_concluidas.includes(currentStage)) {
        current.sessao.etapas_concluidas.push(currentStage)
      }
      const doneAt = pushEvent(current, {
        tipo: 'conclusao_etapa',
        etapa: currentStage,
        duracao_ms: elapsed,
        dados: { etapa: currentStage, duracao_ms: elapsed },
      })
      if (current.experienciaId) {
        registrarEtapa(current.experienciaId, 'conclusao_etapa', currentStage, { duracao_ms: elapsed, timestamp: doneAt })
      }
    }

    if (current.sessao.etapas_visitadas.includes(stage) && currentStage !== stage) {
      current.sessao.reinicios_etapa[stage] = (current.sessao.reinicios_etapa[stage] ?? 0) + 1
    }

    if (!current.sessao.etapas_visitadas.includes(stage)) {
      current.sessao.etapas_visitadas.push(stage)
    }

    currentStage = stage
    stageEnteredAt = Date.now()
    const timestamp = pushEvent(current, { tipo: 'entrada_etapa', etapa: stage, dados: { etapa: stage } })
    if (current.experienciaId) {
      registrarEtapa(current.experienciaId, 'entrada_etapa', stage, { timestamp })
    }
  })
  return session.id
}

export function completeStage(stage: string) {
  withSession((current) => {
    if (!current.sessao.etapas_concluidas.includes(stage)) {
      current.sessao.etapas_concluidas.push(stage)
    }
    if (currentStage === stage && stageEnteredAt) {
      const elapsed = Date.now() - stageEnteredAt
      current.sessao.tempo_por_etapa[stage] = (current.sessao.tempo_por_etapa[stage] ?? 0) + elapsed
      stageEnteredAt = Date.now()
    }
    const timestamp = pushEvent(current, { tipo: 'conclusao_etapa', etapa: stage, dados: { etapa: stage } })
    if (current.experienciaId) {
      registrarEtapa(current.experienciaId, 'conclusao_etapa', stage, { timestamp })
    }
  })
}

export function registerFleeingNo() {
  registerOptionClick('pergunta_1', 'Não')
  const session = withSession((current) => {
    current.interacoes.tentativas_botao_nao += 1
    const timestamp = pushEvent(current, {
      tipo: 'tentativa_botao_nao',
      perguntaId: 'pergunta_1',
      pergunta: perguntasCatalogo.pergunta_1.pergunta,
      opcao: 'Não',
      dados: { tentativas_botao_nao: current.interacoes.tentativas_botao_nao },
    })
    if (current.experienciaId) {
      registrarEvento(current.experienciaId, 'tentativa_botao_nao', {
        perguntaUuid: current.perguntas.pergunta_1?.dbId,
        perguntaCatalogoId: 'pergunta_1',
        opcao: 'Não',
        timestamp,
        dados: {
          pergunta: perguntasCatalogo.pergunta_1.pergunta,
          tentativas_botao_nao: current.interacoes.tentativas_botao_nao,
        },
      })
    }
    const fleeAt = pushEvent(current, {
      tipo: 'botao_fugindo',
      perguntaId: 'pergunta_1',
      pergunta: perguntasCatalogo.pergunta_1.pergunta,
      opcao: 'Não',
    })
    if (current.experienciaId) {
      registrarEvento(current.experienciaId, 'botao_fugindo', {
        perguntaUuid: current.perguntas.pergunta_1?.dbId,
        perguntaCatalogoId: 'pergunta_1',
        opcao: 'Não',
        timestamp: fleeAt,
        dados: { pergunta: perguntasCatalogo.pergunta_1.pergunta },
      })
    }
  })
  return session.id
}

export function registerButton(elemento: string) {
  withSession((current) => {
    const timestamp = pushEvent(current, { tipo: 'clique', elemento, dados: { elemento } })
    if (current.experienciaId) {
      registrarEvento(current.experienciaId, 'clique', { timestamp, dados: { elemento } })
    }
  })
}

export function registerEasterEgg(elemento: string) {
  withSession((current) => {
    if (!current.interacoes.easter_eggs.includes(elemento)) {
      current.interacoes.easter_eggs.push(elemento)
      current.interacoes.easter_eggs_encontrados = current.interacoes.easter_eggs.length
    }
    const timestamp = pushEvent(current, {
      tipo: 'easter_egg',
      elemento,
      dados: { nome: elemento },
    })
    if (current.experienciaId) {
      registrarEvento(current.experienciaId, 'easter_egg', {
        timestamp,
        dados: { nome: elemento },
      })
    }
  })
}

export function registerDevMode() {
  withSession((current) => {
    current.interacoes.modo_desenvolvedor_aberto = true
    if (!current.interacoes.easter_eggs.includes('modo_desenvolvedor')) {
      current.interacoes.easter_eggs.push('modo_desenvolvedor')
      current.interacoes.easter_eggs_encontrados = current.interacoes.easter_eggs.length
    }
    const timestamp = pushEvent(current, {
      tipo: 'modo_desenvolvedor',
      dados: { nome: 'modo_desenvolvedor' },
    })
    if (current.experienciaId) {
      registrarEvento(current.experienciaId, 'modo_desenvolvedor', {
        timestamp,
        dados: { nome: 'modo_desenvolvedor' },
      })
      syncEasterEgg(current.experienciaId, 'modo_desenvolvedor')
    }
  })
}

export function registerMusic(ativa: boolean) {
  withSession((current) => {
    if (ativa) current.interacoes.musica_ativada = true
    const timestamp = pushEvent(current, {
      tipo: ativa ? 'musica_ativada' : 'musica_pausada',
      dados: { ativa },
    })
    if (current.experienciaId) {
      registrarEvento(current.experienciaId, ativa ? 'musica_ativada' : 'musica_pausada', {
        timestamp,
        dados: { ativa },
      })
    }
  })
}

export function registerWhatsAppShare() {
  withSession((current) => {
    current.interacoes.segundo_encontro_selecionado = true
    current.sessao.fim = now()
    if (!current.sessao.etapas_concluidas.includes('finale')) {
      current.sessao.etapas_concluidas.push('finale')
    }
    const timestamp = pushEvent(current, { tipo: 'whatsapp_clique' })
    if (current.experienciaId) {
      registrarCliqueWhatsApp(current.experienciaId, timestamp)
    }
  })
}

export async function finalizarSessaoAtual() {
  const session = currentSession()
  if (!session || finalizedOnServer) return
  finalizedOnServer = true
  withSession((current) => {
    if (!current.sessao.fim) current.sessao.fim = now()
  })
  finalizarExperiencia(session.id, session.sessao.inicio, session.experienciaId)
  await flushPendingEvents()
}

export async function openWhatsApp() {
  registerWhatsAppShare()
  const number = siteConfig.whatsapp.number.replace(/\D/g, '')
  const url = `https://wa.me/${number}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`
  const popup = window.open('', '_blank')

  try {
    await flushPendingEvents()
  } catch {
    // A experiência continua mesmo se o Supabase estiver offline.
  }

  if (popup) {
    popup.location.href = url
  } else {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}

export function exportInteractionData() {
  return JSON.stringify(readStore(), null, 2)
}

export function downloadInteractionData() {
  const json = exportInteractionData()
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'projeto_ela_interacoes.json'
  link.click()
  URL.revokeObjectURL(url)
}

if (typeof window !== 'undefined') {
  Object.assign(window, { exportInteractionData, downloadInteractionData })
}
