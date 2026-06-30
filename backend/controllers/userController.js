const User = require('../models/User');
const Post = require('../models/Post');

exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .populate('followers', 'username displayName avatar')
      .populate('following', 'username displayName avatar');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const postCount = await Post.countDocuments({ author: user._id, isPublic: true });
    const isFollowing = req.user ? user.followers.some(f => f._id.toString() === req.user._id.toString()) : false;
    const isOwnProfile = req.user ? user._id.toString() === req.user._id.toString() : false;

    res.json({ success: true, user: { ...user.toSafeJSON(), postCount, isFollowing, isOwnProfile } });
  } catch (error) { next(error); }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { displayName, bio, website, location } = req.body;
    const updateData = {};
    if (displayName !== undefined) updateData.displayName = displayName;
    if (bio !== undefined) updateData.bio = bio;
    if (website !== undefined) updateData.website = website;
    if (location !== undefined) updateData.location = location;
    if (req.files) {
      if (req.files.avatar) updateData.avatar = `/uploads/${req.files.avatar[0].filename}`;
      if (req.files.coverPhoto) updateData.coverPhoto = `/uploads/${req.files.coverPhoto[0].filename}`;
    }

    const user = await User.findByIdAndUpdate(req.user._id, updateData, { new: true, runValidators: true });
    res.json({ success: true, message: 'Profile updated!', user: user.toSafeJSON() });
  } catch (error) { next(error); }
};

exports.followUser = async (req, res, next) => {
  try {
    const targetId = req.params.id;
    const currentUserId = req.user._id;
    if (targetId === currentUserId.toString())
      return res.status(400).json({ success: false, message: "You can't follow yourself." });

    const targetUser = await User.findById(targetId);
    if (!targetUser) return res.status(404).json({ success: false, message: 'User not found.' });

    const isFollowing = targetUser.followers.includes(currentUserId);
    if (isFollowing) {
      await User.findByIdAndUpdate(targetId, { $pull: { followers: currentUserId } });
      await User.findByIdAndUpdate(currentUserId, { $pull: { following: targetId } });
      return res.json({ success: true, message: 'Unfollowed.', isFollowing: false });
    } else {
      await User.findByIdAndUpdate(targetId, { $addToSet: { followers: currentUserId } });
      await User.findByIdAndUpdate(currentUserId, { $addToSet: { following: targetId } });
      return res.json({ success: true, message: 'Following!', isFollowing: true });
    }
  } catch (error) { next(error); }
};

exports.searchUsers = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q?.trim()) return res.json({ success: true, users: [] });
    const users = await User.find({
      $or: [{ username: { $regex: q, $options: 'i' } }, { displayName: { $regex: q, $options: 'i' } }],
    }).select('username displayName avatar bio followers').limit(10);
    res.json({ success: true, users });
  } catch (error) { next(error); }
};

exports.getFollowers = async (req, res, next) => {
  try {
    const user = await User.findOne({ username: req.params.username }).populate('followers', 'username displayName avatar bio');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, followers: user.followers });
  } catch (error) { next(error); }
};

exports.getFollowing = async (req, res, next) => {
  try {
    const user = await User.findOne({ username: req.params.username }).populate('following', 'username displayName avatar bio');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, following: user.following });
  } catch (error) { next(error); }
};

exports.getSuggestions = async (req, res, next) => {
  try {
    const currentUser = await User.findById(req.user._id);
    const excluded = [req.user._id, ...currentUser.following];
    const suggestions = await User.find({ _id: { $nin: excluded } })
      .select('username displayName avatar bio followers')
      .sort({ followers: -1 })
      .limit(5);
    res.json({ success: true, suggestions });
  } catch (error) { next(error); }
};