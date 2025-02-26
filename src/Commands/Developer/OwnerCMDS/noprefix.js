const { EmbedBuilder } = require("discord.js");
const noprefixSchema = require(`../../../models/noprefixSchema`);

const master = ["1203931944421949533", "931512484769189898"];

module.exports = {
  name: "noprefix",
  aliases: ["np"],
  description: "Set a custom prefix for the guild (Owner only).",
  usage: "noprefix <prefix>",
  category: "developer",
  run: async (client, message, args) => {
    if (!master.includes(message.author.id))
      return message.reply(
        "You are not my Master. You can't use this command."
      );
    if (!args[0]) {
      const embed = new EmbedBuilder().setDescription(
        `**Usage:** \`${client.config.prefix}noprefix add/remove/list <@user.Id>\` Master how can you forget?`
      );
      return message.reply({ embeds: [embed] });
    }

    const subcommand = args[0].toLowerCase();
    if (subcommand === "add") {
      const user = message.mentions.users.first(); // Use message.mentions.users
      if (!user) {
        const embed = new EmbedBuilder().setDescription(
          `Master please provide a valid user.`
        );
        return message.reply({ embeds: [embed] });
      }

      try {
        const existingUser = await noprefixSchema.findOne({
          userId: user.id,
        });
        if (existingUser) {
          const embed = new EmbedBuilder().setDescription(
            `Master this user already has a prefix.`
          );
          return message.reply({ embeds: [embed] });
        }
        const newUser = new noprefixSchema({
          userId: user.id,
        });
        await newUser.save();
        const embed = new EmbedBuilder().setDescription(
          `Master ${user} has been added to the no prefix list.`
        );
        return message.reply({ embeds: [embed] });
      } catch (error) {
        console.error(error);
        const errorEmbed = new EmbedBuilder()
          .setTitle("Error")
          .setDescription(`An error occurred: ${error.message}`)
          .setColor("Red");
        return message.reply({ embeds: [errorEmbed] });
      }
    }

    if (subcommand === "remove") {
      const user = message.mentions.users.first(); // Use message.mentions.users
      if (!user) {
        const embed = new EmbedBuilder().setDescription(
          `Master please provide a valid user.`
        );
        return message.reply({ embeds: [embed] });
      }
      try {
        const removedUser = await noprefixSchema.findOneAndDelete({
          userId: user.id,
        });

        if (!removedUser) {
          const embed = new EmbedBuilder().setDescription(
            `Master this user is not in the no prefix list.`
          );
          return message.reply({ embeds: [embed] });
        }
        const embed = new EmbedBuilder().setDescription(
          `Master ${user} has been removed from the no prefix list.`
        );
        return message.reply({ embeds: [embed] });
      } catch (error) {
        console.error(error);
        const errorEmbed = new EmbedBuilder()
          .setTitle("Error")
          .setDescription(`An error occurred: ${error.message}`)
          .setColor("Red");
        return message.reply({ embeds: [errorEmbed] });
      }
    }

    if (subcommand === "list") {
      try {
        const users = await noprefixSchema.find({});
        if (users.length === 0) {
          const embed = new EmbedBuilder().setDescription(
            `Master there are no users in the no prefix list.`
          );
          return message.reply({ embeds: [embed] });
        }
        const userList = users.map((user) => `<@${user.userId}>`).join("\n");
        const embed = new EmbedBuilder()
          .setTitle("NoPrefix List")
          .setDescription(userList)
          .setColor("#171717");

        message.reply({ embeds: [embed] });
      } catch (error) {
        console.error(error);
        const errorEmbed = new EmbedBuilder()
          .setTitle("Error")
          .setDescription(`An error occurred: ${error.message}`)
          .setColor("Red");
        return message.reply({ embeds: [errorEmbed] });
      }
    } else {
      const embed = new EmbedBuilder().setDescription(
        `Master please provide a valid subcommand. Like \`${client.config.prefix}noprefix add/remove/list <@user.Id>\` Master how can you forget?`
      );

      return message.reply({ embeds: [embed] });
    }
  },
};
