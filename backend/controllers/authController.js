const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '15m' });
  const refreshToken = jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' });
  return { accessToken, refreshToken };
};

exports.register = async (req, res, next) => {
  try {
    const { username, email, password, displayName } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ success: false, message: 'Username, email, and password are required.' });

    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      const field = existing.email === email ? 'Email' : 'Username';
      return res.status(400).json({ success: false, message: `${field} already taken.` });
    }

    const user = await User.create({ username, email, password, displayName: displayName || username });
    const { accessToken, refreshToken } = generateTokens(user._id);
    await User.findByIdAndUpdate(user._id, { $push: { refreshTokens: refreshToken } });

    res.status(201).json({ success: true, message: 'Account created!', accessToken, refreshToken, user: user.toSafeJSON() });
  } catch (error) { next(error); }
};

exports.login = async (req, res, next) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password)
      return res.status(400).json({ success: false, message: 'Email/username and password are required.' });

    const user = await User.findOne({
      $or: [{ email: identifier.toLowerCase() }, { username: identifier }],
    }).select('+password +refreshTokens');

    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });

    const { accessToken, refreshToken } = generateTokens(user._id);
    const tokens = (user.refreshTokens || []);
    if (tokens.length >= 5) tokens.shift();
    tokens.push(refreshToken);
    await User.findByIdAndUpdate(user._id, { refreshTokens: tokens });

    res.json({ success: true, message: 'Logged in!', accessToken, refreshToken, user: user.toSafeJSON() });
  } catch (error) { next(error); }
};

exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ success: false, message: 'Refresh token required.' });

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id).select('+refreshTokens');
    if (!user || !user.refreshTokens.includes(refreshToken))
      return res.status(401).json({ success: false, message: 'Invalid refresh token.' });

    const { accessToken, refreshToken: newRT } = generateTokens(user._id);
    const tokens = user.refreshTokens.filter(t => t !== refreshToken);
    tokens.push(newRT);
    await User.findByIdAndUpdate(user._id, { refreshTokens: tokens });

    res.json({ success: true, accessToken, refreshToken: newRT });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError')
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token.' });
    next(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken && req.user)
      await User.findByIdAndUpdate(req.user._id, { $pull: { refreshTokens: refreshToken } });
    res.json({ success: true, message: 'Logged out.' });
  } catch (error) { next(error); }
};

exports.getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};