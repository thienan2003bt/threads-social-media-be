'use strict';

const mongoose = require('mongoose'); // Erase if already required

// Declare the Schema of the Mongo model
const userSchema = new mongoose.Schema({
    text: {type: String, default: ''},
    conversationId: {type: mongoose.Types.ObjectId, ref: "Conversation"},
    sender: {type: mongoose.Types.ObjectId, ref: "User"},
    seen: {type: Boolean, default: false},
    img: {type: String, default: ''}
}, {
    timestamps: true,
    collection: 'Messages'
});

//Export the model
module.exports = mongoose.model('Message', userSchema);