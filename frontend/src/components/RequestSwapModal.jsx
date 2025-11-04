// src/components/RequestSwapModal.jsx
import React, { useState, useEffect } from 'react';
import api from '../services/api';

const RequestSwapModal = ({ targetSlot, onCancel, onSubmit }) => {
  const [mySlots, setMySlots] = useState([]);
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Fetch the current user's *own* swappable slots to offer
    const fetchMySwappableSlots = async () => {
      try {
        setIsLoading(true);
        const response = await api.get('/events/my-events');
        const swappable = response.data.filter(
          (event) => event.status === 'SWAPPABLE'
        );
        setMySlots(swappable);
      } catch (err) {
        setError('Failed to fetch your swappable slots.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchMySwappableSlots();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedSlotId) {
      setError('You must select one of your slots to offer.');
      return;
    }
    onSubmit(selectedSlotId, targetSlot.event_id);
  };
  
  // Helper to format dates for display
  const formatDisplayDate = (isoString) => {
    return new Date(isoString).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <form onSubmit={handleSubmit}>
          <h3>Request Swap</h3>
          <p>
            You are requesting to swap for:
            <strong> {targetSlot.title}</strong> (
            {formatDisplayDate(targetSlot.start_time)})
          </p>
          <hr />
          <p>Which of your swappable slots do you want to offer?</p>
          
          {isLoading && <p>Loading your slots...</p>}
          {error && <p className="error">{error}</p>}

          {!isLoading && mySlots.length > 0 && (
            <div className="form-group">
              <select
                value={selectedSlotId}
                onChange={(e) => setSelectedSlotId(e.target.value)}
                required
              >
                <option value="" disabled>Select your slot...</option>
                {mySlots.map((slot) => (
                  <option key={slot.event_id} value={slot.event_id}>
                    {slot.title} ({formatDisplayDate(slot.start_time)})
                  </option>
                ))}
              </select>
            </div>
          )}

          {!isLoading && mySlots.length === 0 && (
            <p>
              You have no swappable slots to offer. Go to your Dashboard to
              make a slot "Swappable".
            </p>
          )}

          <div className="form-actions">
            <button type="button" onClick={onCancel} className="btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={mySlots.length === 0 || !selectedSlotId}
            >
              Send Swap Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RequestSwapModal;