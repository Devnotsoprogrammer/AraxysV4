const mongoose = require('mongoose');

const ticketSystemSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    channelId: { type: String, required: true },
    messageId: { type: String },
    supportRoleId: { type: String, required: true },
    categoryId: { type: String, required: true },
    closedCategoryId: { type: String, required: true }
});

module.exports = mongoose.model('TicketSystem', ticketSystemSchema); 