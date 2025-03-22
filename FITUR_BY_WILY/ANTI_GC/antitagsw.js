
import serialize from '../../lib/serialize.js';

const processedMessages = new Set();
const warnings = {};

function saveWarnings() {
    // Optional: Save warnings to persistent storage
}

export async function handleAntiTagStatus(Wilykun, m, store) {
    if (process.env.ENABLE_ANTI_TAG_STATUS === 'true' && m.key.remoteJid.endsWith('@g.us')) {
        const messageId = m.key.id;
        if (processedMessages.has(messageId)) return;
        processedMessages.add(messageId);

        const isTaggingInStatus = (
            m.mtype === 'groupStatusMentionMessage' || 
            (m.quoted && m.quoted.mtype === 'groupStatusMentionMessage') ||
            (m.message && m.message.groupStatusMentionMessage) ||
            (m.message && m.message.protocolMessage && m.message.protocolMessage.type === 25)
        );

        if (!isTaggingInStatus) return;

        const groupMetadata = await Wilykun.groupMetadata(m.key.remoteJid);
        const admins = groupMetadata.participants.filter(p => p.admin).map(p => p.id);
        const isSenderAdmin = admins.includes(m.key.participant);
        const botIsAdmin = admins.includes(Wilykun.user.id);

        // Delete the message
        await Wilykun.sendMessage(m.key.remoteJid, { delete: m.key });

        if (isSenderAdmin) {
            // For admins, just send a warning
            const warningMsg = `Grup ini terdeteksi ditandai dalam Status WhatsApp\n\n@${m.key.participant.split("@")[0]}, mohon untuk tidak menandai grup dalam status WhatsApp\n\nHal tersebut tidak diperbolehkan dalam grup ini.`;
            await Wilykun.sendMessage(m.key.remoteJid, { 
                text: warningMsg,
                mentions: [m.key.participant]
            });
        } else if (botIsAdmin) {
            // For non-admins, remove them if bot is admin
            await Wilykun.groupParticipantsUpdate(m.key.remoteJid, [m.key.participant], "remove");
            const kickMsg = `@${m.key.participant.split("@")[0]} telah dikeluarkan dari grup karena menandai grup dalam status WhatsApp.`;
            await Wilykun.sendMessage(m.key.remoteJid, {
                text: kickMsg,
                mentions: [m.key.participant]
            });
        }
    }
}
