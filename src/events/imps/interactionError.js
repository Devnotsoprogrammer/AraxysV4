module.exports = {
    name: 'interactionError',
    once: false,
    async execute(interaction) {
      if (!interaction.isChatInputCommand()) return;
  
      try {
        const command = interaction.client.commands.get(interaction.commandName);
        if (!command) {
          console.log(`No command matching ${interaction.commandName} was found.`);
          return;
        }
  
        await command.execute(interaction);
      } catch (error) {
        console.error(`Error executing ${interaction.commandName}`);
        console.error(error);
        
        if (!interaction.replied && !interaction.deferred) {
          const errorMessage = {
            content: 'There was an error while executing this command!',
            flags: 64,
          };

          try {
            await interaction.reply(errorMessage);
          } catch (e) {
            try {
              await interaction.followUp(errorMessage);
            } catch (e2) {
              console.error('Could not send error message:', e2);
            }
          }
        }
      }
    },
  };