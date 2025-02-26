const {
  Client,
  Collection,
  GatewayIntentBits,
  EmbedBuilder,
  Partials,
} = require("discord.js");
const { Database } = require("quickmongo");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const { QuickDB } = require("quick.db");
const SlashCommandLoader = require("./slash");
const MemorySweeper = require("../Handler/sweeper");
const AutomodHelper = require("../utils/automodHelper");
const Util = require("./util");
const { config: dotenvConfig } = require("dotenv");

dotenvConfig();

class Araxys extends Client {
  constructor(options) {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildPresences,
      ],
      partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction,
        Partials.User,
        Partials.GuildMember,
      ],
      allowedMentions: { parse: ["users", "roles"] },
      presence: { status: "dnd" },
      disableEveryone: true,
      shards: "auto",
      fetchAllMembers: false,
      ...options,
    });

    this.commands = new Collection();
    this.aliases = new Collection();
    this.config = require("../config.json");
    this.embed = new EmbedBuilder();
    this.data = new QuickDB();
    this.db = new Database(process.env.MONGO_DB);
    this.logger = console;
    this.color = `#000000`;
    this.color2 = `#2b2d31`;
    this.slashCommands = new Collection();
    this.slashCommandLoader = new SlashCommandLoader(this);
    this.queues = new Collection();
    this.util = new Util(this);

    this.emotes = {
      ownzz: "<:Araxys_owner:1330900092370292789>",
      membz: "<:Araxys_member:1330898155990028383>",
      botz: "<:Araxys_bot:1330898065154117663>",
      boostz: "<:Araxys_boost:1330898222452965426>",
      channelz: "<:Araxys_channel:1330898263246770186>",
      rolez: "<:Araxys_rolezz:1330898315579228212>",
      dev: "<:AraxysOwner:1330901574008045701>",
      ban: "<:Araxys_ban:1330897766377062441>",
      cross: "<:Araxys_cross:1330897688064950322>",
      tick: "<:Araxys_tick:1330897643378966683>",
      dot: ">",
      secure: "<:Araxys_security:1330897923223060480>",
      protect: "<:Araxys_protect:1330897860249522196>",
      loadz: "<a:Araxys_loadz:1330897039256719360>",
      offon: "<:Araxys_offon:1330899590375018536>",
      offoff: "<:Araxys_offoff:1330899743882088479>",
      onon: "<:Araxys_onon:1330899936249647134>",
      onoff: "<:Araxys_onoff:1330899782431932416>",
      online: "<:Araxys_Online:1330900403017224277>",
      dnd: "<:Araxys_DoNotDisturb:1330900266827911240>",
      idle: "<:Araxys_Idle:1330900321299337358>",
      offline: "<:Araxys_offline_gray:1330900203972198422>",
    };

    this.memorySweeper = new MemorySweeper(this);
  }

  initializeCommands() {
    const commandFiles = this.getFiles(path.join(__dirname, "..", "Commands"));
    let aliasCount = 0;

    commandFiles.forEach((file) => {
      const command = require(file);
      if (!command.name) {
        console.error(`Command file ${file} does not have a name property.`);
      } else {
        this.commands.set(command.name.toLowerCase(), command);
        console.log(`Loaded command: ${command.name}`);
      }

      if (Array.isArray(command.aliases)) {
        command.aliases.forEach((alias) => {
          this.aliases.set(alias.toLowerCase(), command);
          aliasCount++;
        });
        console.log(
          `Command: ${command.name} has ${command.aliases.length} aliases`
        );
      } else {
        console.log(`Command: ${command.name} has no aliases`);
      }
    });

    console.log(`Total Commands Loaded: ${this.commands.size}`);
    console.log(`Total Aliases Loaded: ${aliasCount}`);
  }

  getFiles(dir, extension = ".js") {
    let filesList = [];
    const files = fs.readdirSync(dir);

    files.forEach((file) => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        filesList = filesList.concat(this.getFiles(filePath, extension));
      } else if (file.endsWith(extension)) {
        filesList.push(filePath);
      }
    });

    return filesList;
  }

  initializeEvents() {
    const eventFiles = this.getFiles(path.join(__dirname, "..", "events"));
    let eventCount = 0;

    eventFiles.forEach((file) => {
      const event = require(file);
      if (event.once) {
        this.once(event.name, (...args) => event.execute(...args, this));
      } else {
        this.on(event.name, (...args) => event.execute(...args, this));
      }
      eventCount++;
    });

    console.log(`Total Events Loaded: ${eventCount}`);
  }

  async initializeMongoose() {
    this.db = new Database(process.env.MONGO_DB);
    await this.db.connect();
    this.logger.log(`Connecting to MongoDb...`);

    try {
      await mongoose.connect(process.env.MONGO_DB, {});
      this.logger.log("Mongoose Database Connected", "ready");
    } catch (err) {
      console.error("Failed to connect to MongoDB", err);
      if (this.errorHandler) {
        await this.errorHandler.handleError(err, {
          type: "DATABASE_INIT",
          action: "MongoDB Initialization",
        });
      }
      throw err;
    }
  }

  async initializeData() {
    try {
      console.log("[DATABASE] Initializing SQL connection...");
      this.data = new QuickDB();
      console.log("[DATABASE] SQL connection established successfully");
    } catch (error) {
      console.error("[DATABASE] Failed to initialize SQL:", error);
      if (this.errorHandler) {
        await this.errorHandler.handleError(error, {
          type: "DATABASE_INIT",
          action: "SQL Initialization",
        });
      }
      throw error;
    }
  }

  loadSlashCommands() {
    this.slashCommandLoader.loadCommands();
    this.slashCommandLoader.registerCommands();
  }

  startSweeper() {
    this.memorySweeper.setup();
  }

  async ready() {
    await super.ready();
    setInterval(() => {
      AutomodHelper.cleanOldMutes(this);
      AutomodHelper.resetOldWarnings();
    }, 300000); // Check every 5 minutes
  }
}

module.exports = Araxys;
