const {
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
} = require("discord.js");

module.exports = {
  name: "invite",
  description: "Get the invite link of the bot",
  usage: "invite",
  category: ["essentials", "utilities"],
  cooldown: 5000,
  run: async (client, message, args) => {
    const invite = new ButtonBuilder()
      .setLabel("Invite")
      .setURL(
        "https://discord.com/oauth2/authorize?client_id=1328259642568216639&permissions=8&response_type=code&redirect_uri=https%3A%2F%2Fdiscord.gg%2FwwcPCQ2emf&integration_type=0&scope=identify+bot+guilds"
      )
      .setStyle(ButtonStyle.Link);

    const row = new ActionRowBuilder().addComponents(invite);

    const embed = new EmbedBuilder()
      .setTitle("Invite")
      .setDescription("Click the button below to invite me to your server!")
      .setFields({
        name: "Created by Liquid Code Creation Team",
        value: "https://discord.gg/wwcPCQ2emf",
      })
      .setColor(client.color)
      .setFooter({
        text: `Created by NotSoProgrammer`,
        iconURL: `https://cdn.discordapp.com/attachments/1316794280798326785/1326132132099264532/wp9525382.jpg?ex=677e504a&is=677cfeca&hm=1ab6ee6d426ce87021ddd1f5881466a45c08c1414051fd8eba4c030183dcff52&`,
      })
      .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 512 }))
      .setTimestamp();

    await message.reply({ embeds: [embed], components: [row] });
  },
};
