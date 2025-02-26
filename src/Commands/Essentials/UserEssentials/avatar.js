const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require("discord.js");

module.exports = {
  name: "avatar",
  aliases: ["av", "photo"],
  category: ["essentials", "utilities"],
  description: "View a user's avatar or server avatar",
  usage: "[user]",
  cooldown: 5000,

  run: async (client, message, args) => {
    try {
      let target;

      // Get target user
      if (args[0]) {
        try {
          target =
            (await getUserFromMention(message, args[0])) ||
            (await client.users.fetch(args[0]));
        } catch {
          target = message.author;
        }
      } else {
        target = message.author;
      }

      // Get member object
      const member =
        target.id === message.author.id
          ? message.member
          : await message.guild.members.fetch(target.id).catch(() => null);

      // Create buttons
      const globalButton = new ButtonBuilder()
        .setCustomId('global_avatar')
        .setLabel('Global Avatar')
        .setStyle(ButtonStyle.Primary);

      const serverButton = new ButtonBuilder()
        .setCustomId('server_avatar')
        .setLabel('Server Avatar')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(!member || member.displayAvatarURL() === target.displayAvatarURL());

      const bannerButton = new ButtonBuilder()
        .setCustomId('user_banner')
        .setLabel('User Banner')
        .setStyle(ButtonStyle.Secondary);

      const row = new ActionRowBuilder().addComponents(globalButton, serverButton, bannerButton);

      // Create initial embed with global avatar
      const embed = new EmbedBuilder()
        .setAuthor({
          name: `${target.tag}'s Global Avatar`,
          iconURL: target.displayAvatarURL({ dynamic: true }),
        })
        .setImage(target.displayAvatarURL({ size: 4096, dynamic: true }))
        .setColor(client.color)
        .setFooter({
          text: `Requested by ${message.author.tag}`,
          iconURL: message.author.displayAvatarURL({ dynamic: true }),
        });

      const msg = await message.channel.send({
        embeds: [embed],
        components: [row],
      });

      // Create collector for button interactions
      const collector = msg.createMessageComponentCollector({
        time: 60000,
      });

      collector.on('collect', async (interaction) => {
        if (interaction.user.id !== message.author.id) {
          return interaction.reply({
            content: `${client.emotes.cross} | This button is not for you!`,
            ephemeral: true,
          });
        }

        try {
          await interaction.deferUpdate();

          const newEmbed = new EmbedBuilder()
            .setColor(client.color)
            .setFooter({
              text: `Requested by ${message.author.tag}`,
              iconURL: message.author.displayAvatarURL({ dynamic: true }),
            });

          switch (interaction.customId) {
            case 'global_avatar':
              newEmbed
                .setAuthor({
                  name: `${target.tag}'s Global Avatar`,
                  iconURL: target.displayAvatarURL({ dynamic: true }),
                })
                .setImage(target.displayAvatarURL({ size: 4096, dynamic: true }));
              break;

            case 'server_avatar':
              if (member) {
                newEmbed
                  .setAuthor({
                    name: `${target.tag}'s Server Avatar`,
                    iconURL: target.displayAvatarURL({ dynamic: true }),
                  })
                  .setImage(member.displayAvatarURL({ size: 4096, dynamic: true }));
              }
              break;

            case 'user_banner':
              const user = await client.users.fetch(target.id, { force: true });
              if (user.banner) {
                newEmbed
                  .setAuthor({
                    name: `${target.tag}'s Banner`,
                    iconURL: target.displayAvatarURL({ dynamic: true }),
                  })
                  .setImage(user.bannerURL({ size: 4096, dynamic: true }));
              } else {
                newEmbed
                  .setAuthor({
                    name: `${target.tag}'s Banner`,
                    iconURL: target.displayAvatarURL({ dynamic: true }),
                  })
                  .setDescription(`${client.emotes.cross} | This user doesn't have a banner!`);
              }
              break;
          }

          await interaction.editReply({
            embeds: [newEmbed],
            components: [row],
          });
        } catch (error) {
          console.error("Button Interaction Error:", error);
        }
      });

      collector.on('end', () => {
        row.components.forEach(button => button.setDisabled(true));
        msg.edit({ components: [row] }).catch(() => {});
      });

    } catch (error) {
      console.error("Avatar Command Error:", error);
      message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor("Red")
            .setDescription(
              `${client.emotes.cross} | Failed to fetch avatar. Please try again.`
            ),
        ],
      });
    }
  },
};

function getUserFromMention(message, mention) {
  if (!mention) return null;
  const matches = mention.match(/^<@!?(\d+)>$/);
  if (!matches) return null;
  return message.client.users.cache.get(matches[1]);
}
