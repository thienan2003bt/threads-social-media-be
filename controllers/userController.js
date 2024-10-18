'use strict';
const UserModel = require('../models/userModel');
const PostModel = require('../models/postModel');
const bcrypt = require('bcrypt');
const cloudinary = require("../helpers/cloudinaryHelper");
const generateTokenAndSetCookie = require('../helpers/generateTokenAndSetCookie');
const { Types } = require('mongoose');

const getUserProfile = async (req, res, next) => {
    try {
        const {query} = req.params;
        // Query is either username or userId

        let user = null;
        if(Types.ObjectId.isValid(query)) {
            user = await UserModel.findById(query).select("-password -updatedAt").lean();
        } else {
            user = await UserModel.findOne({username: query}).select("-password -updatedAt").lean();
        }

        if(!user) {
            return res.status(404).json({ message: 'User not found!', error: 'User not found!' });
        }

        return res.status(200).json({ message: "Get user's profile successfully!", data: {...user} })
    } catch (error) {
        console.error("Error getting user's profile", error.message);
        return res.status(500).json({message: "Internal Server Error"})
    }
}

const getSuggestedUsers = async (req, res, next) => {
    try {
        const userId = req.user._id;
        // let followedUsers = await UserModel.findById(userId).select("following").lean();
        // followedUsers = followedUsers.following;

        let suggestedUsers = [];
        const maxLoopCount = 3;
        for (let index = 0; index < maxLoopCount; index++) {
            const users = await UserModel.aggregate([{ 
                $match: { 
                    _id: { $ne: new Types.ObjectId(userId) },
                    followers: {$nin: [new Types.ObjectId(userId)]}
                }}, { 
                $sample: { size: 10 } 
                }
            ]);
            if(!users || users.length <= 0) {
                return res.status(401).json({ error: "No user matched!" })
            }
            
            suggestedUsers = users
                .map(x => {
                    return {...x, password: null}
                })
                .slice(0, 5)
            ;

            if(suggestedUsers.length > 0) {
                break;
            }
        }

        return res.status(200).json({
            message: "Get suggested users successfully!",
            data: suggestedUsers
        })
    } catch (error) {
        console.error("Error getting user's suggested users", error.message);
        return res.status(500).json({message: "Internal Server Error"})
    }
}

const signupUser = async(req, res, next) => {
    try {
        const {name, username, email, password} = req.body;
        const user = await UserModel.findOne({ $or: [{ email, username }] })
        if(user) {
            return res.status(400).json({message: "User already exists!"})
        }

        const SALT = bcrypt.genSaltSync(10);
        const hashedPassword = bcrypt.hashSync(password, SALT);

        const newUser = await UserModel({name, email, username, password: hashedPassword})
        await newUser.save();


        if(newUser) {
            const token = generateTokenAndSetCookie(newUser._id, res);
            res.cookie("jwt", token, {
                httpOnly: true,
                maxAge: 24 * 60 * 60 * 1000,
                // sameSite: "strict",
            })
            return res.status(201).json({
                message: "New user created successfully", 
                data: {...newUser._doc, password: null}
            });
        }

        return res.status(400).json({message: "Invalid user data"})
    } catch (error) {
        console.error("Error signing up new user", error.message);
        return res.status(500).json({message: "Internal Server Error"})
    }
}

const loginUser = async (req, res, next) => {
    try {
        const {username, password} = req.body;
        const user = await UserModel.findOne({username: username});
        if(!user) {
            return res.status(404).json({message: "Invalid username or password!"})
        }
        const isPasswordMatched = bcrypt.compareSync(password, user?.password ?? '');
        if(isPasswordMatched === false) {
            return res.status(404).json({message: "Invalid username or password!"})
        }

        if(user.isFrozen === true) {
            await UserModel.findByIdAndUpdate(user._id, 
                {isFrozen: false}, 
                {new: true}
            );
        }

        const token = generateTokenAndSetCookie(user._doc._id, res);
        res.cookie("jwt", token, {
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000,
        });
        return res.status(200).json({
            ...user._doc,
            password: null,
            jwt: token,
        })
    } catch (error) {
        console.error("Error logging in: " + error.message);
        return res.status(500).json({message: "Internal Server Error"})
    }
}

