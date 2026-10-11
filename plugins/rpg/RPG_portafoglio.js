// Plugin by elixir, punisher & 888 staff
// Canvas sostituito con Browserless (HTML screenshot) + fallback Jimp
import Jimp from 'jimp'
import { screenshot, browserlessAvailable } from '../../lib/browserless.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const renderCard = async ({ userName, bank, wallet, stolen, cardNumber, iban, cardImg }) => {
  const bg = await Jimp.read(cardImg)
  const W = bg.bitmap.width
  const H = bg.bitmap.height
  const bgUri = `data:image/jpeg;base64,${(await bg.getBufferAsync(Jimp.MIME_JPEG)).toString('base64')}`
  if (browserlessAvailable()) {
    try {
      return await screenshot(buildCardHtml({ userName, bank, wallet, stolen, cardNumber, iban, bgUri, W, H }), { width: W, height: H, type: 'jpeg', quality: 92 })
    } catch (e) {
      console.warn('[RPG_portafoglio] browserless fallito, uso jimp:', e?.message || e)
    }
  }
  return renderCardJimp({ userName, bank, wallet, stolen, cardNumber, iban, bg })
}

function buildCardHtml({ userName, bank, wallet, stolen, cardNumber, iban, bgUri, W, H }) {
  const esc = (s) => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
  const GOLD = '#D4AF37', GLDL = '#EECD5A', WHITE = 'rgba(255,255,255,0.93)', RED = 'rgba(210,75,65,0.95)'
  const n = (v) => Number(v || 0).toLocaleString('it-IT')
  const T = (txt, x, y, fnt, color) => `<div style="position:absolute;left:${x}px;top:${y - 34}px;font:${fnt};color:${color};text-shadow:2px 2px 4px rgba(0,0,0,.55);transform:skewX(-0.15rad)">${esc(txt)}</div>`
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>*{margin:0;padding:0;box-sizing:border-box}html,body{width:${W}px;height:${H}px;overflow:hidden;font-family:sans-serif}.bg{position:absolute;inset:0;background:url('${bgUri}') center/cover no-repeat}</style></head><body><div class="bg"></div>
${T(userName, 560, 255, '500 44px sans-serif', GLDL)}
${T('IN BANCA', 620, 360, '400 40px sans-serif', GOLD)}
${T('888COIN ' + n(bank), 620, 388, '700 30px sans-serif', WHITE)}
${T('PORTAFOGLIO', 620, 442, '400 40px sans-serif', GOLD)}
${T('888COIN ' + n(wallet), 620, 470, '700 30px sans-serif', WHITE)}
${T('TOTALE RUBATO', 620, 524, '400 40px sans-serif', RED)}
${T('888COIN ' + n(stolen), 620, 548, '700 30px sans-serif', RED)}
${T(cardNumber, 400, 810, '700 27px monospace', WHITE)}
${T(iban, 400, 852, '400 25px monospace', GLDL)}
</body></html>`
}

async function renderCardJimp({ userName, bank, wallet, stolen, cardNumber, iban, bg }) {
  const white = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE)
  const white16 = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE)
  const gold = await Jimp.loadFont(Jimp.FONT_SANS_32_YELLOW)
  const n = (v) => Number(v || 0).toLocaleString('it-IT')
  bg.print(white, 560, 220, String(userName).slice(0, 24))
  bg.print(gold, 620, 320, 'IN BANCA')
  bg.print(white16, 620, 350, '888COIN ' + n(bank))
  bg.print(gold, 620, 400, 'PORTAFOGLIO')
  bg.print(white16, 620, 430, '888COIN ' + n(wallet))
  bg.print(gold, 620, 480, 'TOTALE RUBATO')
  bg.print(white16, 620, 510, '888COIN ' + n(stolen))
  bg.print(white, 400, 780, String(cardNumber))
  bg.print(white16, 400, 825, String(iban))
  return bg.getBufferAsync(Jimp.MIME_JPEG)
}

const handler = async (m, { conn, args }) => {

  const who = m.sender
  const userName = m.pushName || 'Utente'

  const users = global.db.data.users

  if (!users[m.sender]) {
    users[m.sender] = {
      pin: null
    }
  }

  if (!users[who]) {
    users[who] = {
      money: 0,
      bank: 0,
      furti: 0,
      rubati: 0,
      datafurto: 'Nessuno',
      iban: null,
      card: null
    }
  }

  const me = users[m.sender]
  const user = users[who]

  if (!me.pin) {
    return m.reply(
      '🔐 Imposta prima un PIN con .impostapin'
    )
  }

  if (!args[0]) {
    return m.reply(
      '🔐 Scrivi il PIN così:\n.portafoglio 1234'
    )
  }

  if (args[0] !== me.pin) {
    return m.reply('❌ PIN ERRATO')
  }

  if (!user.card) {

    user.card = Array
      .from(
        { length: 16 },
        () => Math.floor(Math.random() * 10)
      )
      .join('')
      .replace(/(.{4})/g, '$1 ')
      .trim()
  }

  const money = Number(user.money) || 0
  const bank = Number(user.bank) || 0
  const stolen = Number(user.rubati) || 0

  const iban = user.iban ?? 'Non assegnato'

  const total = money + bank

  await conn.sendMessage(
    m.chat,
    {
      text:
`💳 Accesso alla carta...
👤 @${who.split('@')[0]}`,
      mentions: [who]
    },
    { quoted: m }
  )

  await new Promise(r => setTimeout(r, 2000))

  const cardImgPath = path.join(
    __dirname,
    '..',
    'icone',
    '888bank.jpg'
  )

  if (!fs.existsSync(cardImgPath)) {

    return conn.reply(
      m.chat,
`💳 *PORTAFOGLIO*

👤 @${who.split('@')[0]}
🏦 Banca: ${bank} 888COIN
👛 Tasca: ${money} 888COIN
💰 Totale: ${total.toLocaleString('it-IT')} 888COIN
🥷 Rubato: ${stolen} 888COIN
💳 Carta: ${user.card}
🏦 IBAN: ${iban}`,
      m
    )
  }

  try {

    const imgBuffer = await renderCard({
      userName,
      bank,
      wallet: money,
      stolen,
      cardNumber: user.card,
      iban,
      cardImg: cardImgPath
    })

    await conn.sendMessage(
      m.chat,
      {
        image: imgBuffer,
        mimetype: 'image/jpeg',
        caption: `💳 *${global?.nomebot || '888.BOT'}* — @${who.split('@')[0]}\n💰 Totale: ${total.toLocaleString('it-IT')} 888COIN`,
        mentions: [who]
      },
      { quoted: m }
    )

  } catch (e) {

    conn.reply(
      m.chat,
      `❌ Errore rendering: ${e.message}`,
      m
    )
  }
}

handler.command = /^portafoglio|budget|soldi|tasca|cash$/i

export default handler