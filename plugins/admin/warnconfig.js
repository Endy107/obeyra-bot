// Plugin by elixir
import {
  ROLES,
  resolveRole,
  canUse,
  logModAction,
  getWarnConfig,
  setWarnConfig,
  flushDbNow
} from '../../lib/moderation.js'

let handler = async (m, { conn, text, isOwner, isROwner, isAdmin }) => {
  const role = resolveRole({ isOwner, isROwner, isAdmin, isMods: false })
  if (!canUse(role, ROLES.ADMIN)) {
    return conn.reply(m.chat, '⛔ Solo Admin/Owner possono configurare i warn.', m)
  }
  const cfg = getWarnConfig(m.chat)
  const args = String(text || '').trim()
  if (!args) {
    return conn.reply(m.chat,
      `⚙️ *WARN CONFIG*\n` +
      `• max: *${cfg.max}* (kick automatico)\n` +
      `• modMax: *${cfg.modMax}* (limite MOD)\n` +
      `• expireDays: *${cfg.expireDays}* (0 = mai)\n` +
      `• muteAt: *${cfg.muteAt}* + muteMs: *${cfg.muteMs / 60000}min*\n\n` +
      `Uso: \`.warnconfig max 5 | modMax 4 | expireDays 60 | muteAt 3 | muteMs 300000\``,
      m)
  }
  const patch = {}
  for (const part of args.split(/[,\n]+/)) {
    const mm = part.trim().match(/^(max|modmax|expiredays|muteat|mutems)\s+(\d+)/i)
    if (mm) {
      const k = mm[1].toLowerCase()
      patch[k === 'modmax' ? 'modMax' : k === 'expiredays' ? 'expireDays' : k === 'muteat' ? 'muteAt' : k === 'mutems' ? 'muteMs' : 'max'] = Number(mm[2])
    }
  }
  if (!Object.keys(patch).length) {
    return conn.reply(m.chat, '❌ Nessun parametro valido. Es: `.warnconfig max 5 expireDays 30`', m)
  }
  const next = setWarnConfig(m.chat, patch)
  logModAction({ role, actor: m.sender, action: 'warnconfig', extra: JSON.stringify(patch) })
  await flushDbNow()
  return conn.reply(m.chat, `✅ *Warn config aggiornata*\n• max: *${next.max}*\n• modMax: *${next.modMax}*\n• expireDays: *${next.expireDays}*\n• muteAt: *${next.muteAt}* (${next.muteMs / 60000}min)`, m)
}

handler.help = ['warnconfig']
handler.tags = ['admin']
handler.command = /^(warnconfig|warnsettings|setwarn)$/i
handler.group = true
handler.admin = true

export default handler