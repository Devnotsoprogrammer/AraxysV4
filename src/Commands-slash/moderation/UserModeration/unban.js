const {
    SlashCommandBuilder,
    EmbedBuilder,
    ButtonBuilder,
    ActionRowBuilder,
    ButtonStyle,
    PermissionFlagsBits,
  } = require("discord.js");
  
  module.exports = {
    data: new SlashCommandBuilder()
      .setName("unban")
      .setDescription("Unban a user from the server")
      .addStringOption((option) =>
        option
          .setName("userid")
          .setDescription("The ID of the user to unban")
          .setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName("reason")
          .setDescription("The reason for unbanning the user")
          .setRequired(false)
      ),
    async execute(interaction) {
      const client = interaction.client;
      const userId = interaction.options.getString("userid");
      const reason = interaction.options.getString("reason") || "None";
  
      // Check user permissions
      if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `${client.emotes.cross} | You must have the \`Ban Members\` permission!`
              )
              .setColor(client.color),
          ],
          flags: 64,
        });
      }
  
      // Check bot permissions
      if (
        !interaction.guild.members.me.permissions.has(
          PermissionFlagsBits.BanMembers
        )
      ) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `${client.emotes.cross} | I must have the \`Ban Members\` permission!`
              )
              .setColor(client.color),
          ],
          flags: 64,
        });
      }
  
      try {
        const user = await interaction.client.users.fetch(userId);
        if (!user) {
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setDescription(
                  `${client.emotes.cross} | User not found! Please provide a valid user ID.`
                )
                .setColor(client.color),
            ],
            flags: 64,
          });
        }
  
        // Confirmation prompt
        const confirmationEmbed = new EmbedBuilder()
          .setDescription(
            `${client.emotes.cross} | Are you sure you want to unban ${user.tag}?`
          )
          .setColor(client.color);
        
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("yes")
            .setLabel("Yes")
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId("no")
            .setLabel("No")
            .setStyle(ButtonStyle.Danger)
        );
  
        const msg = await interaction.reply({
          embeds: [confirmationEmbed],
          components: [row],
          flags: 64,
        });
  
        const filter = (i) => i.user.id === interaction.user.id;
        const collector = msg.createMessageComponentCollector({
          filter,
          time: 15000,
        });
  
        collector.on("collect", async (i) => {
          if (i.customId === "yes") {
            try {
              await interaction.guild.members.unban(userId);
              await i.update({
                embeds: [
                  new EmbedBuilder()
                    .setDescription(
                      `${client.emotes.tick} | Successfully unbanned user ${user.tag}.`
                    )
                    .setColor(client.color),
                ],
                components: [],
              });
            } catch (error) {
              await i.update({
                embeds: [
                  new EmbedBuilder()
                    .setDescription(
                      `${client.emotes.cross} | Error unbanning user: ${error.message}`
                    )
                    .setColor(client.color),
                ],
                components: [],
              });
            }
          } else {
            await i.update({
              embeds: [
                new EmbedBuilder()
                  .setDescription(`${client.emotes.cross} | Unban action canceled`)
                  .setColor(client.color),
              ],
              components: [],
            });
          }
        });
  
        collector.on("end", async (collected, reason) => {
          if (reason === "time" && msg.editable) {
            await msg.edit({
              embeds: [
                new EmbedBuilder()
                  .setDescription(
                    `${client.emotes.cross} | Unban confirmation timed out`
                  )
                  .setColor(client.color),
              ],
              components: [],
            });
          }
        });
      } catch (error) {
        console.error("Error executing unban command:", error);
        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `${client.emotes.cross} | An error occurred while executing the command.`
              )
              .setColor(client.color),
          ],
          flags: 64,
        });
      }
    },
  };
  
  async function fetchUser(client, interaction, mention) {
    if (!mention) return null;
  
    const id = mention.match(/^<@!?(\d+)>$/) ? mention.match(/^<@!?(\d+)>$/)[1] : mention.match(/^\d+$/) ? mention : null;
    return id ? client.users.fetch(id).catch(() => null) : null;
  }
  