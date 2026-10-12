// Plugin by elixir, punisher & 888 staff
import state from './state.js'

const KEY = 'afk.users'

const digitsOf = (jid = '') => String(jid ?? '').split('@')[0].split(':')[0].replace(/\D+/g, '')

const persistNow = (target) => {
  const plain = {}
  for (const key of Object.keys(target || {})) {
    if (key === '__afkProxy') continue
    plain[key] = target[key]
  }
  state.set(KEY, plain)
  state.flush({ force: true }).catch(() => {})
}

const makeProxy = () => {
  const raw = state.get(KEY, {}) || {}
  const target = typeof raw === 'object' && raw ? { ...raw } : {}
  delete target.__afkProxy
  return new Proxy(target, {
    set(t, prop, value) {
      t[prop] = value
      persistNow(t)
      return true
    },
    deleteProperty(t, prop) {
      delete t[prop]
      persistNow(t)
      return true
    },
    defineProperty(t, prop, desc) {
      t[prop] = desc.value
      persistNow(t)
      return true
    }
  })
}

global.afkState = global.afkState && global.afkState.__afkProxy ? global.afkState : makeProxy()
global.afkState.__afkProxy = true

const getState = () => {
  if (!global.afkState) global.afkState = makeProxy()
  return global.afkState
}

export const getAfkEntry = (jid) => {
  const state = getState()
  const direct = state[jid]
  if (direct) return direct

  const target = digitsOf(jid)
  if (!target) return undefined

  for (const key of Object.keys(state)) {
    const entry = state[key]
    if (entry && typeof entry === 'object' && digitsOf(key) === target) return entry
  }
  return undefined
}

export const isAfk = (jid, chat = '') => {
  const entry = getAfkEntry(jid)
  if (!entry) return false
  if (entry.scope === 'all') return true
  return Boolean(chat) && entry.chat === chat
}

export const isParticipantAfk = (participant, chat = '') => {
  if (!participant) return false
  const ids = [
    participant.id,
    participant.jid,
    participant.lid,
    participant.phoneNumber,
    participant.participant
  ].filter(Boolean)

  if (!ids.length) return false

  const st = getState()
  const keys = Object.keys(st).filter(k => st[k] && typeof st[k] === 'object')
  if (!keys.length) return false

  for (const id of ids) {
    const entry = getAfkEntry(id)
    if (!entry) continue
    if (entry.scope === 'all') return true
    if (chat && entry.chat === chat) return true
  }
  return false
}

export const withoutAfk = (jids = [], chat = '', skipped = { count: 0 }) => {
  const out = []
  for (const jid of jids) {
    if (isAfk(jid, chat)) skipped.count++
    else out.push(jid)
  }
  return out
}

export const afkReason = (jid) => getAfkEntry(jid)?.reason || ''

export const setAfk = (jid, entry) => {
  const st = getState()
  st[jid] = entry
  return entry
}

export const clearAfk = (jid) => {
  const st = getState()
  const had = Boolean(st[jid])
  delete st[jid]
  return had
}

export const afkUsers = () => {
  const st = getState()
  const out = {}
  for (const k of Object.keys(st)) if (st[k] && typeof st[k] === 'object') out[k] = st[k]
  return out
}

export const flushAfk = () => state.flush({ force: true })

export default {
  getAfkEntry, isAfk, isParticipantAfk, withoutAfk, afkReason,
  setAfk, clearAfk, afkUsers, flushAfk
}