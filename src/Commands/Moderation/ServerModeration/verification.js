const {
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  PermissionsBitField,
} = require("discord.js");
const db = require("../../../database/sqlite");

module.exports = {
  name: "verification",
  description: "Setup advanced verification system",
  usage: "verification <setup/settings/reset>",
  category: ["moderation", "sentinels"],
  run: async (client, message, args) => {
    return message.reply("This Command Is Under Development!");
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
    ) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription("❌ You need Administrator permission!")
            .setColor(client.color),
        ],
      });
    }

    const action = args[0]?.toLowerCase();
    if (!action || !["setup", "settings", "reset"].includes(action)) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("🔒 Verification System")
            .setDescription(
              "Protect your server with advanced verification methods."
            )
            .addFields(
              {
                name: "📝 Commands",
                value:
                  "`verification setup` - Setup verification system\n" +
                  "`verification settings` - Configure settings\n" +
                  "`verification reset` - Reset verification system",
              },
              {
                name: "🛡️ Features",
                value:
                  "• Captcha Verification\n" +
                  "• Account Age Check\n" +
                  "• Custom Questions\n" +
                  "• Role Assignment\n" +
                  "• Logging System",
              }
            )
            .setColor(client.color),
        ],
      });
    }

    try {
      switch (action) {
        case "setup": {
          // Create verification category
          const category = await message.guild.channels.create({
            name: "VERIFICATION",
            type: 4,
          });

          // Create verification channel
          const verifyChannel = await message.guild.channels.create({
            name: "verify-here",
            type: 0,
            parent: category.id,
            permissionOverwrites: [
              {
                id: message.guild.id,
                deny: [
                  PermissionsBitField.Flags.SendMessages,
                  PermissionsBitField.Flags.AddReactions,
                ],
                allow: [PermissionsBitField.Flags.ViewChannel],
              },
            ],
          });

          // Create verification logs channel
          const logsChannel = await message.guild.channels.create({
            name: "verification-logs",
            type: 0,
            parent: category.id,
            permissionOverwrites: [
              {
                id: message.guild.id,
                deny: [PermissionsBitField.Flags.ViewChannel],
              },
            ],
          });

          // Create verified role
          const verifiedRole = await message.guild.roles.create({
            name: "Verified",
            color: "Green",
            reason: "Verification system setup",
          });

          // Create verification buttons
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("verify_captcha")
              .setLabel("Captcha Verify")
              .setStyle(ButtonStyle.Primary)
              .setEmoji("🔒"),
            new ButtonBuilder()
              .setCustomId("verify_questions")
              .setLabel("Answer Questions")
              .setStyle(ButtonStyle.Secondary)
              .setEmoji("❓")
          );

          // Send verification message
          const verifyEmbed = new EmbedBuilder()
            .setTitle("🔒 Server Verification")
            .setDescription(
              "To access the server, you need to verify yourself.\n\n" +
                "**Choose your verification method:**\n" +
                "🔒 `Captcha Verify` - Complete a captcha challenge\n" +
                "❓ `Answer Questions` - Answer verification questions\n\n" +
                "**Requirements:**\n" +
                "• Account age: 7 days\n" +
                "• Profile picture required\n" +
                "• Must complete verification in 10 minutes"
            )
            .setColor(client.color);

          await verifyChannel.send({
            embeds: [verifyEmbed],
            components: [row],
          });

          // Save verification settings
          await db.run(
            `INSERT INTO verification_settings (
              guild_id, channel_id, logs_channel, verified_role,
              min_account_age, require_avatar, timeout
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              message.guild.id,
              verifyChannel.id,
              logsChannel.id,
              verifiedRole.id,
              7 * 24 * 60 * 60 * 1000, // 7 days in ms
              1,
              10 * 60 * 1000, // 10 minutes in ms
            ]
          );

          message.reply({
            embeds: [
              new EmbedBuilder()
                .setDescription(
                  "✅ Verification system has been set up!\n\n" +
                    `Verification Channel: ${verifyChannel}\n` +
                    `Logs Channel: ${logsChannel}\n` +
                    `Verified Role: ${verifiedRole}`
                )
                .setColor(client.color),
            ],
          });
          break;
        }

        // Add settings and reset cases...
      }
    } catch (error) {
      console.error("Verification error:", error);
      message.reply("An error occurred while setting up verification!");
    }
  },
};
