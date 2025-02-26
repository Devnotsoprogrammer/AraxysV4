const mongoose = require("mongoose");

let ticketSchema = new mongoose.Schema({
  Guild: String,
  Channel: String,
  Ticket: String,
});

module.exports = mongoose.model("ticket", ticketSchema);
