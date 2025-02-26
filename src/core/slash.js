const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");
const config = require("../config.json"); // Assuming your config file contains your bot token and IDs
const { config: dotenvConfig } = require("dotenv");

dotenvConfig();

class SlashCommandLoader {
  constructor(client) {
    this.client = client;
    this.slashCommands = new Map();
    this.commandsArray = [];
    this.rest = new REST({ version: "10" }).setToken(process.env.pass);
  }

  loadCommands() {
    const loadSlashCommands = (dir) => {
      const commandFiles = fs
        .readdirSync(dir)
        .filter((file) => file.endsWith(".js"));

      for (const file of commandFiles) {
        try {
          const command = require(path.join(dir, file));
          
          // Check if command has required properties
          if (!command.data) {
            console.log(`[WARNING] The command at ${file} is missing 'data' property.`);
            continue;
          }

          if (!command.execute) {
            console.log(`[WARNING] The command at ${file} is missing 'execute' property.`);
            continue;
          }

          if (!command.data.name) {
            console.log(`[WARNING] The command at ${file} is missing 'data.name' property.`);
            continue;
          }

          this.client.slashCommands.set(command.data.name, command);
          this.commandsArray.push(command.data.toJSON());
          console.log(`Loaded slash command: ${command.data.name}`);
        } catch (error) {
          console.error(`Error loading command from ${file}:`, error);
        }
      }

      const subDirs = fs
        .readdirSync(dir)
        .filter((file) => fs.statSync(path.join(dir, file)).isDirectory());

      subDirs.forEach((subDir) => loadSlashCommands(path.join(dir, subDir)));
    };

    loadSlashCommands(path.join(__dirname, "..", "Commands-slash"));

    console.log(`Total Slash Commands Loaded: ${this.client.slashCommands.size}`);
  }

  async registerCommands() {
    try {
      await this.rest.put(
        Routes.applicationGuildCommands(config.CLIENT_ID, config.GUILD_ID),
        { body: this.commandsArray }
      );
      console.log("Successfully registered application commands.");
    } catch (error) {
      console.error("Error registering application commands:", error);
    }
  }

  async removeCommands() {
    try {
      await this.rest.put(
        Routes.applicationGuildCommands(config.CLIENT_ID, config.GUILD_ID),
        { body: [] }
      );
      console.log("Successfully removed all application commands.");
    } catch (error) {
      console.error("Error removing application commands:", error);
    }
  }

  async execute(action) {
    switch (action) {
      case "load":
        this.loadCommands();
        await this.registerCommands();
        break;
      case "remove":
        await this.removeCommands();
        break;
      default:
        console.log('Unknown action. Use "load" or "remove".');
    }
  }
}

module.exports = SlashCommandLoader;
