let chalk
try {
  chalk = (await import('chalk')).default
} catch {
  const id = (s) => s
  chalk = new Proxy({}, { get: () => ({ bold: id, hex: () => ({ bold: id }) }) })
  chalk.hex = () => ({ bold: id })
  chalk.bold = id
  chalk.gray = id
  chalk.redBright = { bold: id }
  chalk.cyanBright = { bold: id }
}

export const ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MOD: 'mod',
  USER: 'user'
}

export const ROLE_LEVEL = {
  [ROLES.USER]: 0,
  [ROLES.MOD]: 1,
  [ROLES.ADMIN]: 2,
  [ROLES.OWNER]: 3
}

export const LIMITS = {
  
  MOD_MUTE_MAX_MS: 5 * 60 * 1000,
  
  MOD_MAX_WARN: 4,
  
  MAX_WARN: 5,
  
  MOD_UNWARN_COOLDOWN_MS: 5 * 60 * 1000,
  
  MOD_HIDETAG_MAX: 6,
  
  MOD_BAN_MAX_MS: 15 * 60 * 1000,
  
  HISTORY_MAX: 100,

  WARN_EXPIRE_DAYS: 60,
  WARN_MUTE_AT: 3,
  WARN_MUTE_MS: 5 * 60 * 1000,
  MOD_WARN_COOLDOWN_MS: 60 * 1000,
  MOD_WARN_MAX_PER_HOUR: 10,
}

export const PROTECTED_JIDS = [
  '393784409415@s.whatsapp.net',
  '393206032199@s.whatsapp.net'
]

export const STAFF_ACTIONS = ['warn', 'unwarn', 'mute', 'smute', 'ban', 'unban', 'denuncia']

export function cleanNumber(jid = '') {
  return String(jid || '').replace(/[^0-9]/g, '')
}

export function normalizeJid(jid = '') {
  if (!jid) return null
  if (jid.includes('@s.whatsapp.net') || jid.includes('@lid') || jid.includes('@g.us')) return jid
  const clean = cleanNumber(jid)
  return clean.length > 5 ? clean + '@s.whatsapp.net' : null
}

export function isOwnerJid(jid = '') {
  const num = cleanNumber(jid)
  if (!num) return false
  return (global.owner || []).some(entry => {
    const ownerNum = Array.isArray(entry) ? cleanNumber(entry[0]) : cleanNumber(entry)
    return ownerNum === num
  })
}

export function isGlobalMod(jid = '') {
  const num = cleanNumber(jid)
  if (!num) return false
  return (global.mods || []).some(v => cleanNumber(v) === num)
}

export function getGroupMods(chat = '') {
  return global.db?.data?.chats?.[chat]?.moderatori || []
}

export function isGroupMod(chat = '', jid = '') {
  const num = cleanNumber(jid)
  if (!num) return false
  return getGroupMods(chat).some(v => cleanNumber(v) === num)
}

export function resolveRole(flags = {}) {
  const { isOwner, isROwner, isAdmin, isMods } = flags
  if (isOwner || isROwner) return ROLES.OWNER
  if (isAdmin) return ROLES.ADMIN
  if (isMods) return ROLES.MOD
  return ROLES.USER
}

export function resolveRoleOfJid(conn, chat, jid, participants = []) {
  if (isOwnerJid(jid)) return ROLES.OWNER
  const num = cleanNumber(jid)
  const list = Array.isArray(participants) ? participants : []
  const member = list.find(p => {
    const decoded = typeof conn?.decodeJid === 'function' ? conn.decodeJid(p.id || p.jid || '') : (p.id || p.jid || '')
    return cleanNumber(decoded) === num
  })
  if (member && (member.admin === 'admin' || member.admin === 'superadmin' || member.admin === true)) return ROLES.ADMIN
  if (isGlobalMod(jid) || isGroupMod(chat, jid)) return ROLES.MOD
  return ROLES.USER
}

