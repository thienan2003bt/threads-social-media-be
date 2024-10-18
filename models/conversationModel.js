'use strict';

const mongoose = require('mongoose'); // Erase if already required

// Declare the Schema of the Mongo model
const userSchema = new mongoose.Schema({
    participants: [{ type: mongoose.Types.ObjectId, ref: 'User' }],
    lastMessage: {type: Object, default: {}},
}, {
    timestamps: true,
    collection: "Conversations"
});

//Export the model
module.exports = mongoose.model('Conversation', userSchema);