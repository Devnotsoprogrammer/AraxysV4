const {
  EmbedBuilder,
  Message,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
} = require("discord.js");
const noprefixSchema = require("../../models/noprefixSchema");
const guildPrefixSchema = require("../../models/guildPrefixSchema");
const cooldownHandler = require("../../core/ratelimiter");
const commandUsageDb = require("../../database/commandUsageTracker");
const axios = require("axios");

const botOwners = ["1203931944421949533"];
const webhookUrl =
  "https://discord.com/api/webhooks/1330578815717609552/RZHE7LAI5ekrvmT0u2OgZ_8SEtYvwBgKadPReuVRK7FsoatlmZanY3O8hasXSIFZ1QEh";

module.exports = {
  name: "messageCreate",
  async execute(message, client) {
    if (!message || !message.author || message.author.bot) return;

    const commandCooldown = 60000;
    const spamWarningLimitUser = 10;
    const spamWarningLimitServer = 100;
    const maxWarningsPerDay = 5;
    const extendedBlacklistDuration = 5 * 60 * 60 * 1000;

    if (!botOwners.includes(message.author.id)) {
      if (await client.util.isTempBlackListedUser(message.author.id)) {
        return message.reply(
          "You are temporarily blacklisted for spamming commands."
        );
      }

      if (await client.util.isTempBlackListedServer(message.guild?.id)) {
        return message.reply(
          "This server is temporarily blacklisted for spamming commands."
        );
      }
    }

    if (await client.util.isBlackListedUser(message.member?.id)) {
      return;
    }

    if (await client.util.isBlackListedServer(message.guild?.id)) {
      return;
    }

    try {
      const noprefixUser = await noprefixSchema.findOne({
        userId: message.author.id,
      });

      const defaultPrefix = client.config ? client.config.prefix : "r?";
      let guildPrefix = defaultPrefix;

      if (!message.guild) {
        if (message.content.toLowerCase().startsWith(`${defaultPrefix}help`)) {
          const helpCmd = client.commands.get("help");
          if (helpCmd) {
            try {
              await helpCmd.run(client, message, []);
            } catch (error) {
              console.error(`Error executing help command in DM: ${error}`);
            }
          }
          return;
        }

        if (message.content.startsWith(defaultPrefix)) {
          const commandUsed = message.content
            .slice(defaultPrefix.length)
            .trim()
            .split(/ +/)[0];
          const embed = new EmbedBuilder()
            .setTitle("❌ Commands in DM")
            .setDescription(
              `Hey ${message.author}! I see you're trying to use the \`${commandUsed}\` command.\n\n` +
                "This command can only be used in a server, not in DMs!\n\n" +
                "**What to do:**\n" +
                "1. Join a server where I'm present\n" +
                "2. Use the command in an appropriate channel\n" +
                "3. Make sure you have the required permissions\n\n" +
                `Only the \`${defaultPrefix}help\` command works in DMs!`
            )
            .setColor(client.color)
            .setFooter({
              text: "Tip: Use commands in a server for full functionality!",
              iconURL: client.user.displayAvatarURL(),
            })
            .setTimestamp();

          await message.reply({ embeds: [embed] });
          return;
        }
        return;
      }

      const guildConfig = await guildPrefixSchema.findOne({
        GuildId: message.guild.id,
      });
      if (guildConfig) guildPrefix = guildConfig.Prefix;

      const prefixes = [
        defaultPrefix,
        guildPrefix,
        `<@${client.user.id}>`,
        `<@!${client.user.id}>`,
      ];

      let usedPrefix = null;
      for (const prefix of prefixes) {
        if (message.content.startsWith(prefix)) {
          usedPrefix = prefix;
          break;
        }
      }

      if (
        message.content === `<@${client.user.id}>` ||
        message.content === `<@!${client.user.id}>`
      ) {
        // Send embed when only the bot is tagged
        const embed = new EmbedBuilder()
          .setTitle(`${message.guild.name}`)
          .setColor(client.color)
          .setDescription(
            `Hello!👋 <@${message.author.id}>, I'm Araxys! How can I help you?`
          )
          .addFields(
            {
              name: "Get Started",
              value: `Use \`${client.config.prefix}help\` to get started!`,
            },
            {
              name: "Prefix",
              value: `My prefix is \`${client.config.prefix}\``,
            },
            {
              name: "Appreciation",
              value: "Thank you for using me!",
            },
            {
              name: "Development Team",
              value: "Liquid Code Creations",
            }
          )
          .setThumbnail(client.user.displayAvatarURL())
          .setFooter({
            text: "Created by Dev Innovate",
            iconURL: `https://cdn.discordapp.com/attachments/1316765600529256571/1325459797381877844/A_figure_sitting_and_looking_upward_to_God_with_robes_and_clothes_in_black_including_the_sword_with_the_face_hidden.png?ex=677bde21&is=677a8ca1&hm=2a63748daa20ce0d6158fc960fec68cdc5bbbd157a88733db071e47611465592&`,
          });

        const button1 = new ButtonBuilder()
          .setLabel("Invite Me")
          .setURL(
            `https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`
          )
          .setStyle(ButtonStyle.Link);

        const button2 = new ButtonBuilder()
          .setLabel("Support Server")
          .setURL("https://discord.gg/wwcPCQ2emf")
          .setStyle(ButtonStyle.Link);

        const row = new ActionRowBuilder().addComponents(button1, button2);

        await message.reply({ embeds: [embed], components: [row] });
        return;
      }
      if (usedPrefix) {
        const withoutPrefix = message.content.slice(usedPrefix.length).trim();
        const messageArray = withoutPrefix.split(/ +/);
        command = messageArray[0].toLowerCase();
        args = messageArray.slice(1);
      } else if (noprefixUser) {
        const messageArray = message.content.trim().split(/ +/);
        command = messageArray[0].toLowerCase();
        args = messageArray.slice(1);
      } else {
        return;
      }

      const prefixcmd =
        client.commands.get(command) || client.aliases.get(command);
      if (!prefixcmd) return;

      const commandName = prefixcmd.name;
      const cooldownTime = prefixcmd.cooldown || 5;
      if (!cooldownHandler(client, message, commandName, cooldownTime)) {
        return;
      }

      if (!botOwners.includes(message.author.id)) {
        const currentTime = Date.now();
        const userCommandKey = `command_count_${message.author.id}`;
        const userTimestampsKey = `command_timestamps_${message.author.id}`;
        const userWarningsKey = `warnings_${message.author.id}`;

        let userCommandTimestamps =
          (await commandUsageDb.get(userTimestampsKey)) || [];

        userCommandTtimestamps = userCommandTimestamps.filter(
          (timestamp) => currentTime - timestamp < commandCooldown
        );

        userCommandTtimestamps.push(currentTime);

        await commandUsageDb.set(userTimestampsKey, userCommandTtimestamps);

        let userWarnings = (await commandUsageDb.get(userWarningsKey)) || 0;

        if (userCommandTtimestamps.length > spamWarningLimitUser) {
          userWarnings += 1;
          await commandUsageDb.set(userWarningsKey, userWarnings);
          if (userWarnings > maxWarningsPerDay) {
            await client.util.tempBlacklistUser(
              message.author.id,
              extendedBlacklistDuration
            );
            await commandUsageDb.set(userWarningsKey, 0);
            const embed = new EmbedBuilder()
              .setTitle("Spamming Detected")
              .setDescription(
                `You have been temporarily blacklisted for 5 hours due to excessive spamming.`
              )
              .setColor(client.color);
            await message.reply({ embeds: [embed] });
            await message.author.send(
              `You have been temporarily blacklisted for 5 hours due to excessive spamming in ${message.guild.name}.`
            );

            await axios.post(webhookUrl, {
              content: `User ${message.author.tag} (ID: ${
                message.author.id
              }) has been temporarily blacklisted for 5 hours due to excessive spamming in ${
                message.guild.name
              }. Command: ${commandName}, Time: ${new Date().toISOString()}`,
            });
          } else {
            await client.util.tempBlacklistUser(
              message.author.id,
              commandCooldown
            );
            await commandUsageDb.delete(userCommandKey);
            const embed = new EmbedBuilder()
              .setTitle("Spamming Detected")
              .setDescription(
                `You have been temporarily blacklisted for spamming commands. Warning ${userWarnings}/${maxWarningsPerDay}.`
              )
              .setColor(client.color);
            await message.reply({ embeds: [embed] });
            await message.author.send(
              `You have been temporarily blacklisted for spamming commands in ${message.guild.name}. Warning ${userWarnings}/${maxWarningsPerDay}.`
            );
          }
          return;
        }

        const serverCommandKey = `command_count_${message.guild.id}`;
        const serverTimestampsKey = `command_timestamps_${message.guild.id}`;

        let serverCommandTimestamps =
          (await commandUsageDb.get(serverTimestampsKey)) || [];

        serverCommandTimestamps = serverCommandTimestamps.filter(
          (timestamp) => currentTime - timestamp < commandCooldown
        );

        serverCommandTimestamps.push(currentTime);

        await commandUsageDb.set(serverTimestampsKey, serverCommandTimestamps);

        if (serverCommandTtimestamps.length > spamWarningLimitServer) {
          await client.util.tempBlacklistServer(
            message.guild.id,
            commandCooldown
          );
          await commandUsageDb.delete(serverCommandKey);
          const embed = new EmbedBuilder()
            .setTitle("Server Spamming Detected")
            .setDescription(
              `This server has been temporarily blacklisted for spamming commands.`
            )
            .setColor(client.color);
          await message.reply({ embeds: [embed] });
        }
      }

      try {
        await prefixcmd.run(client, message, args);
      } catch (error) {
        console.error(`Error executing command: ${error}`);
      }
    } catch (error) {
      console.error("Error in messageCreate event:", error);
    }
  },
};
