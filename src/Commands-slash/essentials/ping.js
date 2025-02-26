const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Gives the latency of the Bot!"),
  async execute(interaction, client) {
    try {
      const embed = new EmbedBuilder()
        .setTitle("Pong!")
        .setDescription(`Ping: ${client.ws.ping}ms`)
        .setColor("Blue");
      await interaction.reply({ embeds: [embed], flags: ['Ephemeral']});
    } catch (error) {
      await interaction.reply({ content: 'There was an error while executing this command!', flags: ['EPHEMERAL'] });
    }
  },
};
