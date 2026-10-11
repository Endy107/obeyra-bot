import pkg from '../../package.json' with { type: 'json' }

const MESSAGE = "« 🔒 »  *GRUPPO CHIUSO*\n\n> *Le porte si chiudono. Solo le divinità regnano in questo spazio.*"

const BUTTONS = [
  {
    buttonId: '.apri',
    buttonText: { displayText: '🔓 𝐀𝐩𝐫𝐢 𝐆𝐫𝐮𝐩𝐩𝐨' },
    type: 1
  }
]

let handler = async (m, { conn }) => {
  // Reazione e cambio impostazioni in parallelo, senza aspettare la reazione
  conn.sendMessage(m.chat, { react: { text: '🔒', key: m.key } }).catch(() => {})
  const update = conn.groupSettingUpdate(m.chat, 'announcement')

  const buttonMessage = {
    text: MESSAGE,
    footer: '⚙️ Pannello Rapido Amministrazione',
    buttons: BUTTONS,
    headerType: 1,
    contextInfo: {
      forwardingScore: 999,
      isForwarded: true,
      forwardedNewsletterMessageInfo: {
        newsletterJid: '120363427251015414@newsletter',
        newsletterName: `✦ ${global.db?.data?.nomedelbot || pkg.name} ✦`,
        serverMessageId: 143
      }
    }
  }

  await Promise.all([
    update,
    conn.sendMessage(m.chat, buttonMessage, { quoted: m })
  ])
}

handler.help = ['chiudi']
handler.tags = ['group']
handler.command = ['chiudi']
handler.admin = true
handler.botAdmin = true

export default handler