export function canUse(role, minRole = ROLES.MOD) {
  return (ROLE_LEVEL[role] ?? 0) >= (ROLE_LEVEL[minRole] ?? 0)
}

export function roleLabel(role) {
  switch (role) {
    case ROLES.OWNER: return '[OWNER]'
    case ROLES.ADMIN: return '[ADMIN]'
    case ROLES.MOD: return '[MOD]'
    default: return '[USER]'
  }
}

export function roleTag(role) {
  switch (role) {
    case ROLES.OWNER: return chalk.hex('#ffd700').bold('OWNER')
    case ROLES.ADMIN: return chalk.redBright.bold('ADMIN')
    case ROLES.MOD: return chalk.cyanBright.bold('MOD')
    default: return chalk.gray('USER')
  }
}

export function logModAction({ role = ROLES.USER, actor = '', action = '', target = '', extra = '' } = {}) {
  try {
    const tag = roleTag(role)
    const who = chalk.whiteBright(String(actor || '').split('@')[0] || 'sconosciuto')
    const to = target ? chalk.whiteBright(' → ' + String(target).split('@')[0]) : ''
    const detail = extra ? chalk.gray(' (' + extra + ')') : ''
    console.log(`${tag} ${who} ${chalk.hex('#9b5bff')('•')} ${chalk.cyanBright(action)}${to}${detail}`)
  } catch {}
}

export function parseDuration(text = '') {
  const match = String(text)
    .toLowerCase()
    .match(/(?:^|\s)(\d+)\s*(m|min|minuti|minuto|h|ore|ora|d|giorni|giorno|s|sec|secondi)?(?:\.|\s|$)/)

  if (!match) return null

  const value = Number(match[1])
  const unit = match[2] || 'm'
  if (!value || value <= 0) return null

  if (['s', 'sec', 'secondi'].includes(unit))
    return { ms: value * 1000, label: `${value} ${value === 1 ? 'secondo' : 'secondi'}` }

  if (['h', 'ora', 'ore'].includes(unit))
    return { ms: value * 60 * 60 * 1000, label: `${value} ${value === 1 ? 'ora' : 'ore'}` }

  if (['d', 'giorno', 'giorni'].includes(unit))
    return { ms: value * 24 * 60 * 60 * 1000, label: `${value} ${value === 1 ? 'giorno' : 'giorni'}` }

  return { ms: value * 60 * 1000, label: `${value} ${value === 1 ? 'minuto' : 'minuti'}` }
}

export function formatDuration(ms) {
  if (!ms || ms <= 0) return 'Permanente'
  const totalSec = Math.ceil(ms / 1000)
  if (totalSec < 60) return `${totalSec}s`
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  if (min < 60) return sec ? `${min}m ${sec}s` : `${min}m`
  const h = Math.floor(min / 60)
  const rMin = min % 60
  return rMin ? `${h}h ${rMin}m` : `${h}h`
}

export function resolveTarget(m, text = '') {
  const mentioned =
    m?.mentionedJid?.[0] ||
    m?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] ||
    m?.msg?.contextInfo?.mentionedJid?.[0] ||
    null

  if (mentioned) return normalizeJid(mentioned)
  if (m?.quoted?.sender) return normalizeJid(m.quoted.sender)

  const clean = cleanNumber(text)
  return clean.length >= 8 && clean.length <= 15 ? normalizeJid(clean) : null
}

export function isTargetProtected({ target, actorRole = ROLES.USER, participants = [], conn = null, chat = '' } = {}) {
  if (!target) return { protected: false }
  const targetRole = resolveRoleOfJid(conn, chat, target, participants)

  if (targetRole === ROLES.OWNER && actorRole !== ROLES.OWNER)
    return { protected: true, reason: 'Owner protetto', targetRole }

  if (PROTECTED_JIDS.some(j => cleanNumber(j) === cleanNumber(target)) && actorRole !== ROLES.OWNER)
    return { protected: true, reason: 'Utente protetto dallo staff', targetRole }

  if ((targetRole === ROLES.ADMIN || targetRole === ROLES.MOD) && !canUse(actorRole, ROLES.ADMIN))
    return { protected: true, reason: 'Membro dello staff protetto', targetRole }

  return { protected: false, targetRole }
}

