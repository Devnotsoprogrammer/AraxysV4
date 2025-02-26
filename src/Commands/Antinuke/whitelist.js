const {
  Client,
  Message,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  StringSelectMenuInteraction,
  ButtonInteraction,
} = require("discord.js");
const Araxys = require("../../core/Araxys");

const GrantUser = ["1203931944421949533"]; // List of grant users

module.exports = {
  name: "whitelist",
  description: "Manage user whitelisting for specific actions.",
  usage: "<user>",
  category: "moderation",
  run: async (client, message, args) => {
    return message.reply("This Command Is Under Development!");
    try {
      const guildId = message.guild.id;
      const executorId = message.author.id;
      const user =
        message.mentions.users.first() || (await client.users.fetch(args[0]));

      if (!user) {
        return message.reply("Please mention a user or provide their ID.");
      }

      // Check permissions
      const hasPermission = await hasManageWhitelistPermission(
        client,
        guildId,
        executorId
      );
      if (!hasPermission) {
        return message.reply("You do not have permission to use this command.");
      }

      // Check if the user is already whitelisted
      const whitelistData = await client.db.get(`${guildId}_${user.id}_wl`);
      const existingActions = getWhitelistedActions(whitelistData || {});

      if (existingActions.length > 0) {
        const rows = createComponentRows(existingActions);
        const msg = await message.reply({
          content: `User ${
            user.tag
          } is already whitelisted for actions: ${existingActions.join(
            ", "
          )}. Select additional actions to whitelist:`,
          components: rows,
        });

        // Handle the select menu and button interactions
        const filter = (i) =>
          (i.customId === "whitelist_actions" ||
            i.customId === "whitelist_all" ||
            i.customId === "continue") &&
          i.user.id === executorId;
        const collector = msg.createMessageComponentCollector({
          filter,
          time: 60000,
        });

        collector.on("collect", async (interaction) => {
          if (interaction.customId === "whitelist_all") {
            await whitelistUserForAllActions(client, guildId, user);
            await interaction.update({
              content: `User ${user.tag} has been whitelisted for all actions.`,
              components: [],
            });
          } else if (interaction.customId === "continue") {
            await interaction.update({
              content: "Continuing with the next steps...",
              components: [],
            });
            // You can add the continuation logic here
          } else if (interaction instanceof StringSelectMenuInteraction) {
            await whitelistUserForSelectedActions(
              client,
              guildId,
              user,
              interaction.values
            );
            await interaction.update({
              content: `User ${
                user.tag
              } has been whitelisted for actions: ${interaction.values.join(
                ", "
              )}`,
              components: [],
            });
          }
        });

        collector.on("end", (collected, reason) => {
          if (reason === "time") {
            msg.edit({
              content: "Whitelist selection timed out.",
              components: [],
            });
          }
        });
      } else {
        const rows = createComponentRows([]);
        const msg = await message.reply({
          content: "Select actions to whitelist for this user:",
          components: rows,
        });

        // Handle the select menu and button interactions
        const filter = (i) =>
          (i.customId === "whitelist_actions" ||
            i.customId === "whitelist_all" ||
            i.customId === "continue") &&
          i.user.id === executorId;
        const collector = msg.createMessageComponentCollector({
          filter,
          time: 60000,
        });

        collector.on("collect", async (interaction) => {
          if (interaction.customId === "whitelist_all") {
            await whitelistUserForAllActions(client, guildId, user);
            await interaction.update({
              content: `User ${user.tag} has been whitelisted for all actions.`,
              components: [],
            });
          } else if (interaction.customId === "continue") {
            await interaction.update({
              content: "Continuing with the next steps...",
              components: [],
            });
            // You can add the continuation logic here
          } else if (interaction instanceof StringSelectMenuInteraction) {
            await whitelistUserForSelectedActions(
              client,
              guildId,
              user,
              interaction.values
            );
            await interaction.update({
              content: `User ${
                user.tag
              } has been whitelisted for actions: ${interaction.values.join(
                ", "
              )}`,
              components: [],
            });
          }
        });

        collector.on("end", (collected, reason) => {
          if (reason === "time") {
            msg.edit({
              content: "Whitelist selection timed out.",
              components: [],
            });
          }
        });
      }
    } catch (error) {
      console.error("Error executing whitelist command:", error);
      message.reply("There was an error executing the command.");
    }
  },
};

