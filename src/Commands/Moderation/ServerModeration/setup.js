const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { GoogleGenerativeAI } = require("@google/generative-ai");

module.exports = {
  name: "setup",
  description: "Get help setting up bot features",
  usage: "setup <feature>",
  category: "essentials",
  run: async (client, message, args) => {
    // Check if user has admin permissions
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.emotes.cross} |  Only administrators can use this command!`
            )
            .setColor(client.color),
        ],
      });
    }

    const feature = args.join(" ").toLowerCase();
    if (!feature) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("🔧 Setup Assistant")
            .setDescription(
              "Please specify what you want to set up:\n\n" +
                "• `setup tickets` - Help with ticket system\n" +
                "• `setup prefix` - Help with custom prefix\n" +
                "• `setup antinuke` - Help with anti-nuke settings\n" +
                "• `setup moderation` - Help with moderation features"
            )
            .setColor(client.color),
        ],
      });
    }

    try {
      const genAI = new GoogleGenerativeAI(client.config.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });

      // Create context for the AI about bot features
      const setupContext = `
        You are a setup assistant for ${client.user.username} bot.
        Current server: ${message.guild.name}
        Feature requested: ${feature}
        
        Available commands and features:
        - Ticket system: &ticket setup, &ticket close, &ticket delete
        - Custom prefix: &prefix set, &prefix reset
        - Anti-nuke: &antinuke enable/disable, &whitelist add/remove
        - Moderation: &ban, &kick, &mute, &clear
        
        Provide step-by-step setup instructions for the requested feature.
        Include command examples and best practices.
        Mention required bot and user permissions.
      `;

      const result = await model.generateContent(setupContext);
      const response = result.response.text();

      const embed = new EmbedBuilder()
        .setTitle(`📝 Setup Guide: ${feature}`)
        .setDescription(response)
        .setColor(client.color)
        .setFooter({
          text: "Need more help? Join our support server!",
          iconURL: client.user.displayAvatarURL(),
        })
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Setup assistance error:", error);
      message.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.emotes.cross} |  An error occurred while getting setup help!`
            )
            .setColor(client.color),
        ],
      });
    }
  },
};
