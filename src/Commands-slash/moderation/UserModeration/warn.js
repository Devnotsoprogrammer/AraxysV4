const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const db = require('../../../database/warndb');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warning management commands')
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add a warning to a user')
        .addUserOption(option => option.setName('user').setDescription('The user to warn').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('The reason for the warning').setRequired(true))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove a warning from a user')
        .addUserOption(option => option.setName('user').setDescription('The user to remove the warning from').setRequired(true))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('clear')
        .setDescription('Clear all warnings from a user')
        .addUserOption(option => option.setName('user').setDescription('The user to clear warnings from').setRequired(true))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('show')
        .setDescription('Show all warnings of a user')
        .addUserOption(option => option.setName('user').setDescription('The user to show warnings for').setRequired(true))
    ),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');

    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription('You do not have permission to manage warnings!')
            .setColor('#ff0000'),
        ],
        flags: 64,
      });
    }

    switch (subcommand) {
      case 'add':
        db.run("INSERT INTO warnings (user_id, moderator_id, reason) VALUES (?, ?, ?)", [user.id, interaction.user.id, reason], function (err) {
          if (err) return console.error(err.message);
          const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setDescription(`Warning added for ${user}. Reason: ${reason}`);
          interaction.reply({ embeds: [embed] });
        });
        break;

      case 'remove':
        db.all("SELECT * FROM warnings WHERE user_id = ?", user.id, (err, rows) => {
          if (err) return console.error(err.message);
          if (rows.length === 0) {
            const embed = new EmbedBuilder()
              .setColor('#ff0000')
              .setDescription(`User has no warnings.`);
            return interaction.reply({ embeds: [embed], ephemeral: true });
          }

          const options = rows.map(row => ({
            label: `ID: ${row.id} - ${row.reason}`,
            value: row.id.toString(),
          }));

          const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('select-warning')
            .setPlaceholder('Select a warning to remove')
            .addOptions(options);

          const row = new ActionRowBuilder().addComponents(selectMenu);

          const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setDescription('Select a warning from the dropdown menu to remove.');
          interaction.reply({ embeds: [embed], components: [row], ephemeral: true });

          const filter = i => i.customId === 'select-warning' && i.user.id === interaction.user.id;
          const collector = interaction.channel.createMessageComponentCollector({ filter, time: 15000 });

          collector.on('collect', async i => {
            const warnId = i.values[0];
            db.run("DELETE FROM warnings WHERE id = ?", warnId, function (err) {
              if (err) return console.error(err.message);
              const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setDescription(`Warning ID ${warnId} removed.`);
              i.update({ embeds: [embed], components: [] });
            });
          });

          collector.on('end', collected => {
            if (collected.size === 0) {
              interaction.followUp({
                embeds: [
                  new EmbedBuilder()
                    .setDescription(`No warning selected.`)
                    .setColor('#ff0000'),
                ],
                flags: 64,
              });
            }
          });
        });
        break;

      case 'clear':
        db.get("SELECT COUNT(*) as count FROM warnings WHERE user_id = ?", user.id, (err, row) => {
          if (err) return console.error(err.message);
          if (row.count > 0) {
            db.run("DELETE FROM warnings WHERE user_id = ?", user.id, function (err) {
              if (err) return console.error(err.message);
              const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setDescription(`All warnings cleared for ${user}.`);
              interaction.reply({ embeds: [embed] });
            });
          } else {
            const button = new ButtonBuilder()
              .setCustomId('praise')
              .setLabel('Yes')
              .setStyle(ButtonStyle.Success);
            
            const row = new ActionRowBuilder().addComponents(button);

            const embed = new EmbedBuilder()
              .setColor('#00ff00')
              .setDescription(`Should I praise this user for having no warns?`);
            interaction.reply({ embeds: [embed], components: [row], ephemeral: true });

            const filter = i => i.customId === 'praise' && i.user.id === interaction.user.id;
            const collector = interaction.channel.createMessageComponentCollector({ filter, time: 15000 });

            collector.on('collect', async i => {
              if (i.customId === 'praise') {
                await i.deferUpdate();
                const praiseMessages = [
                  "Awesome job staying out of trouble!",
                  "Keep up the good work!",
                  "You're doing great, stay awesome!",
                  "Fantastic, keep being a model citizen!",
                ];
                const randomPraise = praiseMessages[Math.floor(Math.random() * praiseMessages.length)];
                const embed = new EmbedBuilder()
                  .setColor('#00ff00')
                  .setDescription(`${randomPraise}`);
                await i.editReply({ embeds: [embed], components: [] });
              }
            });
          }
        });
        break;

      case 'show':
        db.all("SELECT * FROM warnings WHERE user_id = ?", user.id, (err, rows) => {
          if (err) return console.error(err.message);
          if (rows.length === 0) {
            const embed = new EmbedBuilder()
              .setColor('#00ff00')
              .setDescription(`This user has no warnings.`);
            return interaction.reply({ embeds: [embed], ephemeral: true });
          }

          const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle(`Warnings for <@${user.id}>`)
            .setDescription(rows.map(row => `ID: ${row.id}, Reason: ${row.reason}, Timestamp: ${row.timestamp}`).join('\n'));
          interaction.reply({ embeds: [embed] });
        });
        break;

      default:
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription("Invalid subcommand. Use add, remove, clear, or show.")
              .setColor('#ff0000'),
          ],
          flags: 64,
        });
    }
  },
};
