const Comment = require('../models/Comment');
const Post = require('../models/Post');

exports.addComment = async (req, res, next) => {
  try {
    const { content, parentComment } = req.body;
    if (!content?.trim()) return res.status(400).json({ success: false, message: 'Comment content is required.' });

    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });

    const commentData = { post: req.params.postId, author: req.user._id, content: content.trim() };
    if (parentComment) {
      const parent = await Comment.findById(parentComment);
      if (!parent) return res.status(404).json({ success: false, message: 'Parent comment not found.' });
      commentData.parentComment = parentComment;
    }

    const comment = await Comment.create(commentData);
    if (parentComment) await Comment.findByIdAndUpdate(parentComment, { $push: { replies: comment._id } });
    await comment.populate('author', 'username displayName avatar');

    res.status(201).json({ success: true, comment });
  } catch (error) { next(error); }
};

exports.getComments = async (req, res, next) => {
  try {
    const comments = await Comment.find({ post: req.params.postId, parentComment: null })
      .populate('author', 'username displayName avatar')
      .populate({ path: 'replies', populate: { path: 'author', select: 'username displayName avatar' } })
      .sort({ createdAt: 1 });
    res.json({ success: true, comments, count: comments.length });
  } catch (error) { next(error); }
};

exports.deleteComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found.' });
    if (comment.author.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    if (comment.parentComment)
      await Comment.findByIdAndUpdate(comment.parentComment, { $pull: { replies: comment._id } });
    await Comment.deleteMany({ parentComment: comment._id });
    await comment.deleteOne();
    res.json({ success: true, message: 'Comment deleted.' });
  } catch (error) { next(error); }
};

exports.likeComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found.' });
    const isLiked = comment.likes.includes(req.user._id);
    if (isLiked) {
      await Comment.findByIdAndUpdate(req.params.id, { $pull: { likes: req.user._id } });
      return res.json({ success: true, liked: false, likeCount: comment.likes.length - 1 });
    } else {
      await Comment.findByIdAndUpdate(req.params.id, { $addToSet: { likes: req.user._id } });
      return res.json({ success: true, liked: true, likeCount: comment.likes.length + 1 });
    }
  } catch (error) { next(error); }
};