const { EmbedBuilder } = require('discord.js');
const db = require('../database/sqlite');

module.exports = {
    // Function to clean expired premium entries
    cleanExpiredPremium: function() {
        return new Promise((resolve, reject) => {
            db.serialize(() => {
                db.run('BEGIN TRANSACTION');

                // Remove expired premium users
                db.run(`DELETE FROM premium_users WHERE expires_at < datetime('now')`, (err) => {
                    if (err) {
                        db.run('ROLLBACK');
                        return reject(err);
                    }
                });

                // Remove expired premium guilds
                db.run(`DELETE FROM premium_guilds WHERE expires_at < datetime('now')`, (err) => {
                    if (err) {
                        db.run('ROLLBACK');
                        return reject(err);
                    }
                });

                db.run('COMMIT', (err) => {
                    if (err) {
                        db.run('ROLLBACK');
                        return reject(err);
                    }
                    resolve();
                });
            });
        });
    },

    // Function to get premium user count
    getPremiumUserCount: function() {
        return new Promise((resolve, reject) => {
            db.get(
                'SELECT COUNT(*) as count FROM premium_users WHERE expires_at > datetime("now")',
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row.count);
                }
            );
        });
    },

    // Function to get premium guild count
    getPremiumGuildCount: function() {
        return new Promise((resolve, reject) => {
            db.get(
                'SELECT COUNT(*) as count FROM premium_guilds WHERE expires_at > datetime("now")',
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row.count);
                }
            );
        });
    },

    // Function to check premium status
    checkPremium: function(userId, guildId) {
        return new Promise((resolve, reject) => {
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
                    reject(err);
                    return;
                }
                resolve(!!row);
            });
        });
    },

    // Premium error embed
    premiumEmbed: function() {
        return new EmbedBuilder()
            .setDescription('❌ This is a premium-only feature!')
            .setColor('Red')
            .setFooter({ text: 'Subscribe to premium to use this feature!' });
    },

    async isPremium(userId) {
        const user = await db.get('SELECT * FROM premium_users WHERE user_id = ? AND expires_at > datetime("now")',
            [userId]);
        return !!user;
    },

    async checkPremiumCommand(message, command) {
        if (!command.premium) return true;
        const isPremium = await this.isPremium(message.author.id);
        if (!isPremium) {
            message.reply('This command requires premium! Use `premium` command for info.');
            return false;
        }
        return true;
    }
};
