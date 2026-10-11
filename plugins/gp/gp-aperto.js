import pkg from '../../package.json' with { type: 'json' }

const MESSAGE = "« 🔓 »  *GRUPPO APERTO*\n\n> *Il silenzio è rotto. La parola torna al popolo. Esprimetevi con saggezza.*"

const BUTTONS = [
  {
    buttonId: '.chiuso',
    buttonText: { displayText: '🔒 𝐂𝐡𝐢𝐮𝐝𝐢 𝐆𝐫𝐮𝐩𝐩𝐨' },
    type: 1
  }
]

let handler = async (m, { conn }) => {
  // Reazione e cambio impostazioni in parallelo, senza aspettare la reazione
  conn.sendMessage(m.chat, { react: { text: '🔓', key: m.key } }).catch(() => {})
  const update = conn.groupSettingUpdate(m.chat, 'not_announcement')

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

handler.help = ['apri']
handler.tags = ['group']
handler.command = ['apri']
handler.admin = true
handler.botAdmin = true

export default handler