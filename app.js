const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const session = require('express-session');

// Load environment variables FIRST
dotenv.config();

const app = express();

// Render (and most hosts) sit behind a proxy — needed for correct req.protocol/secure cookies
app.set('trust proxy', 1);

// Webhook route KAFIN express.json()
app.use('/portal/payment/webhook', express.raw({ type: 'application/json' }));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Session setup
app.use(session({
  secret: process.env.SESSION_SECRET || 'school-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Database connection
require('./db');

// Routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const portalRoutes = require('./routes/portal');
const websiteRoutes = require('./routes/website');
const teacherRoutes = require('./routes/teacher');
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/portal', portalRoutes);
app.use('/website', websiteRoutes);
app.use('/teacher', teacherRoutes);

// Website home route
app.get('/', (req, res) => {
  res.sendFile('website/index.html', { root: './public' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});