async function hasManageWhitelistPermission(client, guildId, executorId) {
  const guildOwnerId = await client.guilds
    .fetch(guildId)
    .then((guild) => guild.ownerId);
  const isExtraOwner = await client.util.isExtraOwner(guildId, executorId);
  return (
    executorId === guildOwnerId ||
    GrantUser.includes(executorId) ||
    isExtraOwner
  );
}

function getWhitelistedActions(whitelistData) {
  return Object.keys(whitelistData).filter((action) => whitelistData[action]);
}

function createComponentRows(existingActions) {
  const allOptions = [
    { label: "Ban", value: "ban", description: "Authorise user Ban action" },
    { label: "Kick", value: "kick", description: "Authorise user Kick action" },
    {
      label: "Prune",
      value: "prune",
      description: "Authorise user Prune action",
    },
    {
      label: "Bot Add",
      value: "botadd",
      description: "Authorise user to add bot to server ⚠️",
    },
    {
      label: "Server Update",
      value: "serverup",
      description: "Authorise user to Update Server Settings⚠️",
    },
    {
      label: "Member Update",
      value: "memup",
      description: "Authorise user to Update Members Roles/Names⚠️",
    },
    {
      label: "Channel Create",
      value: "chcr",
      description: "Authorise user to Create Channels Action",
    },
    {
      label: "Channel Update",
      value: "chup",
      description: "Authorise user to Update Channels Action",
    },
    {
      label: "Channel Delete",
      value: "chdl",
      description: "Authorise user to Delete Channels Action",
    },
    {
      label: "Role Create",
      value: "rlcr",
      description: "Authorise user to Create Roles Action⚠️",
    },
    {
      label: "Role Delete",
      value: "rldl",
      description: "Authorise user to Update Roles Action",
    },
    {
      label: "Role Update",
      value: "rlup",
      description: "Authorise user to Delete Roles Action⚠️",
    },
    {
      label: "Mention Everyone",
      value: "meneve",
      description: "Authorise user to Mention Evertyone Action⚠️",
    },
    {
      label: "Manage Webhooks",
      value: "mngweb",
      description: "Authorise user to Manage Webhooks Action",
    },
    {
      label: "Manage Emojis",
      value: "mngstemo",
      description: "Authorise user to Manage Emojis Action",
    },
  ];

  const filteredOptions =
    existingActions.length > 0
      ? allOptions.filter((option) => !existingActions.includes(option.value))
      : allOptions;

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId("whitelist_actions")
    .setPlaceholder("Select actions to whitelist")
    .setMinValues(1)
    .setMaxValues(filteredOptions.length)
    .addOptions(filteredOptions);

  const whitelistAllButton = new ButtonBuilder()
    .setCustomId("whitelist_all")
    .setLabel("Whitelist For EveryAction")
    .setStyle(ButtonStyle.Primary);

  const continueButton = new ButtonBuilder()
    .setCustomId("continue")
    .setLabel("Continue")
    .setStyle(ButtonStyle.Secondary);

  // Split components into multiple rows if needed
  const rows = [new ActionRowBuilder().addComponents(selectMenu)];
  rows.push(
    new ActionRowBuilder().addComponents(whitelistAllButton, continueButton)
  );

  return rows;
}

async function whitelistUserForAllActions(client, guildId, user) {
  const allActions = [
    "ban",
    "kick",
    "prune",
    "botadd",
    "serverup",
    "memup",
    "chcr",
    "chup",
    "chdl",
    "rlcr",
    "rldl",
    "rlup",
    "meneve",
    "mngweb",
    "mngstemo",
  ];
  const whitelist = allActions.reduce(
    (acc, action) => ({ ...acc, [action]: true }),
    {}
  );

  await client.db.set(`${guildId}_${user.id}_wl`, whitelist);
}

async function whitelistUserForSelectedActions(
  client,
  guildId,
  user,
  selectedActions
) {
  const whitelist = selectedActions.reduce(
    (acc, action) => ({ ...acc, [action]: true }),
    {}
  );

  await client.db.set(`${guildId}_${user.id}_wl`, whitelist);
}
