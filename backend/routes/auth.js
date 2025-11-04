// routes/auth.js
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';

const router = Router();

// === SIGN UP ===
// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // 1. Check if user already exists
    const userCheck = await db.query('SELECT * FROM users WHERE email = $1', [
      email,
    ]);
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    // 2. Hash the password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 3. Insert new user into the database
    //    We use 'RETURNING *' to get the new user's data back
    const newUser = await db.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING user_id, name, email',
      [name, email, passwordHash]
    );

    const user = newUser.rows[0];

    // 4. Generate JWT
    const token = jwt.sign(
      { userId: user.user_id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1d' } // Token expires in 1 day
    );

    // 5. Send response
    res.status(201).json({
      token,
      user: {
        userId: user.user_id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// === LOG IN ===
// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Check if user exists
    const userResult = await db.query('SELECT * FROM users WHERE email = $1', [
      email,
    ]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = userResult.rows[0];

    // 2. Compare password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 3. Generate JWT
    const token = jwt.sign(
      { userId: user.user_id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // 4. Send response
    res.json({
      token,
      user: {
        userId: user.user_id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

export default router;