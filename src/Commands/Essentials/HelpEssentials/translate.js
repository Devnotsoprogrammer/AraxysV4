const { EmbedBuilder } = require("discord.js");
const { GoogleGenerativeAI } = require("@google/generative-ai");

module.exports = {
  name: "translate",
  description: "Translate any message to English by replying to it",
  usage: "translate (reply to a message)",
  category: "essentials",
  cooldown: 1000,
  run: async (client, message, args) => {
    try {
      // Check if the message is a reply
      if (!message.reference) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `${client.emotes.cross} |  Reply to a message to translate it!`
              )
              .setColor(client.color),
          ],
        });
      }

      // Get the replied message
      const repliedMessage = await message.channel.messages.fetch(
        message.reference.messageId
      );

      if (!repliedMessage.content) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `${client.emotes.cross} |  Cannot translate an empty message!`
              )
              .setColor(client.color),
          ],
        });
      }

      // Show typing indicator
      await message.channel.sendTyping();

      // Initialize Gemini
      const genAI = new GoogleGenerativeAI(client.config.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });

      // Create translation prompt
      const prompt = `Translate the following text to English. If it's already in English, improve its grammar and clarity:
      "${repliedMessage.content}"
      
      Respond in this format:
      Translation: [translated text]
      Original Language: [detected language]`;

      const result = await model.generateContent(prompt);
      const response = result.response.text();

      // Create embed
      const embed = new EmbedBuilder()
        .setAuthor({
          name: repliedMessage.author.tag,
          iconURL: repliedMessage.author.displayAvatarURL(),
        })
        .setDescription(response)
        .setColor(client.color)
        .setFooter({
          text: `Requested by ${message.author.tag}`,
          iconURL: message.author.displayAvatarURL(),
        })
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Translation error:", error);
      message.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.emotes.cross} |  An error occurred while translating!`
            )
            .setColor(client.color),
        ],
      });
    }
  },
};
