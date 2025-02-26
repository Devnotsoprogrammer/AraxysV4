const { EmbedBuilder } = require('discord.js');
const cooldowns = new Map();

function cooldownHandler(client, message, commandName, cooldownTime) {
    const userId = message.author.id;
    const currentTime = Date.now();

    if (!cooldowns.has(userId)) {
        cooldowns.set(userId, {});
    }

    const userCooldowns = cooldowns.get(userId);

    if (!userCooldowns[commandName] || currentTime - userCooldowns[commandName] > cooldownTime) {
        userCooldowns[commandName] = currentTime;
        return true; 
    }

    const timeLeft = ((userCooldowns[commandName] + cooldownTime) - currentTime) / 1000;

    const embed = new EmbedBuilder()
        .setColor(client.color)
        .setDescription(`${client.emotes.loadz} | Please wait ${timeLeft.toFixed(1)} seconds before using the \`${commandName}\` command again.`);

    message.reply({ embeds: [embed] }).then(sentMessage => {
        const interval = setInterval(async () => {
            const newTimeLeft = ((userCooldowns[commandName] + cooldownTime) - Date.now()) / 1000;
            if (newTimeLeft <= 0) {
                clearInterval(interval);
                try {
                    await sentMessage.delete(); 
                    const endEmbed = new EmbedBuilder()
                        .setColor(client.color)
                        .setDescription(`${client.emotes.tick} | <@${userId}>, you can now use the \`${commandName}\` command again.`);
                    message.channel.send({ embeds: [endEmbed] });
                } catch (error) {
                    if (error.code !== 10008) { 
                        console.error('Error deleting message:', error);
                    }
                }
            } else {
                const updateEmbed = new EmbedBuilder()
                    .setColor(client.color)
                    .setDescription(`${client.emotes.loadz} | Please wait ${newTimeLeft.toFixed(1)} seconds before using the \`${commandName}\` command again.`);
                try {
                    await sentMessage.edit({ embeds: [updateEmbed] });
                } catch (error) {
                    if (error.code === 10008) { 
                        clearInterval(interval); 
                    } else {
                        console.error('Error editing message:', error);
                        clearInterval(interval); 
                    }
                }
            }
        }, 1000); 
    });

    return false; 
}

module.exports = cooldownHandler;
