const { SnowflakeUtil, EmbedBuilder, WebhookClient, Client, GatewayIntentBits } = require('discord.js');
const { isMainThread } = require('worker_threads');

const memoryLogger = new WebhookClient({
    url: 'https://discord.com/api/webhooks/1217308163016233103/P75IMICLgYQYcSL4bYHaBggcyZrBZqimz39r5RLRPpVJwAShA2bg0dNaun1uoLCpdpU3'
});

const THRESHOLD = 60 * 60 * 1000; // 60 minutes (adjust as needed)

class MemorySweeper {
    constructor(client) {
        this.client = client;
        this.task = null;
    }

    setup() {
        this.clearTask(); // Ensure any existing tasks are cleared
        this.run();
        this.task = setInterval(() => this.run(), 60 * 1000); // 60 seconds interval
    }

    clearTask() {
        if (this.task) {
            clearInterval(this.task);
            this.task = null;
        }
    }

    run() {
        const OLD_SNOWFLAKE = SnowflakeUtil.generate(Date.now() - THRESHOLD);
        let guildMembers = 0,
            lastMessages = 0,
            emojis = 0,
            voiceStates = 0,
            users = 0;

        let oldMemoryUsage = process.memoryUsage().heapUsed;

        // Per-Guild sweeper
        for (const guild of this.client.guilds.cache.values()) {
            if (!guild.available) continue;

            // Clear members that haven't sent a message in the last 30 minutes
            for (const [id, member] of guild.members.cache) {
                if (member.id === this.client.user.id) continue;

                if (member.voice.channelId && member.user.bot)
                    guild.voiceStates.cache.delete(id);
                if (member.lastMessageId && member.lastMessageId > OLD_SNOWFLAKE)
                    guild.members.cache.delete(id);

                guildMembers++;
                voiceStates++;
            }

            // Clear emojis
            if (guild.id !== '1180427110200905798') { // don't clear support guild's emojis
                emojis += guild.emojis.cache.size;
                guild.emojis.cache.clear();
            }
        }

        // Per-Channel sweeper
        for (const channel of this.client.channels.cache.values()) {
            if (!channel.lastMessageId) continue;
            channel.lastMessageId = null;
            lastMessages++;
        }

        // Per-User sweeper
        for (const user of this.client.users.cache.values()) {
            if (user.lastMessageId && user.lastMessageId > OLD_SNOWFLAKE)
                continue;
            this.client.users.cache.delete(user.id);
            users++;
        }

        if (this.client.user.tag !== 'Satxler#7940') return;

        const embed = new EmbedBuilder()
            .setTitle(`Memory Sweeper`)
            .setColor(this.client.color)
            .setDescription(
                `**Cache swept:**\n` +
                `Guild Members: \`${guildMembers}\`\n` +
                `Users: \`${users}\`\n` +
                `Emojis: \`${emojis}\`\n` +
                `Voice States: \`${voiceStates}\`\n` +
                `Messages: \`${lastMessages}\``
            )
            .addFields(
                {
                    name: 'Memory Swept:',
                    value: `\`${this.formatBytes(process.memoryUsage().heapUsed - oldMemoryUsage)}\``,
                    inline: true
                },
                {
                    name: 'Memory Usage:',
                    value: `\`${this.formatBytes(process.memoryUsage().heapUsed)}\``,
                    inline: true
                }
            );

        memoryLogger.send({ embeds: [embed] }).catch(() => null);
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024,
            dm = 2,
            sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'],
            i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }
}

module.exports = MemorySweeper;
