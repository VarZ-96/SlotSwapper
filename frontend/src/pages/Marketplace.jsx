// src/pages/Marketplace.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx'; // .jsx
import { Link } from 'react-router-dom';
import api from '../services/api';
import RequestSwapModal from '../components/RequestSwapModal.jsx'; // .jsx

const Marketplace = () => {
  const { user, logout } = useAuth();
  const [swappableSlots, setSwappableSlots] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // State for the modal
  const [showModal, setShowModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null); // The slot they WANT

  // --- Data Fetching ---
  const fetchMarketplace = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/swap/swappable-slots');
      setSwappableSlots(response.data);
      setError('');
    } catch (err) {
      setError('Failed to fetch swappable slots.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // This hook runs the fetchMarketplace function once when the page loads
  useEffect(() => {
    fetchMarketplace();
  }, []);

  // --- Modal Handlers ---
  const handleRequestClick = (slot) => {
    setSelectedSlot(slot);
    setShowModal(true);
  };

  const handleModalCancel = () => {
    setShowModal(false);
    setSelectedSlot(null);
  };

  const handleModalSubmit = async (mySlotId, theirSlotId) => {
    try {
      await api.post('/swap/request', { mySlotId, theirSlotId });
      setShowModal(false);
      setSelectedSlot(null);
      // Refresh the marketplace list, as that slot is now pending
      fetchMarketplace(); 
    } catch (err) {
      console.error(err);
      setError('Failed to send swap request. ' + (err.response?.data?.error || ''));
    }
  };

  // Helper to format dates for display
  const formatDisplayDate = (isoString) => {
    return new Date(isoString).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  return (
    <div>
      <nav>
        <h1>SlotSwapper</h1>
        <div>
          <span>Welcome, {user?.name}!</span>
          <Link to="/">Dashboard</Link>
          <Link to="/requests">My Requests</Link>
          <button onClick={logout}>Log Out</button>
        </div>
      </nav>

      <div className="dashboard-container">
        <h2>Marketplace - Available Slots</h2>
        
        {error && <p className="error">{error}</p>}
        {isLoading && <p>Loading available slots...</p>}

        <div className="event-list">
          {swappableSlots.map((slot) => (
            <div key={slot.event_id} className="event-card status-swappable">
              <div className="event-card-header">
                <h3>{slot.title}</h3>
                <span className="event-status">SWAPPABLE</span>
              </div>
              <p>
                <strong>Owner:</strong> {slot.owner_name}
              </p>
              <p>
                {formatDisplayDate(slot.start_time)} –{' '}
                {formatDisplayDate(slot.end_time)}
              </p>
              <div className="event-actions">
                <button
                  onClick={() => handleRequestClick(slot)}
                  className="btn-primary"
                >
                  Request Swap
                </button>
              </div>
            </div>
          ))}
        </div>

        {swappableSlots.length === 0 && !isLoading && (
          <p>No swappable slots available right now.</p>
        )}
      </div>

      {showModal && (
        <RequestSwapModal
          targetSlot={selectedSlot}
          onCancel={handleModalCancel}
          onSubmit={handleModalSubmit}
        />
      )}
    </div>
  );
};

export default Marketplace;