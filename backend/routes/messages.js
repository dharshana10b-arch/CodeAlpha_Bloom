const express = require('express');
const router = express.Router();
const { sendMessage, getConversation, getConversationsList, markAsRead } = require('../controllers/messageController');
const { protect } = require('../middleware/auth');

router.post('/', protect, sendMessage);
router.get('/conversations', protect, getConversationsList);
router.get('/:userId', protect, getConversation);
router.put('/:userId/read', protect, markAsRead);

module.exports = router;
