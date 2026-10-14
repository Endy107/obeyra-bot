import fetch from 'node-fetch'

let handler = async (m, { conn, text }) => {

  if (!text) {
    return m.reply('❌ *ERRORE LINK*\nInserisci un link TikTok valido.\nEsempio:\n➜ .tt https://www.tiktok.com/...')
  }

  if (!text.includes('tiktok.com') && !text.includes('vm.tiktok.com')) {
    return m.reply('❌ *LINK NON VALIDO*\nIl link inserito non è un link TikTok riconosciuto.')
  }

  await m.reply('⏳ *DOWNLOAD IN CORSO*\nSto scaricando il video... Attendere qualche secondo.\n\n🔰 888 BOT Downloader')

  try {
    const api = `https://www.tikwm.com/api/?url=${encodeURIComponent(text)}`
    const res = await fetch(api)
    const json = await res.json()

    if (!json.data || !json.data.play) {
      return m.reply('❌ *ERRORE DOWNLOAD*\nImpossibile scaricare il video. Riprova più tardi.')
    }

    await conn.sendMessage(
      m.chat,
      {
        video: { url: json.data.play },
        mimetype: 'video/mp4',
        caption: `🎬 *VIDEO SCARICATO*\n🎵 Titolo:\n➜ ${json.data.title || 'TikTok Video'}\n\n🔰 888 BOT Downloader`
      },
      { quoted: m }
    )

  } catch (e) {
    console.error('[fun-scarica] Errore download TikTok:', e || 'Errore non specificato')
    return m.reply('❌ *ERRORE*\nSi è verificato un errore durante il download.')
  }
}

handler.command = /^(tt|tiktok)$/i
handler.help = ['tt <link>']
handler.tags = ['downloader']

export default handler