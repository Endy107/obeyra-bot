// Plugin by elixir
import { LIMITS } from '../../lib/moderation.js'

const PORN_PATTERNS = [
  /pornhub\.com/i,
  /xvideos\.com/i,
  /xnxx\.com/i,
  /redtube\.com/i,
  /xhamster\.com/i,
  /youporn\.com/i,
  /pornmd\.com/i,
  /beeg\.com/i,
  /tube8\.com/i,
  /spankbang\.com/i,
  /brazzers\.com/i,
  /onlyfans\.com/i,
  /chaturbate\.com/i,
  /camwhores/i,
  /erome\.com/i,
  /hclips\.com/i,
  /tnaflix\.com/i,
  /slutload/i,
  /motherless\.com/i,
  /\bporn\b/i,
  /\bporno\b/i,
  /\bhentai\b/i,
  /\bnudes?\b/i,
  /\bboobs\b/i,
  /\btits\b/i,
  /pussy/i,
  /dickpic/i,
  /blowjob/i,
  /handjob/i,
  /deepthroat/i,
  /creampie/i,
  /gangbang/i,
  /threesome/i,
  /onlyfans[\s_-]?leak/i,
  /porn[\s_-]?video/i,
  /sex[\s_-]?video/i,
  /xxx[\s_-]?video/i,
  /porcata/i,
  /sesso[\s_-]?esplicito/i,
  /video[\s_-]?porno/i,
  /foto[\s_-]?porno/i,
  /link[\s_-]?porno/i,
  /tette/i,
  /pompino/i,
  /sborra/i,
  /scopata/i,
  /troia/i
]

const matchesPorn = (text = '') => {
  if (!text) return false
  return PORN_PATTERNS.some((re) => re.test(text))
}

export async function before(m, { conn, isAdmin, isBotAdmin, isMods, isOwner, isROwner }) {
  if (m.isBaileys && m.fromMe) return true
  if (!m.isGroup) return false

  const chat = global.db.data.chats[m.chat]
  if (!chat?.antiporno || chat?.isBanned) return true

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

  if (!matchesPorn(text) && !matchesPorn(caption) && !matchesPorn(fileName)) return true

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
        `⛔ Motivo: Link/contenuti porno (${maxWarn}/${maxWarn} avvertimenti)`,
      mentions: [m.sender]
    })
    await new Promise(resolve => setTimeout(resolve, 1000))
    try {
      await conn.groupParticipantsUpdate(m.chat, [m.sender], 'remove')
    } catch (e) {
      console.log('Errore espulsione antiporno:', e)
    }
    return false
  }

  await conn.sendMessage(m.chat, {
    text:
      `⚠️ *AVVERTIMENTO AUTOMATICO*\n` +
      `👤 Target: ${tag}\n` +
      `📝 Motivo: Link/contenuti porno non consentiti\n` +
      `📊 Sanzioni: [ ${user.warn}/${maxWarn} ]\n\n` +
      `⮕ Al ${maxWarn}° avvertimento l'utente verrà espulso dal gruppo.`,
    mentions: [m.sender]
  })

  return false
}