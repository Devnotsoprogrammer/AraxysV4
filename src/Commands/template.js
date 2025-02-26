const { EmbedBuilder } = require('discord.js');
const db = require('../database/sqlite');

module.exports = {
    name: 'template',
    description: 'Template for premium commands',
    usage: 'premium templete',
    category: 'developer',
    run: async (client, message, args) => {
        try {
            // Premium Check Function
            checkPremium(message.author.id, message.guild.id, async (isPremium) => {
                if (!isPremium) {
                    return message.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setDescription('❌ This is a premium-only feature!')
                                .setColor('Red')
                                .setFooter({ text: 'Subscribe to premium to use this feature!' })
                        ]
                    });
                }

                // Your premium-only code here
                message.reply('✅ Premium feature accessed successfully!');
            });
        } catch (error) {
            console.error('Error in template command:', error);
            message.reply('An error occurred while executing the command!');
        }
    }
};

// Reusable Premium Check Function
function checkPremium(userId, guildId, callback) {
    db.get(`
        SELECT * FROM premium_users 
        WHERE user_id = ? AND expires_at > datetime('now')
        UNION
        SELECT pu.* FROM premium_users pu
        INNER JOIN premium_guilds pg ON pg.guild_id = ?
        WHERE pg.expires_at > datetime('now')
    `, [userId, guildId], (err, row) => {
        if (err) {
            console.error('Database error:', err);
            callback(false);
            return;
        }
        callback(!!row);
    });
} 