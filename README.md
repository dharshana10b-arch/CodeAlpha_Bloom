# Bloom 

A full-stack social media platform built with Express.js, MongoDB, and vanilla JS frontend with a dark red neon glassmorphism aesthetic.

## Features
- JWT authentication with refresh token rotation
- User profiles with avatar & cover photo upload
- Create posts with images and hashtags
- Like & save posts
- Comments with likes
- Follow / unfollow users
- Feed (following only) + Explore (all posts)
- User search
- Fully responsive (mobile bottom nav)

## Tech Stack
- **Backend:** Node.js, Express.js, MongoDB, Mongoose, JWT, Multer
- **Frontend:** HTML, CSS, Vanilla JavaScript
- **Auth:** JWT Access + Refresh tokens

## Setup

1. Clone the repo and install dependencies:
\`\`\`bash
cd backend
npm install
\`\`\`

2. Create `.env` file in `/backend`:
\`\`\`
PORT=5000
MONGO_URI=mongodb://localhost:27017/billage
JWT_SECRET=your_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
NODE_ENV=development
\`\`\`

3. Start the server:
\`\`\`bash
npm run dev
\`\`\`

4. Open `http://localhost:5000`

## Project Structure
\`\`\`
billage/
├── backend/          Express.js API
│   ├── config/       DB connection
│   ├── controllers/  Business logic
│   ├── middleware/   Auth, errors, uploads
│   ├── models/       Mongoose schemas
│   └── routes/       API routes
└── frontend/         Static HTML/CSS/JS
    ├── assets/       CSS & JS files
    ├── pages/        HTML pages
    └── index.html    Main feed
\`\`\`
