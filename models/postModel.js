'use strict';

const mongoose = require('mongoose'); // Erase if already required

// Declare the Schema of the Mongo model
const postSchema = new mongoose.Schema({
    text: {type: String, maxLength: 300, default: ''},
    img: {type: String, default: ''},
    likes: {type: Array, default: []},
    postedBy: {type: mongoose.Types.ObjectId, ref: 'User', required: true},
    replies: [{
        userId: {type: mongoose.Types.ObjectId, ref: 'User', required: true},
        text: {type: String, maxLength: 300, default: ''},
        userProfilePic: {type: String, default: ''},
        username: {type: String, required: true},
    }],
}, {
    timestamps: true,
    collection: 'posts'
});

//Export the model
module.exports = mongoose.model('Post', postSchema);