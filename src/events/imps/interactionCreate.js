module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        // Handle Slash Commands
        if (interaction.isChatInputCommand()) {
            const command = client.slashCommands.get(interaction.commandName);
            if (!command) return;

            try {
                await command.execute(interaction, client);
            } catch (error) {
                console.error('Slash Command Error:', error);
                if (interaction.deferred) {
                    await interaction.editReply({
                        content: 'There was an error while executing this command!'
                    }).catch(console.error);
                } else {
                    await interaction.reply({
                        content: 'There was an error while executing this command!',
                        flags: 64
                    }).catch(console.error);
                }
            }
        }

        // Handle Button Interactions
        if (interaction.isButton() || interaction.isStringSelectMenu()) {
            try {
                // Get the command name from the customId (if needed)
                const [commandName] = interaction.customId.split('_');
                const command = client.slashCommands.get(commandName);

                if (command && command.handleButton) {
                    await command.handleButton(interaction, client);
                }
            } catch (error) {
                console.error('Component Interaction Error:', error);
                // Don't send timeout messages for component interactions
                if (!error.message?.includes('timeout')) {
                    if (interaction.deferred) {
                        await interaction.editReply({
                            content: 'There was an error while processing this interaction!'
                        }).catch(console.error);
                    } else {
                        await interaction.reply({
                            content: 'There was an error while processing this interaction!',
                            flags: 64
                        }).catch(console.error);
                    }
                }
            }
        }
    }
};
  