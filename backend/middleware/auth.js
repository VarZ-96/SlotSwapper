// middleware/auth.js
import jwt from 'jsonwebtoken';
import 'dotenv/config';

// This function is our middleware
export default (req, res, next) => {
  // Get token from the 'Authorization' header
  // It's usually in the format: "Bearer <token>"
  const authHeader = req.header('Authorization');

  // Check if there's a header
  if (!authHeader) {
    return res.status(401).json({ error: 'No token, authorization denied' });
  }

  // Check if it's a Bearer token
  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Malformed token, authorization denied' });
  }

  // Verify the token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Add the user's ID from the token payload to the request object
    // Now all our protected routes will have access to req.user.userId
    req.user = {
      userId: decoded.userId
    };

    next(); // Pass control to the next middleware (or the route handler)
  } catch (err) {
    res.status(401).json({ error: 'Token is not valid' });
  }
};