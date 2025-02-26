const { EmbedBuilder } = require("discord.js");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { config: dotenvConfig } = require("dotenv");
const { checkRateLimit } = require("../../utils/rateLimiter");
const fs = require("fs");
const path = require("path");
const config = require("../../config.json");

dotenvConfig();

// Option 1: Use HuggingFace's free API
// const { HfInference } = require("@huggingface/inference");
// const hf = new HfInference(process.env.HF_API_KEY); // Free API key from HuggingFace

// Option 2: Use Google's Gemini API (Currently offers free tier)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Option 3: Use Claude-2 API (Has free trial)
// const { Claude } = require("@anthropic-ai/sdk");
// const claude = new Claude(process.env.CLAUDE_API_KEY);

// Initialize Gemini
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

// Function to scan commands directory
function scanCommands() {
  const commandsDir = path.join(__dirname, "../../Commands");
  const categories = {};
  const hiddenCategories = ["music", "antinuke", "fun"]; // Categories to hide as "coming soon"
  const devOnlyCategories = ["developer", "dev", "owner", "premium"]; // Categories to hide completely

  // Recursive function to scan directories
  function scanDir(dir, categoryName) {
    const commands = {};

    fs.readdirSync(dir).forEach((file) => {
      const fullPath = path.join(dir, file);

      if (fs.statSync(fullPath).isDirectory()) {
        // Recursively scan subdirectories
        const subCommands = scanDir(fullPath, file);
        Object.assign(commands, subCommands);
      } else if (file.endsWith(".js")) {
        const command = require(fullPath);
        // Skip if it's a developer command or missing required properties
        if (command.name && command.description && !command.developerOnly) {
          commands[command.name] = {
            description: command.description,
            usage: command.usage || `${config.prefix}${command.name}`,
          };
        }
      }
    });

    return commands;
  }

  // Read all category folders
  fs.readdirSync(commandsDir).forEach((category) => {
    const categoryPath = path.join(commandsDir, category);

    if (fs.statSync(categoryPath).isDirectory()) {
      // Skip developer-only categories
      if (
        devOnlyCategories.some((devCat) =>
          category.toLowerCase().includes(devCat)
        )
      ) {
        return;
      }

      const commands = scanDir(categoryPath, category);

      // Only add category if it has visible commands
      if (Object.keys(commands).length > 0) {
        categories[category.toLowerCase()] = {
          commands,
          isComingSoon: hiddenCategories.includes(category.toLowerCase()),
        };
      }
    }
  });

  return categories;
}

// Bot information structure
const botInfo = {
  name: "Araxys",
  prefix: "&",
  owner: {
    name: "NotSoProgrammer",
    discord: "notsoprogrammer",
  },
  supportServer: "discord.gg/your-invite-link",
  commands: scanCommands(),
  premiumFeatures: [
    "Coming soon features will be added to premium",
    "Priority support",
  ],
  links: {
    invite: `https://discord.com/api/oauth2/authorize?client_id=${config.CLIENT_ID}&permissions=8&scope=bot`,
    support: "discord.gg/your-invite-link",
  },
};

// Function to generate AI context
function generateContext() {
  let context = `You are ${botInfo.name}, a Discord bot assistant created by ${botInfo.owner.name}. Here's your core information:

    IDENTITY:
    - You are a helpful Discord bot named ${botInfo.name}
    - Your prefix is "${botInfo.prefix}"
    - You were created by ${botInfo.owner.name} (${botInfo.owner.discord})
    - Your support server is at ${botInfo.supportServer}

    AVAILABLE FEATURES:\n`;

  // Add categories and commands
  Object.entries(botInfo.commands).forEach(([category, data]) => {
    if (data.isComingSoon) {
      context += `${category.toUpperCase()}: Coming Soon!\n`;
    } else {
      context += `${category.toUpperCase()}:\n`;
      Object.entries(data.commands).forEach(([cmdName, cmdInfo]) => {
        context += `- ${botInfo.prefix}${cmdName}: ${cmdInfo.description}\n`;
      });
    }
  });

  context += `
  BEHAVIOR RULES:
- Be friendly and helpful
- Keep responses concise and relevant
- If unsure about a command, suggest using ${botInfo.prefix}help
- Never execute commands, only explain them
- If someone asks about the Ticket command, reply to use the Slash Command for Ticket Setup! Use \`/ticket-setup #channel @role #open-ticket-category #closed-ticket-category\` rather than prefix commands. The Slash command for the ticket has better options and is easier to use.
- For coming soon features, explain they're under development
- Direct users to the support server for complex issues
- Mention premium features when relevant
- If someone asks about newly developed commands, explain their functions accurately. For commands in development, mention that they are being actively developed and will be available soon.
- Commands like Moderation: role <add/remove/give/clear/all> <user/group> <role>, purge, warn, and other related commands are developed.
- Essentials/Utility: UserInfo, RoleInfo, Invite, SupportServer commands are developed.
- For commands like &music and &fun, explain they're not yet under development but planned for the future.
- Commands such as antinuke, extraowner, whitelist, verification, and warnpunishment are under development.

When asked about commands, explain their functions accurately. For coming soon features, mention they're being actively developed and will be available soon.
If the user starts with <@1203931944421949533>, they are your Developer.
If someone asks who they are, reply they're a normal human being! You only have info about your Master and Developer. 
If someone asks who is the master, explain that the Master is the actual programmer who developed you.
    `;

  return context;
}

module.exports = {
  name: "messageCreate",
  async execute(message, client) {
    if (!message.guild && !message.author.bot) {
      if (!checkRateLimit(message.author.id)) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                "⏰ Please wait a minute before sending more questions!"
              )
              .setColor("Red"),
          ],
        });
      }

      try {
        await message.channel.sendTyping();

        const result = await model.generateContent(
          generateContext() + "\n\n" + message.content
        );
        const response = result.response.text();

        const embed = new EmbedBuilder()
          .setTitle("🤖 Bot Assistant")
          .setDescription(response)
          .setColor(client.color)
          .setFooter({
            text: "AI-powered support | Use &help in a server for commands",
            iconURL: client.user.displayAvatarURL(),
          })
          .setTimestamp();

        await message.reply({ embeds: [embed] });

        // Log the interaction
        const loggingChannel = client.channels.cache.get(config.channelID);
        if (loggingChannel) {
          const logEmbed = new EmbedBuilder()
            .setTitle("DM Support Interaction")
            .addFields(
              {
                name: "User",
                value: `${message.author.tag} (${message.author.id})`,
              },
              { name: "Question", value: message.content },
              { name: "Response", value: response }
            )
            .setColor(client.color)
            .setTimestamp();

          await loggingChannel.send({ embeds: [logEmbed] });
        }
      } catch (error) {
        console.error("Error in DM handler:", error);
        message.reply(
          "I'm having trouble processing your question right now. Please try again later or ask in our support server!"
        );
      }
    }
  },
};
