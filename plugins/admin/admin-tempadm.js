// Plugin by elixir, punisher & 888 staff




const handler = async (m, { conn, text, usedPrefix, command, isAdmin, isOwner, isROwner }) => {
  const { verifyGroupAdmin, verifyBotAdmin, isOwnerJid } = await import('../../lib/moderation.js')
  let adminNow = !!(isAdmin || isOwner || isROwner)
  if (!adminNow) {
    const fresh = await verifyGroupAdmin(conn, m.chat, m.sender)
    adminNow = fresh.ok
  }
  const ownerNow = !!(isOwner || isROwner) || isOwnerJid(m.sender)

  if (!adminNow && !ownerNow) {
    return m.reply(`*❌ Accesso Negato*\nSolo gli admin reali possono usare questo comando.`);
  }

  let who;
  if (m.isGroup) who = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : false;
  else who = m.chat;

  if (!who) return m.reply(`*⚠️ Tagga un utente o rispondi a un messaggio.*`);

  const match = text.match(/(\d+)\s*([smhd])/i);
  if (!match) return m.reply(`*⚠️ Esempio: ${usedPrefix + command} @tag 1m*`);

  const duration = parseInt(match[1]);
  const unit = match[2].toLowerCase();

  let timer;
  if (unit === 's') timer = duration * 1000;
  else if (unit === 'm') timer = duration * 60 * 1000;
  else if (unit === 'h') timer = duration * 60 * 60 * 1000;
  else if (unit === 'd') timer = duration * 24 * 60 * 60 * 1000;

  const name = '@' + who.split`@`[0];
  const chat = m.chat;

  const botCheck = await verifyBotAdmin(conn, chat)
  if (!botCheck.ok) return m.reply('*❌ Errore:* Assicurati che il bot sia Admin.')

  if (isOwnerJid(who)) return m.reply('*⛔ Non puoi promuovere un owner del bot.*')

  try {
    await conn.groupParticipantsUpdate(chat, [who], 'promote');
    try { global.groupCache?.del?.(chat) } catch {}

    await conn.sendMessage(chat, { 
      text: `*⚡ ADMIN TEMPORANEO*\n\n*👤 Utente:* ${name}\n*⏳ Durata:* ${duration}${unit}\n\n_Rimozione automatica attiva._`,
      mentions: [who]
    }, { quoted: m });

    setTimeout(async () => {
      try {
        await conn.groupParticipantsUpdate(chat, [who], 'demote');
        try { global.groupCache?.del?.(chat) } catch {}
        await conn.sendMessage(chat, { 
          text: `*⏰ TEMPO SCADUTO*\n\nL'utente ${name} non è più Admin.`,
          mentions: [who]
        });
      } catch (err) {
        console.error(err);
      }
    }, timer);

  } catch (e) {
    m.reply('*❌ Errore:* Assicurati che il bot sia Admin.');
  }
};

handler.help = ['tempadm @user <tempo>'];
handler.tags = ['group'];
handler.command = ['tempadm', 'tempadmin'];
handler.group = true;
handler.admin = true;
handler.botAdmin = true;

export default handler;