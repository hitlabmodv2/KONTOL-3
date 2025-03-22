
import serialize from '../../lib/serialize.js';

const processedMessages = new Set();
const warnings = {};

function saveWarnings() {
    // Optional: Save warnings to persistent storage
}

export async function handleAntiTagStatus(Wilykun, m, store) {
    try {
        console.log('Anti Tag Status Check Started');
        console.log('Message Type:', m.mtype);
        console.log('Message Content:', JSON.stringify(m.message, null, 2));

        if (process.env.ENABLE_ANTI_TAG_STATUS !== 'true') {
            console.log('Anti Tag Status Feature is disabled');
            return;
        }

        if (!m.key.remoteJid.endsWith('@g.us')) {
            console.log('Not a group message, skipping');
            return;
        }

        const messageId = m.key.id;
        if (processedMessages.has(messageId)) {
            console.log('Message already processed, skipping');
            return;
        }
        
        console.log('Processing new message:', messageId);
        processedMessages.add(messageId);

        // Enhanced status tag detection
        const isTaggingInStatus = (
            m.mtype === 'groupStatusMentionMessage' ||
            m.mtype === 'messageContextInfo' ||
            (m.quoted && (m.quoted.mtype === 'groupStatusMentionMessage' || m.quoted.mtype === 'messageContextInfo')) ||
            (m.message && (m.message.groupStatusMentionMessage || m.message.messageContextInfo)) ||
            (m.message && m.message.protocolMessage && m.message.protocolMessage.type === 25) ||
            (m.message && m.message.extendedTextMessage && m.message.extendedTextMessage.contextInfo && m.message.extendedTextMessage.contextInfo.mentionedJid)
        );

        console.log('Is tagging in status:', isTaggingInStatus);

        if (!isTaggingInStatus) {
            console.log('No status tag detected, skipping');
            return;
        }

        console.log('Getting group metadata');
        const groupMetadata = await Wilykun.groupMetadata(m.key.remoteJid);
        const admins = groupMetadata.participants.filter(p => p.admin).map(p => p.id);
        const isSenderAdmin = admins.includes(m.key.participant);
        const botIsAdmin = admins.includes(Wilykun.user.id);

        console.log('Sender is admin:', isSenderAdmin);
        console.log('Bot is admin:', botIsAdmin);

        // Delete the message
        try {
            await Wilykun.sendMessage(m.key.remoteJid, { delete: m.key });
            console.log('Successfully deleted tagged status message');
        } catch (err) {
            console.error('Failed to delete message:', err);
        }

        if (isSenderAdmin) {
            console.log('Sending warning to admin');
            const warningMsg = `Grup ini terdeteksi ditandai dalam Status WhatsApp\n\n@${m.key.participant.split("@")[0]}, mohon untuk tidak menandai grup dalam status WhatsApp\n\nHal tersebut tidak diperbolehkan dalam grup ini.`;
            await Wilykun.sendMessage(m.key.remoteJid, { 
                text: warningMsg,
                mentions: [m.key.participant]
            });
        } else if (botIsAdmin) {
            console.log('Removing non-admin member');
            await Wilykun.groupParticipantsUpdate(m.key.remoteJid, [m.key.participant], "remove");
            const kickMsg = `@${m.key.participant.split("@")[0]} telah dikeluarkan dari grup karena menandai grup dalam status WhatsApp.`;
            await Wilykun.sendMessage(m.key.remoteJid, {
                text: kickMsg,
                mentions: [m.key.participant]
            });
        }

    } catch (error) {
        console.error('Error in handleAntiTagStatus:', error);
    }
}