export function findGroupParticipant(participants = [], jid = '', conn = null) {
  const list = Array.isArray(participants) ? participants : []
  const wantNum = cleanNumber(typeof conn?.decodeJid === 'function' ? conn.decodeJid(jid) : jid)
  if (!wantNum) return null
  return list.find(p => {
    const ids = [p?.id, p?.jid, p?.lid, p?.phoneNumber].filter(Boolean)
    return ids.some(raw => {
      let d = raw
      try { d = typeof conn?.decodeJid === 'function' ? conn.decodeJid(raw) : raw } catch { d = raw }
      return cleanNumber(d) === wantNum
    })
  }) || null
}

export function isParticipantAdmin(p) {
  return !!p && (p.admin === 'admin' || p.admin === 'superadmin' || p.admin === true)
}

export async function fetchFreshGroupMetadata(conn, chat = '') {
  if (!conn || typeof conn.groupMetadata !== 'function' || !chat) return null
  try {
    const meta = await conn.groupMetadata(chat)
    if (meta) {
      try { global.groupCache?.set?.(chat, meta) } catch {}
      return meta
    }
  } catch {}
  return null
}

export async function verifyGroupAdmin(conn, chat = '', jid = '', opts = {}) {
  const { allowBotOwner = true } = opts || {}
  if (!chat || !jid) return { ok: false, isAdmin: false, isMember: false, fresh: false, reason: 'missing-params' }
  if (allowBotOwner && isOwnerJid(jid)) return { ok: true, isAdmin: true, isMember: true, isOwner: true, fresh: true, reason: 'bot-owner' }
  if (!conn || typeof conn.groupMetadata !== 'function') return { ok: false, isAdmin: false, isMember: false, fresh: false, reason: 'no-conn' }
  const meta = await fetchFreshGroupMetadata(conn, chat)
  if (!meta || !Array.isArray(meta.participants)) return { ok: false, isAdmin: false, isMember: false, fresh: false, reason: 'metadata-unavailable' }
  const member = findGroupParticipant(meta.participants, jid, conn)
  if (!member) return { ok: false, isAdmin: false, isMember: false, fresh: true, reason: 'not-member' }
  const admin = isParticipantAdmin(member)
  return { ok: admin, isAdmin: admin, isMember: true, isOwner: false, fresh: true, reason: admin ? 'admin' : 'not-admin', participant: member, metadata: meta }
}

export async function verifyBotAdmin(conn, chat = '') {
  const botJid = conn?.user?.jid || conn?.user?.id || ''
  if (!botJid) return { ok: false, reason: 'no-bot-jid' }
  return verifyGroupAdmin(conn, chat, botJid, { allowBotOwner: false })
}

export function ensureModStats(chat = '') {
  const data = global.db?.data
  if (!data) return null
  data.modStats ??= {}
  data.modStats[chat] ??= {}
  return data.modStats[chat]
}

export function modStatsFor(chat, actor) {
  const store = ensureModStats(chat)
  if (!store || !actor) return null
  const entry = store[actor] ??= {
    warn: 0,
    unwarn: 0,
    mute: 0,
    smute: 0,
    ban: 0,
    unban: 0,
    denuncia: 0,
    firstAction: 0,
    lastAction: 0,
    lastUnwarn: 0,
    history: []
  }
  for (const action of STAFF_ACTIONS) entry[action] ??= 0
  entry.history ??= []
  return entry
}

export function recordAction({ chat, actor, action, target = null, role = ROLES.MOD, detail = '' } = {}) {
  const entry = modStatsFor(chat, actor)
  if (!entry) return null
  if (STAFF_ACTIONS.includes(action)) entry[action] = (entry[action] || 0) + 1
  const now = Date.now()
  entry.firstAction ||= now
  entry.lastAction = now
  entry.history.push({ action, target, role, at: now, detail })
  if (entry.history.length > LIMITS.HISTORY_MAX)
    entry.history.splice(0, entry.history.length - LIMITS.HISTORY_MAX)
  global.markDbDirty?.()
  return entry
}

