const {
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
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

// Add new helper functions for ticket operations
async function handleTicketCreation(channel, user, client, config) {
  try {
    // Check active tickets for this user
    const userTickets = await TicketUser.find({
      guildId: channel.guild.id,
      userId: user.id,
      closed: false,
    });

    const MAX_FREE_TICKETS = 2;

    if (userTickets.length >= MAX_FREE_TICKETS) {
      const embed = new EmbedBuilder()
        .setTitle("❌ Ticket Limit Reached")
        .setDescription(
          `You have reached the maximum limit of ${MAX_FREE_TICKETS} open tickets!\n\n` +
            `**Current Open Tickets:**\n` +
            userTickets.map((ticket) => `<#${ticket.channelId}>`).join("\n")
        )
        .setColor("Red");
      return { error: true, embed };
    }

    const ticketChannel = await channel.guild.channels.create({
      name: `ticket-${user.username}`,
      type: ChannelType.GuildText,
      parent: config.categoryId,
      permissionOverwrites: [
        {
          id: channel.guild.id,
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: user.id,
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
        { name: "Created by", value: `${user}`, inline: true },
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

    await TicketUser.create({
      guildId: channel.guild.id,
      userId: user.id,
      channelId: ticketChannel.id,
      createdAt: Date.now(),
      claimed: false,
      claimedBy: null,
      ticketCount: userTickets.length + 1,
    });

    return { ticketChannel, embed, buttons };
  } catch (error) {
    console.error("Error creating ticket:", error);
    throw error;
  }
}

async function handleTicketClose(channel, user, guild) {
  try {
    const ticketData = await TicketUser.findOne({
      guildId: guild.id,
      channelId: channel.id,
    });

    if (!ticketData || ticketData.closed) {
      return {
        error: true,
        message: "This ticket is already closed or doesn't exist!",
      };
    }

    const config = await TicketSystem.findOne({ guildId: guild.id });
    if (!config) {
      return { error: true, message: "Ticket system configuration not found!" };
    }

    // Update ticket status and move to closed category
    await TicketUser.findOneAndUpdate(
      { guildId: guild.id, channelId: channel.id },
      {
        closed: true,
        closedBy: user.id,
        closedAt: Date.now(),
      }
    );

    await channel.edit({
      parent: config.closedCategoryId,
      permissionOverwrites: [
        {
          id: guild.id,
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

    const buttons = new ActionRowBuilder().addComponents(
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

    return { success: true, buttons };
  } catch (error) {
    console.error("Error closing ticket:", error);
    throw error;
  }
}

async function handleTicketReopen(channel, user, guild) {
  try {
    const ticketData = await TicketUser.findOne({
      guildId: guild.id,
      channelId: channel.id,
      closed: true,
    });

    if (!ticketData) {
      return {
        error: true,
        message: "This ticket is not closed or doesn't exist!",
      };
    }

    const config = await TicketSystem.findOne({ guildId: guild.id });
    if (!config) {
      return { error: true, message: "Ticket system configuration not found!" };
    }

    // Move back to open tickets category
    await channel.edit({
      parent: config.categoryId,
      permissionOverwrites: [
        {
          id: guild.id,
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
      { guildId: guild.id, channelId: channel.id },
      {
        closed: false,
        reopenedBy: user.id,
        reopenedAt: Date.now(),
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

    return { success: true, buttons, ticketData, config };
  } catch (error) {
    console.error("Error reopening ticket:", error);
    throw error;
  }
}

async function handleTicketDelete(channel, user, guild) {
  try {
    const config = await TicketSystem.findOne({ guildId: guild.id });
    if (!config) {
      return { error: true, message: "Ticket system configuration not found!" };
    }

    const member = await guild.members.fetch(user.id);
    if (!member.roles.cache.has(config.supportRoleId)) {
      return {
        error: true,
        message: "Only support team members can delete tickets!",
      };
    }

    const ticketData = await TicketUser.findOne({
      guildId: guild.id,
      channelId: channel.id,
    });

    if (!ticketData) {
      return { error: true, message: "This ticket doesn't exist!" };
    }

    await TicketUser.findOneAndDelete({
      guildId: guild.id,
      channelId: channel.id,
    });

    return { success: true };
  } catch (error) {
    console.error("Error deleting ticket:", error);
    throw error;
  }
}

async function handleTicketClaim(channel, user, guild) {
  try {
    const config = await TicketSystem.findOne({ guildId: guild.id });
    if (!config) {
      return { error: true, message: "Ticket system configuration not found!" };
    }

    const member = await guild.members.fetch(user.id);
    if (!member.roles.cache.has(config.supportRoleId)) {
      return {
        error: true,
        message: "Only support team members can claim tickets!",
      };
    }

    const ticketData = await TicketUser.findOne({
      guildId: guild.id,
      channelId: channel.id,
    });

    if (!ticketData || ticketData.claimed) {
      return {
        error: true,
        message: "This ticket is already claimed or doesn't exist!",
      };
    }

    await TicketUser.findOneAndUpdate(
      { guildId: guild.id, channelId: channel.id },
      {
        claimed: true,
        claimedBy: user.id,
      }
    );

    return { success: true };
  } catch (error) {
    console.error("Error claiming ticket:", error);
    throw error;
  }
}

module.exports = {
  name: "ticket",
  aliases: ["tickets"],
  description: "Manage the ticket system",
  usage: "ticket <setup/reset/info/close/delete/reopen>",
  category: ["support", "sentinels"],
  run: async (client, message, args) => {
    const validSubcommands = [
      "setup",
      "reset",
      "info",
      "close",
      "delete",
      "reopen",
    ];

    if (!args[0]) {
      // Check if user has permission to manage tickets
      if (message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        // Show admin help menu
        const embed = new EmbedBuilder()
          .setTitle("🎫 Ticket System Commands")
          .setDescription(
            `**Available Commands:**\n` +
              `\`${client.config.prefix}ticket setup #channel @support-role #category\` - Set up the ticket system\n` +
              `\`${client.config.prefix}ticket reset\` - Reset the ticket system\n` +
              `\`${client.config.prefix}ticket info\` - Show ticket system information\n` +
              `\`${client.config.prefix}ticket close\` - Close the current ticket\n` +
              `\`${client.config.prefix}ticket delete\` - Immediately delete the ticket\n` +
              `\`${client.config.prefix}ticket reopen\` - Reopen a closed ticket`
          )
          .setColor(client.color)
          .setFooter({ text: "Ticket System" });

        return message.reply({ embeds: [embed] });
      } else {
        // Show user help menu
        const embed = new EmbedBuilder()
          .setTitle("🎫 Ticket System")
          .setDescription(
            "To create a ticket, click the button in the ticket channel or use the ticket creation command in that channel."
          )
          .setColor(client.color)
          .setFooter({ text: "Ticket System" });

        return message.reply({ embeds: [embed] });
      }
    }

    const subCommand = args[0]?.toLowerCase();

    // Check permissions for admin commands
    if (["setup", "reset", "info"].includes(subCommand)) {
      if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        const embed = new EmbedBuilder()
          .setDescription("❌ You don't have permission to use this command!")
          .setColor("Red");
        return message.reply({ embeds: [embed] });
      }
    }

    if (!validSubcommands.includes(subCommand)) {
      const embed = new EmbedBuilder()
        .setTitle("🎫 Ticket System Commands")
        .setDescription(
          `**Available Commands:**\n` +
            `\`${client.config.prefix}ticket setup #channel @support-role #category\` - Set up the ticket system\n` +
            `\`${client.config.prefix}ticket reset\` - Reset the ticket system\n` +
            `\`${client.config.prefix}ticket info\` - Show ticket system information\n` +
            `\`${client.config.prefix}ticket close\` - Close the current ticket\n` +
            `\`${client.config.prefix}ticket delete\` - Immediately delete the ticket\n` +
            `\`${client.config.prefix}ticket reopen\` - Reopen a closed ticket`
        )
        .setColor(client.color)
        .setFooter({ text: "Ticket System" });

      return message.reply({ embeds: [embed] });
    }

    switch (subCommand) {
      case "setup":
        // Check bot permissions first
        const missingPerms = checkBotPermissions(message.guild);
        if (missingPerms) {
          const embed = new EmbedBuilder()
            .setDescription(`❌ ${missingPerms}`)
            .setColor("Red");
          return message.reply({ embeds: [embed] });
        }

        // Additional check for setup permissions
        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
          return message.reply({
            embeds: [
              new EmbedBuilder()
                .setDescription(
                  "❌ You need Manage Server permission to set up tickets!"
                )
                .setColor("Red")
                .setFooter({
                  text: "Created by NotSoProgrammer",
                  iconURL:
                    "https://cdn.discordapp.com/attachments/1316794280798326785/1326132132099264532/wp9525382.jpg?ex=677e504a&is=677cfeca&hm=1ab6ee6d426ce87021ddd1f5881466a45c08c1414051fd8eba4c030183dcff52&",
                }),
            ],
          });
        }
        const channel = message.mentions.channels.first();
        const supportRole = message.mentions.roles.first();
        const openCategory = message.mentions.channels.find(
          (ch) => ch.type === ChannelType.GuildCategory
        );
        const closedCategory = message.mentions.channels.filter(
          (ch) => ch.type === ChannelType.GuildCategory
        )[1];

        if (!channel || !supportRole || !openCategory || !closedCategory) {
          return message.reply(
            `Usage: \`${client.config.prefix}ticket setup #channel @support-role #open-category #closed-category\``
          );
        }

        // Add category type checks
        if (
          openCategory.type !== ChannelType.GuildCategory ||
          closedCategory.type !== ChannelType.GuildCategory
        ) {
          return message.reply({
            embeds: [
              new EmbedBuilder()
                .setDescription("❌ Both categories must be category channels!")
                .setColor("Red"),
            ],
          });
        }

        const embed = new EmbedBuilder()
          .setTitle("🎫 Create a Ticket")
          .setDescription("Click the button below to create a ticket")
          .setColor(client.color)

          .addFields(
            { name: "Support Team", value: `${supportRole}`, inline: true },
            { name: "Category", value: `${openCategory.name}`, inline: true }
          )
          .setFooter({
            text: "Created by NotSoProgrammer",
            iconURL:
              "https://cdn.discordapp.com/attachments/1316794280798326785/1326132132099264532/wp9525382.jpg?ex=677e504a&is=677cfeca&hm=1ab6ee6d426ce87021ddd1f5881466a45c08c1414051fd8eba4c030183dcff52&",
          });

        const buttons = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("create_ticket")
            .setLabel("Create Ticket")
            .setEmoji("🎫")
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId("ticket_guide")
            .setLabel("How to use")
            .setEmoji("❓")
            .setStyle(ButtonStyle.Secondary)
        );

        try {
          const setupMessage = await channel.send({
            embeds: [embed],
            components: [buttons],
          });

          await TicketSystem.findOneAndUpdate(
            { guildId: message.guild.id },
            {
              guildId: message.guild.id,
              channelId: channel.id,
              messageId: setupMessage.id,
              supportRoleId: supportRole.id,
              categoryId: openCategory.id,
              closedCategoryId: closedCategory.id,
            },
            { upsert: true, new: true }
          );

          return message.reply(
            "✅ Ticket system has been set up successfully!"
          );
        } catch (error) {
          console.error("Error setting up ticket system:", error);
          return message.reply(
            "❌ An error occurred while setting up the ticket system."
          );
        }

      case "reset":
        // Additional check for reset permissions
        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
          return message.reply({
            embeds: [
              new EmbedBuilder()
                .setDescription(
                  "❌ You need Manage Server permission to reset tickets!"
                )
                .setColor("Red"),
            ],
          });
        }
        try {
          const config = await TicketSystem.findOne({
            guildId: message.guild.id,
          });
          if (!config) {
            return message.reply("❌ No ticket system configuration found!");
          }

          try {
            const ticketChannel = await message.guild.channels.fetch(
              config.channelId
            );
            const ticketMessage = await ticketChannel.messages.fetch(
              config.messageId
            );
            await ticketMessage.delete();
          } catch (err) {
            console.log("Could not delete ticket message:", err);
          }

          await TicketSystem.findOneAndDelete({ guildId: message.guild.id });
          return message.reply("✅ Ticket system has been reset successfully!");
        } catch (error) {
          console.error("Error resetting ticket system:", error);
          return message.reply(
            "❌ An error occurred while resetting the ticket system."
          );
        }

      case "info":
        // Additional check for info permissions
        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
          return message.reply({
            embeds: [
              new EmbedBuilder()
                .setDescription(
                  "❌ You need Manage Server permission to view ticket info!"
                )
                .setColor("Red"),
            ],
          });
        }
        try {
          const config = await TicketSystem.findOne({
            guildId: message.guild.id,
          });
          if (!config) {
            return message.reply("❌ No ticket system configuration found!");
          }

          const activeTickets = await TicketUser.countDocuments({
            guildId: message.guild.id,
          });

          const claimedTickets = await TicketUser.countDocuments({
            guildId: message.guild.id,
            claimed: true,
          });

          const infoEmbed = new EmbedBuilder()
            .setTitle("🎫 Ticket System Information")
            .setColor("#2b2d31")
            .addFields(
              {
                name: "Setup Channel",
                value: `<#${config.channelId}>`,
                inline: true,
              },
              {
                name: "Support Role",
                value: `<@&${config.supportRoleId}>`,
                inline: true,
              },
              {
                name: "Ticket Category",
                value: `<#${config.categoryId}>`,
                inline: true,
              },
              {
                name: "Active Tickets",
                value: `${activeTickets}`,
                inline: true,
              },
              {
                name: "Claimed Tickets",
                value: `${claimedTickets}`,
                inline: true,
              }
            )
            .setFooter({ text: "Ticket System" });

          return message.reply({ embeds: [infoEmbed] });
        } catch (error) {
          console.error("Error getting ticket info:", error);
          return message.reply(
            "❌ An error occurred while getting ticket information."
          );
        }

      case "close":
        try {
          const result = await handleTicketClose(
            message.channel,
            message.author,
            message.guild
          );
          if (result.error) {
            return message.reply(result.message);
          }

          const embed = new EmbedBuilder()
            .setTitle("Ticket Closed")
            .setDescription(`Ticket closed by ${message.author}`)
            .setColor("Red")
            .setTimestamp();

          await message.channel.send({
            embeds: [embed],
            components: [result.buttons],
          });

          return message.reply("✅ Ticket has been closed!");
        } catch (error) {
          console.error("Error closing ticket:", error);
          return message.reply(
            "❌ An error occurred while closing the ticket."
          );
        }
        break;

      case "delete":
        try {
          // Check if user has permission to delete tickets
          if (
            !message.member.permissions.has(PermissionFlagsBits.ManageChannels)
          ) {
            return message.reply({
              embeds: [
                new EmbedBuilder()
                  .setDescription(
                    "❌ You need Manage Channels permission to delete tickets!"
                  )
                  .setColor("Red"),
              ],
            });
          }

          // Check if the channel is a ticket
          const ticketData = await TicketUser.findOne({
            guildId: message.guild.id,
            channelId: message.channel.id,
          });

          if (!ticketData) {
            return message.reply({
              embeds: [
                new EmbedBuilder()
                  .setDescription(
                    "❌ This command can only be used in ticket channels!"
                  )
                  .setColor("Red"),
              ],
            });
          }

          await message.reply("⚠️ Deleting this ticket in 5 seconds...");

          // Delete ticket data
          await TicketUser.findOneAndDelete({
            guildId: message.guild.id,
            channelId: message.channel.id,
          });

          // Delete the channel after 5 seconds
          setTimeout(() => message.channel.delete(), 5000);
        } catch (error) {
          console.error("Error deleting ticket:", error);
          return message.reply(
            "❌ An error occurred while deleting the ticket."
          );
        }
        break;

      case "reopen":
        try {
          // Check if user has permission to reopen tickets
          if (
            !message.member.permissions.has(PermissionFlagsBits.ManageChannels)
          ) {
            return message.reply({
              embeds: [
                new EmbedBuilder()
                  .setDescription(
                    "❌ You need Manage Channels permission to reopen tickets!"
                  )
                  .setColor("Red"),
              ],
            });
          }

          // Check if this is a closed ticket
          const ticketData = await TicketUser.findOne({
            guildId: message.guild.id,
            channelId: message.channel.id,
            closed: true,
          });

          if (!ticketData) {
            return message.reply({
              embeds: [
                new EmbedBuilder()
                  .setDescription(
                    "❌ This command can only be used in closed ticket channels!"
                  )
                  .setColor("Red"),
              ],
            });
          }

          // Update ticket status
          await TicketUser.findOneAndUpdate(
            {
              guildId: message.guild.id,
              channelId: message.channel.id,
            },
            {
              closed: false,
              reopenedBy: message.author.id,
              reopenedAt: Date.now(),
            }
          );

          // Update channel permissions
          await message.channel.permissionOverwrites.edit(ticketData.userId, {
            ViewChannel: true,
            SendMessages: true,
          });

          const embed = new EmbedBuilder()
            .setTitle("🎫 Ticket Reopened")
            .setDescription(
              `Ticket has been reopened by ${message.author}\n<@${ticketData.userId}> your ticket has been reopened!`
            )
            .setColor(client.color)
            .setTimestamp();

          await message.channel.send({ embeds: [embed] });
          return message.reply("✅ Ticket has been reopened successfully!");
        } catch (error) {
          console.error("Error reopening ticket:", error);
          return message.reply(
            "❌ An error occurred while reopening the ticket."
          );
        }
        break;
    }
  },

  // Add button interaction handling
  async handleInteraction(interaction, client) {
    if (!interaction.isButton()) return;

    try {
      switch (interaction.customId) {
        case "create_ticket":
          const config = await TicketSystem.findOne({
            guildId: interaction.guild.id,
          });
          if (!config) {
            return interaction.reply({
              content: "❌ Ticket system is not configured!",
              ephemeral: true,
            });
          }

          const result = await handleTicketCreation(
            interaction.channel,
            interaction.user,
            client,
            config
          );

          if (result.error) {
            return interaction.reply({
              embeds: [result.embed],
              ephemeral: true,
            });
          }

          await interaction.reply({
            content: `✅ Your ticket has been created in ${result.ticketChannel}!`,
            ephemeral: true,
          });
          break;

        case "close_ticket":
          const closeResult = await handleTicketClose(
            interaction.channel,
            interaction.user,
            interaction.guild
          );

          if (closeResult.error) {
            return interaction.reply({
              content: closeResult.message,
              ephemeral: true,
            });
          }

          const closeEmbed = new EmbedBuilder()
            .setTitle("Ticket Closed")
            .setDescription(`Ticket closed by ${interaction.user}`)
            .setColor("Red")
            .setTimestamp();

          await interaction.reply({
            embeds: [closeEmbed],
            components: [closeResult.buttons],
          });
          break;

        case "reopen_ticket":
          const reopenResult = await handleTicketReopen(
            interaction.channel,
            interaction.user,
            interaction.guild
          );

          if (reopenResult.error) {
            return interaction.reply({
              content: reopenResult.message,
              ephemeral: true,
            });
          }

          const reopenMessage =
            `Ticket reopened by ${interaction.user}\n` +
            `<@${reopenResult.ticketData.userId}> your ticket has been reopened!\n\n` +
            `${
              interaction.user.id !== interaction.guild.ownerId
                ? `<@${interaction.guild.ownerId}> | `
                : ""
            }` +
            `<@&${reopenResult.config.supportRoleId}>`;

          const reopenEmbed = new EmbedBuilder()
            .setTitle("Ticket Reopened")
            .setDescription(reopenMessage)
            .setColor("Green")
            .setTimestamp();

          const mentionUsers =
            interaction.user.id === interaction.guild.ownerId
              ? [reopenResult.ticketData.userId]
              : [reopenResult.ticketData.userId, interaction.guild.ownerId];

          await interaction.reply({
            embeds: [reopenEmbed],
            components: [reopenResult.buttons],
            allowedMentions: {
              users: mentionUsers,
              roles: [reopenResult.config.supportRoleId],
            },
          });
          break;

        case "delete_ticket":
          const deleteResult = await handleTicketDelete(
            interaction.channel,
            interaction.user,
            interaction.guild
          );

          if (deleteResult.error) {
            return interaction.reply({
              content: deleteResult.message,
              ephemeral: true,
            });
          }

          await interaction.reply(
            "⚠️ This ticket will be deleted in 5 seconds..."
          );
          setTimeout(() => interaction.channel.delete(), 5000);
          break;

        case "claim_ticket":
          const claimResult = await handleTicketClaim(
            interaction.channel,
            interaction.user,
            interaction.guild
          );

          if (claimResult.error) {
            return interaction.reply({
              content: claimResult.message,
              ephemeral: true,
            });
          }

          await interaction.reply(`✅ Ticket claimed by ${interaction.user}!`);
          break;

        case "ticket_guide":
          const guideEmbed = new EmbedBuilder()
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

          await interaction.reply({
            embeds: [guideEmbed],
            ephemeral: true,
          });
          break;
      }
    } catch (error) {
      console.error("Error handling button interaction:", error);
      return interaction.reply({
        content: "❌ An error occurred while processing your request.",
        ephemeral: true,
      });
    }
  },
};
