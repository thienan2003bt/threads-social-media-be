const router = require('express').Router();

router.get('/', (req, res, next) => {
    return res.send("Hello world!");
});

router.use('/users', require('./userRoute'));
router.use('/posts', require('./postRoute'));
router.use('/messages', require('./messageRoute'));


module.exports = router;