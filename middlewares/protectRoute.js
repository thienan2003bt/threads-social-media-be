'use strict';
require('dotenv').config();
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');

const protectRoute = async (req, res, next) => {
    try {
        const token = req.cookies["jwt"];
        if(!token) {
            return res.status(401).json({ error: "Not authenticated user!" })
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        const user = await userModel.findById(decoded?.userId).select("-password");

        req.user = user;
        return next();
    } catch (error) {
        console.error("Error using protected route: ", error.message);
        return res.status(401).json({ error: "Not authenticated user!" })
    }
}


module.exports = {
    protectRoute,
}