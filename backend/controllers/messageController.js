const Message = require('../models/Message');
const User = require('../models/User');

// Send Message
exports.sendMessage = async (req, res, next) => {
  try {
    const { receiverId, content } = req.body;
    const senderId = req.user._id;

    if (!receiverId || !content) {
      return res.status(400).json({ success: false, message: 'Receiver and content are required.' });
    }

    // Verify receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ success: false, message: 'Receiver user not found.' });
    }

    const message = await Message.create({
      sender: senderId,
      receiver: receiverId,
      content,
    });

    await message.populate('sender', 'username displayName avatar isVerified');
    await message.populate('receiver', 'username displayName avatar isVerified');

    res.status(201).json({ success: true, message });
  } catch (error) {
    next(error);
  }
};

// Get Conversation between current user and another user
exports.getConversation = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;
    const partnerId = req.params.userId;

    const messages = await Message.find({
      $or: [
        { sender: currentUserId, receiver: partnerId },
        { sender: partnerId, receiver: currentUserId },
      ],
    })
      .sort({ createdAt: 1 })
      .populate('sender', 'username displayName avatar isVerified')
      .populate('receiver', 'username displayName avatar isVerified');

    res.json({ success: true, messages });
  } catch (error) {
    next(error);
  }
};

// Get list of conversations (chats) for current user
exports.getConversationsList = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;

    // Retrieve all messages involving the current user
    const messages = await Message.find({
      $or: [{ sender: currentUserId }, { receiver: currentUserId }],
    })
      .sort({ createdAt: -1 })
      .populate('sender', 'username displayName avatar isVerified')
      .populate('receiver', 'username displayName avatar isVerified');

    // Group messages by contact
    const chatsMap = new Map();

    for (const msg of messages) {
      const isSender = msg.sender._id.toString() === currentUserId.toString();
      const contact = isSender ? msg.receiver : msg.sender;
      const contactId = contact._id.toString();

      if (!chatsMap.has(contactId)) {
        chatsMap.set(contactId, {
          contact: {
            _id: contact._id,
            username: contact.username,
            displayName: contact.displayName,
            avatar: contact.avatar,
            isVerified: contact.isVerified,
          },
          lastMessage: {
            content: msg.content,
            createdAt: msg.createdAt,
            senderId: msg.sender._id,
          },
          unreadCount: 0,
        });
      }

      // If search received the message and it is unread, increment count
      if (!isSender && !msg.read) {
        const chatData = chatsMap.get(contactId);
        chatData.unreadCount += 1;
      }
    }

    // Convert map to array sorted by latest message timestamp
    const conversations = Array.from(chatsMap.values()).sort(
      (a, b) => new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt)
    );

    res.json({ success: true, conversations });
  } catch (error) {
    next(error);
  }
};

// Mark conversation with a specific user as read
exports.markAsRead = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;
    const partnerId = req.params.userId;

    await Message.updateMany(
      { sender: partnerId, receiver: currentUserId, read: false },
      { $set: { read: true } }
    );

    res.json({ success: true, message: 'Messages marked as read.' });
  } catch (error) {
    next(error);
  }
};
