// Plugin by the punisher
import {
  ROLES,
  recordAction,
  logModAction,
  getWarnConfig,
  addWarn,
  resetWarns,
  formatWarnDate,
  flushDbNow,
  isOwnerJid
} from '../../lib/moderation.js'
import { sendStaffReport } from '../utility/ticket.js'

export async function before(m, { conn, isAdmin, isBotAdmin, isOwner, isROwner, isMods }) {
  const isMine = conn.user && (conn.user.jid || conn.user.id) &&
    typeof conn.decodeJid === 'function' &&
    conn.decodeJid(m.sender) === conn.decodeJid(conn.user.jid || conn.user.id)
  if (isMine) return true;
  if (m.isBaileys && m.fromMe) return true;
  if (!m.isGroup) return false;

  const chat = global.db.data.chats[m.chat];
  if (!chat || !chat.antilinktiktok || chat.isBanned) return true;

  if (isAdmin || isOwner || isROwner || isMods || isOwnerJid(m.sender)) return true;
  if (!isBotAdmin) return true;

  const text = (m.text || '').toLowerCase();
  const tiktokRegex = /(tiktok\.com|vm\.tiktok\.com)/i;
  if (!tiktokRegex.test(text)) return true;

  const target = m.sender;
  const targetTag = `@${target.split('@')[0]}`;
  const botJid = conn.decodeJid(conn.user.jid || conn.user.id);
  const reason = 'Link TikTok non consentito (antilink)';
  const cfg = getWarnConfig(m.chat);

  try {
    await conn.sendMessage(m.chat, {
      delete: {
        remoteJid: m.chat,
        fromMe: false,
        id: m.key.id,
        participant: m.sender
      }
    });
  } catch (e) {
    console.error('[antilinktiktok] Errore eliminazione messaggio:', e || 'Errore non specificato');
  }

  const res = addWarn({ chat: m.chat, target, reason, actor: botJid, role: ROLES.ADMIN });
  recordAction({ chat: m.chat, actor: botJid, action: 'warn', target, role: ROLES.ADMIN, detail: reason });
  logModAction({ role: ROLES.ADMIN, actor: botJid, action: 'warn (antilinktiktok)', target, extra: `${res.count}/${cfg.max} id:${res.item.id}` });

  if (res.escalate) {
    resetWarns({ chat: m.chat, target });
    await flushDbNow();

    await conn.sendMessage(m.chat, {
      text:
        `❌ *UTENTE ESPULSO*\n` +
        `👤 Target: ${targetTag}\n` +
        `⚙️ Azione: Rimozione automatica\n` +
        `⛔ Motivo: Ha raggiunto ${cfg.max} avvertimenti\n` +
        `📝 Ultimo motivo: ${reason}`,
      mentions: [target]
    });

    await new Promise(resolve => setTimeout(resolve, 1000));
    try {
      await conn.groupParticipantsUpdate(m.chat, [target], 'remove');
    } catch (e) {
      console.error('[antilinktiktok] Errore rimozione partecipante:', e || 'Errore non specificato');
    }

    sendStaffReport(conn, {
      text: `❌ *ESPULSIONE AUTOMATICA WARN*\n👤 ${targetTag}\n🏠 Chat: ${m.chat}\n📝 Ultimo motivo: ${reason}\n🤖 Eseguito da: antilinktiktok`,
      mentions: [target]
    }).catch(() => {});

    return false;
  }

  const riskNote = res.count >= cfg.max - 1
    ? `\n⛔ Al prossimo warn verrai espulso.`
    : '';

  await conn.sendMessage(m.chat, {
    text:
      `⚠️ *AVVERTIMENTO*\n` +
      `👤 Target: ${targetTag}\n` +
      `🤖 Eseguito da: Antilink TikTok\n` +
      `📊 Sanzioni: [ ${res.count}/${cfg.max} ]\n` +
      `🆔 ID: ${res.item.id} • ${formatWarnDate(res.item.at)}\n` +
      `📝 Motivo: ${reason}${riskNote}\n\n` +
      `⮕ Al ${cfg.max}° avvertimento l'utente verrà espulso dal gruppo.`,
    mentions: [target]
  });

  return false;
                                         }