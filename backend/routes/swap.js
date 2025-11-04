// routes/swap.js
import { Router } from 'express';
import db from '../db.js';
import auth from '../middleware/auth.js'; // Import our auth middleware

const router = Router();

// All routes in this file are protected
router.use(auth);

// --- GET ALL SWAPPABLE SLOTS (Marketplace View) ---
// GET /api/swap/swappable-slots
router.get('/swappable-slots', async (req, res) => {
  try {
    const myUserId = req.user.userId;

    // Get all events that are "SWAPPABLE" and do NOT belong to the current user
    // Also join with the 'users' table to get the owner's name
    const swappableSlots = await db.query(
      `SELECT e.*, u.name AS owner_name
       FROM events e
       JOIN users u ON e.owner_id = u.user_id
       WHERE e.status = 'SWAPPABLE' AND e.owner_id != $1
       ORDER BY e.start_time ASC`,
      [myUserId]
    );

    res.json(swappableSlots.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// --- CREATE A NEW SWAP REQUEST ---
// POST /api/swap/request
router.post('/request', async (req, res) => {
  const { mySlotId, theirSlotId } = req.body;
  const myUserId = req.user.userId;

  // We use a transaction to ensure both slots are updated
  // or neither is, if an error occurs.
  const client = await db.pool.connect(); // Use a client for transactions
  try {
    await client.query('BEGIN');

    // 1. Get 'my' slot, verify I own it and it's swappable
    const mySlotRes = await client.query(
      "SELECT * FROM events WHERE event_id = $1 AND owner_id = $2 AND status = 'SWAPPABLE'",
      [mySlotId, myUserId]
    );
    if (mySlotRes.rows.length === 0) {
      throw new Error('Your slot is not valid or not swappable.');
    }

    // 2. Get 'their' slot, verify it's swappable and get owner ID
    const theirSlotRes = await client.query(
      "SELECT * FROM events WHERE event_id = $1 AND status = 'SWAPPABLE'",
      [theirSlotId]
    );
    if (theirSlotRes.rows.length === 0) {
      throw new Error('The desired slot is not valid or no longer swappable.');
    }
    const theirSlot = theirSlotRes.rows[0];
    const theirUserId = theirSlot.owner_id;

    // 3. Check that user is not swapping with themselves
    if (myUserId === theirUserId) {
      throw new Error('You cannot swap a slot with yourself.');
    }

    // 4. Create the swap request
    await client.query(
      'INSERT INTO swap_requests (requester_id, responder_id, requester_slot_id, responder_slot_id, status) VALUES ($1, $2, $3, $4, $5)',
      [myUserId, theirUserId, mySlotId, theirSlotId, 'PENDING']
    );

    // 5. Update both events' status to 'SWAP_PENDING'
    await client.query(
      "UPDATE events SET status = 'SWAP_PENDING' WHERE event_id = $1",
      [mySlotId]
    );
    await client.query(
      "UPDATE events SET status = 'SWAP_PENDING' WHERE event_id = $1",
      [theirSlotId]
    );

    // 6. Commit the transaction
    await client.query('COMMIT');

    res.status(201).json({ msg: 'Swap request created successfully.' });
  } catch (err) {
    await client.query('ROLLBACK'); // Roll back all changes if any error occurred
    console.error(err.message);
    res.status(500).json({ error: err.message || 'Server error' });
  } finally {
    client.release(); // Release the client back to the pool
  }
});

// --- RESPOND TO A SWAP REQUEST ---
// POST /api/swap/response/:requestId
router.post('/response/:requestId', async (req, res) => {
  const { requestId } = req.params;
  const { accept } = req.body; // true or false
  const myUserId = req.user.userId;

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Get the request and verify I am the responder and it's 'PENDING'
    const reqRes = await client.query(
      "SELECT * FROM swap_requests WHERE request_id = $1 AND responder_id = $2 AND status = 'PENDING'",
      [requestId, myUserId]
    );
    if (reqRes.rows.length === 0) {
      throw new Error('Swap request not found, not pending, or you are not authorized to respond.');
    }
    const swapRequest = reqRes.rows[0];
    const { requester_id, responder_id, requester_slot_id, responder_slot_id } = swapRequest;

    if (accept === true) {
      // --- USER ACCEPTS THE SWAP ---

      // 1. Update the swap request status
      await client.query(
        "UPDATE swap_requests SET status = 'ACCEPTED' WHERE request_id = $1",
        [requestId]
      );

      // 2. Exchange the owners of the two events
      //    (And set status back to 'BUSY')
      await client.query(
        "UPDATE events SET owner_id = $1, status = 'BUSY' WHERE event_id = $2",
        [responder_id, requester_slot_id] // Responder now owns the requester's slot
      );
      await client.query(
        "UPDATE events SET owner_id = $1, status = 'BUSY' WHERE event_id = $2",
        [requester_id, responder_slot_id] // Requester now owns the responder's slot
      );

      // 3. Reject any other pending requests for these two slots
      await client.query(
        "UPDATE swap_requests SET status = 'REJECTED' WHERE (requester_slot_id = $1 OR responder_slot_id = $1 OR requester_slot_id = $2 OR responder_slot_id = $2) AND status = 'PENDING'",
        [requester_slot_id, responder_slot_id]
      );

      res.json({ msg: 'Swap accepted!' });
    } else {
      // --- USER REJECTS THE SWAP ---

      // 1. Update the swap request status
      await client.query(
        "UPDATE swap_requests SET status = 'REJECTED' WHERE request_id = $1",
        [requestId]
      );

      // 2. Set both events' status back to 'SWAPPABLE'
      await client.query(
        "UPDATE events SET status = 'SWAPPABLE' WHERE event_id = $1",
        [requester_slot_id]
      );
      await client.query(
        "UPDATE events SET status = 'SWAPPABLE' WHERE event_id = $1",
        [responder_slot_id]
      );
      
      res.json({ msg: 'Swap rejected.' });
    }

    // 6. Commit the transaction
    await client.query('COMMIT');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err.message);
    res.status(500).json({ error: err.message || 'Server error' });
  } finally {
    client.release();
  }
});


// --- GET A USER'S SWAP REQUESTS (for Notification View) ---
// This is split into 'incoming' and 'outgoing' for the frontend

// GET /api/swap/requests/incoming
router.get('/requests/incoming', async (req, res) => {
    try {
        const myUserId = req.user.userId;
        // Get requests where I am the RESPONDER and status is PENDING
        const requests = await db.query(
            `SELECT 
                sr.request_id, sr.status,
                u_req.name AS requester_name,
                e_req.event_id AS requester_slot_id, e_req.title AS requester_slot_title, e_req.start_time AS requester_slot_start, e_req.end_time AS requester_slot_end,
                e_res.event_id AS responder_slot_id, e_res.title AS responder_slot_title, e_res.start_time AS responder_slot_start, e_res.end_time AS responder_slot_end
             FROM swap_requests sr
             JOIN users u_req ON sr.requester_id = u_req.user_id
             JOIN events e_req ON sr.requester_slot_id = e_req.event_id
             JOIN events e_res ON sr.responder_slot_id = e_res.event_id
             WHERE sr.responder_id = $1 AND sr.status = 'PENDING'`,
            [myUserId]
        );
        res.json(requests.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// GET /api/swap/requests/outgoing
router.get('/requests/outgoing', async (req, res) => {
    try {
        const myUserId = req.user.userId;
        // Get requests where I am the REQUESTER
        const requests = await db.query(
            `SELECT 
                sr.request_id, sr.status,
                u_res.name AS responder_name,
                e_req.title AS requester_slot_title,
                e_res.title AS responder_slot_title, e_res.start_time AS responder_slot_start, e_res.end_time AS responder_slot_end
             FROM swap_requests sr
             JOIN users u_res ON sr.responder_id = u_res.user_id
             JOIN events e_req ON sr.requester_slot_id = e_req.event_id
             JOIN events e_res ON sr.responder_slot_id = e_res.event_id
             WHERE sr.requester_id = $1
             ORDER BY sr.created_at DESC`,
            [myUserId]
        );
        res.json(requests.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});


export default router;