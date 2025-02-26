const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database/sqlite');
const config = require('../../config.json');

module.exports = {
    name: 'premium',
    description: 'Manage premium users and guilds',
    usage: 'premium <add/remove/guild/update/refresh> [user/guild] [duration]',
    category: 'premium',
    run: async (client, message, args) => {
        // Check if user is authorized to use premium commands
        if (!config.premiumManagers.includes(message.author.id)) {
            return message.reply('❌ You are not authorized to use premium commands!');
        }

        if (!args.length) {
            return message.reply(`Usage: ${module.exports.usage}`);
        }

        const subCommand = args[0].toLowerCase();
        const validSubCommands = ['add', 'remove', 'guild', 'update', 'refresh'];

        if (!validSubCommands.includes(subCommand)) {
            return message.reply('❌ Invalid sub-command! Available commands: add, remove, guild, update, refresh');
        }

        switch (subCommand) {
            case 'add':
                handlePremiumAdd(client, message, args);
                break;
            case 'remove':
                handlePremiumRemove(client, message, args);
                break;
            case 'guild':
                if (args[1]?.toLowerCase() === 'add') {
                    handleGuildPremiumAdd(client, message, args);
                } else if (args[1]?.toLowerCase() === 'remove') {
                    handleGuildPremiumRemove(client, message, args);
                } else {
                    message.reply('❌ Please specify add or remove for guild premium!');
                }
                break;
            case 'update':
                handlePremiumUpdate(client, message, args);
                break;
            case 'refresh':
                handlePremiumRefresh(client, message);
                break;
        }
    }
};

async function handlePremiumAdd(client, message, args) {
    if (args.length < 2) {
        return message.reply('❌ Please provide a user to add premium to!');
    }

    // Get user ID from mention or ID
    const userId = args[1].replace(/[<@!>]/g, '');
    let months = 1; // Default 1 month

    // Check if duration is specified
    if (args[2]) {
        const duration = args[2].toLowerCase();
        if (duration.endsWith('m')) {
            months = parseInt(duration.slice(0, -1));
            if (isNaN(months) || months < 1) {
                return message.reply('❌ Invalid duration! Format: Xm (e.g., 3m for 3 months)');
            }
        }
    }

    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + months);

    db.run(`INSERT OR REPLACE INTO premium_users (user_id, premium_since, expires_at) 
            VALUES (?, datetime('now'), datetime(?))`, 
        [userId, expiryDate.toISOString()],
        (err) => {
            if (err) {
                console.error('Database error:', err);
                return message.reply('❌ An error occurred while adding premium user!');
            }

            const embed = new EmbedBuilder()
                .setTitle('Premium Added')
                .setDescription(`✅ Added premium to <@${userId}> for ${months} month(s)`)
                .addFields(
                    { name: 'Expires', value: `<t:${Math.floor(expiryDate.getTime() / 1000)}:F>` }
                )
                .setColor('Green');

            message.reply({ embeds: [embed] });
        }
    );
}

async function handlePremiumRemove(client, message, args) {
    if (args.length < 2) {
        return message.reply('❌ Please provide a user to remove premium from!');
    }

    const userId = args[1].replace(/[<@!>]/g, '');

    db.run('DELETE FROM premium_users WHERE user_id = ?', [userId], (err) => {
        if (err) {
            console.error('Database error:', err);
            return message.reply('❌ An error occurred while removing premium user!');
        }

        const embed = new EmbedBuilder()
            .setTitle('Premium Removed')
            .setDescription(`✅ Removed premium from <@${userId}>`)
            .setColor('Red');

        message.reply({ embeds: [embed] });
    });
}

async function handleGuildPremiumAdd(client, message, args) {
    if (args.length < 3) {
        return message.reply('❌ Please provide a guild ID!');
    }

    const guildId = args[2];
    let months = args[3]?.toLowerCase().endsWith('m') ? parseInt(args[3].slice(0, -1)) : 1;

    if (isNaN(months) || months < 1) {
        months = 1;
    }

    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + months);

    db.run(`INSERT OR REPLACE INTO premium_guilds (guild_id, premium_since, expires_at) 
            VALUES (?, datetime('now'), datetime(?))`,
        [guildId, expiryDate.toISOString()],
        (err) => {
            if (err) {
                console.error('Database error:', err);
                return message.reply('❌ An error occurred while adding premium guild!');
            }

            const embed = new EmbedBuilder()
                .setTitle('Guild Premium Added')
                .setDescription(`✅ Added premium to guild \`${guildId}\` for ${months} month(s)`)
                .addFields(
                    { name: 'Expires', value: `<t:${Math.floor(expiryDate.getTime() / 1000)}:F>` }
                )
                .setColor('Green');

            message.reply({ embeds: [embed] });
        }
    );
}

async function handleGuildPremiumRemove(client, message, args) {
    if (args.length < 3) {
        return message.reply('❌ Please provide a guild ID!');
    }

    const guildId = args[2];

    db.run('DELETE FROM premium_guilds WHERE guild_id = ?', [guildId], (err) => {
        if (err) {
            console.error('Database error:', err);
            return message.reply('❌ An error occurred while removing premium guild!');
        }

        const embed = new EmbedBuilder()
            .setTitle('Guild Premium Removed')
            .setDescription(`✅ Removed premium from guild \`${guildId}\``)
            .setColor('Red');

        message.reply({ embeds: [embed] });
    });
}

async function handlePremiumUpdate(client, message, args) {
    if (args.length < 3) {
        return message.reply('❌ Please provide a user and new duration!');
    }

    const userId = args[1].replace(/[<@!>]/g, '');
    const duration = args[2].toLowerCase();

    if (!duration.endsWith('m')) {
        return message.reply('❌ Invalid duration! Format: Xm (e.g., 3m for 3 months)');
    }

    const months = parseInt(duration.slice(0, -1));
    if (isNaN(months) || months < 1) {
        return message.reply('❌ Invalid duration! Must be a positive number of months.');
    }

    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + months);

    db.run(`UPDATE premium_users 
            SET expires_at = datetime(?)
            WHERE user_id = ?`,
        [expiryDate.toISOString(), userId],
        (err) => {
            if (err) {
                console.error('Database error:', err);
                return message.reply('❌ An error occurred while updating premium duration!');
            }

            const embed = new EmbedBuilder()
                .setTitle('Premium Updated')
                .setDescription(`✅ Updated premium duration for <@${userId}>`)
                .addFields(
                    { name: 'New Expiry', value: `<t:${Math.floor(expiryDate.getTime() / 1000)}:F>` }
                )
                .setColor('Blue');

            message.reply({ embeds: [embed] });
        }
    );
}

async function handlePremiumRefresh(client, message) {
    // Remove expired premium users
    db.run(`DELETE FROM premium_users WHERE expires_at < datetime('now')`, (err) => {
        if (err) {
            console.error('Database error:', err);
            return message.reply('❌ An error occurred while refreshing premium database!');
        }

        // Remove expired premium guilds
        db.run(`DELETE FROM premium_guilds WHERE expires_at < datetime('now')`, (err) => {
            if (err) {
                console.error('Database error:', err);
                return message.reply('❌ An error occurred while refreshing premium guilds!');
            }

            const embed = new EmbedBuilder()
                .setTitle('Premium Refresh')
                .setDescription('✅ Successfully refreshed premium database!')
                .setFooter({ text: 'All expired premium entries have been removed' })
                .setColor('Green');

            message.reply({ embeds: [embed] });
        });
    });
} 