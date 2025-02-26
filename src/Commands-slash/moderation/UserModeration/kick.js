const { SlashCommandBuilder } = require("@discordjs/builders");
const {
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  PermissionsBitField,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick a user from the server")
    .addUserOption((option) =>
      option
        .setName("target")
        .setDescription("The user to kick")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("reason").setDescription("Reason for kicking the user")
    ),

  async execute(interaction) {
    const araxysian = ["1203931944421949533", "1237649310141906965"];

    if (
      !interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers)
    ) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${interaction.client.emotes.cross} | You must have the \`Kick Members\` permission!`
            )
            .setColor(interaction.client.color),
        ],
        flags: 64,
      });
    }

    if (
      !interaction.guild.members.me.permissions.has(
        PermissionsBitField.Flags.KickMembers
      )
    ) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${interaction.client.emotes.cross} | I must have the \`Kick Members\` permission!`
            )
            .setColor(interaction.client.color),
        ],
        flags: 64,
      });
    }

    const user = interaction.options.getUser("target");
    const reason = interaction.options.getString("reason") || "None";
    const reasonWithAuthor = `${interaction.user.tag} (${interaction.user.id}) | ${reason}`;
    const targetMember = await interaction.guild.members
      .fetch(user.id)
      .catch(() => null);

    if (
      user.id === interaction.client.user.id ||
      user.id === interaction.guild.ownerId ||
      user.id === interaction.user.id ||
      araxysian.includes(user.id)
    ) {
      const descriptions = {
        [interaction.client.user.id]: "You cannot Kick me!",
        [interaction.guild.ownerId]: "You cannot Kick the server owner!",
        [interaction.user.id]: "You cannot Kick yourself!",
        true: "You cannot kick my Master",
      };
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${interaction.client.emotes.cross} | ${
                descriptions[araxysian.includes(user.id) ? true : user.id]
              }`
            )
            .setColor(interaction.client.color),
        ],
        flags: 64,
      });
    }

    // Role hierarchy check for the bot
    if (
      targetMember &&
      interaction.guild.members.me.roles.highest.position <=
        targetMember.roles.highest.position
    ) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${interaction.client.emotes.cross} | I cannot kick this user! The role is higher than my highest role.`
            )
            .setColor(interaction.client.color),
        ],
        flags: 64,
      });
    }

    // Role hierarchy check for the executor
    if (
      targetMember &&
      interaction.member.roles.highest.position <=
        targetMember.roles.highest.position
    ) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${interaction.client.emotes.cross} | You cannot kick someone with a higher role than you!`
            )
            .setColor(interaction.client.color),
        ],
        flags: 64,
      });
    }

    const embed = new EmbedBuilder()
      .setDescription(`Are you sure you want to kick ${user.tag}?`)
      .setColor(interaction.client.color);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("confirm-kick")
        .setLabel("Yes")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("cancel-kick")
        .setLabel("No")
        .setStyle(ButtonStyle.Danger)
    );

    await interaction.reply({
      embeds: [embed],
      components: [row],
      flags: 64,
    });

    const filter = (i) =>
      i.customId === "confirm-kick" || i.customId === "cancel-kick";
    const collector = interaction.channel.createMessageComponentCollector({
      filter,
      time: 15000,
    });

    collector.on("collect", async (i) => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({
          content: "You are not allowed to use this button!",
          flags: 64,
        });
      }

      if (i.customId === "confirm-kick") {
        try {
          // Attempt to send a DM to the user before kicking
          const dmEmbed = new EmbedBuilder()
            .setDescription(
              `${interaction.client.emotes.ban} | You have been kicked from **${interaction.guild.name}**`
            )
            .setColor(interaction.client.color);
          await user.send({ embeds: [dmEmbed] }).catch(() => null); // Silently catch DM errors

          await interaction.guild.members.kick(user, {
            reason: reasonWithAuthor,
          });
          const successEmbed = new EmbedBuilder()
            .setDescription(
              `${interaction.client.emotes.tick} | ${user.tag} has been kicked from the server`
            )
            .setColor(interaction.client.color);
          return interaction.editReply({
            embeds: [successEmbed],
            components: [],
          });
        } catch (error) {
          console.error("Error executing kick command:", error);
          return interaction.editReply({
            embeds: [
              new EmbedBuilder()
                .setDescription(
                  `${interaction.client.emotes.cross} | An error occurred while executing the command.`
                )
                .setColor(interaction.client.color),
            ],
            components: [],
          });
        }
      } else if (i.customId === "cancel-kick") {
        return i.update({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `${interaction.client.emotes.cross} | Kick action canceled.`
              )
              .setColor(interaction.client.color),
          ],
          components: [],
        });
      }
    });

    collector.on("end", (collected) => {
      if (collected.size === 0) {
        interaction
          .editReply({
            embeds: [
              new EmbedBuilder()
                .setDescription(
                  `${interaction.client.emotes.cross} | Kick confirmation timed out.`
                )
                .setColor(interaction.client.color),
            ],
            components: [],
          })
          .catch(console.error);
      }
    });
  },
};
