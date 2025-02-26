const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
} = require("discord.js");
const TicketSystem = require("../../../models/ticketSystemSchema");

module.exports = {
  name: "ticket-setup",
  data: new SlashCommandBuilder()
    .setName("ticket-setup")
    .setDescription("Set up the ticket system")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription(
          "Select the channel where the ticket message will be sent"
        )
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .addRoleOption((option) =>
      option
        .setName("support-role")
        .setDescription("Select the support team role")
        .setRequired(true)
    )
    .addChannelOption((option) =>
      option
        .setName("open-category")
        .setDescription("Select the category where new tickets will be created")
        .addChannelTypes(ChannelType.GuildCategory)
        .setRequired(true)
    )
    .addChannelOption((option) =>
      option
        .setName("closed-category")
        .setDescription(
          "Select the category where closed tickets will be moved"
        )
        .addChannelTypes(ChannelType.GuildCategory)
        .setRequired(true)
    ),

  async execute(interaction) {
    // Single try-catch block for the entire execution
    try {
      // Permission checks
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return await interaction.reply({
          content: "❌ You don't have permission to use this command!",
          flags: 64,
        });
      }

      const requiredPermissions = [
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageChannels
      ];

      if (!interaction.guild.members.me.permissions.has(requiredPermissions)) {
        return await interaction.reply({
          content: "❌ I don't have the required permissions: `EmbedLinks`, `SendMessages`, `ManageChannels`!",
          flags: 64,
        });
      }

      const channel = interaction.options.getChannel("channel");
      const supportRole = interaction.options.getRole("support-role");
      const openCategory = interaction.options.getChannel("open-category");
      const closedCategory = interaction.options.getChannel("closed-category");

      const embed = new EmbedBuilder()
        .setTitle("🎫 Create a Ticket")
        .setDescription("Click the button below to create a ticket")
        .setColor("#2b2d31")
        .addFields(
          { name: "Support Team", value: `${supportRole}`, inline: true },
          { name: "Category", value: `${openCategory.name}`, inline: true }
        )
        .setFooter({
          text: "Created by NotSoProgrammer",
          iconURL:
            "https://cdn.discordapp.com/attachments/1316794280798326785/1326132132099264532/wp9525382.jpg?ex=677e504a&is=677cfeca&hm=1ab6ee6d426ce87021ddd1f5881466a45c08c1414051fd8eba4c030183dcff52&",
        });

      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("create_ticket")
          .setLabel("Create Ticket")
          .setEmoji("🎫")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("ticket_guide")
          .setLabel("How to use")
          .setEmoji("❓")
          .setStyle(ButtonStyle.Secondary)
      );

      // Send message and save configuration
      const message = await channel.send({
        embeds: [embed],
        components: [buttons],
      });

      // Save to database
      await TicketSystem.findOneAndUpdate(
        { guildId: interaction.guild.id },
        {
          guildId: interaction.guild.id,
          channelId: channel.id,
          messageId: message.id,
          supportRoleId: supportRole.id,
          categoryId: openCategory.id,
          closedCategoryId: closedCategory.id,
        },
        { upsert: true, new: true }
      );

      // Reply to the interaction
      return await interaction.reply({
        content: "✅ Ticket system has been set up successfully!",
        flags: 64,
      });

    } catch (error) {
      console.error("Error in ticket-setup command:", error);
      
      // Only reply if we haven't already
      if (!interaction.replied && !interaction.deferred) {
        return await interaction.reply({
          content: "❌ An error occurred while setting up the ticket system.",
          flags: 64,
        });
      }
    }
  },
};
