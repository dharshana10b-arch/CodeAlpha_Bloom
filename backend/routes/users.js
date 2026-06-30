const express = require('express');
const router = express.Router();
const { getProfile, updateProfile, followUser, searchUsers, getFollowers, getFollowing, getSuggestions } = require('../controllers/userController');
const { protect, optionalAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/search', optionalAuth, searchUsers);
router.get('/suggestions', protect, getSuggestions);
router.put('/profile', protect, upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'coverPhoto', maxCount: 1 }]), updateProfile);
router.get('/:username', optionalAuth, getProfile);
router.post('/:id/follow', protect, followUser);
router.get('/:username/followers', optionalAuth, getFollowers);
router.get('/:username/following', optionalAuth, getFollowing);

module.exports = router;