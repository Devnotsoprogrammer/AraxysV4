const Araxys = require("./src/core/Araxys");
const config = require("./src/config.json");
const client = new Araxys(config);
const { config: dotenvConfig } = require("dotenv");

dotenvConfig();

(async () => {
  await client.initializeMongoose();
  await client.initializeData();
  await client.initializeEvents();
  await client.initializeCommands();
  await client.loadSlashCommands();

  await client.login(process.env.pass);
  client.once("ready", () => {
    console.log(`Logged in as ${client.user.tag}!`);
    client.startSweeper();
  });
})();
