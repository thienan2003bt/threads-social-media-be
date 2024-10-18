'use strict';

const userModel = require("../models/userModel");
const PostModel = require('../models/postModel');
const { Types } = require("mongoose");
const cloudinary = require("../helpers/cloudinaryHelper");


const getPost = async (req, res, next) => {
    try {
        const {id} = req.params;
        const post = await PostModel.findById(id);

        if(post) {
            return res.status(200).json({
                message: "Get post successfully!",
                data: post._doc,
            })
        }

        return res.status(404).json({ error: "No post found!" });
    } catch (error) {
        console.error("Error getting post: " + error.message);
        return res.status(500).json({ error: "Internal Server Error" })
    }
}

const getUserPosts = async (req, res, next) => {
    try {
        const {username} = req.params;
        const user = await userModel.findOne({ username: username });
        if(!user) {
            return res.status(404).json({ error: "User not found!" });
        }

        const posts = await PostModel.find({
            postedBy: new Types.ObjectId(user?._id)
        }).sort({createdAt: -1}).lean().exec();

        if(posts) {
            return res.status(200).json({
                message: "Get posts by username successfully!",
                data: posts,
            })
        }

        return res.status(404).json({ error: "No post found!" });
    } catch (error) {
        console.error("Error getting user's post: " + error.message);
        return res.status(500).json({ error: "Internal Server Error" })
    }
}

const getFeedPost = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const user = await userModel.findById(userId);
        if(!user) {
            return res.status(404).json({ error: "User not found!"});
        }

        const feedPosts = await PostModel.find({
            postedBy: {$in: user.following}
        }).sort({createdAt: -1}).lean();

        return res.status(200).json({
            message: "Get feed posts successfully!",
            data: feedPosts,
        })

    } catch (error) {
        console.error("Error getting feed post: " + error.message);
        return res.status(500).json({ message: "Internal Server Error" })
    }
}

const createPost = async (req, res, next) => {
    try {
        const {postedBy, text, img} = req.body;
        if(!postedBy || !text) {
            return res.status(400).json({ error: "Some of the properties are required!"})
        }

        const user = await userModel.findById(postedBy);
        if(!user) {
            return res.status(404).json({ error: "User not found!"});
        } else if(user._id.toString() !== req.user._id.toString()) {
            return res.status(401).json({ error: "Unauthorized!"});
        }

        const maxLength = 500;
        if(text.length > maxLength) {
            return res.status(400).json({ error: `Text must be less than ${maxLength} characters in length!`});
        }

        let newImg = img;
        if(img) {
            const uploadedResponse = await cloudinary.uploader.upload(img);
            newImg = uploadedResponse.secure_url;
        }

        const newPost = await PostModel({postedBy, text, img: newImg});
        await newPost.save();

        return res.status(201).json({ 
            message: "New post created successfully!", 
            data: { ...newPost._doc }
        });

    } catch (error) {
        console.error("Error creating new post: " + error.message);
        return res.status(500).json({ error: "Internal Server Error" })
    }
}

const toggleLike = async (req, res, next) => {
    try {
        const {id: postId} = req.params;
        const userId = req.user._id;

        const post = await PostModel.findById(postId);
        if(!post) {
            return res.status(404).json({ message: "Post not found!"});
        }

        const isLiked = post.likes?.includes(userId.toString());
        if(isLiked === true) {
            const data = await PostModel.findByIdAndUpdate(postId, {
                $pull: {likes: new Types.ObjectId(userId)}
            }, {new: true});

            return res.status(200).json({ message: "Unlike post successfully!", data });
        } else {
            const data = await PostModel.findByIdAndUpdate(postId, {
                $push: {likes: new Types.ObjectId(userId)}
            }, {new: true});

            return res.status(200).json({ message: "Like post successfully!", data });
        }
    } catch (error) {
        console.error("Error toggling like for post: " + error.message);
        return res.status(500).json({ message: "Internal Server Error" })
    }
}

const replyPost = async (req, res, next) => {
    try {
        const {text} = req.body;
        if(!text) {
            return res.status(400).json({ message: "Text in reply is required!"});
        }

        const {id: postId} = req.params;
        const post = await PostModel.findById(postId);
        if(!post) {
            return res.status(404).json({ message: "Post not found!"});
        }

        const {_id: userId, profilePic, username} = req.user;
        const data = await PostModel.findByIdAndUpdate(postId, {
            $push: {
                replies: {
                    userId: new Types.ObjectId(userId),
                    text: text,
                    userProfilePic: profilePic,
                    username: username,
                }   
            },
        }, { new: true });

        return res.status(201).json({
            message: "Create new reply to post successfully!",
            data: data
        })
    } catch (error) {
        console.error("Error replying post: " + error.message);
        return res.status(500).json({ message: "Internal Server Error" })
    }
}

const deletePost = async (req, res, next) => {
    try {
        const post = await PostModel.findById(req.params?.id ?? '');
        if(!post) {
            return res.status(404).json({ message: "Post not found!"});
        } else if(post?.postedBy.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: "Unauthorized!"});
        }

        if(post?.img) {
            const imgId = post.img.split("/").pop().split(".")[0];
            await cloudinary.uploader.destroy(imgId);
        }

        const data = await PostModel.findByIdAndDelete(req.params.id);
        return res.status(200).json({
            message: "Delete post successfully!",
            data
        });
    } catch (error) {
        console.error("Error creating new post: " + error.message);
        return res.status(500).json({ message: "Internal Server Error" })
    }
}

module.exports = {
    getPost,
    getUserPosts,
    getFeedPost,
    createPost,
    deletePost,
    toggleLike,
    replyPost,
}