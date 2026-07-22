const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { sendWelcomeEmail } = require('./services/emailService');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

const dbPath = path.join(__dirname, 'db.json');

// Helper to read DB
const readDB = () => {
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify({ users: [] }));
  }
  const data = fs.readFileSync(dbPath);
  return JSON.parse(data);
};

// Helper to write DB
const writeDB = (data) => {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
};

// Routes

// @route POST /api/register
// @desc Register user
// @access Public
app.post(
  '/api/register',
  [
    body('firstName', 'First name is required').notEmpty(),
    body('lastName', 'Last name is required').notEmpty(),
    body('email', 'Please include a valid email').isEmail(),
    body('mobile', 'Mobile number is required').notEmpty(),
    body('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { firstName, lastName, email, mobile, password } = req.body;

    try {
      const db = readDB();
      const users = db.users || [];

      let userExists = users.find(u => u.email === email);

      if (userExists) {
        return res.status(400).json({ error: 'User already exists' });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const newUser = {
        id: Date.now().toString(),
        firstName,
        lastName,
        email,
        mobile,
        password: hashedPassword,
        createdAt: new Date().toISOString()
      };

      users.push(newUser);
      db.users = users;
      writeDB(db);

      // Send welcome email
      console.log('\n----------------------------------------');
      console.log(`[Email System] Attempting to send welcome email...`);
      console.log(`[Email System] Target Email Address: ${email}`);
      try {
        await sendWelcomeEmail({ fname: firstName, lname: lastName, email, phone: mobile });
      } catch (err) {
        console.error('Email sending failed, but user was created.', err);
      }
      console.log('----------------------------------------\n');

      res.status(201).json({ msg: 'User registered successfully' });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// @route POST /api/login
// @desc Authenticate user & get token
// @access Public
app.post(
  '/api/login',
  [
    body('email', 'Please include a valid email').isEmail(),
    body('password', 'Password is required').exists(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      const db = readDB();
      const users = db.users || [];

      let user = users.find(u => u.email === email);

      if (!user) {
        return res.status(400).json({ error: 'Invalid Credentials' });
      }

      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return res.status(400).json({ error: 'Invalid Credentials' });
      }

      const payload = {
        userId: user.id,
      };

      jwt.sign(
        payload,
        process.env.JWT_SECRET || 'fallback_secret_key',
        { expiresIn: '1h' },
        (err, token) => {
          if (err) throw err;
          res.json({ token, user: { firstName: user.firstName, lastName: user.lastName, email: user.email } });
        }
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// @route POST /api/admin-login
// @desc Authenticate admin
// @access Public
app.post(
  '/api/admin-login',
  [
    body('username', 'Username is required').exists(),
    body('password', 'Password is required').exists(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    try {
      const db = readDB();
      const admins = db.admin || [];

      let adminUser = admins.find(a => a.username === username);

      if (!adminUser) {
        return res.status(400).json({ error: 'Invalid Admin Credentials' });
      }

      // Hardcoded passwords for admin in db.json are plain text
      if (password !== adminUser.password) {
        return res.status(400).json({ error: 'Invalid Admin Credentials' });
      }

      const payload = {
        adminId: adminUser.id || adminUser.username,
      };

      jwt.sign(
        payload,
        process.env.JWT_SECRET || 'fallback_secret_key',
        { expiresIn: '4h' },
        (err, token) => {
          if (err) throw err;
          res.json({ token, admin: { username: adminUser.username } });
        }
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// @route GET /api/users
// @desc Get all registered users
// @access Public (should be protected in prod)
app.get('/api/users', async (req, res) => {
  try {
    const db = readDB();
    const users = (db.users || []).map(u => {
      // Exclude passwords
      const { password, ...userData } = u;
      return userData;
    });
    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
