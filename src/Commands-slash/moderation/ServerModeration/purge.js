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
    .setName("purge")
    .setDescription("Delete a specified number of messages from a channel")
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription("Number of messages to delete")
        .setRequired(true)
    ),

  async execute(interaction) {
    if (
      !interaction.member.permissions.has(
        PermissionsBitField.Flags.ManageMessages
      )
    ) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${interaction.client.emotes.cross} | You do not have permission to manage messages!`
            )
            .setColor(interaction.client.color),
        ],
        flags: 64,
      });
    }

    const amount = interaction.options.getInteger("amount");

    if (amount < 1 || amount > 100) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${interaction.client.emotes.cross} | Please specify a number between 1 and 100.`
            )
            .setColor(interaction.client.color),
        ],
        flags: 64,
      });
    }

    const embed = new EmbedBuilder()
      .setDescription(`Are you sure you want to delete ${amount} messages?`)
      .setColor(interaction.client.color);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("confirm-purge")
        .setLabel("Yes")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("cancel-purge")
        .setLabel("No")
        .setStyle(ButtonStyle.Danger)
    );

    await interaction.reply({
      embeds: [embed],
      components: [row],
      flags: 64,
    });

    const filter = (i) =>
      i.customId === "confirm-purge" || i.customId === "cancel-purge";
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

      if (i.customId === "confirm-purge") {
        await interaction.deleteReply().catch(console.error);

        await interaction.channel
          .bulkDelete(amount, true)
          .then((deletedMessages) => {
            const actualDeleted = deletedMessages.size;

            interaction.channel
              .send({
                embeds: [
                  new EmbedBuilder()
                    .setDescription(
                      `${interaction.client.emotes.tick} | Deleted ${actualDeleted} messages.`
                    )
                    .setColor(interaction.client.color),
                ],
              })
              .then((sentMessage) => {
                setTimeout(
                  () => sentMessage.delete().catch(console.error),
                  5000
                );
              });
          })
          .catch((error) => {
            interaction.channel.send({
              embeds: [
                new EmbedBuilder()
                  .setDescription(
                    `${interaction.client.emotes.cross} | An error occurred while trying to delete messages: ${error.message}`
                  )
                  .setColor(interaction.client.color),
              ],
            });
          });
      } else if (i.customId === "cancel-purge") {
        return i.update({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `${interaction.client.emotes.cross} | Purge action canceled.`
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
                  `${interaction.client.emotes.cross} | Purge confirmation timed out.`
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
