
import serialize from '../../lib/serialize.js';

const processedMessages = new Set();
const warnings = {};

function saveWarnings() {
    // Optional: Save warnings to persistent storage
}

export async function handleAntiTagStatus(Wilykun, m, store) {
    try {
        console.log('Anti Tag Status Check Started');
        const messageType = m.message ? Object.keys(m.message)[0] : 'undefined';
        console.log('Message Type:', messageType);
        
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

        if (!isTaggingInStatus) {
            console.log('No status tag detected, skipping');
            return;
        }

        const groupMetadata = await Wilykun.groupMetadata(m.key.remoteJid);
        const admins = groupMetadata.participants.filter(p => p.admin).map(p => p.id);
        const isSenderAdmin = admins.includes(m.key.participant);
        const botIsAdmin = admins.includes(Wilykun.user.id);

        // Immediately try to delete the message with retries
        let deleteRetries = 0;
        const maxDeleteRetries = 3;
        
        while (deleteRetries < maxDeleteRetries) {
            try {
                await Wilykun.sendMessage(m.key.remoteJid, { 
                    delete: m.key
                });
                console.log('Successfully deleted tagged status message');
                break;
            } catch (err) {
                console.error(`Delete attempt ${deleteRetries + 1} failed:`, err);
                deleteRetries++;
                if (deleteRetries < maxDeleteRetries) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }

        // Kick user if bot is admin and user is not admin
        if (!isSenderAdmin && botIsAdmin) {
            try {
                await Wilykun.groupParticipantsUpdate(m.key.remoteJid, [m.key.participant], "remove");
                await Wilykun.sendMessage(m.key.remoteJid, {
                    text: `🚫 @${m.key.participant.split("@")[0]} telah dikeluarkan dari grup karena menandai grup dalam status.`,
                    mentions: [m.key.participant]
                });
                console.log(`Successfully kicked user ${m.key.participant}`);
            } catch (error) {
                console.error('Failed to kick user:', error);
            }
        } else if (isSenderAdmin) {
            // For admins, send a warning
            await Wilykun.sendMessage(m.key.remoteJid, { 
                text: `⚠️ *PERINGATAN ADMIN*\n\n@${m.key.participant.split("@")[0]}, mohon untuk tidak menandai grup dalam status WhatsApp\n\nHal tersebut tidak diperbolehkan dalam grup ini.`,
                mentions: [m.key.participant]
            });
        } else if (botIsAdmin) {
            // For non-admins, immediately kick
            try {
                await Wilykun.groupParticipantsUpdate(m.key.remoteJid, [m.key.participant], "remove");
                await Wilykun.sendMessage(m.key.remoteJid, {
                    text: `🚫 @${m.key.participant.split("@")[0]} telah dikeluarkan dari grup karena menandai grup dalam status WhatsApp.`,
                    mentions: [m.key.participant]
                });
                console.log(`Successfully kicked user ${m.key.participant}`);
            } catch (error) {
                console.error('Failed to kick user:', error);
            }
        }

    } catch (error) {
        console.error('Error in handleAntiTagStatus:', error);
    }
}
