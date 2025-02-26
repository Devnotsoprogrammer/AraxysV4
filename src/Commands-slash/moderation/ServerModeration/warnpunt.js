const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');
const db = require('../../../database/warndb');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnpunishment')
    .setDescription('Set warning punishment levels and types'),
  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription('You do not have permission to manage punishments!')
            .setColor('#ff0000'),
        ],
        ephemeral: true,
      });
    }

    const warningMenu = new StringSelectMenuBuilder()
      .setCustomId('warning_level')
      .setPlaceholder('Select the number of warnings')
      .addOptions(
        { label: '1 Warning', value: '1' },
        { label: '2 Warnings', value: '2' },
        { label: '3 Warnings', value: '3' },
        { label: '4 Warnings', value: '4' },
        { label: '5 Warnings', value: '5' },
        { label: '6 Warnings', value: '6' },
        { label: '7 Warnings', value: '7' },
        { label: '8 Warnings', value: '8' },
        { label: '9 Warnings', value: '9' },
        { label: '10 Warnings', value: '10' },
        { label: '11 Warnings', value: '11' },
        { label: '12 Warnings', value: '12' },
        { label: '13 Warnings', value: '13' },
        { label: '14 Warnings', value: '14' },
        { label: '15 Warnings', value: '15' },
        { label: '16 Warnings', value: '16' },
        { label: '17 Warnings', value: '17' },
        { label: '18 Warnings', value: '18' },
        { label: '19 Warnings', value: '19' },
        { label: '20 Warnings', value: '20' }
      );

    const punishmentMenu = new StringSelectMenuBuilder()
      .setCustomId('punishment_type')
      .setPlaceholder('Select the type of punishment')
      .addOptions(
        { label: 'Timeout', value: 'timeout' },
        { label: 'Ban', value: 'ban' },
        { label: 'Kick', value: 'kick' }
      );

    const row = new ActionRowBuilder()
      .addComponents(warningMenu, punishmentMenu);

    const embed = new EmbedBuilder()
      .setColor('#00ff00')
      .setDescription('Select the number of warnings and the type of punishment.');

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });

    const filter = i => i.user.id === interaction.user.id;
    const collector = interaction.channel.createMessageComponentCollector({ filter, componentType: 'SELECT_MENU', time: 60000 });

    let warningLevel = null;
    let punishmentType = null;

    collector.on('collect', async i => {
      if (i.customId === 'warning_level') {
        warningLevel = i.values[0];
        await i.reply({ content: `Warning level set to: ${warningLevel}`, ephemeral: true });
      } else if (i.customId === 'punishment_type') {
        punishmentType = i.values[0];
        await i.reply({ content: `Punishment type set to: ${punishmentType}`, ephemeral: true });

        if (punishmentType === 'timeout' || punishmentType === 'ban') {
          const durationMenu = new StringSelectMenuBuilder()
            .setCustomId('duration')
            .setPlaceholder('Select the duration')
            .addOptions(
              { label: '10 minutes', value: '10m' },
              { label: '1 hour', value: '1h' },
              { label: '1 day', value: '1d' },
              { label: '1 month', value: '1mo' },
              { label: 'Permanent', value: 'perm' }
            );

          const rowDuration = new ActionRowBuilder().addComponents(durationMenu);

          const embedDuration = new EmbedBuilder()
            .setColor('#00ff00')
            .setDescription('Select the duration of the punishment.');

          await interaction.followUp({ embeds: [embedDuration], components: [rowDuration], ephemeral: true });

          const durationCollector = interaction.channel.createMessageComponentCollector({ filter, componentType: 'SELECT_MENU', time: 60000 });

          durationCollector.on('collect', async d => {
            const duration = d.values[0];
            await d.reply({ content: `Duration set to: ${duration}`, ephemeral: true });

            // Save the punishment configuration to the database
            db.run("INSERT INTO punishments (guild_id, warning_level, punishment_type, duration) VALUES (?, ?, ?, ?)", [interaction.guild.id, warningLevel, punishmentType, duration], function (err) {
              if (err) return console.error(err.message);
              const embedConfirm = new EmbedBuilder()
                .setColor('#00ff00')
                .setDescription(`Punishment configuration saved: ${warningLevel} warnings, ${punishmentType}, duration: ${duration}`);
              interaction.followUp({ embeds: [embedConfirm], ephemeral: true });
            });

            durationCollector.stop();
          });
        } else {
          // Save the punishment configuration for kick (no duration needed)
          db.run("INSERT INTO punishments (guild_id, warning_level, punishment_type, duration) VALUES (?, ?, ?, ?)", [interaction.guild.id, warningLevel, punishmentType, 'N/A'], function (err) {
            if (err) return console.error(err.message);
            const embedConfirm = new EmbedBuilder()
              .setColor('#00ff00')
              .setDescription(`Punishment configuration saved: ${warningLevel} warnings, ${punishmentType}`);
            interaction.followUp({ embeds: [embedConfirm], ephemeral: true });
          });
        }
      }
    });

    collector.on('end', collected => {
      if (!warningLevel || !punishmentType) {
        interaction.followUp('Punishment setup timed out.', { ephemeral: true });
      }
    });
  },
};
