const Post = require('../models/Post');
const Comment = require('../models/Comment');
const User = require('../models/User');

exports.createPost = async (req, res, next) => {
  try {
    const { content, tags } = req.body;
    if (!content && !req.file)
      return res.status(400).json({ success: false, message: 'Post must have content or an image.' });

    const postData = { author: req.user._id, content: content || '' };
    if (req.file) postData.image = `/uploads/${req.file.filename}`;
    if (tags) postData.tags = tags.split(',').map(t => t.trim().toLowerCase().replace(/^#/, '')).filter(Boolean);

    const post = await Post.create(postData);
    await post.populate('author', 'username displayName avatar isVerified');
    res.status(201).json({ success: true, message: 'Post created!', post });
  } catch (error) { next(error); }
};

exports.getFeed = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const currentUser = await User.findById(req.user._id);
    const feedAuthors = [req.user._id, ...currentUser.following];

    const posts = await Post.find({ author: { $in: feedAuthors }, isPublic: true })
      .populate('author', 'username displayName avatar isVerified')
      .populate({ path: 'comments', options: { limit: 2, sort: { createdAt: -1 } }, populate: { path: 'author', select: 'username displayName avatar' } })
      .sort({ createdAt: -1 })
      .skip(skip).limit(limit);

    const total = await Post.countDocuments({ author: { $in: feedAuthors }, isPublic: true });
    res.json({ success: true, posts, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
};

exports.getExplorePosts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;
    const posts = await Post.find({ isPublic: true })
      .populate('author', 'username displayName avatar isVerified')
      .sort({ createdAt: -1 }).skip(skip).limit(limit);
    const total = await Post.countDocuments({ isPublic: true });
    res.json({ success: true, posts, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
};

exports.getPost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'username displayName avatar isVerified bio')
      .populate({ path: 'comments', populate: { path: 'author', select: 'username displayName avatar' }, options: { sort: { createdAt: 1 } } });
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });
    res.json({ success: true, post });
  } catch (error) { next(error); }
};

exports.deletePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });
    if (post.author.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    await Comment.deleteMany({ post: post._id });
    await post.deleteOne();
    res.json({ success: true, message: 'Post deleted.' });
  } catch (error) { next(error); }
};

exports.likePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });
    const isLiked = post.likes.includes(req.user._id);
    if (isLiked) {
      await Post.findByIdAndUpdate(req.params.id, { $pull: { likes: req.user._id } });
      return res.json({ success: true, liked: false, likeCount: post.likes.length - 1 });
    } else {
      await Post.findByIdAndUpdate(req.params.id, { $addToSet: { likes: req.user._id } });
      return res.json({ success: true, liked: true, likeCount: post.likes.length + 1 });
    }
  } catch (error) { next(error); }
};

exports.getUserPosts = async (req, res, next) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;
    const posts = await Post.find({ author: user._id, isPublic: true })
      .populate('author', 'username displayName avatar isVerified')
      .sort({ createdAt: -1 }).skip(skip).limit(limit);
    const total = await Post.countDocuments({ author: user._id, isPublic: true });
    res.json({ success: true, posts, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
};

exports.savePost = async (req, res, next) => {
  try {
    const currentUser = await User.findById(req.user._id);
    const isSaved = currentUser.savedPosts.includes(req.params.id);
    if (isSaved) {
      await User.findByIdAndUpdate(req.user._id, { $pull: { savedPosts: req.params.id } });
      return res.json({ success: true, saved: false });
    } else {
      await User.findByIdAndUpdate(req.user._id, { $addToSet: { savedPosts: req.params.id } });
      return res.json({ success: true, saved: true });
    }
  } catch (error) { next(error); }
};