// server.js
import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import db from './db.js';

// Import our routes
import authRoutes from './routes/auth.js';
import eventRoutes from './routes/events.js';
import swapRoutes from './routes/swap.js';

const app = express();
const PORT = process.env.PORT || 5000;

// --- Middleware ---
app.use(cors()); // Allows your React frontend to talk to this server
app.use(express.json()); // Parses incoming JSON request bodies

// --- Test Routes ---
app.get('/', (req, res) => {
  res.send('SlotSwapper API is running!');
});

// Test database connection
app.get('/api/test-db', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW()');
    res.json({
      message: 'Database connection successful!',
      time: result.rows[0].now,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

// --- API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/swap', swapRoutes);

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});