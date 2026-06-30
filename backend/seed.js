require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('./models/User');
const Post = require('./models/Post');
const Comment = require('./models/Comment');
const Message = require('./models/Message');

const connectDB = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ MongoDB Connected');
};

const users = [
  { username: 'seraphina_gold', displayName: 'Seraphina 🌸', email: 'seraphina@bloom.app', password: 'password123', bio: 'gathering pink cherry wood and building a castle in the clouds. Level 99 goddess 🏰', location: 'Cherry Biome', isVerified: true },
  { username: 'celeste_luna', displayName: 'Celeste 🌙', email: 'celeste@bloom.app', password: 'password123', bio: 'starry block skies and nether portal adventures. let\'s cozy up in the cherry grove biome 🌠', location: 'Starry Plains', isVerified: true },
  { username: 'aurelia_rose', displayName: 'Aurelia 🌹', email: 'aurelia@bloom.app', password: 'password123', bio: 'crafting diamond swords with rose gold hilts. aesthetics matter, even in pixels 🛡️', location: 'Rose Garden Biome', isVerified: false },
  { username: 'diana_hunt', displayName: 'Diana 🏹', email: 'diana@bloom.app', password: 'password123', bio: 'hunting creepers with a power V bow. cashmere armor only. ⚔️', location: 'Mountain Peaks', isVerified: true },
  { username: 'freya_nordic', displayName: 'Freya 🕯️', email: 'freya@bloom.app', password: 'password123', bio: 'nordic cottage curator. collecting sweet berries and reading enchant books by the fire 🦢', location: 'Taiga Biome', isVerified: false },
];

const postContents = [
  { content: 'Finding solace in the morning light, crafting diamond pickaxes in my cherry castle. True luxury is a full inventory. 🌸💎', tags: ['pixelgame', 'minecraft', 'goddess'] },
  { content: 'Building a cottage garden in the pixel plains. The air smells of sweet berries, campfire, and oak leaves. 🏡🍃', tags: ['cozy', 'gaming', 'cottagecore'] },
  { content: 'To the girls who survive the Nether raids and keep their inventories organized: you are queens. 👑🛡️', tags: ['gamer', 'femininity', 'inspiration'] },
  { content: 'Brewing health potions in glass bottles, golden hour casting shadows on my crafting table. A cozy afternoon.', tags: ['pixel', 'aesthetic', 'cozy'] },
  { content: 'Embracing the slow life: taming pink axolotls, planting cherry saplings, and watching the sunset over block mountains. 🌸🌅', tags: ['minecraft', 'wellness', 'cozygame'] },
  { content: 'Velvet ribbons, gold blocks, and retro soundtracks on a Tuesday night.', tags: ['retro', 'aesthetic', 'gaming'] },
  { content: 'Letting go of things that do not light up my soul. Only warm pixel tones and beautiful minds allowed here. 🌸', tags: ['bloom', 'vibes', 'wellness'] },
  { content: 'Nothing is more elegant than kindness, and nothing is more radiant than a player who knows her power. ✨⚔️', tags: ['inspiration', 'gamer', 'bloom'] },
];

const commentTexts = [
  'this is everything omg 🔥',
  'absolutely obsessed with this',
  'why does this hit so hard 😭',
  'the vibes are immaculate',
  'screaming crying throwing up this is so real',
  'the aesthetic is unmatched fr',
  'i feel so seen rn',
  'living for this energy 🖤',
  'this gave me chills no joke',
  'so beautiful 🌸',
];

const seed = async () => {
  try {
    await connectDB();

    // Clear existing data
    await User.deleteMany({});
    await Post.deleteMany({});
    await Comment.deleteMany({});
    await Message.deleteMany({});
    console.log('🗑️  Cleared existing database collections');

    // Create users
    const createdUsers = [];
    for (const userData of users) {
      const user = await User.create(userData);
      createdUsers.push(user);
    }
    console.log(`👥 Created ${createdUsers.length} users`);

    // Make everyone follow everyone
    for (let i = 0; i < createdUsers.length; i++) {
      const others = createdUsers.filter((_, j) => j !== i).map(u => u._id);
      await User.findByIdAndUpdate(createdUsers[i]._id, {
        following: others,
        followers: others,
      });
    }
    console.log('👥 Set up follow relationships');

    // Create posts
    const createdPosts = [];
    for (let i = 0; i < postContents.length; i++) {
      const author = createdUsers[i % createdUsers.length];
      const post = await Post.create({
        author: author._id,
        content: postContents[i].content,
        tags: postContents[i].tags,
        isPublic: true,
      });
      createdPosts.push(post);
    }
    console.log(`📝 Created ${createdPosts.length} posts`);

    // Add random likes to posts
    for (const post of createdPosts) {
      const numLikes = Math.floor(Math.random() * createdUsers.length) + 1;
      const likers = createdUsers
        .sort(() => Math.random() - 0.5)
        .slice(0, numLikes)
        .map(u => u._id);
      await Post.findByIdAndUpdate(post._id, { likes: likers });
    }
    console.log('❤️  Added likes to posts');

    // Add comments to posts
    for (const post of createdPosts) {
      const numComments = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < numComments; i++) {
        const commenter = createdUsers[Math.floor(Math.random() * createdUsers.length)];
        const text = commentTexts[Math.floor(Math.random() * commentTexts.length)];
        await Comment.create({
          post: post._id,
          author: commenter._id,
          content: text,
          likes: [],
        });
      }
    }
    console.log('💬 Added comments to posts');

    // Seed conversations
    const msgData = [
      { sender: createdUsers[0]._id, receiver: createdUsers[1]._id, content: "Hello Celeste! I loved your post about starry nights. The photography was divine 🌙" },
      { sender: createdUsers[1]._id, receiver: createdUsers[0]._id, content: "Thank you, Seraphina! That means so much coming from you. Let's do a vintage shoot soon ✨" },
      { sender: createdUsers[2]._id, receiver: createdUsers[0]._id, content: "Seraphina, do you know where I can get that silk slip you posted yesterday? It's gorgeous." },
      { sender: createdUsers[0]._id, receiver: createdUsers[2]._id, content: "Aurelia! It's from a vintage shop in Rome, I'll send you the details tomorrow morning 🌹" },
      { sender: createdUsers[3]._id, receiver: createdUsers[4]._id, content: "Hey Freya! Are we still visiting the museum this weekend? 🏛️" },
      { sender: createdUsers[4]._id, receiver: createdUsers[3]._id, content: "Yes, Diana! I was just getting my cashmere sweater ready. Can't wait! 🕯️" },
    ];

    for (const m of msgData) {
      await Message.create(m);
    }
    console.log(`✉️ Seeded ${msgData.length} message interactions`);

    console.log('\n✅ SEED COMPLETE! 🔥');
    console.log('\n📋 TEST ACCOUNTS:');
    console.log('──────────────────────────────');
    users.forEach(u => {
      console.log(`👤 ${u.displayName}`);
      console.log(`   Email: ${u.email}`);
      console.log(`   Username: ${u.username}`);
      console.log(`   Password: password123`);
      console.log('');
    });
    console.log('──────────────────────────────');
    console.log('🌐 Open: http://localhost:5000');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }
};

seed();