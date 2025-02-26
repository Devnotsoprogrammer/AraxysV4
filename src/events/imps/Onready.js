const { cleanExpiredPremium } = require("../../utils/premiumUtil");
module.exports = {
  name: "ready",
  once: true,
  async execute(client) {
    console.log(`${client.user.username} is online!`);

    // Clean premium database every 24 hours
    setInterval(async () => {
      try {
        await cleanExpiredPremium();
        console.log("Premium database cleaned successfully");
      } catch (error) {
        console.error("Error cleaning premium database:", error);
      }
    }, 24 * 60 * 60 * 1000);

    // Initial cleanup on bot start
    try {
      await cleanExpiredPremium();
      console.log("Initial premium database cleanup completed");
    } catch (error) {
      console.error("Error during initial premium cleanup:", error);
    }
  },
};
