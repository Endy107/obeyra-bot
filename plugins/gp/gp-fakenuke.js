// Plugin by elixir
const { default: pkg } = await import('../../package.json', { with: { type: 'json' } });
import fs from 'fs'

const wait = ms => new Promise(r => setTimeout(r, ms))

async function forceDescription(conn, jid, text) {
    try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 3500)

        const res = await conn.query({
            tag: 'iq',
            attrs: {
                to: jid,
                type: 'set',
                xmlns: 'w:g2'
            },
            content: [{
                tag: 'description',
                attrs: {},
                content: Buffer.from(text, 'utf-8')
            }]
        }, { signal: controller.signal })

        clearTimeout(timeout)
        return res

    } catch (e) {
        console.log("[forceDescription] RAW IQ fallita → fallback metadata API")

        try {
            await conn.groupUpdateDescription(jid, text)
        } catch (err) {
            console.log("[forceDescription] fallback fallito:", err)
        }
    }
}

async function safeUpdate(fn, ...args) {
    try {
        return await fn(...args)
    } catch (e) {
        const code = e?.data || e?.output?.statusCode || String(e)

        if (String(code).includes("409")) {
            console.log("[WARN] Conflict 409 → retry in 1500ms")
            await wait(1500)
            return await fn(...args)
        }

        if (String(code).includes("Timed Out")) {
            console.log("[WARN] Timeout → retry in 2000ms")
            await wait(2000)
            return await fn(...args)
        }

        console.log("[ERROR safeUpdate]", e)
        throw e
    }
}

let handler = async (m, { conn, command }) => {
    const chat = global.db.data.chats[m.chat] || {}

    if (command === 'nuke') {
        const metadata = await conn.groupMetadata(m.chat)

        chat.oldName = metadata.subject
        chat.oldDesc = metadata.desc || "Nessuna descrizione"
        global.db.data.chats[m.chat] = chat

        const newName = `☣️ SYSTEM FAILURE | ${chat.oldName}`

        await safeUpdate(conn.groupUpdateSubject.bind(conn), m.chat, newName)
        await wait(1200)

        await forceDescription(
            conn,
            m.chat,
            "⚡ CONTROLLO ACQUISITO DA 𝟴𝟴𝟴 BOT ⚡"
        )
        await wait(1200)

        await safeUpdate(conn.groupSettingUpdate.bind(conn), m.chat, 'announcement')
        await wait(1200)

        const code = await conn.groupInviteCode(m.chat)
        const link = `https://chat.whatsapp.com/${code}`

        const participants = metadata.participants.map(u => u.id)

        await conn.sendMessage(
            m.chat,
            {
                video: fs.readFileSync('./media/fakenuke.mp4'),
                caption: "⚠️ *CRITICAL ERROR: NUKE IN CORSO...*"
            },
            { quoted: m }
        )

        await wait(2000)

        const nukeMsg = `
⚡ ─── ╳ ${pkg.name} ╳ ─── ⚡

☣️ *CHAT WIPED SUCCESSFULLY*
━━━━━━━━━━━━━━━━━━━━━━━━━━
↳ _Tutti i dati precedenti sono stati sovrascritti._

📢 *UNISCITI AL QUARTIER GENERALE:*
🔗 ${link}

⚠️ _System Hacked by ${pkg.name}_
━━━━━━━━━━━━━━━━━━━━━━━━━━
`.trim()

        await conn.sendMessage(
            m.chat,
            {
                text: nukeMsg,
                mentions: participants
            },
            { quoted: m }
        )
    }

    if (command === 'resuscita') {
        if (!chat.oldName) {
            return m.reply("❌ *[ERROR]:* Nessun backup rilevato per questa chat.")
        }

        await safeUpdate(conn.groupUpdateSubject.bind(conn), m.chat, chat.oldName)
        await wait(1200)

        await forceDescription(conn, m.chat, chat.oldDesc)
        await wait(1200)

        await safeUpdate(conn.groupSettingUpdate.bind(conn), m.chat, 'not_announcement')

        const resMsg = `
🔄 *BACKUP RESTORE COMPLETE*
━━━━━━━━━━━━━━━━━━━━━━━━━━
⚙️ _Nome e descrizione ripristinati._
🔓 _I canali di comunicazione sono di nuovo aperti._
━━━━━━━━━━━━━━━━━━━━━━━━━━
`.trim()

        m.reply(resMsg)
    }
}

handler.help = ['nuke', 'resuscita']
handler.tags = ['owner']
handler.command = ['nuke', 'resuscita']

handler.group = true
handler.owner = true

export default handler