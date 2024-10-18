'use strict';
const { Server } = require("socket.io")
const http = require("http");
const express = require("express");
const MessageModel = require("../models/messageModel");
const ConversationModel = require("../models/conversationModel");
const { Types } = require("mongoose");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST", "HEAD", "OPTIONS"],
    }
});

const userSocketMap = {};

const getRecipientSocketId = (recipientId) => {
    return userSocketMap[recipientId];
}

io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId;
    console.log("> User connected: ", socket.id);
    
    
    if(userId) {
        userSocketMap[userId] = socket.id;
    }
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
    
    socket.on("markMessageAsSeen", async ({conversationId, userId}) => {
        try {
            await MessageModel.updateMany(
                {conversationId: new Types.ObjectId(conversationId), seen: false},
                {$set: {seen: true}},
            );

            await ConversationModel.findByIdAndUpdate(conversationId, {
                $set: {"lastMessage.seen": true},
            });

            return io.to(userSocketMap[userId]).emit("messageSeen", { conversationId })
        } catch (error) {
            console.error("Error marking message as seen: " + error.message);
        }
    })
    
    // DISCONNECT
    socket.on("disconnect", () => {
        console.log("< User disconnected: ", socket.id);
        delete userSocketMap[userId];
        io.emit("getOnlineUsers", Object.keys(userSocketMap));
    })
})



module.exports = {
    io, 
    server, 
    app,
    getRecipientSocketId,
};