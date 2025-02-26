const mongoose = require("mongoose");

const noprefixSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("noprefix", noprefixSchema);