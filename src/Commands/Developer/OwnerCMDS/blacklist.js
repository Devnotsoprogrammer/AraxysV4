const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const master = ["1203931944421949533", "931512484769189898"];
const db = require("../../../database/blacklistDB");

module.exports = {
  name: "blacklist",
  aliases: ["bl"],
  description: "Manage the global blacklist (Master only).",
  usage: "blacklist <add/remove/list> <user/guild> <@user|guildId>",
  category: "developer",
  cooldown: 500,
  run: async (client, message, args) => {
    if (!master.includes(message.author.id)) {
      return message.reply("You are not my Master. You can't use this command.");
    }

    if (!args[0]) {
      return message.reply({
        embeds: [new EmbedBuilder().setDescription(`**Usage:** \`${client.config.prefix}blacklist add/remove/list <user/guild> <@user|guildId>\` Master, how could you forget?`).setColor(client.color)]
      });
    }

    const subcommand = args[0].toLowerCase();
    const type = args[1]?.toLowerCase();
    const id = args[2];

    if (!type || !id && subcommand !== "list") {
      return message.reply({
        embeds: [new EmbedBuilder().setDescription(`Master, please provide the type (user/guild) and the ID.`).setColor(client.color)]
      });
    }

    try {
      if (subcommand === "add") {
        await handleAdd(type, id, message, client);
      } else if (subcommand === "remove") {
        await handleRemove(type, id, message, client);
      } else if (subcommand === "list") {
        await handleList(type, message, client);
      } else {
        return message.reply({
          embeds: [new EmbedBuilder().setDescription(`Master, please provide a valid subcommand. Like \`${client.config.prefix}blacklist add/remove/list <user/guild> <@user|guildId>\` Master, how could you forget?`).setColor(client.color)]
        });
      }
    } catch (error) {
      console.error(error);
      return message.reply({
        embeds: [new EmbedBuilder().setTitle("Error").setDescription(`An error occurred: ${error.message}`).setColor(client.color)]
      });
    }
  },
};

async function handleAdd(type, id, message, client) {
  if (type === "user") {
    const user = message.mentions.users.first() || await client.users.fetch(id).catch(() => null);
    if (!user) {
      throw new Error("Master, please provide a valid user.");
    }

    db.run(`INSERT INTO blacklisted_users (userId) VALUES (?)`, [user.id], function (err) {
      if (err) throw err;
      return message.reply({
        embeds: [new EmbedBuilder().setDescription(`Master, ${user} has been added to the blacklist.`).setColor(client.color)]
      });
    });

  } else if (type === "guild") {
    const guild = await client.guilds.fetch(id).catch(() => null);
    if (!guild) {
      throw new Error("Master, please provide a valid guild ID.");
    }
    
    const ownerId = guild.ownerId;
    
    db.run(`INSERT INTO blacklisted_servers (guildId) VALUES (?)`, [id], function (err) {
      if (err) throw err;
    });

    db.run(`INSERT INTO blacklisted_users (userId) VALUES (?)`, [ownerId], function (err) {
      if (err) throw err;
      return message.reply({
        embeds: [new EmbedBuilder().setDescription(`Master, ${id} and its owner have been added to the blacklist.`).setColor(client.color)]
      });
    });

  } else {
    throw new Error("Master, please provide a valid type (user/guild).");
  }
}

async function handleRemove(type, id, message, client) {
  if (type === "user") {
    const user = message.mentions.users.first() || await client.users.fetch(id).catch(() => null);
    if (!user) {
      throw new Error("Master, please provide a valid user.");
    }

    db.run(`DELETE FROM blacklisted_users WHERE userId = ?`, [user.id], function (err) {
      if (err) throw err;
      return message.reply({
        embeds: [new EmbedBuilder().setDescription(`Master, ${user} has been removed from the blacklist.`).setColor(client.color)]
      });
    });

  } else if (type === "guild") {
    const guild = await client.guilds.fetch(id).catch(() => null);
    if (!guild) {
      throw new Error("Master, please provide a valid guild ID.");
    }
    
    const ownerId = guild.ownerId;

    db.run(`DELETE FROM blacklisted_servers WHERE guildId = ?`, [id], function (err) {
      if (err) throw err;
    });

    db.run(`DELETE FROM blacklisted_users WHERE userId = ?`, [ownerId], function (err) {
      if (err) throw err;
      return message.reply({
        embeds: [new EmbedBuilder().setDescription(`Master, ${id} and its owner have been removed from the blacklist.`).setColor(client.color)]
      });
    });

  } else {
    throw new Error("Master, please provide a valid type (user/guild).");
  }
}

async function handleList(type, message, client) {
  if (type === "user") {
    db.all(`SELECT * FROM blacklisted_users`, [], function (err, rows) {
      if (err) throw err;
      if (rows.length === 0) {
        return message.reply({
          embeds: [new EmbedBuilder().setDescription("Master, there are no users in the blacklist.").setColor(client.color)]
        });
      }
      
      paginateList(rows, message, "Blacklisted Users", row => `<@${row.userId}>`, client.color);
    });

  } else if (type === "guild") {
    db.all(`SELECT * FROM blacklisted_servers`, [], function (err, rows) {
      if (err) throw err;
      if (rows.length === 0) {
        return message.reply({
          embeds: [new EmbedBuilder().setDescription("Master, there are no guilds in the blacklist.").setColor(client.color)]
        });
      }
      
      paginateList(rows, message, "Blacklisted Guilds", row => `${row.guildId}`, client.color);
    });

  } else {
    throw new Error("Master, please provide a valid type (user/guild).");
  }
}

async function paginateList(rows, message, title, formatRow, color) {
  let page = 0;
  const itemsPerPage = 10;
  const totalPages = Math.ceil(rows.length / itemsPerPage);
  
  const getPageContent = (page) => {
    const start = page * itemsPerPage;
    const end = start + itemsPerPage;
    const pageRows = rows.slice(start, end);
    return pageRows.map(formatRow).join("\n");
  };
  
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(getPageContent(page))
    .setColor(color)
    .setFooter({ text: `Page ${page + 1} of ${totalPages}` });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("previous")
      .setLabel("Previous")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page === 0),
    new ButtonBuilder()
      .setCustomId("next")
      .setLabel("Next")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page === totalPages - 1)
  );

  const messageEmbed = await message.reply({ embeds: [embed], components: [row] });

  const collector = messageEmbed.createMessageComponentCollector({
    componentType: "BUTTON",
    time: 60000,
  });

  collector.on("collect", async (interaction) => {
    if (interaction.user.id !== message.author.id) return;

    if (interaction.customId === "previous" && page > 0) {
      page--;
    } else if (interaction.customId === "next" && page < totalPages - 1) {
      page++;
    }

    embed.setDescription(getPageContent(page));
    embed.setFooter({ text: `Page ${page + 1} of ${totalPages}` });

    row.components[0].setDisabled(page === 0);
    row.components[1].setDisabled(page === totalPages - 1);

    await interaction.update({ embeds: [embed], components: [row] });
  });

  collector.on("end", () => {
    messageEmbed.edit({ components: [] }).catch(() => {});
  });
}
