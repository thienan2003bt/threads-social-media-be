'use strict';
const { getPost, getUserPosts, getFeedPost, createPost, deletePost, toggleLike, replyPost } = require('../controllers/postController');
const { protectRoute } = require('../middlewares/protectRoute');
const router = require('express').Router();

router.get('/feeds', protectRoute, getFeedPost);
router.get('/:id', getPost);
router.get('/user/:username', getUserPosts);

router.use(protectRoute)

router.post('/create', createPost);

router.put('/like/:id', toggleLike);
router.put('/reply/:id', replyPost);

router.delete('/delete/:id', deletePost)

module.exports = router;