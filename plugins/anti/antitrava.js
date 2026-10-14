//Plugin by Elixir, Punisher & 888 staff

import {
  ROLES,
  addWarn,
  resetWarns,
  getWarnConfig,
  applyMute,
  formatDuration,
  flushDbNow
} from '../../lib/moderation.js'

function normalizeJid(jid) {
  return String(jid || '').split(':')[0]
}

export async function before(m, { conn, isAdmin, isBotAdmin }) {

  if (m.fromMe) return true
  if (m.isBaileys && m.fromMe) return true
  if (!m.isGroup) return true

  const chat = global.db.data.chats[m.chat]
  if (!chat?.antitrava || chat?.isBanned) return true
  if (isAdmin || !isBotAdmin) return true

  const text = (m.text || m.message?.extendedTextMessage?.text || '').toString()
  const messageSize = JSON.stringify(m.message || {}).length
  const fileLength = Number(
    m.message?.imageMessage?.fileLength ||
    m.message?.videoMessage?.fileLength ||
    m.message?.documentMessage?.fileLength ||
    m.message?.audioMessage?.fileLength ||
    m.message?.stickerMessage?.fileLength ||
    0
  )
  const hasInvisibleSpam = /[\u200b\u200c\u200d\u2060\uFEFF]{10,}/.test(text)

  const isTravaPayload =
    messageSize > 18000 ||
    text.length > 1600 ||
    fileLength > 8_000_000 ||
    hasInvisibleSpam

  if (!isTravaPayload) return true

  const botJid = normalizeJid(conn.user?.jid || conn.user?.id || '')
  const cfg = getWarnConfig(m.chat)

  // Elimina subito il messaggio
  try {
    await conn.sendMessage(m.chat, {
      delete: {
        remoteJid: m.chat,
        fromMe: false,
        id: m.key.id,
        participant: m.sender
      }
    })
  } catch {}

  // Warn nel sistema centrale (visibile con .warn, rimovibile con .unwarn / .resetwarn)
  let res
  try {
    res = addWarn({
      chat: m.chat,
      target: m.sender,
      reason: 'AntiTrava: messaggio crash/trava',
      actor: botJid,
      role: ROLES.OWNER
    })
  } catch (e) {
    console.log('Errore addWarn antitrava:', e)
    return false
  }

  // Espulsione al raggiungimento del limite
  if (res.escalate) {
    try {
      resetWarns({ chat: m.chat, target: m.sender })
      await flushDbNow()

      await conn.sendMessage(m.chat, {
        text:
`❌ *UTENTE ESPULSO*

👤 @${m.sender.split('@')[0]}
⚙️ Azione: Rimozione automatica
⛔ Motivo: Ha raggiunto ${cfg.max} avvertimenti (AntiTrava)`,
        mentions: [m.sender]
      })

      await new Promise(resolve => setTimeout(resolve, 1000))
      await conn.groupParticipantsUpdate(m.chat, [m.sender], 'remove')
    } catch (e) {
      console.log('Errore espulsione antitrava:', e)
    }
    return false
  }

  // Mute automatico, se previsto dalla configurazione warn
  let muteNote = ''
  if (res.mute) {
    try {
      const mr = applyMute({
        chat: m.chat,
        target: m.sender,
        actor: botJid,
        role: ROLES.OWNER,
        durationMs: cfg.muteMs
      })
      muteNote = `\n🔇 Mute automatico: ${formatDuration(mr.ms)}`
    } catch {}
  }

  const riskNote = res.count >= cfg.max - 1
    ? `\n⛔ Al prossimo warn verrai espulso.`
    : ''

  await conn.sendMessage(m.chat, {
    text:
`🚫 *AntiTrava attivato*

👤 @${m.sender.split('@')[0]}
📝 Messaggio rimosso perché potenzialmente crash/trava
⚠️ Warn: ${res.count}/${cfg.max}${muteNote}${riskNote}`,
    mentions: [m.sender]
  })

  return false
}