const logoutUser = async (req, res, next) => {
    try {
        res.cookie("jwt", "", { maxAge: 1 });
        return res.status(200).json({ message: "Logout successfully!" })
    } catch (error) {
        console.error("Error logging out: " + error.message);
        return res.status(500).json({message: "Internal Server Error"})
    }
}

const toggleFollowUser = async (req, res, next) => {
    try {
        const {id} = req.params;
        const userToModify = await UserModel.findById(id).lean();
        const currentUser = await UserModel.findById(req.user._id);

        if(id === req.user?._id.toString()) {
            return res.status(400).json({message: "You cannot follow / unfollow yourself"})
        }
        if(!userToModify || !currentUser) {
            return res.status(404).json({message: "Users not found!"});
        }

        const isFollowing = currentUser.following?.includes(id) ?? false;
        if(isFollowing === true) {
            await UserModel.findByIdAndUpdate(req.user._id, {
                $pull: { following: id }
            });

            await UserModel.findByIdAndUpdate(id, {
                $pull: { followers: req.user._id }
            });
            return res.status(200).json({ message: "Unfollow successfully!" })
        } else {
            await UserModel.findByIdAndUpdate(req.user._id, {
                $push: { following: id }
            });

            await UserModel.findByIdAndUpdate(id, {
                $push: { followers: req.user._id }
            });
            return res.status(200).json({ message: "Follow successfully!" })
        }

    } catch (error) {
        console.error("Error following / unfollowing user: " + error.message);
        return res.status(500).json({message: "Internal Server Error"})
    }
}

const updateUser = async (req, res, next) => {
    const {name, email, username, password, profilePic, bio} = req.body;
    const userId = req.user._id;
    try {
        let user = await UserModel.findById(userId);
        if(!user) {
            return res.status(404).json({ message: "User not found!"});
        }

        if(req.params.id !== userId.toString()) {
            return res.status(401).json({ message: "Unauthorized" })
        }
        if(password) {
            const salt = bcrypt.genSaltSync(10);
            const hashedPassword = bcrypt.hashSync(password, salt);
            user.password = hashedPassword;
        }

        let newProfilePic = profilePic;
        if(profilePic) {
            if(user.profilePic) {
                await cloudinary.uploader.destroy(user.profilePic.split('/').pop().split('.')[0])
            }

            const uploadedResponse = await cloudinary.uploader.upload(profilePic);
            newProfilePic = uploadedResponse.secure_url;
        }

        user.name = name ?? user?.name;
        user.username = username ?? user?.username;
        user.email = email ?? user?.email;
        user.profilePic = newProfilePic ?? user?.profilePic;
        user.bio = bio ?? user?.bio;
        
        user = await user.save();

        // Find all users in all post's replies and update it
        await PostModel.updateMany(
            {"replies.userId": userId}, 
            {$set: {
                "replies.$[reply].username": user.username,
                "replies.$[reply].userProfilePic": user.profilePic
            }},
            { arrayFilters: [{"reply.userId": userId}] },
        );
        
        return res.status(200).json({ message: "Update user successfully!", data: {...user._doc, password: null} });
    } catch (error) {
        console.error("Error updating user: " + error.message);
        return res.status(500).json({message: "Internal Server Error"})
    }
}

const freezeUser = async (req, res, next) => {
    const userId = req.user._id;
    try {
        const user = await UserModel.findByIdAndUpdate(userId, 
            {isFrozen: true}, 
            {new: true}
        );
        if(!user) {
            return res.status(404).json({ error: "User not found!"});
        }

        return res.status(200).json({
            message: "Freeze account successfully!",
            data: user
        })

    } catch (error) {
        console.error("Error freezing user: " + error.message);
        return res.status(500).json({message: "Internal Server Error"})
    }
}

module.exports = {
    getUserProfile,
    getSuggestedUsers,
    signupUser, 
    loginUser,
    logoutUser,
    toggleFollowUser,
    updateUser,
    freezeUser,
};