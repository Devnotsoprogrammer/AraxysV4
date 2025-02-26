const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "membercount",
  aliases: ["members", "mc"],
  category: ["essentials", "utilities"],
  description: "Shows detailed server member statistics",
  usage: "",
  cooldown: 5,

  run: async (client, message, args) => {
    try {
      // Fetch guild members to ensure accurate counts
      await message.guild.members.fetch();

      // Get member counts
      const totalMembers = message.guild.memberCount;
      const humans = message.guild.members.cache.filter(
        (member) => !member.user.bot
      ).size;
      const bots = message.guild.members.cache.filter(
        (member) => member.user.bot
      ).size;
      const onlineMembers = message.guild.members.cache.filter(
        (member) => member.presence?.status === "online"
      ).size;
      const idleMembers = message.guild.members.cache.filter(
        (member) => member.presence?.status === "idle"
      ).size;
      const dndMembers = message.guild.members.cache.filter(
        (member) => member.presence?.status === "dnd"
      ).size;
      const offlineMembers = message.guild.members.cache.filter(
        (member) => !member.presence || member.presence.status === "offline"
      ).size;

      // Create embed
      const embed = new EmbedBuilder()
        .setColor(client.color || "#000000")
        .setTitle(`${message.guild.name}'s Member Statistics`)
        .setThumbnail(message.guild.iconURL({ dynamic: true, size: 512 }))
        .addFields(
          {
            name: "👥 Total Members",
            value: `\`\`\`${totalMembers.toLocaleString()}\`\`\``,
            inline: true,
          },
          {
            name: "👤 Humans",
            value: `\`\`\`${humans.toLocaleString()}\`\`\``,
            inline: true,
          },
          {
            name: "🤖 Bots",
            value: `\`\`\`${bots.toLocaleString()}\`\`\``,
            inline: true,
          },
          {
            name: "Online Status",
            value: [
              `${
                client.emoji?.online || "🟢"
              } Online: \`${onlineMembers.toLocaleString()}\``,
              `${
                client.emoji?.idle || "🟡"
              } Idle: \`${idleMembers.toLocaleString()}\``,
              `${
                client.emoji?.dnd || "🔴"
              } DND: \`${dndMembers.toLocaleString()}\``,
              `${
                client.emoji?.offline || "⚫"
              } Offline: \`${offlineMembers.toLocaleString()}\``,
            ].join("\n"),
            inline: false,
          }
        )
        .setFooter({
          text: `Requested by ${message.author.tag}`,
          iconURL: message.author.displayAvatarURL({ dynamic: true }),
        })
        .setTimestamp();

      // Add verification level if available
      /*if (message.guild.verificationLevel) {
        const verificationLevels = {
          0: "None",
          1: "Low",
          2: "Medium",
          3: "High",
          4: "Highest",
        };

        embed.addFields({
          name: "🛡️ Verification Level",
          value: `\`${verificationLevels[message.guild.verificationLevel]}\``,
          inline: true,
        });
      }
       */
      // Send embed
      await message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error("Member Count Error:", error);
      message.channel
        .send({
          embeds: [
            new EmbedBuilder()
              .setColor(client.color2)
              .setDescription(
                `${client.emotes.cross} | An error occurred while fetching member statistics.`
              ),
          ],
        })
        .catch(() => {});
    }
  },
};
