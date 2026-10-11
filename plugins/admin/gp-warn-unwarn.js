// Plugin by elixir, punisher & 888 staff
import {
  ROLES,
  LIMITS,
  resolveRole,
  resolveRoleOfJid,
  canUse,
  roleLabel,
  resolveTarget,
  isTargetProtected,
  recordAction,
  logModAction,
  checkUnwarnCooldown,
  markUnwarn,
  checkWarnCooldown,
  getWarnConfig,
  getWarnEntry,
  addWarn,
  removeWarn,
  resetWarns,
  applyMute,
  formatDuration,
  formatWarnDate,
  flushDbNow,
  isOwnerJid
} from '../../lib/moderation.js'
import { sendStaffReport } from '../utility/ticket.js'

const handler = async (msg, { conn, command, text, isOwner, isROwner, isAdmin, isMods, participants }) => {
  const role = resolveRole({ isOwner, isROwner, isAdmin, isMods })
  if (!canUse(role, ROLES.MOD)) {
    return conn.reply(msg.chat, '⛔ Questo comando è riservato allo staff (Moderatori/Admin/Owner).', msg)
  }

  const target = resolveTarget(msg, text || '')
  if (!target) {
    return conn.reply(msg.chat, '⚠️ Devi menzionare o rispondere a un utente.', msg)
  }

  const targetTag = `@${target.split('@')[0]}`
  const executorTag = `@${msg.sender.split('@')[0]}`
  const targetRole = resolveRoleOfJid(conn, msg.chat, target, participants)

  const protection = isTargetProtected({
    target,
    actorRole: role,
    participants,
    conn,
    chat: msg.chat
  })
  if (protection.protected) {
    return conn.reply(msg.chat, `ⓘ Sanzione non applicabile: ${protection.reason} (${roleLabel(protection.targetRole)}).`, msg)
  }

  const reason = String(text || '').replace(/@\d+/g, '').replace(/^\d+/, '').trim()

  const cfg = getWarnConfig(msg.chat)
  const cmd = String(command || '').toLowerCase()

  if (cmd === 'warn') {
    if (isOwnerJid(target)) {
      return conn.reply(msg.chat, '⛔ Impossibile applicare un avvertimento a un owner.', msg)
    }

    if (!reason || reason.length < 3) {
      return conn.reply(msg.chat, 'ℹ️ Inserisci una motivazione valida per ammonire l’utente.', msg)
    }

    const currentEntry = getWarnEntry(msg.chat, target)
    const current = Number(currentEntry?.count) || 0
    const nextWarn = current + 1

    if (role === ROLES.MOD && nextWarn > cfg.modMax) {
      logModAction({
        role,
        actor: msg.sender,
        action: 'warn BLOCCATO',
        target,
        extra: `limite moderatori ${cfg.modMax}/${cfg.max}`
      })
      return conn.sendMessage(msg.chat, {
        text:
          `⚠️ *Limite moderatori raggiunto*\n` +
          `👤 Target: ${targetTag}\n` +
          `📊 Sanzioni attuali: [ ${current}/${cfg.max} ]\n\n` +
          `🛑 I moderatori non possono assegnare il ${cfg.max}° avvertimento.\n` +
          `⏳ Attendi la decisione di un Admin/Owner.`,
        mentions: [target]
      }, { quoted: msg })
    }

    const wcd = checkWarnCooldown(msg.chat, msg.sender, role)
    if (!wcd.ok) {
      logModAction({ role, actor: msg.sender, action: 'warn BLOCCATO', target, extra: wcd.reason })
      return conn.sendMessage(msg.chat, {
        text: `${wcd.message}\n👤 Target: ${targetTag}`,
        mentions: [target]
      }, { quoted: msg })
    }

    const res = addWarn({ chat: msg.chat, target, reason, actor: msg.sender, role })
    recordAction({ chat: msg.chat, actor: msg.sender, action: 'warn', target, role, detail: reason })
    logModAction({ role, actor: msg.sender, action: 'warn', target, extra: `${res.count}/${cfg.max} id:${res.item.id}` })

    if (res.escalate) {
      resetWarns({ chat: msg.chat, target })
      await flushDbNow()
      await conn.sendMessage(msg.chat, {
        text:
          `❌ *UTENTE ESPULSO*\n` +
          `👤 Target: ${targetTag}\n` +
          `⚙️ Azione: Rimozione automatica\n` +
          `⛔ Motivo: Ha raggiunto ${cfg.max} avvertimenti\n` +
          `📝 Ultimo motivo: ${reason}`,
        mentions: [target]
      })
      await new Promise(resolve => setTimeout(resolve, 1000))
      try {
        await conn.groupParticipantsUpdate(msg.chat, [target], 'remove')
      } catch {}
      sendStaffReport(conn, {
        text: `❌ *ESPULSIONE AUTOMATICA WARN*\n👤 @${target.split('@')[0]}\n🏠 Chat: ${msg.chat}\n📝 Ultimo motivo: ${reason}\n👑 Eseguito da: @${msg.sender.split('@')[0]} ${roleLabel(role)}`,
        mentions: [target, msg.sender]
      }).catch(() => {})
      return
    }

    let muteNote = ''
    if (res.mute) {
      try {
        const mr = applyMute({ chat: msg.chat, target, actor: msg.sender, role, durationMs: cfg.muteMs })
        recordAction({ chat: msg.chat, actor: msg.sender, action: 'mute', target, role, detail: `auto al ${cfg.muteAt}° warn` })
        muteNote = `\n🔇 Mute automatico: ${formatDuration(mr.ms)} (al ${cfg.muteAt}° warn).`
      } catch {}
    }

    const warnLimitLabel = role === ROLES.MOD
      ? `${res.count}/${cfg.modMax} (limite moderatori)`
      : `${res.count}/${cfg.max}`

    const riskNote = res.count >= cfg.max - 1
      ? `\n⛔ Al prossimo warn verrai espulso.`
      : ''

    return conn.sendMessage(msg.chat, {
      text:
        `⚠️ *AVVERTIMENTO*\n` +
        `👤 Target: ${targetTag}\n` +
        `👑 Eseguito da: ${executorTag} ${roleLabel(role)}\n` +
        `📊 Sanzioni: [ ${warnLimitLabel} ]\n` +
        `🆔 ID: ${res.item.id} • ${formatWarnDate(res.item.at)}\n` +
        `📝 Motivo: ${reason}${muteNote}${riskNote}\n\n` +
        `⮕ Al ${cfg.max}° avvertimento l'utente verrà espulso dal gruppo.`,
      mentions: [target, msg.sender]
    }, { quoted: msg })
  }

  if (cmd === 'unwarn') {
    const entry = getWarnEntry(msg.chat, target)
    if (!entry || !(Number(entry.count) || 0)) {
      return conn.reply(msg.chat, 'ℹ️ L’utente non ha sanzioni attive.', msg)
    }

    const arg = String(reason || '').trim()
    if (arg.toLowerCase() === 'all' || arg === '*') {
      if (role !== ROLES.ADMIN && role !== ROLES.OWNER) {
        return conn.reply(msg.chat, '⛔ Solo Admin/Owner possono usare `.unwarn @user all`.', msg)
      }
    }

    const cooldown = checkUnwarnCooldown(msg.chat, msg.sender, role)
    if (!cooldown.ok) {
      logModAction({ role, actor: msg.sender, action: 'unwarn BLOCCATO', target, extra: 'cooldown attivo' })
      return conn.sendMessage(msg.chat, {
        text: `${cooldown.message}\n👤 Target: ${targetTag}`,
        mentions: [target]
      }, { quoted: msg })
    }

    if (arg.toLowerCase() === 'all' || arg === '*') {
      const r = resetWarns({ chat: msg.chat, target })
      markUnwarn(msg.chat, msg.sender)
      recordAction({ chat: msg.chat, actor: msg.sender, action: 'unwarn', target, role, detail: `reset totale (${r.removed})` })
      logModAction({ role, actor: msg.sender, action: 'unwarn', target, extra: `reset ${r.removed} -> 0/${cfg.max}` })
      await flushDbNow()
      return conn.sendMessage(msg.chat, {
        text:
          `✅ *TUTTE LE SANZIONI REVOCATE*\n` +
          `👤 Target: ${targetTag}\n` +
          `👑 Eseguito da: ${executorTag} ${roleLabel(role)}\n` +
          `📊 Rimosse: *${r.removed}* — ora [ 0/${cfg.max} ]`,
        mentions: [target, msg.sender]
      }, { quoted: msg })
    }

    const r = removeWarn({ chat: msg.chat, target, id: arg || null })
    if (!r.ok) {
      const list = (entry.list || []).map(w => `• ${w.id} — ${String(w.reason || '').slice(0, 40)}`).join('\n')
      return conn.sendMessage(msg.chat, {
        text: `❌ ID non trovato.\n📋 ID validi:\n${list}\n\nUso: \`.unwarn @user <ID>\` oppure \`.unwarn @user\` per l'ultimo.`,
        mentions: [target]
      }, { quoted: msg })
    }
    markUnwarn(msg.chat, msg.sender)
    recordAction({ chat: msg.chat, actor: msg.sender, action: 'unwarn', target, role, detail: `revocato ${r.removed?.id || ''} ${r.removed?.reason || ''}`.trim() })
    logModAction({ role, actor: msg.sender, action: 'unwarn', target, extra: `${r.count}/${cfg.max}` })

    return conn.sendMessage(msg.chat, {
      text:
        `✅ *SANZIONE REVOCATA*\n` +
        `👤 Target: ${targetTag}\n` +
        `👑 Eseguito da: ${executorTag} ${roleLabel(role)}\n` +
        `🆔 Rimosso: ${r.removed?.id || 'ultimo'} — ${String(r.removed?.reason || '').slice(0, 80)}\n` +
        `📊 Sanzioni rimanenti: [ ${r.count}/${cfg.max} ]\n\n` +
        `⮕ Un avvertimento è stato rimosso.`,
      mentions: [target, msg.sender]
    }, { quoted: msg })
  }

  if (cmd === 'resetwarn' || cmd === 'clearwarn') {
    if (role !== ROLES.ADMIN && role !== ROLES.OWNER) {
      return conn.reply(msg.chat, '⛔ Solo Admin/Owner possono azzerare tutti i warn.', msg)
    }
    const entry = getWarnEntry(msg.chat, target)
    if (!entry || !(Number(entry.count) || 0)) {
      return conn.reply(msg.chat, 'ℹ️ L’utente non ha sanzioni attive.', msg)
    }
    const r = resetWarns({ chat: msg.chat, target })
    recordAction({ chat: msg.chat, actor: msg.sender, action: 'unwarn', target, role, detail: `resetwarn (${r.removed})` })
    logModAction({ role, actor: msg.sender, action: 'resetwarn', target, extra: `rimossi ${r.removed}` })
    await flushDbNow()
    return conn.sendMessage(msg.chat, {
      text:
        `🧹 *WARN AZZERATI*\n` +
        `👤 Target: ${targetTag}\n` +
        `👑 Da: ${executorTag} ${roleLabel(role)}\n` +
        `📊 Rimosse: *${r.removed}* sanzioni.`,
      mentions: [target, msg.sender]
    }, { quoted: msg })
  }
}

handler.help = ['warn @user motivo', 'unwarn @user [ID|all]', 'resetwarn @user']
handler.tags = ['admin']
handler.command = /^(warn|unwarn|resetwarn|clearwarn)$/i
handler.group = true
handler.mods = true
handler.botAdmin = true

export default handler