'use strict';

const mongoose = require('mongoose'); // Erase if already required

// Declare the Schema of the Mongo model
const userSchema = new mongoose.Schema({
    name:{ type:String, required:true },
    username:{ type:String, required:true },
    email:{ type:String, required:true },
    password:{ type:String, required:true, minLength: 6 },
    profilePic:{ type:String, default: '' },
    followers: {type: Array, default: []},
    following: {type: Array, default: []},
    bio: {type: String, default: ''},
    isFrozen: {type: Boolean, default: false}
}, {
    timestamps: true,
    collection: 'users'
});

//Export the model
module.exports = mongoose.model('User', userSchema);