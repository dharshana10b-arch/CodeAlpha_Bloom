const express = require('express');
const router = express.Router();
const { deleteComment, likeComment } = require('../controllers/commentController');
const { protect } = require('../middleware/auth');

router.delete('/:id', protect, deleteComment);
router.post('/:id/like', protect, likeComment);

module.exports = router;