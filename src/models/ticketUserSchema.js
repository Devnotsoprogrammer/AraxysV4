const mongoose = require('mongoose');

const ticketUserSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    channelId: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    claimed: { type: Boolean, default: false },
    claimedBy: { type: String, default: null },
    closed: { type: Boolean, default: false },
    closedBy: { type: String, default: null },
    closedAt: { type: Date, default: null },
    reopenedBy: { type: String, default: null },
    reopenedAt: { type: Date, default: null },
    ticketCount: { type: Number, default: 1 }
});

module.exports = mongoose.model('TicketUser', ticketUserSchema); 