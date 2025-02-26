const { EmbedBuilder } = require("discord.js");
const { GoogleGenerativeAI } = require("@google/generative-ai");

module.exports = {
  name: "explain",
  description: "Explain code using AI",
  usage: "explain <code>",
  category: "developer",
  developerOnly: true, // This ensures only developers can use it
  run: async (client, message, args) => {
    // Check if user is a developer
    if (!client.config.ownerID.includes(message.author.id)) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription("❌ This command is only for developers!")
            .setColor(client.color),
        ],
      });
    }

    const code = args.join(" ");
    if (!code) return message.reply("Please provide some code to explain!");

    try {
      const genAI = new GoogleGenerativeAI(client.config.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });

      const result = await model.generateContent(
        `Explain this code in simple terms:\n\`\`\`\n${code}\n\`\`\``
      );

      const embed = new EmbedBuilder()
        .setTitle("Code Explanation")
        .setDescription(result.response.text())
        .setColor(client.color)
        .setTimestamp();

      message.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Code explanation error:", error);
      message.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription("❌ An error occurred while explaining the code!")
            .setColor(client.color),
        ],
      });
    }
  },
};
