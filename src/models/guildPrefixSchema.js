const mongoose = require("mongoose");

const guildPrefixSchema = new mongoose.Schema({
  GuildId: {
    type: String,
    required: true,
    unique: true
  },
  Prefix: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("guildPrefix", guildPrefixSchema);
