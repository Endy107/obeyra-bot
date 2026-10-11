// Plugin by elixir
import {
  ROLES,
  resolveRole,
  canUse,
  roleLabel,
  resolveTarget,
  logModAction,
  getWarnEntry,
  getWarnConfig,
  formatWarnDate
} from '../../lib/moderation.js'

let handler = async (m, { conn, text, isOwner, isROwner, isAdmin, isMods }) => {
  const role = resolveRole({ isOwner, isROwner, isAdmin, isMods })
  if (!canUse(role, ROLES.MOD)) {
    return conn.reply(m.chat, '⛔ Questo comando è riservato allo staff (Moderatori/Admin/Owner).', m)
  }
  const target = resolveTarget(m, text || '')
  if (!target) return conn.reply(m.chat, '⚠️ Devi menzionare o rispondere a un utente.', m)
  const cfg = getWarnConfig(m.chat)
  const entry = getWarnEntry(m.chat, target)
  logModAction({ role, actor: m.sender, action: 'warninfo', target, extra: `${entry?.count || 0}/${cfg.max}` })
  if (!entry || !(entry.count || 0)) {
    return conn.sendMessage(m.chat, {
      text: `✅ @${target.split('@')[0]} non ha warn attivi in questo gruppo.\n📊 [ 0/${cfg.max} ]`,
      mentions: [target]
    }, { quoted: m })
  }
  const lines = (entry.list || []).map((w, i) =>
    `${i + 1}. 🆔 *${w.id}* — ${formatWarnDate(w.at)}\n   👑 @${String(w.by || '').split('@')[0]} ${w.byRole ? `[${String(w.byRole).toUpperCase()}]` : ''}\n   📝 ${String(w.reason || '').slice(0, 120)}`
  ).join('\n\n')
  return conn.sendMessage(m.chat, {
    text:
      `⚠️ *WARN INFO*\n` +
      `👤 @${target.split('@')[0]} — [ ${entry.count}/${cfg.max} ] (totale storico: ${entry.total || entry.count})\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n\n${lines}\n\n━━━━━━━━━━━━━━━━━━━━━━\n` +
      `💡 Rimuovi: *.unwarn @user <ID>* • Tutti (Admin): *.unwarn @user all*\n` +
      `👤 Richiesto da ${roleLabel(role)}`,
    mentions: [target, ...((entry.list || []).map(w => w.by).filter(Boolean))]
  }, { quoted: m })
}

handler.help = ['warninfo @user']
handler.tags = ['admin']
handler.command = /^(warninfo|infowarn|mywarn|warnsinfo)$/i
handler.group = true
handler.mods = true

export default handler