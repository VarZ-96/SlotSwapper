// routes/events.js
import { Router } from 'express';
import db from '../db.js';
import auth from '../middleware/auth.js'; // Import our auth middleware

const router = Router();

// All routes in this file are protected by our auth middleware
// This means any request to /api/events/* must have a valid JWT
router.use(auth);

// --- CREATE A NEW EVENT ---
// POST /api/events
router.post('/', async (req, res) => {
  try {
    const { title, startTime, endTime } = req.body;
    const ownerId = req.user.userId; // We get this from the auth middleware

    // Validate input
    if (!title || !startTime || !endTime) {
      return res.status(400).json({ error: 'Please provide title, startTime, and endTime' });
    }

    const newEvent = await db.query(
      'INSERT INTO events (title, start_time, end_time, owner_id, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [title, startTime, endTime, ownerId, 'BUSY'] // Default status is 'BUSY'
    );

    res.status(201).json(newEvent.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// --- GET ALL OF THE LOGGED-IN USER'S EVENTS ---
// GET /api/events/my-events
router.get('/my-events', async (req, res) => {
  try {
    const ownerId = req.user.userId;

    const events = await db.query(
      'SELECT * FROM events WHERE owner_id = $1 ORDER BY start_time ASC',
      [ownerId]
    );

    res.json(events.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// --- UPDATE AN EVENT (e.g., change title, time, or status) ---
// PUT /api/events/:eventId
router.put('/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const ownerId = req.user.userId;
    const { title, startTime, endTime, status } = req.body;

    // First, verify this event exists and belongs to the user
    const eventResult = await db.query(
      'SELECT * FROM events WHERE event_id = $1 AND owner_id = $2',
      [eventId, ownerId]
    );

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found or user not authorized' });
    }

    // Get current event data
    const currentEvent = eventResult.rows[0];
    
    // Only update the fields that are provided
    const newTitle = title || currentEvent.title;
    const newStartTime = startTime || currentEvent.start_time;
    const newEndTime = endTime || currentEvent.end_time;
    // IMPORTANT: Allow updating status. You might want to add validation
    // to ensure status is one of ('BUSY', 'SWAPPABLE') here,
    // as 'SWAP_PENDING' should only be set by the server.
    const newStatus = status || currentEvent.status;

    const updatedEvent = await db.query(
      'UPDATE events SET title = $1, start_time = $2, end_time = $3, status = $4 WHERE event_id = $5 RETURNING *',
      [newTitle, newStartTime, newEndTime, newStatus, eventId]
    );

    res.json(updatedEvent.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// --- DELETE AN EVENT ---
// DELETE /api/events/:eventId
router.delete('/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const ownerId = req.user.userId;

    // We must ensure the user owns the event before deleting
    const deleteResult = await db.query(
      'DELETE FROM events WHERE event_id = $1 AND owner_id = $2 RETURNING *',
      [eventId, ownerId]
    );

    if (deleteResult.rowCount === 0) {
      return res.status(404).json({ error: 'Event not found or user not authorized' });
    }

    res.json({ msg: 'Event successfully deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

export default router;