export function readStats(chat) {
  const store = global.db?.data?.modStats?.[chat]
  return store || {}
}

export function totalsFor(entry = {}) {
  return STAFF_ACTIONS.reduce((sum, action) => sum + (Number(entry[action]) || 0), 0)
}

export function maxWarnForRole(role) {
  return role === ROLES.MOD ? LIMITS.MOD_MAX_WARN : LIMITS.MAX_WARN
}

export function canApplyWarn(role, currentWarn = 0) {
  if (role === ROLES.MOD && (Number(currentWarn) || 0) + 1 > LIMITS.MOD_MAX_WARN) {
    return {
      ok: false,
      reason: 'escalation',
      message:
        `⚠️ *Limite moderatori raggiunto*\n` +
        `📊 Sanzioni attuali: [ ${currentWarn}/${LIMITS.MAX_WARN} ]\n` +
        `🛑 I moderatori non possono assegnare il 5° warn.\n` +
        `⏳ Attendi la decisione di un Admin/Owner.`
    }
  }
  return { ok: true }
}

export function checkUnwarnCooldown(chat, actor, role) {
  if (role !== ROLES.MOD) return { ok: true, remainingMs: 0 }
  const entry = global.db?.data?.modStats?.[chat]?.[actor]
  const last = Number(entry?.lastUnwarn) || 0
  const diff = Date.now() - last
  if (last && diff < LIMITS.MOD_UNWARN_COOLDOWN_MS) {
    const remainingMs = LIMITS.MOD_UNWARN_COOLDOWN_MS - diff
    return {
      ok: false,
      remainingMs,
      message:
        `⏳ *Cooldown attivo*\n` +
        `I moderatori possono usare .unwarn una volta ogni 5 minuti.\n` +
        `🕒 Riprova tra *${formatDuration(remainingMs)}*.`
    }
  }
  return { ok: true, remainingMs: 0 }
}

export function markUnwarn(chat, actor) {
  const entry = modStatsFor(chat, actor)
  if (!entry) return
  entry.lastUnwarn = Date.now()
  global.markDbDirty?.()
}

export function ensureMuteStore(chat = '') {
  const data = global.db?.data
  if (!data) return {}
  data.chats ??= {}
  data.chats[chat] ??= {}
  data.chats[chat].mutedUsers ??= {}
  return data.chats[chat].mutedUsers
}

export function getMute(chat, jid) {
  const store = global.db?.data?.chats?.[chat]?.mutedUsers
  if (!store || !jid) return null
  return store[jid] || null
}

export function activeMute(chat, jid) {
  const data = getMute(chat, jid)
  if (!data || data.active !== true) return null
  if (data.expiresAt && Date.now() >= data.expiresAt) {
    delete ensureMuteStore(chat)[jid]
    global.markDbDirty?.()
    return null
  }
  return data
}

export function resolveMuteDuration(role, requestedMs) {
  if (role === ROLES.MOD) {
    const requested = requestedMs ?? LIMITS.MOD_MUTE_MAX_MS
    return {
      ms: Math.min(requested, LIMITS.MOD_MUTE_MAX_MS),
      capped: requested > LIMITS.MOD_MUTE_MAX_MS,
      requested
    }
  }
  return { ms: requestedMs ?? null, capped: false, requested: requestedMs ?? null }
}

export function applyMute({ chat, target, actor, role = ROLES.MOD, durationMs = null } = {}) {
  const store = ensureMuteStore(chat)
  const resolved = resolveMuteDuration(role, durationMs)
  store[target] = {
    active: true,
    expiresAt: resolved.ms ? Date.now() + resolved.ms : null,
    mutedBy: actor,
    mutedByRole: role,
    mutedByOwner: role === ROLES.OWNER,
    createdAt: Date.now()
  }
  global.markDbDirty?.()
  return resolved
}

