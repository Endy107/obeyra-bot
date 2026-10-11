// Plugin by elixir
import { LIMITS } from '../../lib/moderation.js'

const GORE_PATTERNS = [
  // Siti gore
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

  // Inglese (solo frasi di contenuto, non parole singole comuni)
  /\bgore[\s_-]?(video|videos|pics?|photos?|foto|content)\b/i,
  /\b(video|videos|pics?|photos?|foto|link)[\s_-]?gore\b/i,
  /\bbehead(ing|ed)?[\s_-]?(video|videos|clip)\b/i,
  /\bdecapitation[\s_-]?(video|videos|clip)\b/i,
  /\b(snuff|kill|murder|execution|suicide|hanging|torture)[\s_-]?(film|video|videos|clip)\b/i,
  /\b(dismembered|mutilated|disemboweled|impaled)[\s_-]?(body|bodies|corpse|corpses)\b/i,
  /\breal[\s_-]?(corpse|corpses|dead[\s_-]?bod(y|ies))\b/i,

  // Italiano (solo frasi di contenuto, non parole singole comuni)
  /\b(video|foto|link)[\s_-]?(gore|shock)\b/i,
  /\bvideo[\s_-]?(di[\s_-])?(decapitazion[ei]|esecuzion[ei]|tortur[ae]|omicidi[o]?|suicidi[o]?)\b/i,
  /\bcorpo[\s_-]?smembrato\b/i,
  /\btesta[\s_-]?(mozzata|tagliata)\b/i,
  /\bcadaver[ei][\s_-]?(vero|reale|vere|reali)\b/i,
  /\bvideo[\s_-]?horror[\s_-]?reale\b/i,
  /\b(omicidio|suicidio|splatter)[\s_-]?reale\b/i
]

const matchesGore = (text = '') => {
  if (!text) return false
  return GORE_PATTERNS.some((re) => re.test(text))
}

export async function before(m, { conn, isAdmin, isBotAdmin, isMods, isOwner, isROwner }) {
  // Ignora i messaggi del bot stesso (evita warn dai suoi avvisi)
  if (m.fromMe || m.isBaileys || m.sender === conn.user?.jid) return true
  if (!m.isGroup) return true

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
      participant: m.key.participant || m.sender
    }
  }).catch(() => {})

  if (user.warn >= maxWarn) {
    user.warn = 0
    await conn.sendMessage(m.chat, {
      text:
        `❌ *UTENTE ESPULSO*\n` +
        `👤 Target: ${tag}\n` +
        `⚙️ Azione: Rimozione automatica\n` +
        `⛔ Motivo: Contenuti violenti non consentiti (${maxWarn}/${maxWarn} avvertimenti)`,
      mentions: [m.sender]
    })
    await new Promise((resolve) => setTimeout(resolve, 1000))
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
      `📝 Motivo: Contenuti violenti non consentiti\n` +
      `📊 Sanzioni: [ ${user.warn}/${maxWarn} ]\n\n` +
      `⮕ Al ${maxWarn}° avvertimento l'utente verrà espulso dal gruppo.`,
    mentions: [m.sender]
  })

  return false
}
