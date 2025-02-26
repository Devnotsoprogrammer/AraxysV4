const {
  EmbedBuilder,
  PermissionsBitField,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} = require("discord.js");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// Database setup
const dbPath = path.join(__dirname, "../../../db/warndb.db"); // Adjust the path as necessary
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error opening database:", err);
  } else {
    db.run(`CREATE TABLE IF NOT EXISTS warnings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      moderator_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
  }
});

module.exports = {
  name: "warn",
  description: "Manage user warnings.",
  usage: "warn <add/remove/clear/show> <user> <reason>",
  category: ["moderation"],
  userPermissions: [PermissionsBitField.Flags.ModerateMembers],
  botPermissions: [PermissionsBitField.Flags.ModerateMembers],
  cooldown: 5000,

  run: async (client, message, args) => {
    try {
      if (!message.guild) {
        return message.reply({ embeds: [new EmbedBuilder().setColor(client.color).setDescription("This command can only be used in a server.")] });
      }

      // Check if the user has the required permission
      if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
        return message.reply({ embeds: [new EmbedBuilder().setColor(client.color).setDescription("You do not have permission to use this command.")] });
      }

      const subcommand = args[0]?.toLowerCase();
      const user = message.mentions.members.first() || message.guild.members.cache.get(args[1]);

      if (!user) {
        return message.reply({ embeds: [new EmbedBuilder().setColor(client.color).setDescription("Please specify a valid user.")] });
      }

      // Check for self-warn
      if (user.id === message.author.id) {
        return message.reply({ embeds: [new EmbedBuilder().setColor(client.color).setDescription("You cannot warn yourself.")] });
      }

      // Check for bot warn
      if (user.user.bot) {
        return message.reply({ embeds: [new EmbedBuilder().setColor(client.color).setDescription("You cannot warn bots.")] });
      }

      // Check if the user is in the ownerIds list
      if (client.config.ownerIds.includes(user.id)) {
        return message.reply({ embeds: [new EmbedBuilder().setColor(client.color).setDescription("You cannot warn my master.")] });
      }

      // Check role hierarchy
      if (
        message.member.roles.highest.position <= user.roles.highest.position &&
        !message.guild.ownerId &&
        !client.config.ownerIds.includes(message.author.id)
      ) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(client.color)
              .setDescription(
                "You can't warn someone with a higher or equal role."
              ),
          ],
        });
      }

      // Check if the user is the guild owner
      if (message.guild.ownerId === user.id) {
        return message.reply({ embeds: [new EmbedBuilder().setColor(client.color).setDescription("You cannot warn the guild owner.")] });
      }

      switch (subcommand) {
        case "add": {
          const reason = args.slice(2).join(" ") || "No reason provided.";
          await addWarning(client, message, user, reason);
          break;
        }

        case "remove": {
          await handleRemoveWarnings(client, message, user);
          break;
        }

        case "clear": {
          await handleClearWarnings(client, message, user);
          break;
        }

        case "show": {
          await showWarnings(client, message, user);
          break;
        }

        default: {
          return message.reply({ embeds: [new EmbedBuilder().setColor(client.color).setDescription("Invalid subcommand. Use add, remove, clear, or show.")] });
        }
      }
    } catch (error) {
      console.error('Error in warn command:', error);
      return message.reply({ embeds: [new EmbedBuilder().setColor(client.color).setDescription("An error occurred while executing the command.")] });
    }
  },
};

// Helper Functions

async function addWarning(client, message, user, reason) {
  try {
    await db.run("INSERT INTO warnings (user_id, moderator_id, reason) VALUES (?, ?, ?)", [user.id, message.author.id, reason]);
    const count = await getWarningCount(user.id); // Get the updated count after adding the warning
    await message.reply({ embeds: [new EmbedBuilder().setColor(client.color).setDescription(`Warning added for ${user}. Total warnings: ${count}. Reason: ${reason}`)] });
  } catch (error) {
    console.error('Error adding warning:', error);
    await message.reply({ embeds: [new EmbedBuilder().setColor(client.color).setDescription("Failed to add warning.")] });
  }
}

async function handleRemoveWarnings(client, message, user) {
  const warnings = await getWarnings(user.id);
  if (!warnings.length) {
    return message.reply({ embeds: [new EmbedBuilder().setColor(client.color).setDescription("User has no warnings to remove.")] });
  }

  const options = warnings.map((warn, index) => ({
    label: `Warning ${index + 1} - ${warn.reason}`,
    value: warn.id.toString(),
  }));

  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('select_warning')
      .setPlaceholder('Select warnings to remove')
      .setOptions(options)
      .setMinValues(1) // Minimum selection
      .setMaxValues(options.length) // Maximum selection
  );

  const replyMessage = await message.reply({ embeds: [new EmbedBuilder().setColor(client.color).setDescription('Select warnings to remove:')], components: [row] });

  // Handle interaction for removing warnings
  const filter = (interaction) => interaction.user.id === message.author.id;
  const collector = replyMessage.createMessageComponentCollector({ filter, time: 15000 });

  collector.on('collect', async (interaction) => {
    await interaction.deferUpdate(); // Acknowledge the interaction

    const selectedWarnings = interaction.values; // Get selected warning IDs
    const selectedWarningsList = selectedWarnings.map(id => {
      const warning = warnings.find(warn => warn.id.toString() === id);
      return `Warning ${warnings.indexOf(warning) + 1} - ${warning.reason}`; // Correctly map to the warning index
    }).join(", "); // Create a string of selected warning IDs with reasons

    const confirmRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('confirm_remove').setLabel('Continue').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('cancel_remove').setLabel('Cancel').setStyle(ButtonStyle.Secondary)
    );

    const confirmationMessage = await interaction.followUp({ embeds: [new EmbedBuilder().setColor(client.color).setDescription(`You selected the following warnings to remove: ${selectedWarningsList}.`)], components: [confirmRow] });

    // Handle confirmation for removing selected warnings
    const confirmFilter = (confirmInteraction) => confirmInteraction.user.id === message.author.id;
    const confirmCollector = interaction.channel.createMessageComponentCollector({ filter: confirmFilter, time: 15000 });

    confirmCollector.on('collect', async (confirmInteraction) => {
      await confirmInteraction.deferUpdate(); // Acknowledge the interaction

      if (confirmInteraction.customId === 'confirm_remove') {
        for (const warningId of selectedWarnings) {
          await db.run("DELETE FROM warnings WHERE id = ?", [warningId]); // Remove each selected warning
        }
        await confirmInteraction.followUp({ embeds: [new EmbedBuilder().setColor(client.color).setDescription(`Removed selected warnings for ${user}.`)] });
      } else if (confirmInteraction.customId === 'cancel_remove') {
        await confirmInteraction.followUp({ embeds: [new EmbedBuilder().setColor(client.color).setDescription(`Removing warnings for ${user} has been canceled.`)] });
      }

      // Delete the original message and the select menu
      try {
        await replyMessage.delete();
        await confirmationMessage.delete();
      } catch (error) {
        console.error('Error deleting message:', error); // Handle unknown message error
      }
      confirmCollector.stop(); // Stop the collector after handling the interaction
    });

    confirmCollector.on('end', collected => {
      if (collected.size === 0) {
        message.reply({ embeds: [new EmbedBuilder().setColor(client.color).setDescription("You did not respond in time.")] });
      }
    });
  });

  collector.on('end', collected => {
    if (collected.size === 0) {
      message.reply({ embeds: [new EmbedBuilder().setColor(client.color).setDescription("You did not select any warnings in time.")] });
    }
  });
}

async function handleClearWarnings(client, message, user) {
  const warningCount = await getWarningCount(user.id);
  if (warningCount === 0) {
    return message.reply({ embeds: [new EmbedBuilder().setColor(client.color).setDescription(`${user} has no warnings to clear.`)] });
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('confirm_clear').setLabel('Confirm').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('cancel_clear').setLabel('Cancel').setStyle(ButtonStyle.Secondary)
  );

  const replyMessage = await message.reply({ embeds: [new EmbedBuilder().setColor(client.color).setDescription(`Are you sure you want to clear all warnings for ${user}? Total warnings: ${warningCount}`)], components: [row] });

  // Handle button interactions
  const filter = (interaction) => interaction.user.id === message.author.id;
  const collector = replyMessage.createMessageComponentCollector({ filter, time: 15000 });

  collector.on('collect', async (interaction) => {
    await interaction.deferUpdate(); // Acknowledge the interaction

    if (interaction.customId === 'confirm_clear') {
      await deleteAllWarnings(user.id);
      await interaction.followUp({ embeds: [new EmbedBuilder().setColor(client.color).setDescription(`All warnings cleared for ${user}.`)] });
    } else if (interaction.customId === 'cancel_clear') {
      await interaction.followUp({ embeds: [new EmbedBuilder().setColor(client.color).setDescription(`Clearing warnings for ${user} has been canceled.`)] });
    }

    // Delete the original message and the buttons
    try {
      await replyMessage.delete();
    } catch (error) {
      console.error('Error deleting message:', error); // Handle unknown message error
    }
    collector.stop(); // Stop the collector after handling the interaction
  });

  collector.on('end', collected => {
    if (collected.size === 0) {
      message.reply({ embeds: [new EmbedBuilder().setColor(client.color).setDescription("You did not respond in time.")] });
    }
  });
}

async function showWarnings(client, message, user) {
  const warnings = await getWarnings(user.id);
  if (!warnings.length) {
    return message.reply({ embeds: [new EmbedBuilder().setColor(client.color).setDescription(`${user} has no warnings.`)] });
  }

  const warningList = warnings.map((warn, index) => 
    `**Warning ${index + 1}**\nModerator: <@${warn.moderator_id}>\nReason: ${warn.reason}\nDate: <t:${Math.floor(new Date(warn.timestamp).getTime() / 1000)}:R>`
  ).join('\n\n');

  return message.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(client.color)
        .setAuthor({ 
          name: `Warnings for ${user.user.tag}`,
          iconURL: user.user.displayAvatarURL({ dynamic: true })
        })
        .setDescription(warningList)
        .setFooter({ text: `Total Warnings: ${warnings.length}` })
        .setTimestamp()
    ]
  });
}

async function getWarningCount(userId) {
  return new Promise((resolve, reject) => {
    db.get("SELECT COUNT(*) as count FROM warnings WHERE user_id = ?", [userId], (err, row) => {
      if (err) {
        console.error('Error getting warning count:', err);
        return resolve(0);
      }
      resolve(row ? row.count : 0);
    });
  });
}

async function getWarnings(userId) {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM warnings WHERE user_id = ?", [userId], (err, rows) => {
      if (err) {
        console.error('Error getting warnings:', err);
        return resolve([]);
      }
      resolve(rows);
    });
  });
}

async function deleteAllWarnings(userId) {
  return new Promise((resolve, reject) => {
    db.run("DELETE FROM warnings WHERE user_id = ?", [userId], (err) => {
      if (err) {
        console.error('Error deleting warnings:', err);
        return resolve(false);
      }
      resolve(true);
    });
  });
}
