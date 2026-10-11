// Plugin by elixir, punisher & 888 staff
import { LIMITS } from '../../lib/moderation.js'

const IG_REGEX = /(instagram\.com|instagr\.am)/i

export async function before(m, { conn, isAdmin, isBotAdmin, isMods, isOwner, isROwner }) {
  const isMine = conn.user && (conn.user.jid || conn.user.id) &&
    typeof conn.decodeJid === 'function' &&
    conn.decodeJid(m.sender) === conn.decodeJid(conn.user.jid || conn.user.id)
  if (isMine) return true
  if (m.isBaileys && m.fromMe) return true
  if (!m.isGroup) return false

  const chat = global.db.data.chats[m.chat]
  if (!chat?.antilinkig || chat?.isBanned) return true

  // Staff esente, e il bot deve essere admin per poter cancellare/espellere
  if (isAdmin || isMods || isOwner || isROwner || !isBotAdmin) return true

  const text = (m.text || '').toLowerCase()
  if (!IG_REGEX.test(text)) return true

  // Stesso contatore di warn / unwarn / warnlist
  global.db.data.users ??= {}
  global.db.data.users[m.sender] ??= { warn: 0 }
  const user = global.db.data.users[m.sender]
  user.warn = (Number(user.warn) || 0) + 1

  const maxWarn = LIMITS.MAX_WARN
  const tag = `@${m.sender.split('@')[0]}`

  // Cancella subito il messaggio
  await conn.sendMessage(m.chat, {
    delete: {
      remoteJid: m.chat,
      fromMe: false,
      id: m.key.id,
      participant: m.sender
    }
  }).catch(() => {})

  if (user.warn >= maxWarn) {
    user.warn = 0
    await conn.sendMessage(m.chat, {
      text:
        `❌ *UTENTE ESPULSO*\n` +
        `👤 Target: ${tag}\n` +
        `⚙️ Azione: Rimozione automatica\n` +
        `⛔ Motivo: Link Instagram (${maxWarn}/${maxWarn} avvertimenti)`,
      mentions: [m.sender]
    })
    await new Promise(resolve => setTimeout(resolve, 1000))
    try {
      await conn.groupParticipantsUpdate(m.chat, [m.sender], 'remove')
    } catch (e) {
      console.error('[antilinkig] Errore rimozione partecipante:', e || 'Errore non specificato')
    }
    return false
  }

  await conn.sendMessage(m.chat, {
    text:
      `⚠️ *AVVERTIMENTO AUTOMATICO*\n` +
      `👤 Target: ${tag}\n` +
      `📝 Motivo: Link Instagram non consentiti\n` +
      `📊 Sanzioni: [ ${user.warn}/${maxWarn} ]\n\n` +
      `⮕ Al ${maxWarn}° avvertimento l'utente verrà espulso dal gruppo.`,
    mentions: [m.sender]
  })

  return false
}