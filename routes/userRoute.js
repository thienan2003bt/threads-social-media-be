const {getUserProfile, getSuggestedUsers, signupUser, loginUser, logoutUser, toggleFollowUser, updateUser, freezeUser } = require('../controllers/userController');
const { protectRoute } = require('../middlewares/protectRoute');


const router = require('express').Router();

router.get('/profile/:query', getUserProfile);


router.post('/signup', signupUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser);


// AUTHENTICATION PROTECTION
router.use(protectRoute)

router.get('/suggested', getSuggestedUsers);

router.post('/follow/:id', toggleFollowUser);

router.patch('/update/:id', updateUser);
router.patch('/freeze/', freezeUser);

module.exports = router;