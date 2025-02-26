const {
  EmbedBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const wait = require("util").promisify(setTimeout);
const Araxys = require("../../core/Araxys");

module.exports = {
  name: "antinuke",
  aliases: ["antiwizz", "an"],
  category: "security",
  premium: true,
  run: async (client, message, args) => {
    return message.reply("This Command Is Under Development!");
    const enable = `${client.emotes.onon}${client.emotes.onoff}`;
    const disable = `${client.emotes.offon}${client.emotes.offoff}`;
    const protect = `${client.emotes.protect}`;
    const hii = `<:Hii:1220745498621771776>`;

    if (message.guild.memberCount < 1) {
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(client.color)
            .setDescription(
              `${client.emotes.cross} | Your Server Doesn't Meet My 30 Member Criteria`
            ),
        ],
      });
    }

    let own = message.author.id == message.guild.ownerId;
    const check = await client.util.isExtraOwner(
      message.guild.id,
      message.author.id
    );

    if (!own && !check) {
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(client.color)
            .setDescription(
              `${client.emotes.cross} | Only Server Owner Or Extraowner Can Run This Command.!`
            ),
        ],
      });
    }

    if (
      !own &&
      !(
        message.guild.members.cache.get(client.user.id).roles.highest
          .position <= message.member.roles.highest.position
      )
    ) {
      const higherole = new EmbedBuilder()
        .setColor(client.color)
        .setDescription(
          `${client.emotes.cross} | Only Server Owner Or Extraowner Having Higher Role Than Me Can Run This Command`
        );
      return message.channel.send({ embeds: [higherole] });
    }

    let prefix = "&" || message.guild.prefix;
    const option = args[0];
    const isActivatedAlready = await client.db.get(
      `${message.guild.id}_antinuke`
    );

    const antinuke = new EmbedBuilder()
      .setThumbnail(client.user.avatarURL({ dynamic: true }))
      .setColor(client.color)
      .setTitle(`__**Antinuke**__`)
      .setDescription(
        `Level up your server security with Antinuke! It swiftly bans admins engaging in suspicious activities, all while safeguarding your whitelisted members. Enhance protection – enable Antinuke now!`
      )
      .addFields([
        {
          name: `__**Antinuke Enable**__`,
          value: `To Enable Antinuke, Use - \`${prefix}antinuke enable\``,
        },
        {
          name: `__**Antinuke Disable**__`,
          value: `To Disable Antinuke, Use - \`${prefix}antinuke disable\``,
        },
      ]);

    if (!option) {
      message.channel.send({ embeds: [antinuke] });
    } else if (option === "enable") {
      if (isActivatedAlready) {
        const enabnble = new EmbedBuilder()
          .setThumbnail(client.user.displayAvatarURL())
          .setColor(client.color)
          .setDescription(
            `**Security Settings For ${message.guild.name} ${protect}\nUmm, looks like your server has already enabled security\n\nCurrent Status : ${enable}\nTo Disable use ${prefix}antinuke disable**`
          );
        message.channel.send({ embeds: [enabnble] });
      } else {
        await client.db.set(`${message.guild.id}_antinuke`, true);
        await client.db.set(`${message.guild.id}_wl`, {
          whitelisted: [],
        });

        let msg = await message.channel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(client.color)
              .setDescription(
                `${client.emotes.tick} | Initializing Quick Setup!`
              ),
          ],
        });

        const steps = [
          "Updating security settings...",
          "Initializing whitelisted members...",
          "Checking server roles...",
        ];

        for (const step of steps) {
          await wait(1000);
          await msg.edit({
            embeds: [
              new EmbedBuilder()
                .setColor(client.color)
                .setDescription(
                  `${msg.embeds[0].description}\n${client.emotes.tick} | ${step}`
                ),
            ],
          });
        }

        // Role creation step
        try {
          await wait(1000);
          let role = message.guild.members.cache.get(client.user.id).roles
            .highest.position;
          let createdRole = await message.guild.roles.create({
            name: "Araxys Abyss",
            position: role ? role : 0,
            reason: "Araxys Role For Unbypassable Setup",
            permissions: [PermissionFlagsBits.Administrator],
            color: "#171717",
            hoist: true,
          });

          await message.guild.members.cache
            .get(client.user.id)
            .roles.add(createdRole.id);

          await msg.edit({
            embeds: [
              new EmbedBuilder()
                .setColor(client.color)
                .setDescription(
                  `${msg.embeds[0].description}\n${client.emotes.tick} | Successfully created and assigned role \`${createdRole.name}\`.`
                ),
            ],
          });

          // Continue with antinuke setup steps
          const remainingSteps = [
            "Enabling antinuke protection...",
            "Finalizing setup...",
          ];

          for (const step of remainingSteps) {
            await wait(1000);
            await msg.edit({
              embeds: [
                new EmbedBuilder()
                  .setColor(client.color)
                  .setDescription(
                    `${msg.embeds[0].description}\n${client.emotes.tick} | ${step}`
                  ),
              ],
            });
          }

          await wait(2000);
          const enabled = new EmbedBuilder()
            .setThumbnail(client.user.displayAvatarURL())
            .setAuthor({
              name: `${client.user.username} Security`,
              iconURL: client.user.displayAvatarURL(),
            })
            .setColor(client.color)
            .setDescription(
              `**Security Settings For ${message.guild.name} ${protect}**\n\n**Antinuke is Now Enabled**`
            )
            .setFooter({
              text: `Punishment Type: Ban`,
              iconURL: message.author.displayAvatarURL({ dynamic: true }),
            });
          await msg.edit({ embeds: [enabled] });
        } catch (error) {
          await msg.edit({
            embeds: [
              new EmbedBuilder()
                .setColor(client.color)
                .setDescription(
                  `Role creation disturbed! Ensure I have appropriate permissions to create roles. Antinuke has not been enabled.`
                ),
            ],
          });

          await client.db.set(`${message.guild.id}_antinuke`, null);
          await client.db.set(`${message.guild.id}_wl`, {
            whitelisted: [],
          });
        }
      }
    } else if (option === "disable") {
      if (!isActivatedAlready) {
        const dissable = new EmbedBuilder()
          .setThumbnail(client.user.displayAvatarURL())
          .setColor(client.color)
          .setDescription(
            `**Security Settings For ${message.guild.name} ${protect}\nUmm, looks like your server hasn't enabled security.\n\nCurrent Status: ${disable}\n\nTo Enable use ${prefix}antinuke enable**`
          );
        message.channel.send({ embeds: [dissable] });
      } else {
        await client.db.get(`${message.guild.id}_wl`).then(async (data) => {
          const users = data.whitelisted;
          for (const userId of users) {
            let data2 = await client.db.get(`${message.guild.id}_${userId}_wl`);
            if (data2) {
              await client.db.delete(`${message.guild.id}_${userId}_wl`);
            }
          }
        });

        await client.db.set(`${message.guild.id}_antinuke`, null);
        await client.db.set(`${message.guild.id}_wl`, {
          whitelisted: [],
        });

        const disabled = new EmbedBuilder()
          .setThumbnail(client.user.displayAvatarURL())
          .setColor(client.color)
          .setDescription(
            `**Security Settings For ${message.guild.name} ${protect}\nSuccessfully disabled security settings for this server.\n\nCurrent Status: ${disable}\n\nTo Enable use ${prefix}antinuke enable**`
          );
        message.channel.send({ embeds: [disabled] });
      }
    } else {
      return message.channel.send({ embeds: [antinuke] });
    }
  },
};
