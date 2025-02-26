const {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} = require("discord.js");

module.exports = {
  name: "ban",
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a user from the server")
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption((option) =>
      option.setName("user").setDescription("The user to ban").setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("The reason for the ban")
        .setRequired(false)
    ),

  async execute(interaction, client) {
    try {
      await interaction.deferReply();

      // Get the member who used the command
      const member = interaction.member;
      if (!member.permissions.has(PermissionFlagsBits.BanMembers)) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `${client.emotes.cross} | You don't have permission to ban members!`
              )
              .setColor(client.color),
          ],
        });
      }

      // Check bot permissions
      if (
        !interaction.guild.members.me.permissions.has(
          PermissionFlagsBits.BanMembers
        )
      ) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `${client.emotes.cross} | I must have the \`Ban Members\` permission!`
              )
              .setColor(client.color),
          ],
        });
      }

      const user = interaction.options.getUser("user");
      let reason = interaction.options.getString("reason") || "None";
      reason = `${interaction.user.tag} (${interaction.user.id}) | ${reason}`;

      const targetMember = await interaction.guild.members
        .fetch(user.id)
        .catch(() => null);

      if (
        user.id === client.user.id ||
        user.id === interaction.guild.ownerId ||
        user.id === interaction.user.id
      ) {
        const descriptions = {
          [client.user.id]: "You cannot ban me!",
          [interaction.guild.ownerId]: "You cannot ban the server owner!",
          [interaction.user.id]: "You cannot ban yourself!",
        };
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `${client.emotes.cross} | ${descriptions[user.id]}`
              )
              .setColor(client.color),
          ],
        });
      }
      // Get target member object for role checks

      if (
        targetMember &&
        interaction.member.roles.highest.position <=
          targetMember.roles.highest.position &&
        !interaction.guild.ownerId
      ) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `${client.emotes.cross} | You cannot ban someone with a higher role than you!`
              )
              .setColor(client.color),
          ],
        });
      }

      // Create confirmation buttons
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("confirm_ban")
          .setLabel("Yes")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId("cancel_ban")
          .setLabel("No")
          .setStyle(ButtonStyle.Danger)
      );

      const confirmEmbed = new EmbedBuilder()
        .setDescription(
          `${client.emotes.cross} | Are you sure you want to ban ${user}?`
        )
        .setColor(client.color);

      const response = await interaction.editReply({
        embeds: [confirmEmbed],
        components: [row],
      });

      // Create collector for button interaction
      const collector = response.createMessageComponentCollector({
        time: 15000,
      });

      collector.on("collect", async (i) => {
        if (i.user.id !== interaction.user.id) {
          return i.reply({
            content: "You are not allowed to use this button!",
            flags: 64,
          });
        }

        if (i.customId === "confirm_ban") {
          try {
            // Try to DM the user
            try {
              const dmEmbed = new EmbedBuilder()
                .setDescription(
                  `${client.emotes.ban} | You have been banned from **${interaction.guild.name}**`
                )
                .setColor(client.color);
              await user.send({ embeds: [dmEmbed] });
            } catch (error) {
              // Ignore DM errors
            }

            // Ban the user
            await interaction.guild.members.ban(user, { reason });

            const successEmbed = new EmbedBuilder()
              .setDescription(
                `${client.emotes.tick} | ${user} has been banned from the server`
              )
              .setColor(client.color);

            await i.update({ embeds: [successEmbed], components: [] });
          } catch (error) {
            const errorEmbed = new EmbedBuilder()
              .setDescription(
                `${client.emotes.cross} | Error: ${error.message}`
              )
              .setColor(client.color);

            await i.update({ embeds: [errorEmbed], components: [] });
          }
        } else if (i.customId === "cancel_ban") {
          const cancelEmbed = new EmbedBuilder()
            .setDescription(`${client.emotes.cross} | Ban action canceled`)
            .setColor(client.color);

          await i.update({ embeds: [cancelEmbed], components: [] });
        }
      });

      collector.on("end", async (collected, reason) => {
        if (reason === "time") {
          const timeoutEmbed = new EmbedBuilder()
            .setDescription(
              `${client.emotes.cross} | Ban confirmation timed out`
            )
            .setColor(client.color);

          await interaction.editReply({
            embeds: [timeoutEmbed],
            components: [],
          });
        }
      });
    } catch (error) {
      console.error("Error executing ban command:", error);
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.emotes.cross} | An error occurred while executing the command.`
            )
            .setColor(client.color),
        ],
      });
    }
  },
};
