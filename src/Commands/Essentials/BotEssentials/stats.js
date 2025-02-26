const {
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  version: djsVersion,
} = require("discord.js");
const moment = require("moment");
const os = require("os");
const pkg = require("../../../../package.json");

module.exports = {
  name: "stats",
  category: "essentials",
  aliases: ["botinfo", "bi"],
  description: "Shows detailed information about the bot",
  usage: "stats",
  cooldown: 5000,

  run: async (client, message, args) => {
    // Create buttons
    const buttons = [
      new ButtonBuilder()
        .setLabel("Team Info")
        .setCustomId("team")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setLabel("General Info")
        .setCustomId("general")
        .setStyle(ButtonStyle.Danger)
        .setDisabled(true),
      new ButtonBuilder()
        .setLabel("System Info")
        .setCustomId("system")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setLabel("Partners")
        .setCustomId("partners")
        .setStyle(ButtonStyle.Danger),
    ];

    const row = new ActionRowBuilder().addComponents(buttons);

    // Calculate stats
    const uptime = Date.now() - client.uptime;
    const guilds = client.guilds.cache.size;
    const members = client.guilds.cache.reduce(
      (acc, guild) => acc + guild.memberCount,
      0
    );
    const channels = client.channels.cache.size;
    const cachedUsers = client.users.cache.size;

    // Create initial embed
    const embed = new EmbedBuilder()
      .setColor(`#000000`)
      .setAuthor({
        name: `${client.user.username} Information`,
        iconURL: client.user.displayAvatarURL({ dynamic: true }),
      })
      .setDescription(
        [
          "**__General Information__**",
          `Bot's Mention: ${client.user}`,
          `Bot's Tag: ${client.user.tag}`,
          `Bot's Version: ${pkg.version || "1.0.0"}`,
          `Discord.js: v${djsVersion}`,
          `Node.js: ${process.version}`,
          "",
          "**__Statistics__**",
          `Servers: ${guilds.toLocaleString()}`,
          `Users: ${members.toLocaleString()} (${cachedUsers.toLocaleString()} cached)`,
          `Channels: ${channels.toLocaleString()}`,
          `Last Restart: ${moment(uptime).fromNow()}`,
          `Uptime: ${moment.duration(client.uptime).humanize()}`,
        ].join("\n")
      )
      .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
      .setImage(
        `https://cdn.discordapp.com/attachments/1316765600529256571/1330795849596534785/Create_a_sleek_and_modern_logo_for_the_bot_named_Araxys_The_design_should_incorporate_a_minimalist_and_bold_style_similar_to_the_Bitzxier_and_Flantic_logos_The_logo_should_feature_a_stylized_wolf_head_f_17.jpg?ex=678f47b7&is=678df637&hm=63a7740b8fb692c4d066ab126f0d85f2c956f9a47de985b0bd73136c6cb2972f&`
      )
      // .setImage(client.user.displayAvatarURL({ dynamic: true, size: 1024 })) // Added bot's avatar as a banner
      .setFooter({
        text: `Requested by ${message.author.tag}`,
        iconURL: message.author.displayAvatarURL({ dynamic: true }),
      })
      .setTimestamp();

    // Send initial message
    const msg = await message.channel.send({
      embeds: [embed],
      components: [row],
    });

    // Create collector
    const collector = msg.createMessageComponentCollector({
      filter: (i) => i.user.id === message.author.id,
      time: 60000,
    });

    collector.on("collect", async (interaction) => {
      await interaction.deferUpdate();

      const status = {
        online: "<:online:1181479231872565361>",
        idle: "<:idle:1181484312265228439>",
        dnd: "<:dnd:1181484398097485834>",
        offline: "<:offline:1181479232015188019>",
      };

      let newEmbed = new EmbedBuilder()
        .setColor(`#000000`)
        .setAuthor({
          name: `${client.user.username} Information`,
          iconURL: client.user.displayAvatarURL({ dynamic: true }),
        })
        .setFooter({
          text: `Requested by ${message.author.tag}`,
          iconURL: message.author.displayAvatarURL({ dynamic: true }),
        })
        .setTimestamp();

      // Update button states
      buttons.forEach((button) =>
        button.setDisabled(button.data.custom_id === interaction.customId)
      );
      const newRow = new ActionRowBuilder().addComponents(buttons);

      switch (interaction.customId) {
        case "team":
          newEmbed.setDescription(
            [
              "**__ARAXYS DEVELOPMENT__**",
              "",
              `**_${client.emotes.dev}_Main Developer_${client.emotes.dev}_**`,
              `[1] NotSoProgrammer`,
              ` - [GitHub Link](https://github.com/Devnotsoprogrammer)  `,
              ` - [Discord](https://discord.com/users/1237649310141906965)`,
              "",
              `**_${client.emotes.ownzz}_Core Team_${client.emotes.ownzz}_**`,
              `[1] 𝐀𝐒𝐘𝐍𝐂𝐑𝐎 !`,
              ` - [Discord](https://discord.com/users/1203931944421949533)`,
              ` - Discord Username:- \`techasyncro\``,
              `[2] Dr. Innovate`,
              ` - [Discord](https://discord.com/users/1277996795225575515)`,
              ` - Discord Username:- \`dr.innovate\``,
              "",
              "**__Contributors__**",
              `ArtWork = Anushka Mishra`,
              `Support = Harsh Prajapati`,
            ].join("\n")
          );
          break;

        case "system":
          const cpuUsage =
            (process.cpuUsage().user + process.cpuUsage().system) / 1024 / 1024;
          const memUsage = process.memoryUsage().heapUsed / 1024 / 1024;

          newEmbed.setDescription(
            [
              "**__System Information__**",
              `Platform: ${process.platform}`,
              `CPU Usage: ${cpuUsage.toFixed(2)}%`,
              `Memory Usage: ${memUsage.toFixed(2)} MB`,
              `Total Memory: ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(
                2
              )} GB`,
              `OS Type: ${os.type()}`,
              `OS Version: ${os.release()}`,
              `Architecture: ${os.arch()}`,
              `Node.js: ${process.version}`,
              `Discord.js: v${djsVersion}`,
            ].join("\n")
          );
          break;

        case "partners":
          newEmbed
            .setDescription(
              [
                "**__Partners__**",
                "",
                "No partners at the moment.",
                "Interested in partnering? Contact the bot owner!",
              ].join("\n")
            )
            .setFooter({
              text: `${client.user.username} Partnerships`,
              iconURL: client.user.displayAvatarURL({ dynamic: true }),
            });
          break;

        case "general":
          newEmbed = embed;
          break;
      }

      await msg.edit({
        embeds: [newEmbed],
        components: [newRow],
      });
    });

    collector.on("end", () => {
      buttons.forEach((button) => button.setDisabled(true));
      const disabledRow = new ActionRowBuilder().addComponents(buttons);
      msg.edit({ components: [disabledRow] }).catch(() => {});
    });
  },
};
