const { sendMessage, getMessages, getConversations } = require('../controllers/messageController');
const { protectRoute } = require('../middlewares/protectRoute');

const router = require('express').Router();

router.use(protectRoute)

router.get("/", () => {});
router.get("/conversations", getConversations);
router.get("/:otherUserId", getMessages);

router.post("/", sendMessage);

module.exports = router;