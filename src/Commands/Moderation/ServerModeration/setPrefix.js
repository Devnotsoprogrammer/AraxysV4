const { EmbedBuilder } = require("discord.js");
const guildPrefixSchema = require(`../../../models/guildPrefixSchema`);

module.exports = {
  name: "setprefix",
  description: "Set a custom prefix for the guild (Owner only).",
  usage: "setprefix <new_prefix>",
  category: ["moderation", "sentinels"],
  cooldown: 60000,
  run: async (client, message, args) => {
    if (message.guild.ownerId !== message.author.id) {
      return message.reply("Only the guild owner can set the prefix.");
    }

    const newPrefix = args[0];
    if (!newPrefix) {
      const embed = new EmbedBuilder().setDescription(
        `**Usage:** \`${client.config.prefix}setprefix <new_prefix>\``
      );
      return message.reply({ embeds: [embed] });
    }

    if (newPrefix.length > 3) {
      const embed = new EmbedBuilder()
        .setDescription("Prefix cannot be longer than 3 characters!")
        .setColor("Red");
      return message.reply({ embeds: [embed] });
    }

    if (newPrefix === client.config.prefix) {
      const embed = new EmbedBuilder()
        .setDescription(`Prefix cannot be the same as the default prefix (\`${client.config.prefix}\`)!`)
        .setColor("Red");
      return message.reply({ embeds: [embed] });
    }

    try {
      const guildId = message.guild.id;
      let guildConfig = await guildPrefixSchema.findOne({ GuildId: guildId });

      if (!guildConfig) {
        guildConfig = new guildPrefixSchema({
          GuildId: guildId,
          Prefix: newPrefix,
        });
      } else {
        guildConfig.Prefix = newPrefix;
      }

      await guildConfig.save();

      const embed = new EmbedBuilder()
        .setTitle("Prefix Set")
        .setDescription(`Prefix has been set to \`${newPrefix}\``)
        .setColor("Green");
      return message.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const errorEmbed = new EmbedBuilder()
        .setTitle("Error")
        .setDescription(`An error occurred: ${error.message}`)
        .setColor("Red");
      return message.reply({ embeds: [errorEmbed] });
    }
  },
};
