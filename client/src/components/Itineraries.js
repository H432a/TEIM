import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { format } from 'date-fns';
import ItineraryModal from './ItineraryModal';

function Itineraries() {
  const [itineraries, setItineraries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItinerary, setEditingItinerary] = useState(null);
  const [selectedItinerary, setSelectedItinerary] = useState(null);

  useEffect(() => {
    fetchItineraries();
  }, []);

  const fetchItineraries = async () => {
    try {
      const response = await api.get('/itineraries');
      setItineraries(response.data);
    } catch (error) {
      console.error('Error fetching itineraries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingItinerary(null);
    setShowModal(true);
  };

  const handleEdit = (itinerary) => {
    setEditingItinerary(itinerary);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this itinerary?')) {
      try {
        await api.delete(`/itineraries/${id}`);
        fetchItineraries();
      } catch (error) {
        console.error('Error deleting itinerary:', error);
        alert('Failed to delete itinerary');
      }
    }
  };

  const handleView = (itinerary) => {
    setSelectedItinerary(itinerary);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingItinerary(null);
    setSelectedItinerary(null);
    fetchItineraries();
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Itineraries</h1>
        <button onClick={handleAdd} className="btn btn-primary">Add Itinerary</button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Trips</h3>
          <div className="value">{itineraries.length}</div>
        </div>
        <div className="stat-card">
          <h3>Upcoming Trips</h3>
          <div className="value">
            {itineraries.filter(trip => new Date(trip.startDate) >= new Date()).length}
          </div>
        </div>
      </div>

      <div className="card">
        <h2>All Itineraries</h2>
        {itineraries.length > 0 ? (
          <table className="table">
            <thead>
              <tr>
                <th>Trip Name</th>
                <th>Destination</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Type</th>
                <th>Participants</th>
                <th>Items</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {itineraries.map(itinerary => (
                <tr key={itinerary._id}>
                  <td>{itinerary.tripName}</td>
                  <td>{itinerary.destination}</td>
                  <td>{format(new Date(itinerary.startDate), 'MMM dd, yyyy')}</td>
                  <td>{format(new Date(itinerary.endDate), 'MMM dd, yyyy')}</td>
                  <td>
                    {itinerary.isGroupTrip ? (
                      <span className="badge badge-success">Group Trip</span>
                    ) : (
                      <span className="badge badge-secondary">Individual</span>
                    )}
                  </td>
                  <td>
                    {itinerary.isGroupTrip ? (
                      <span>{itinerary.participants?.length || 1} people</span>
                    ) : (
                      <span>-</span>
                    )}
                  </td>
                  <td>{itinerary.items?.length || 0}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleView(itinerary)}
                        className="btn btn-primary"
                        style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleEdit(itinerary)}
                        className="btn btn-secondary"
                        style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(itinerary._id)}
                        className="btn btn-danger"
                        style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <h3>No itineraries yet</h3>
            <p>Click "Add Itinerary" to start planning your trips!</p>
          </div>
        )}
      </div>

      {showModal && (
        <ItineraryModal
          itinerary={editingItinerary || selectedItinerary}
          viewMode={!!selectedItinerary}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
}

export default Itineraries;

