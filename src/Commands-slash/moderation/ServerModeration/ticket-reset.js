const {
  SlashCommandBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const TicketSystem = require('../../../models/ticketSystemSchema');

module.exports = {
  name: "ticket-reset",
  data: new SlashCommandBuilder()
    .setName("ticket-reset")
    .setDescription("Reset the ticket system configuration")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    try {
      // Permission check
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return await interaction.reply({
          content: "❌ You don't have permission to use this command!",
          flags: 64
        });
      }

      const config = await TicketSystem.findOne({ guildId: interaction.guild.id });
      
      if (!config) {
        return await interaction.reply({
          content: "❌ No ticket system configuration found!",
          flags: 64
        });
      }

      // Try to delete the ticket message if it exists
      try {
        const channel = await interaction.guild.channels.fetch(config.channelId);
        const message = await channel.messages.fetch(config.messageId);
        await message.delete();
      } catch (error) {
        console.log("Could not delete ticket message:", error);
        // Continue execution even if message deletion fails
      }

      // Delete the configuration from MongoDB
      await TicketSystem.findOneAndDelete({ guildId: interaction.guild.id });

      return await interaction.reply({
        content: "✅ Ticket system has been reset successfully!",
        flags: 64
      });

    } catch (error) {
      console.error("Error resetting ticket system:", error);
      
      // Only reply if we haven't already
      if (!interaction.replied && !interaction.deferred) {
        return await interaction.reply({
          content: "❌ An error occurred while resetting the ticket system.",
          flags: 64
        });
      }
    }
  },
};
