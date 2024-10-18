'use strict';
const jwt = require('jsonwebtoken');
require('dotenv').config();


const generateTokenAndSetCookie = (userId, res) => {
    try {
        const token = jwt.sign({userId}, process.env.JWT_SECRET, {
            expiresIn: '1d',
        })
    
        console.log("Login with token: " + token);
        res.cookie("jwt", token, {
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000,
            // sameSite: "strict",
        })
    
        return token;
    } catch (error) {
        throw new Error("Error signing token: " + error.message)
    }
    
}

module.exports = generateTokenAndSetCookie;