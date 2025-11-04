// src/pages/Requests.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx'; // .jsx
import { Link } from 'react-router-dom';
import api from '../services/api';

const Requests = () => {
  const { user, logout } = useAuth();
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Helper to format dates for display
  const formatDisplayDate = (isoString) => {
    return new Date(isoString).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const fetchRequests = async () => {
    try {
      setIsLoading(true);
      setError('');
      // Fetch both lists in parallel
      const [incomingRes, outgoingRes] = await Promise.all([
        api.get('/swap/requests/incoming'),
        api.get('/swap/requests/outgoing'),
      ]);
      setIncoming(incomingRes.data);
      setOutgoing(outgoingRes.data);
    } catch (err) {
      setError('Failed to fetch swap requests.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleResponse = async (requestId, accept) => {
    try {
      await api.post(`/swap/response/${requestId}`, { accept });
      // Refresh the lists
      fetchRequests();
    } catch (err) {
      console.error(err);
      setError('Failed to respond to request.');
    }
  };

  return (
    <div>
      <nav>
        <h1>SlotSwapper</h1>
        <div>
          <span>Welcome, {user?.name}!</span>
          <Link to="/">Dashboard</Link>
          <Link to="/marketplace">Marketplace</Link>
          <button onClick={logout}>Log Out</button>
        </div>
      </nav>

      <div className="dashboard-container">
        <h2>My Swap Requests</h2>
        {error && <p className="error">{error}</p>}
        {isLoading && <p>Loading requests...</p>}

        {/* --- INCOMING REQUESTS --- */}
        <div className="request-section">
          <h3>Incoming Requests</h3>
          {incoming.length > 0 ? (
            <div className="request-list">
              {incoming.map((req) => (
                <div key={req.request_id} className="request-card">
                  <p>
                    <strong>{req.requester_name}</strong> wants to swap:
                  </p>
                  <p>
                    <strong>Their Slot:</strong> {req.requester_slot_title} (
                    {formatDisplayDate(req.requester_slot_start)})
                  </p>
                  <p>
                    <strong>For Your Slot:</strong> {req.responder_slot_title} (
                    {formatDisplayDate(req.responder_slot_start)})
                  </p>
                  <div className="event-actions">
                    <button
                      onClick={() => handleResponse(req.request_id, true)}
                      className="btn-success"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleResponse(req.request_id, false)}
                      className="btn-danger"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            !isLoading && <p>You have no pending incoming requests.</p>
          )}
        </div>

        {/* --- OUTGOING REQUESTS --- */}
        <div className="request-section">
          <h3>Outgoing Requests</h3>
          {outgoing.length > 0 ? (
            <div className="request-list">
              {outgoing.map((req) => (
                <div key={req.request_id} className="request-card">
                  <p>
                    You offered <strong>{req.requester_slot_title}</strong> to{' '}
                    <strong>{req.responder_name}</strong> for their{' '}
                    <strong>{req.responder_slot_title}</strong>.
                  </p>
                  <p className={`request-status status-${req.status.toLowerCase()}`}>
                    Status: <strong>{req.status}</strong>
                  </p>
                </div>
              ))}
            </div>
          ) : (
            !isLoading && <p>You have no pending outgoing requests.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Requests;