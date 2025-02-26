const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  ChannelType,
} = require("discord.js");
const TicketSystem = require("../../models/ticketSystemSchema");
const TicketUser = require("../../models/ticketUserSchema");

function checkBotPermissions(guild) {
  const botMember = guild.members.cache.get(guild.client.user.id);
  const requiredPermissions = [
    PermissionFlagsBits.ManageChannels,
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.EmbedLinks,
    PermissionFlagsBits.ManageRoles,
  ];

  const missingPermissions = requiredPermissions.filter(
    (perm) => !botMember.permissions.has(perm)
  );

  if (missingPermissions.length > 0) {
    const permissionNames = missingPermissions.map((perm) => {
      return Object.keys(PermissionFlagsBits)
        .find((key) => PermissionFlagsBits[key] === perm)
        .replace(/_/g, " ")
        .toLowerCase();
    });

    return `I need the following permissions to manage tickets:\n\`${permissionNames.join(
      ", "
    )}\``;
  }
  return null;
}

module.exports = {
  name: "interactionCreate",
  async execute(interaction, client) {
    if (!interaction.isButton()) return;

    if (interaction.customId === "create_ticket") {
      try {
        // First, defer the reply to prevent interaction timeout
        await interaction.deferReply({ flags: 64 });

        const config = await TicketSystem.findOne({
          guildId: interaction.guild.id,
        });
        if (!config) {
          return await interaction.editReply({
            content: "❌ Ticket system is not configured!",
            flags: 64,
          });
        }

        // Check active tickets for this user
        const userTickets = await TicketUser.find({
          guildId: interaction.guild.id,
          userId: interaction.user.id,
          closed: false, // Only count open tickets
        });

        const MAX_FREE_TICKETS = 2;

        if (userTickets.length >= MAX_FREE_TICKETS) {
          const embed = new EmbedBuilder()
            .setTitle("❌ Ticket Limit Reached")
            .setDescription(
              `You have reached the maximum limit of ${MAX_FREE_TICKETS} open tickets!\n\n` +
                `**Current Open Tickets:**\n` +
                userTickets
                  .map((ticket) => `<#${ticket.channelId}>`)
                  .join("\n") +
                "\n\n" +
                `To create more tickets, you need to:\n` +
                `• Close your existing tickets, or\n` +
                `• Upgrade to premium for unlimited tickets\n\n` +
                `Use \`!ticket close\` in your ticket channel to close it.`
            )
            .setColor("Red")
            .setFooter({ text: "Premium users can create unlimited tickets!" });

          return await interaction.editReply({
            embeds: [embed],
            flags: 64,
          });
        }

        // Check if category exists
        const category = await interaction.guild.channels.fetch(
          config.categoryId
        );
        if (!category || category.type !== ChannelType.GuildCategory) {
          return await interaction.editReply({
            content:
              "❌ The ticket category has been deleted or is invalid. Please contact an administrator.",
            flags: 64,
          });
        }

        // Check bot permissions
        const missingPerms = checkBotPermissions(interaction.guild);
        if (missingPerms) {
          return await interaction.editReply({
            content: `❌ ${missingPerms}`,
            flags: 64,
          });
        }

        // Check if user already has an open ticket
        const existingTicket = await TicketUser.findOne({
          guildId: interaction.guild.id,
          userId: interaction.user.id,
        });

        if (existingTicket) {
          return await interaction.editReply({
            content: "❌ You already have an open ticket!",
            flags: 64,
          });
        }

        // Create ticket channel
        const ticketChannel = await interaction.guild.channels.create({
          name: `ticket-${interaction.user.username}`,
          type: ChannelType.GuildText,
          parent: config.categoryId,
          permissionOverwrites: [
            {
              id: interaction.guild.id,
              deny: [PermissionFlagsBits.ViewChannel],
            },
            {
              id: interaction.user.id,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
              ],
            },
            {
              id: config.supportRoleId,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
              ],
            },
          ],
        });

        const embed = new EmbedBuilder()
          .setTitle("🎫 Ticket Created")
          .setDescription(
            `Support will be with you shortly.\n` +
              `To close this ticket, click the button below.\n\n` +
              `You have ${
                MAX_FREE_TICKETS - (userTickets.length + 1)
              } free tickets remaining.`
          )
          .setColor(client.color)
          .addFields(
            { name: "Created by", value: `${interaction.user}`, inline: true },
            {
              name: "Created at",
              value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
              inline: true,
            },
            {
              name: "Ticket Number",
              value: `#${userTickets.length + 1}/${MAX_FREE_TICKETS}`,
              inline: true,
            }
          );

        const buttons = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("close_ticket")
            .setLabel("Close Ticket")
            .setEmoji("🔒")
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId("claim_ticket")
            .setLabel("Claim Ticket")
            .setEmoji("✋")
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId("delete_ticket")
            .setLabel("Delete Ticket")
            .setEmoji("🗑️")
            .setStyle(ButtonStyle.Danger)
        );

        // Add notification message for support team and owner
        const notificationMessage =
          `${interaction.user} has created a new ticket!\n\n` +
          `${
            interaction.user.id !== interaction.guild.ownerId
              ? `<@${interaction.guild.ownerId}> | `
              : ""
          }` +
          `<@&${config.supportRoleId}>\n` +
          `Please attend to this ticket when available.`;

        // Create a Set to remove duplicate user IDs and filter out owner if they're the creator
        const mentionUsers =
          interaction.user.id === interaction.guild.ownerId
            ? [interaction.user.id]
            : [interaction.user.id, interaction.guild.ownerId];

        await ticketChannel.send({
          content: notificationMessage,
          embeds: [embed],
          components: [buttons],
          allowedMentions: {
            users: mentionUsers,
            roles: [config.supportRoleId],
          },
        });

        // Save ticket information
        await TicketUser.create({
          guildId: interaction.guild.id,
          userId: interaction.user.id,
          channelId: ticketChannel.id,
          createdAt: Date.now(),
          claimed: false,
          claimedBy: null,
          ticketCount: userTickets.length + 1,
        });

        return await interaction.editReply({
          content: `✅ Your ticket has been created in ${ticketChannel}!`,
          flags: 64,
        });
      } catch (error) {
        console.error("Error creating ticket:", error);
        return await interaction.editReply({
          content: "❌ An error occurred while creating your ticket.",
          flags: 64,
        });
      }
    }

    // Handle ticket closing
    if (interaction.customId === "close_ticket") {
      try {
        // Defer the reply first
        await interaction.deferReply();

        const ticketData = await TicketUser.findOne({
          guildId: interaction.guild.id,
          channelId: interaction.channel.id,
        });

        if (!ticketData) return;

        const config = await TicketSystem.findOne({
          guildId: interaction.guild.id,
        });
        if (!config) return;

        // Check if closed category exists
        const closedCategory = await interaction.guild.channels.fetch(
          config.closedCategoryId
        );
        if (!closedCategory) {
          return await interaction.editReply({
            content:
              "❌ The closed tickets category has been deleted. Please contact an administrator.",
          });
        }

        // Update ticket status
        await TicketUser.findOneAndUpdate(
          {
            guildId: interaction.guild.id,
            channelId: interaction.channel.id,
          },
          {
            closed: true,
            closedBy: interaction.user.id,
            closedAt: Date.now(),
          }
        );

        // Update channel permissions and move to closed category
        await interaction.channel.edit({
          parent: config.closedCategoryId,
          permissionOverwrites: [
            {
              id: interaction.guild.id,
              deny: [PermissionFlagsBits.ViewChannel],
            },
            {
              id: ticketData.userId,
              allow: [PermissionFlagsBits.ViewChannel],
              deny: [PermissionFlagsBits.SendMessages],
            },
            {
              id: config.supportRoleId,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
              ],
            },
          ],
        });

        // First disable the original buttons
        const disabledButtons = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("close_ticket")
            .setLabel("Close Ticket")
            .setEmoji("🔒")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId("claim_ticket")
            .setLabel("Claim Ticket")
            .setEmoji("✋")
            .setStyle(ButtonStyle.Success)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId("delete_ticket")
            .setLabel("Delete Ticket")
            .setEmoji("🗑️")
            .setStyle(ButtonStyle.Danger)
            .setDisabled(true)
        );

        // Update the original message to disable its buttons
        await interaction.message.edit({ components: [disabledButtons] });

        // Create new buttons for the closed ticket
        const closedTicketButtons = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("delete_ticket")
            .setLabel("Delete Ticket")
            .setEmoji("🗑️")
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId("reopen_ticket")
            .setLabel("Reopen Ticket")
            .setEmoji("🔓")
            .setStyle(ButtonStyle.Success)
        );

        const embed = new EmbedBuilder()
          .setTitle("Ticket Closed")
          .setDescription(
            `Ticket closed by ${interaction.user}\n` +
              `This ticket has been moved to the closed tickets category.`
          )
          .setColor("Red")
          .setTimestamp();

        // Send new message with the delete/reopen buttons
        await interaction.channel.send({
          embeds: [embed],
          components: [closedTicketButtons],
        });

        // Confirm the action
        await interaction.editReply("✅ Ticket has been closed successfully!");
      } catch (error) {
        console.error("Error closing ticket:", error);
        if (!interaction.deferred) {
          await interaction.reply({
            content: "❌ An error occurred while closing the ticket.",
            flags: 64,
          });
        } else {
          await interaction.editReply({
            content: "❌ An error occurred while closing the ticket.",
          });
        }
      }
    }

    // Handle ticket claiming
    if (interaction.customId === "claim_ticket") {
      const member = await interaction.guild.members.fetch(interaction.user.id);
      const config = await TicketSystem.findOne({
        guildId: interaction.guild.id,
      });

      if (!member.roles.cache.has(config.supportRoleId)) {
        return interaction.reply({
          content: "❌ Only support team members can claim tickets!",
          flags: 64,
        });
      }

      try {
        const ticketData = await TicketUser.findOne({
          guildId: interaction.guild.id,
          channelId: interaction.channel.id,
        });

        if (!ticketData || ticketData.claimed) {
          return interaction.reply({
            content: "❌ This ticket is already claimed or does not exist!",
            flags: 64,
          });
        }

        // Update ticket data
        await TicketUser.findOneAndUpdate(
          {
            guildId: interaction.guild.id,
            channelId: interaction.channel.id,
          },
          {
            claimed: true,
            claimedBy: interaction.user.id,
          }
        );

        await interaction.reply(`✅ Ticket claimed by ${interaction.user}!`);
      } catch (error) {
        console.error("Error claiming ticket:", error);
        await interaction.reply({
          content: "❌ An error occurred while claiming the ticket.",
          flags: 64,
        });
      }
    }

    // Add handlers for the new buttons
    if (interaction.customId === "reopen_ticket") {
      try {
        await interaction.deferReply();
        const ticketData = await TicketUser.findOne({
          guildId: interaction.guild.id,
          channelId: interaction.channel.id,
        });

        if (!ticketData) return;

        const config = await TicketSystem.findOne({
          guildId: interaction.guild.id,
        });

        // Move back to open tickets category
        await interaction.channel.edit({
          parent: config.categoryId,
          permissionOverwrites: [
            {
              id: interaction.guild.id,
              deny: [PermissionFlagsBits.ViewChannel],
            },
            {
              id: ticketData.userId,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
              ],
            },
            {
              id: config.supportRoleId,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
              ],
            },
          ],
        });

        // Update ticket status
        await TicketUser.findOneAndUpdate(
          {
            guildId: interaction.guild.id,
            channelId: interaction.channel.id,
          },
          {
            closed: false,
            reopenedBy: interaction.user.id,
            reopenedAt: Date.now(),
          }
        );

        // Restore channel permissions
        await interaction.channel.permissionOverwrites.edit(ticketData.userId, {
          ViewChannel: true,
          SendMessages: true,
        });

        const reopenMessage =
          `Ticket reopened by ${interaction.user}\n` +
          `<@${ticketData.userId}> your ticket has been reopened!\n\n` +
          `${
            interaction.user.id !== interaction.guild.ownerId
              ? `<@${interaction.guild.ownerId}> | `
              : ""
          }` +
          `<@&${config.supportRoleId}>`;

        const embed = new EmbedBuilder()
          .setTitle("Ticket Reopened")
          .setDescription(reopenMessage)
          .setColor("Green")
          .setTimestamp();

        // Filter out owner if they're the one reopening
        const mentionUsers =
          interaction.user.id === interaction.guild.ownerId
            ? [ticketData.userId]
            : [ticketData.userId, interaction.guild.ownerId];

        const reopenButtons = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("close_ticket")
            .setLabel("Close Ticket")
            .setEmoji("🔒")
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId("claim_ticket")
            .setLabel("Claim Ticket")
            .setEmoji("✋")
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId("delete_ticket")
            .setLabel("Delete Ticket")
            .setEmoji("🗑️")
            .setStyle(ButtonStyle.Danger)
        );

        // Disable the current buttons
        const disabledReopenButtons = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("delete_ticket")
            .setLabel("Delete Ticket")
            .setEmoji("🗑️")
            .setStyle(ButtonStyle.Danger)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId("reopen_ticket")
            .setLabel("Reopen Ticket")
            .setEmoji("🔓")
            .setStyle(ButtonStyle.Success)
            .setDisabled(true)
        );

        // Update the message that had the reopen button to disable it
        await interaction.message.edit({ components: [disabledReopenButtons] });

        await interaction.editReply({
          embeds: [embed],
          components: [reopenButtons],
          allowedMentions: {
            users: mentionUsers,
            roles: [config.supportRoleId],
          },
        });
      } catch (error) {
        console.error("Error reopening ticket:", error);
        if (!interaction.deferred) {
          await interaction.reply({
            content: "❌ An error occurred while reopening the ticket.",
            flags: 64,
          });
        } else {
          await interaction.editReply({
            content: "❌ An error occurred while reopening the ticket.",
          });
        }
      }
    }

    if (interaction.customId === "delete_ticket") {
      try {
        await interaction.deferReply();
        const member = await interaction.guild.members.fetch(
          interaction.user.id
        );
        const config = await TicketSystem.findOne({
          guildId: interaction.guild.id,
        });

        // Check if user has support role
        if (!member.roles.cache.has(config.supportRoleId)) {
          return await interaction.editReply({
            content: "❌ Only support team members can delete tickets!",
          });
        }

        const ticketData = await TicketUser.findOne({
          guildId: interaction.guild.id,
          channelId: interaction.channel.id,
        });

        if (!ticketData) return;

        // Disable all buttons in the message
        const disabledButtons = new ActionRowBuilder().addComponents(
          interaction.message.components[0].components.map((button) =>
            ButtonBuilder.from(button).setDisabled(true)
          )
        );

        await interaction.message.edit({ components: [disabledButtons] });
        await interaction.editReply(
          "⚠️ This ticket will be deleted in 5 seconds..."
        );

        await TicketUser.findOneAndDelete({
          guildId: interaction.guild.id,
          channelId: interaction.channel.id,
        });

        setTimeout(() => interaction.channel.delete(), 5000);
      } catch (error) {
        console.error("Error deleting ticket:", error);
        if (!interaction.deferred) {
          await interaction.reply({
            content: "❌ An error occurred while deleting the ticket.",
            flags: 64,
          });
        } else {
          await interaction.editReply({
            content: "❌ An error occurred while deleting the ticket.",
          });
        }
      }
    }

    // Add this handler after your other button handlers
    if (interaction.customId === "ticket_guide") {
      try {
        const embed = new EmbedBuilder()
          .setTitle("🎫 How to Use the Ticket System")
          .setDescription(
            "**Creating a Ticket:**\n" +
              '• Click the "Create Ticket" button to open a new ticket\n' +
              "• Only one ticket can be open at a time\n\n" +
              "**In Your Ticket:**\n" +
              "• Describe your issue clearly\n" +
              "• Wait for a support team member to respond\n" +
              "• Use `!ticket close` to close your ticket when done\n\n" +
              "**Support Team Commands:**\n" +
              "• `!ticket claim` - Claim a ticket\n" +
              "• `!ticket delete` - Delete a ticket\n" +
              "• `!ticket reopen` - Reopen a closed ticket"
          )
          .setColor(client.color)
          .setFooter({
            text: "Created by NotSoProgrammer",
            iconURL:
              "https://cdn.discordapp.com/attachments/1316794280798326785/1326132132099264532/wp9525382.jpg?ex=677e504a&is=677cfeca&hm=1ab6ee6d426ce87021ddd1f5881466a45c08c1414051fd8eba4c030183dcff52&",
          });

        return await interaction.reply({
          embeds: [embed],
          flags: 64, // This replaces ephemeral: true
        });
      } catch (error) {
        console.error("Error showing ticket guide:", error);
        return await interaction.reply({
          content: "❌ An error occurred while showing the guide.",
          flags: 64,
        });
      }
    }
  },
};
