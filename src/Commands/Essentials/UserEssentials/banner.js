const { EmbedBuilder } = require("discord.js");
const { category } = require("./roleinfo");

module.exports = {
  name: "banner",
  aliases: ["userbanner", "profilebanner"],
  category: ["essentials", "utilities"],
  description: "View a user's profile banner",
  usage: "[user]",
  // premium: true,

  run: async (client, message, args) => {
    try {
      let target;

      // Get target user
      if (args[0]) {
        try {
          target =
            (await getUserFromMention(message, args[0])) ||
            (await client.users.fetch(args[0]));
        } catch {
          target = message.author;
        }
      } else {
        target = message.author;
      }

      // Fetch user with banner info
      const user = await client.users.fetch(target.id, { force: true });

      if (!user.banner && !user.accentColor) {
        return message.channel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(client.color2)
              .setDescription(
                `${client.emotes.cross} |  ${user.tag} doesn't have a banner or accent color set.`
              ),
          ],
        });
      }

      const embed = new EmbedBuilder()
        .setAuthor({
          name: `${user.tag}'s Banner`,
          iconURL: user.displayAvatarURL({ dynamic: true }),
        })
        .setColor(client.color);

      if (user.banner) {
        const bannerUrl = user.bannerURL({ size: 4096, dynamic: true });
        embed
          .setImage(bannerUrl)
          .setDescription(
            `[\`PNG\`](${bannerUrl.replace("webp", "png")}) | ` +
              `[\`JPG\`](${bannerUrl.replace("webp", "jpg")}) | ` +
              `[\`WEBP\`](${bannerUrl.replace("png", "webp")})`
          );
      } else if (user.accentColor) {
        embed
          .setDescription(
            `This user has no banner but has set their accent color to: \`#${user.accentColor
              .toString(16)
              .padStart(6, "0")}\``
          )
          .setImage(
            `https://singlecolorimage.com/get/${user.accentColor
              .toString(16)
              .padStart(6, "0")}/400x100`
          );
      }

      embed.setFooter({
        text: `Requested by ${message.author.tag}`,
        iconURL: message.author.displayAvatarURL({ dynamic: true }),
      });

      await message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error("Banner Command Error:", error);
      message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(client.color2)
            .setDescription(
              `${client.emotes.cross} |  Failed to fetch banner. Please try again.`
            ),
        ],
      });
    }
  },
};

function getUserFromMention(message, mention) {
  if (!mention) return null;
  const matches = mention.match(/^<@!?(\d+)>$/);
  if (!matches) return null;
  return message.client.users.cache.get(matches[1]);
}
