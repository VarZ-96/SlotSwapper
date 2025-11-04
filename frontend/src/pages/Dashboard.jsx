// src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import api from '../services/api'; // Import our API helper
import EventForm from '../components/eventForm'; // Import the form

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  // --- Data Fetching ---
  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/events/my-events');
      setEvents(response.data);
      setError('');
    } catch (err) {
      setError('Failed to fetch events.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Run fetchEvents() once when the component loads
  useEffect(() => {
    fetchEvents();
  }, []);

  // --- Event Handlers ---
  const handleCreateEvent = async (eventData) => {
    try {
      const response = await api.post('/events', eventData);
      setEvents([...events, response.data]); // Add new event to state
      setShowForm(false); // Hide the form
    } catch (err) {
      console.error(err);
      setError('Failed to create event.');
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        await api.delete(`/events/${eventId}`);
        setEvents(events.filter((e) => e.event_id !== eventId)); // Remove from state
      } catch (err) {
        console.error(err);
        setError('Failed to delete event.');
      }
    }
  };

  const handleUpdateStatus = async (event, newStatus) => {
    try {
      const response = await api.put(`/events/${event.event_id}`, {
        status: newStatus,
      });
      // Update the single event in our state
      setEvents(
        events.map((e) => (e.event_id === event.event_id ? response.data : e))
      );
    } catch (err) {
      console.error(err);
      setError('Failed to update status.');
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
          <Link to="/marketplace">Marketplace</Link>
          <Link to="/requests">My Requests</Link>
          <button onClick={logout}>Log Out</button>
        </div>
      </nav>

      <div className="dashboard-container">
        <div className="dashboard-header">
          <h2>My Calendar</h2>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            + Create Event
          </button>
        </div>

        {error && <p className="error">{error}</p>}
        {isLoading && <p>Loading events...</p>}

        <div className="event-list">
          {events.map((event) => (
            <div key={event.event_id} className={`event-card status-${event.status.toLowerCase()}`}>
              <div className="event-card-header">
                <h3>{event.title}</h3>
                <span className="event-status">{event.status}</span>
              </div>
              <p>
                {formatDisplayDate(event.start_time)} –{' '}
                {formatDisplayDate(event.end_time)}
              </p>
              <div className="event-actions">
                {event.status === 'BUSY' && (
                  <button
                    onClick={() => handleUpdateStatus(event, 'SWAPPABLE')}
                    className="btn-secondary"
                  >
                    Make Swappable
                  </button>
                )}
                {event.status === 'SWAPPABLE' && (
                  <button
                    onClick={() => handleUpdateStatus(event, 'BUSY')}
                    className="btn-secondary"
                  >
                    Make Busy
                  </button>
                )}
                <button
                  onClick={() => handleDeleteEvent(event.event_id)}
                  className="btn-danger"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {events.length === 0 && !isLoading && (
          <p>You have no events. Click "Create Event" to get started.</p>
        )}
      </div>

      {/* The "Create Event" Modal */}
      {showForm && (
        <EventForm
          onSubmit={handleCreateEvent}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
};

export default Dashboard;