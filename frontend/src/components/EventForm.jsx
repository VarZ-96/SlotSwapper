// src/components/EventForm.jsx
import React, { useState } from 'react';

const EventForm = ({ onSubmit, onCancel, initialData = {} }) => {
  const [title, setTitle] = useState(initialData.title || '');
  // Note: HTML datetime-local input needs a specific format: YYYY-MM-DDThh:mm
  // We need to format the ISO string (which has a Z) to this.
  const formatDateTimeLocal = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toISOString().slice(0, 16);
  };

  const [startTime, setStartTime] = useState(
    formatDateTimeLocal(initialData.start_time)
  );
  const [endTime, setEndTime] = useState(
    formatDateTimeLocal(initialData.end_time)
  );
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title || !startTime || !endTime) {
      setError('All fields are required.');
      return;
    }
    // Convert back to ISO string for the database
    onSubmit({
      title,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
    });
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <form onSubmit={handleSubmit}>
          <h3>{initialData.event_id ? 'Edit Event' : 'Create New Event'}</h3>
          {error && <p className="error">{error}</p>}
          <div className="form-group">
            <label htmlFor="title">Title</label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="startTime">Start Time</label>
            <input
              type="datetime-local"
              id="startTime"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="endTime">End Time</label>
            <input
              type="datetime-local"
              id="endTime"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
          <div className="form-actions">
            <button type="button" onClick={onCancel} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Save Event
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventForm;