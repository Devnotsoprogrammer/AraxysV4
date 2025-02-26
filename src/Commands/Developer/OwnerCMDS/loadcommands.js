const SlashCommandLoader = require("../../../core/slash"); // Adjust the path as needed

module.exports = {
  name: "loadcommands",
  description: "Load slash commands globally",
  async execute(client, message, args) {
    if (!client.config.botOwners.includes(message.author.id)) {
      return message.reply("You do not have permission to use this command.");
    }

    const slashCommandLoader = new SlashCommandLoader(client);
    try {
      await slashCommandLoader.execute("load");
      message.reply("Slash commands have been loaded globally.");
    } catch (error) {
      console.error("Error loading slash commands:", error);
      message.reply("There was an error loading the slash commands.");
    }
  },
};
