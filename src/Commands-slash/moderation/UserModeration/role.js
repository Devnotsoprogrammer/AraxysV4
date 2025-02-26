const { SlashCommandBuilder } = require("@discordjs/builders");
const { PermissionsBitField, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("role")
    .setDescription("Role management commands")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("add")
        .setDescription("Add a role to a user")
        .addUserOption((option) =>
          option
            .setName("target")
            .setDescription("Select a user")
            .setRequired(true)
        )
        .addRoleOption((option) =>
          option
            .setName("role")
            .setDescription("Select a role")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("remove")
        .setDescription("Remove a role from a user")
        .addUserOption((option) =>
          option
            .setName("target")
            .setDescription("Select a user")
            .setRequired(true)
        )
        .addRoleOption((option) =>
          option
            .setName("role")
            .setDescription("Select a role")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("give")
        .setDescription("Give a role to users (Human/Bot/Everyone)")
        .addStringOption((option) =>
          option
            .setName("group")
            .setDescription("Choose the group (Human/Bot/Everyone)")
            .setRequired(true)
            .addChoices(
              { name: "Human", value: "human" },
              { name: "Bot", value: "bot" },
              { name: "Everyone", value: "everyone" }
            )
        )
        .addRoleOption((option) =>
          option
            .setName("role")
            .setDescription("Select a role")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("clear")
        .setDescription("Clear all roles from a user")
        .addUserOption((option) =>
          option
            .setName("target")
            .setDescription("Select a user")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("all")
        .setDescription("Add or remove a role from everyone")
        .addStringOption((option) =>
          option
            .setName("action")
            .setDescription("Add or remove role")
            .setRequired(true)
            .addChoices(
              { name: "Add", value: "add" },
              { name: "Remove", value: "remove" }
            )
        )
        .addRoleOption((option) =>
          option
            .setName("role")
            .setDescription("Select a role")
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    if (
      !interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles)
    ) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription("You do not have permission to manage roles!")
            .setColor(client.color),
        ],
        flags: 64,
      });
    }

    if (
      !interaction.guild.me.permissions.has(
        PermissionsBitField.Flags.ManageRoles
      )
    ) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription("I do not have permission to manage roles!")
            .setColor(client.color),
        ],
        flags: 64,
      });
    }

    const subcommand = interaction.options.getSubcommand();
    const target = interaction.options.getUser("target");
    const role = interaction.options.getRole("role");
    const group = interaction.options.getString("group");
    const action = interaction.options.getString("action");
    const guildMember = target
      ? interaction.guild.members.cache.get(target.id)
      : null;

    if (subcommand === "add" || subcommand === "remove") {
      if (!guildMember) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription("Please specify a valid user.")
              .setColor(client.color),
          ],
          flags: 64,
        });
      }

      if (role.position >= interaction.guild.me.roles.highest.position) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                "I cannot manage this role. The role is higher than my highest role."
              )
              .setColor(client.color),
          ],
          flags: 64,
        });
      }

      if (
        role.position >= interaction.member.roles.highest.position &&
        !interaction.guild.ownerId
      ) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                "You cannot manage roles that are higher or equal in position to yours."
              )
              .setColor(client.color),
          ],
          flags: 64,
        });
      }
    }

    switch (subcommand) {
      case "add":
        if (guildMember.roles.cache.has(role.id)) {
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setDescription(
                  `<@${guildMember.user.id}> already has the role <@${role.id}>.`
                )
                .setColor(client.color),
            ],
            flags: 64,
          });
        }

        await guildMember.roles.add(role);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `Role <@${role.id}> has been added to <@${guildMember.user.id}>.`
              )
              .setColor(client.color),
          ],
        });

      case "remove":
        if (!guildMember.roles.cache.has(role.id)) {
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setDescription(
                  `<@${guildMember.user.id}> does not have the role <@${role.id}>.`
                )
                .setColor(client.color),
            ],
            flags: 64,
          });
        }

        await guildMember.roles.remove(role);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `Role <@${role.id}> has been removed from <@${guildMember.user.id}>.`
              )
              .setColor(client.color),
          ],
        });

      case "give":
        const members = interaction.guild.members.cache.filter((member) => {
          if (group.toLowerCase() === "human") return !member.user.bot;
          if (group.toLowerCase() === "bot") return member.user.bot;
          return true;
        });

        members.forEach((member) => {
          member.roles.add(role).catch(console.error);
        });

        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `Role <@${role.id}> has been given to ${group} members.`
              )
              .setColor(client.color),
          ],
        });

      case "clear":
        if (!guildMember) {
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setDescription("Please specify a valid user.")
                .setColor(client.color),
            ],
            flags: 64,
          });
        }

        const userRoles = guildMember.roles.cache.filter(
          (r) => r.id !== interaction.guild.id
        );
        await guildMember.roles.remove(userRoles);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `<@${guildMember.user.id}>'s roles have been cleared.`
              )
              .setColor(client.color),
          ],
        });

      case "all":
        if (!action) {
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setDescription("Please specify an action (add/remove).")
                .setColor(client.color),
            ],
            flags: 64,
          });
        }

        const allMembers = interaction.guild.members.cache;
        if (action.toLowerCase() === "add") {
          allMembers.forEach((member) => {
            member.roles.add(role).catch(console.error);
          });
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setDescription(
                  `Role <@${role.id}> has been added to everyone.`
                )
                .setColor(client.color),
            ],
          });
        } else if (action.toLowerCase() === "remove") {
          allMembers.forEach((member) => {
            member.roles.remove(role).catch(console.error);
          });
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setDescription(
                  `Role <@${role.id}> has been removed from everyone.`
                )
                .setColor(client.color),
            ],
          });
        } else {
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setDescription("Invalid action. Use add or remove.")
                .setColor(client.color),
            ],
            flags: 64,
          });
        }
    }
  },
};