export function liftMute({ chat, target } = {}) {
  const store = ensureMuteStore(chat)
  const previous = store[target] || null
  if (previous) delete store[target]
  global.markDbDirty?.()
  return { removed: !!previous, previous }
}

const banTimers = new Map()
const MAX_TIMEOUT = 2 ** 31 - 1

export function ensureBanStore() {
  const data = global.db?.data
  if (!data) return {}
  data.modBans ??= {}
  return data.modBans
}

export function getTempBan(target) {
  return ensureBanStore()[target] || null
}

export function ensureUser(target) {
  const data = global.db?.data
  if (!data) return null
  data.users ??= {}
  data.users[target] ??= {}
  return data.users[target]
}

export function resolveBanDuration(role, requestedMs) {
  if (role === ROLES.MOD) {
    const requested = requestedMs ?? LIMITS.MOD_BAN_MAX_MS
    return {
      ms: Math.min(requested, LIMITS.MOD_BAN_MAX_MS),
      capped: requested > LIMITS.MOD_BAN_MAX_MS,
      requested
    }
  }
  return { ms: requestedMs ?? null, capped: false, requested: requestedMs ?? null }
}

function clearBanTimer(target) {
  const timer = banTimers.get(target)
  if (timer) {
    clearTimeout(timer)
    banTimers.delete(target)
  }
}

export async function expireBan(conn, target) {
  clearBanTimer(target)
  const store = ensureBanStore()
  const record = store[target]
  if (!record) return null

  delete store[target]
  const user = ensureUser(target)
  if (user) {
    user.banned = false
    user.notifiedBan = false
  }
  global.markDbDirty?.()

  logModAction({
    role: ROLES.MOD,
    actor: record.by || 'sistema',
    action: 'ban scaduto',
    target,
    extra: 'rilascio automatico'
  })

  if (conn && record.chat) {
    try {
      await conn.sendMessage(record.chat, {
        text: `🔓 *Ban temporaneo scaduto*\n👤 Utente: @${String(target).split('@')[0]}\n⚙️ Azione: riattivazione automatica`,
        mentions: [target]
      })
    } catch {}
  }
  return record
}

function scheduleBanExpiry(conn, target) {
  clearBanTimer(target)
  const record = getTempBan(target)
  if (!record || !record.until) return
  const delay = Math.max(0, record.until - Date.now())
  const timer = setTimeout(() => {
    expireBan(conn, target).catch(() => {})
  }, Math.min(delay, MAX_TIMEOUT))
  timer.unref?.()
  banTimers.set(target, timer)
}

export function applyBan({ conn, target, actor, role = ROLES.MOD, durationMs = null, chat = '', reason = '' } = {}) {
  const resolved = resolveBanDuration(role, durationMs)
  const user = ensureUser(target)
  if (user) {
    user.banned = true
    user.bannedReason = reason || `Ban ${roleLabel(role)}`
    user.bannedBy = actor
    user.bannedAt = Date.now()
  }

  const store = ensureBanStore()
  store[target] = {
    until: resolved.ms ? Date.now() + resolved.ms : null,
    by: actor,
    role,
    chat,
    reason,
    permanent: !resolved.ms
  }
  if (resolved.ms) scheduleBanExpiry(conn, target)
  global.markDbDirty?.()
  return resolved
}

export function liftBan({ target, role = ROLES.MOD } = {}) {
  const store = ensureBanStore()
  const record = store[target] || null

  if (record?.permanent && role === ROLES.MOD)
    return { ok: false, reason: 'permanent', record }

  if (record?.role === ROLES.OWNER && role !== ROLES.OWNER)
    return { ok: false, reason: 'higher', record }

  clearBanTimer(target)
  delete store[target]
  const user = ensureUser(target)
  if (user) {
    user.banned = false
    user.notifiedBan = false
  }
  global.markDbDirty?.()
  return { ok: true, record }
}

