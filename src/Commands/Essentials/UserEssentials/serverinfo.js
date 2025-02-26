const { EmbedBuilder, ChannelType } = require("discord.js");

module.exports = {
  name: "serverinfo",
  aliases: ["si", "jankari"],
  description: "Get information about the server",
  category: ["essentials", "utilities"],
  cooldown: 5000,
  run: async (client, message) => {
    try {
      // Fetch guild and members to ensure accurate data
      const guild = message.guild;
      const owner = await guild.fetchOwner();
      await guild.members.fetch();

      // Get member counts
      const totalMembers = guild.memberCount;
      const humans = guild.members.cache.filter(
        (member) => !member.user.bot
      ).size;
      const bots = guild.members.cache.filter((member) => member.user.bot).size;
      const onlineMembers = guild.members.cache.filter(
        (member) => member.presence?.status === "online"
      ).size;
      const idleMembers = guild.members.cache.filter(
        (member) => member.presence?.status === "idle"
      ).size;
      const dndMembers = guild.members.cache.filter(
        (member) => member.presence?.status === "dnd"
      ).size;
      const offlineMembers = guild.members.cache.filter(
        (member) => !member.presence || member.presence.status === "offline"
      ).size;

      // Get channel counts
      const totalChannels = guild.channels.cache.size;
      const textChannels = guild.channels.cache.filter(
        (c) => c.type === ChannelType.GuildText
      ).size;
      const voiceChannels = guild.channels.cache.filter(
        (c) => c.type === ChannelType.GuildVoice
      ).size;
      const categories = guild.channels.cache.filter(
        (c) => c.type === ChannelType.GuildCategory
      ).size;
      const announcements = guild.channels.cache.filter(
        (c) => c.type === ChannelType.GuildAnnouncement
      ).size;
      const stages = guild.channels.cache.filter(
        (c) => c.type === ChannelType.GuildStageVoice
      ).size;
      const forums = guild.channels.cache.filter(
        (c) => c.type === ChannelType.GuildForum
      ).size;

      // Get other stats
      const roles = guild.roles.cache.size - 1; // Exclude @everyone
      const emojis = guild.emojis.cache.size;
      const stickers = guild.stickers.cache.size;
      const boostCount = guild.premiumSubscriptionCount;
      const boostTier = guild.premiumTier;
      const verificationLevel = {
        0: "None",
        1: "Low",
        2: "Medium",
        3: "High",
        4: "Highest",
      }[guild.verificationLevel];

      // Format features list
      const features = guild.features.length
        ? guild.features.map((feature) => `\`${feature}\``).join(", ")
        : "None";

      // Create embed
      const embed = new EmbedBuilder()
        .setColor(client.color || "#2f3136")
        .setTitle(`${guild.name}'s Information`)
        .setThumbnail(guild.iconURL({ dynamic: true, size: 1024 }) || null)
        .setDescription(
          `
          ${client.emotes.ownzz} **Server Owner**: <@${owner.user.id}>
          ${client.emotes.membz} **Members**: ${totalMembers.toLocaleString()} 
          ${client.emotes.botz} **Bots**: ${bots.toLocaleString()}
          ${
            client.emotes.boostz
          } **Boost Tier**: ${boostTier} (${boostCount} boosts)
          `
        )
        .addFields(
          {
            name: "📋 General Information",
            value: [
              `**Name:** ${guild.name}`,
              `**ID:** \`${guild.id}\``,
              `**Owner:** <@${owner.user.id}>`,
            ].join("\n"),
            inline: false,
          },
          {
            name: "👥 Member Information",
            value: [
              `**Total Members:** ${totalMembers.toLocaleString()}`,
              `**Humans:** ${humans.toLocaleString()}`,
              `**Bots:** ${bots.toLocaleString()}`,
              ``,
              `${
                client.emotes.online || "🟢"
              } **Online:** ${onlineMembers.toLocaleString()}`,
              `${
                client.emotes.idle || "🟡"
              } **Idle:** ${idleMembers.toLocaleString()}`,
              `${
                client.emotes.dnd || "🔴"
              } **DND:** ${dndMembers.toLocaleString()}`,
              `${
                client.emotes.offline || "⚫"
              } **Offline:** ${offlineMembers.toLocaleString()}`,
            ].join("\n"),
            inline: true,
          },
          {
            name: "📊 Channel Information",
            value: [
              `${
                client.emotes.channelz
              } **Total Channels:** ${totalChannels.toLocaleString()}`,
              `**Text Channels:** ${textChannels.toLocaleString()}`,
              `**Voice Channels:** ${voiceChannels.toLocaleString()}`,
              `**Categories:** ${categories.toLocaleString()}`,
              `**Announcement Channels:** ${announcements.toLocaleString()}`,
              `**Stage Channels:** ${stages.toLocaleString()}`,
              `**Forums:** ${forums.toLocaleString()}`,
            ].join("\n"),
            inline: true,
          },
          {
            name: "🎨 Additional Information",
            value: [
              `${client.emotes.rolez} **Roles:** ${roles.toLocaleString()}`,
              `**Emojis:** ${emojis.toLocaleString()}`,
              `**Stickers:** ${stickers.toLocaleString()}`,
              `**Features:** ${features}`,
            ].join("\n"),
            inline: false,
          }
        )
        .setFooter({
          text: `Created by NotSoProgrammer 💤💤💤 `,
          iconURL: `https://cdn.discordapp.com/attachments/1316794280798326785/1326132132099264532/wp9525382.jpg?ex=677e504a&is=677cfeca&hm=1ab6ee6d426ce87021ddd1f5881466a45c08c1414051fd8eba4c030183dcff52&`,
        })
        .setTimestamp();

      // Add server banner if it exists
      if (guild.bannerURL()) {
        embed.setImage(guild.bannerURL({ size: 4096 }));
      }

      // Send embed
      await message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error("Server Info Command Error:", error);
      message.channel
        .send({
          embeds: [
            new EmbedBuilder()
              .setColor("Red")
              .setDescription(
                `${client.emotes.cross} | An error occurred while fetching server information.`
              ),
          ],
        })
        .catch(() => {});
    }
  },
};
