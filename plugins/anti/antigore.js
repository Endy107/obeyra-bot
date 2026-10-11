// Plugin by elixir
import { LIMITS } from '../../lib/moderation.js'

const GORE_PATTERNS = [
  /bestgore/i,
  /liveleak/i,
  /watchpeopledie/i,
  /kaotic\.com/i,
  /seegore/i,
  /goregrish/i,
  /documentingreality/i,
  /theync\.com/i,
  /deathaddict/i,
  /ogrish/i,

  /\bgore\b/i,
  /behead/i,
  /decapit/i,
  /dismember/i,
  /mutilat/i,
  /torture/i,
  /impalement/i,
  /disembowel/i,
  /snuff[\s_-]?film/i,
  /snuff[\s_-]?video/i,
  /kill[\s_-]?video/i,
  /murder[\s_-]?video/i,
  /execution[\s_-]?video/i,
  /suicide[\s_-]?video/i,
  /hanging[\s_-]?video/i,
  /\bcorpse\b/i,

  /sgozzat/i,
  /squartat/i,
  /smembrat/i,
  /sventrat/i,
  /impiccat/i,
  /impalat/i,
  /torturat/i,
  /cadavere/i,
  /corpo[\s_-]?smembrato/i,
  /testa[\s_-]?mozzata/i,
  /testa[\s_-]?tagliata/i,
  /video[\s_-]?shock/i,
  /video[\s_-]?horror[\s_-]?reale/i,
  /omicidio[\s_-]?reale/i,
  /suicidio[\s_-]?reale/i,
  /splatter[\s_-]?reale/i
]

const matchesGore = (text = '') => {
  if (!text) return false
  return GORE_PATTERNS.some((re) => re.test(text))
}

export async function before(m, { conn, isAdmin, isBotAdmin, isMods, isOwner, isROwner }) {
  if (m.isBaileys && m.fromMe) return true
  if (!m.isGroup) return false

  const chat = global.db.data.chats[m.chat]
  if (!chat?.antigore || chat?.isBanned) return true

  // Staff esente, e il bot deve essere admin per poter cancellare/espellere
  if (isAdmin || isMods || isOwner || isROwner || !isBotAdmin) return true

  const text = (m.text || '').toString()
  const caption = (
    m.message?.imageMessage?.caption ||
    m.message?.videoMessage?.caption ||
    m.message?.documentMessage?.caption ||
    m.message?.extendedTextMessage?.text ||
    ''
  ).toString()
  const fileName = (
    m.message?.documentMessage?.fileName ||
    m.message?.imageMessage?.fileName ||
    m.message?.videoMessage?.fileName ||
    ''
  ).toString()

  if (!matchesGore(text) && !matchesGore(caption) && !matchesGore(fileName)) return true

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
        `⛔ Motivo: Contenuti gore/shock (${maxWarn}/${maxWarn} avvertimenti)`,
      mentions: [m.sender]
    })
    await new Promise(resolve => setTimeout(resolve, 1000))
    try {
      await conn.groupParticipantsUpdate(m.chat, [m.sender], 'remove')
    } catch (e) {
      console.log('Errore espulsione antigore:', e)
    }
    return false
  }

  await conn.sendMessage(m.chat, {
    text:
      `🩸 *AVVERTIMENTO AUTOMATICO*\n` +
      `👤 Target: ${tag}\n` +
      `📝 Motivo: Contenuti gore/shock non consentiti\n` +
      `📊 Sanzioni: [ ${user.warn}/${maxWarn} ]\n\n` +
      `⮕ Al ${maxWarn}° avvertimento l'utente verrà espulso dal gruppo.`,
    mentions: [m.sender]
  })

  return false
}