export async function restoreTempBans(conn) {
  const store = ensureBanStore()
  const now = Date.now()
  for (const [target, record] of Object.entries(store)) {
    if (!record || record.permanent || !record.until) continue
    if (record.until <= now) {
      await expireBan(conn, target).catch(() => {})
    } else {
      scheduleBanExpiry(conn, target)
    }
  }
}

let sweepTimer = null
export function startBanSweeper(conn) {
  if (sweepTimer) return sweepTimer
  sweepTimer = setInterval(() => {
    restoreTempBans(conn).catch(() => {})
  }, 30_000)
  sweepTimer.unref?.()
  return sweepTimer
}
export function checkWarnCooldown(chat, actor, role) {
  if (role !== ROLES.MOD) return { ok: true, remainingMs: 0 }
  const data = global.db?.data
  if (!data || !chat) return { ok: true, remainingMs: 0 }
  data.chats ??= {}
  data.chats[chat] ??= {}
  data.chats[chat].warnCooldowns ??= {}
  const cd = data.chats[chat].warnCooldowns[actor] ||= { lastWarnAt: 0, hourStart: 0, hourCount: 0 }
  const now = Date.now()
  const sinceLast = now - Number(cd.lastWarnAt || 0)
  if (cd.lastWarnAt && sinceLast < LIMITS.MOD_WARN_COOLDOWN_MS) {
    const remainingMs = LIMITS.MOD_WARN_COOLDOWN_MS - sinceLast
    return { ok: false, reason: 'cooldown', remainingMs, message: 'Cooldown warn attivo. Riprova tra ' + formatDuration(remainingMs) + '.' }
  }
  if (!cd.hourStart || now - cd.hourStart >= 3600000) {
    cd.hourStart = now
    cd.hourCount = 0
  }
  if (cd.hourCount >= LIMITS.MOD_WARN_MAX_PER_HOUR) {
    const remainingMs = (cd.hourStart + 3600000) - now
    return { ok: false, reason: 'hourly', remainingMs, message: 'Limite orario warn raggiunto. Riprova tra ' + formatDuration(remainingMs) + '.' }
  }
  return { ok: true, remainingMs: 0 }
}

export function markWarnGiven(chat, actor, role) {
  if (role !== ROLES.MOD || !chat || !actor) return
  try {
    const cd = global.db.data.chats[chat].warnCooldowns[actor] ||= { lastWarnAt: 0, hourStart: 0, hourCount: 0 }
    const now = Date.now()
    if (!cd.hourStart || now - cd.hourStart >= 3600000) {
      cd.hourStart = now
      cd.hourCount = 0
    }
    cd.lastWarnAt = now
    cd.hourCount += 1
  } catch {}
}

export function addWarn({ chat, target, reason = '', actor = '', role = ROLES.MOD } = {}) {
  if (!chat || !target) return null
  const cfg = getWarnConfig(chat)
  const store = ensureWarnStore(chat)
  const now = Date.now()
  const entry = store[target] ??= { count: 0, total: 0, createdAt: now, updatedAt: now, list: [] }
  entry.list ??= []
  const item = { id: shortWarnId(), reason: String(reason || '').slice(0, 300), by: actor, byRole: role, at: now }
  entry.list.push(item)
  entry.count = entry.list.length
  entry.total = (Number(entry.total) || 0) + 1
  entry.updatedAt = now
  try {
    global.db.data.users ??= {}
    global.db.data.users[target] ??= {}
    global.db.data.users[target].warn = entry.count
  } catch {}
  markWarnGiven(chat, actor, role)
  global.markDbDirty?.()
  return { entry, item, count: entry.count, max: cfg.max, escalate: entry.count >= cfg.max, mute: entry.count === cfg.muteAt }
}

export function removeWarn({ chat, target, id = null } = {}) {
  if (!chat || !target) return { ok: false, reason: 'no-target' }
