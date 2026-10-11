//Plugin by Elixir, Punisher & 888 staff
import {
  isOwnerJid,
  verifyGroupAdmin,
  verifyBotAdmin,
  isTargetProtected,
  resolveRole,
  ROLES
} from '../../lib/moderation.js'

let handler = async (m, { conn, text, isAdmin, isOwner, isROwner }) => {
    const role = resolveRole({ isOwner, isROwner, isAdmin })
    if (role !== ROLES.OWNER && role !== ROLES.ADMIN) {
        const fresh = await verifyGroupAdmin(conn, m.chat, m.sender)
        if (!fresh.ok) return m.reply('⛔ Solo admin e owner possono usare questo comando.')
    }

    const botCheck = await verifyBotAdmin(conn, m.chat)
    if (!botCheck.ok) return m.reply('⛔ Devo essere admin per retrocedere.')

    let users = []

    if (m.mentionedJid?.length) {
        users = [...m.mentionedJid]
    } else if (m.quoted?.sender) {
        users.push(m.quoted.sender)
    } else if (text) {
        let numbers = text.split(/\s+/).filter(v => v.length > 0)
        for (let number of numbers) {
            const digits = String(number).replace(/[^0-9]/g, '')
            if (digits.length >= 8 && digits.length <= 15) users.push(digits + '@s.whatsapp.net')
        }
    }

    if (users.length === 0) return

    for (let user of users) {
        if (isOwnerJid(user)) {
            await m.reply(`⛔ Impossibile retrocedere @${String(user).split('@')[0]}: owner protetto.`)
            continue
        }
        const protection = isTargetProtected({ target: user, actorRole: role, conn, chat: m.chat, participants: botCheck.metadata?.participants || [] })
        if (protection.protected && role !== ROLES.OWNER) {
            await m.reply(`⛔ Impossibile retrocedere @${String(user).split('@')[0]}: ${protection.reason}.`)
            continue
        }
        try {
            await conn.groupParticipantsUpdate(m.chat, [user], 'demote')
        } catch {
            await m.reply(`❌ Retrocessione fallita per @${String(user).split('@')[0]}.`)
        }
    }

    try { global.groupCache?.del?.(m.chat) } catch {}
    global.logAdmin?.increment?.(m.chat, m.sender, 'demotes', users.length)
}

handler.help = ['*593xxx*', '*@usuario*', '*responder chat*'].map(v => 'demote ' + v)
handler.tags = ['group']
handler.command = /^(demote|retrocedi|togliadmin|r)$/i
handler.group = true
handler.admin = true
handler.botAdmin = true

export default handler