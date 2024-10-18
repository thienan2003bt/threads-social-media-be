const express = require('express');
const connectDB = require('./db/connectDB');
const cookieParser = require('cookie-parser');
const CORS = require('cors');

const {app, server} = require("./socket/socket");

require('dotenv').config();

const PORT = process.env.PORT || 5000;

connectDB();


app.use(CORS({
    origin: 'http://localhost:3000',
    optionsSuccessStatus: 200,
    credentials: true,
}))

app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({ 
    extended: true,
    limit: '50mb',
    parameterLimit: 5000,
}));
app.use(cookieParser());

app.use('/', require('./routes/index'));


server.listen(PORT, () => {
    console.log("Threads server is listening on port: " + PORT + ", url: http://localhost:" + PORT);
})