const express = require('express');
const router = express.Router();
const { createPost, getFeed, getExplorePosts, getPost, deletePost, likePost, getUserPosts, savePost } = require('../controllers/postController');
const { addComment, getComments } = require('../controllers/commentController');
const { protect, optionalAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.post('/', protect, upload.single('image'), createPost);
router.get('/feed', protect, getFeed);
router.get('/explore', optionalAuth, getExplorePosts);
router.get('/user/:username', optionalAuth, getUserPosts);
router.get('/:id', optionalAuth, getPost);
router.delete('/:id', protect, deletePost);
router.post('/:id/like', protect, likePost);
router.post('/:id/save', protect, savePost);
router.post('/:postId/comments', protect, addComment);
router.get('/:postId/comments', optionalAuth, getComments);

module.exports = router;