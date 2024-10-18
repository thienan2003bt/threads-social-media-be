'use strict';

const MessageModel = require('../models/messageModel');
const ConversationModel = require('../models/conversationModel');
const { Types } = require('mongoose');
const { getRecipientSocketId, io } = require('../socket/socket');
const cloudinary = require('../helpers/cloudinaryHelper')

const sendMessage = async (req, res, next) => {
    try {
        const {recipientId, message} = req.body;
        let img = req.body.img;
        const senderId = req.user._id;

        let conversation = await ConversationModel.findOne({
            participants: {$all: [new Types.ObjectId(senderId), new Types.ObjectId(recipientId)]}
        });

        if(!conversation) {
            conversation = new ConversationModel({
                participants: [new Types.ObjectId(senderId), new Types.ObjectId(recipientId)],
                lastMessage: {text: message, sender: senderId}
            })

            await conversation.save();
        }

        const checkedConversation = await ConversationModel.findById(conversation._id);
        if(!checkedConversation) {
            return res.status(400).json({ error: "Error creating new conversation" })
        }

        if(img) {
            const uploadedResponse = await cloudinary.uploader.upload(img);
            img = uploadedResponse.secure_url;
        }

        const newMessage = await MessageModel({
            sender: senderId,
            text: message,
            conversationId: new Types.ObjectId(conversation._id),
            img: img || "",
        });

        await Promise.all([
            newMessage.save(),
            ConversationModel.findByIdAndUpdate(conversation._id, {
                lastMessage: {text: newMessage.text, sender: senderId},
            })
        ]);

        const recipientSocketId = getRecipientSocketId(recipientId);
        io.to(recipientSocketId).emit("newMessage", newMessage);
        
        return res.status(201).json({
            message: "Sending new message successfully!",
            data: newMessage
        })
    } catch (error) {
        console.log("Error sending message: " + error.message);
        return res.status(500).json({ error: "Internal Server Error"})
    }
}

const getConversations = async (req, res, next) => {
    const userId = req.user._id;
    try {
        const conversations = await ConversationModel.find({
            participants: new Types.ObjectId(userId)
        })
        .populate({
            path: "participants",
            select: "username profilePic",
        })


        return res.status(200).json({ 
            message: "Get conversations successfully!",
            data: conversations
        })
    } catch (error) {
        console.log("Error getting conversations: " + error.message);
        return res.status(500).json({ error: "Internal Server Error"})
    }
}

const getMessages = async (req, res, next) => {
    const {otherUserId} = req.params;
    const userId = req.user._id;
    try {
        const conversation = await ConversationModel.findOne({
            participants: {$all: [new Types.ObjectId(otherUserId), new Types.ObjectId(userId)]}
        })
        if(!conversation) {
            return res.status(404).json({ error: "Conversation not found!" });
        }

        const messages = await MessageModel.find({
            conversationId: new Types.ObjectId(conversation._id)
        }).sort({createdAt: 1}).lean().exec();

        return res.status(200).json({
            message: "Get messages successfully!",
            data: messages
        })
    } catch (error) {
        console.log("Error getting other user's messages: " + error.message);
        return res.status(500).json({ error: "Internal Server Error"})
    }
}

module.exports = {
    sendMessage,
    getConversations,
    getMessages,
}