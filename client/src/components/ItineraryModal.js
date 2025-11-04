import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';

function ItineraryModal({ itinerary, viewMode, onClose }) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    tripName: '',
    destination: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    description: '',
    items: [],
    isGroupTrip: false,
    participants: []
  });
  const [itemForm, setItemForm] = useState({
    title: '',
    description: '',
    location: '',
    startTime: '',
    endTime: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState(null);
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);

  const isOwner = itinerary ? (itinerary.user?._id || itinerary.user) === user.id : true;

  useEffect(() => {
    if (itinerary) {
      setFormData({
        tripName: itinerary.tripName || '',
        destination: itinerary.destination || '',
        startDate: itinerary.startDate ? new Date(itinerary.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        endDate: itinerary.endDate ? new Date(itinerary.endDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        description: itinerary.description || '',
        items: itinerary.items || [],
        isGroupTrip: itinerary.isGroupTrip || false,
        participants: itinerary.participants?.map(p => p.user?._id || p.user).filter(id => id !== user.id) || []
      });
    }
  }, [itinerary, user.id]);

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: value
    });
  };

  const handleSearchUsers = async (email) => {
    setSearchEmail(email);
    if (email.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await api.get(`/itineraries/users/search?email=${email}`);
      setSearchResults(response.data);
      setShowSearch(true);
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const handleAddParticipant = (selectedUser) => {
    if (!formData.participants.find(p => p === selectedUser._id)) {
      setFormData({
        ...formData,
        participants: [...formData.participants, selectedUser._id]
      });
    }
    setSearchEmail('');
    setSearchResults([]);
    setShowSearch(false);
  };

  const handleRemoveParticipant = (userId) => {
    setFormData({
      ...formData,
      participants: formData.participants.filter(p => p !== userId)
    });
  };

  const getParticipantName = (userId) => {
    if (itinerary?.participants) {
      const participant = itinerary.participants.find(p => (p.user?._id || p.user) === userId);
      return participant?.user?.name || 'Unknown';
    }
    return 'Unknown';
  };

  const handleItemChange = (e) => {
    setItemForm({
      ...itemForm,
      [e.target.name]: e.target.value
    });
  };

  const handleAddItem = () => {
    if (!itemForm.title || !itemForm.startTime) {
      setError('Title and start time are required for itinerary items');
      return;
    }

    const items = [...formData.items];
    if (editingItemIndex !== null) {
      items[editingItemIndex] = { ...itemForm };
    } else {
      items.push({ ...itemForm });
    }

    setFormData({ ...formData, items });
    setItemForm({
      title: '',
      description: '',
      location: '',
      startTime: '',
      endTime: '',
      notes: ''
    });
    setShowItemForm(false);
    setEditingItemIndex(null);
    setError('');
  };

  const handleEditItem = (index) => {
    const item = formData.items[index];
    setItemForm({
      title: item.title || '',
      description: item.description || '',
      location: item.location || '',
      startTime: item.startTime ? new Date(item.startTime).toISOString().slice(0, 16) : '',
      endTime: item.endTime ? new Date(item.endTime).toISOString().slice(0, 16) : '',
      notes: item.notes || ''
    });
    setEditingItemIndex(index);
    setShowItemForm(true);
  };

  const handleDeleteItem = (index) => {
    const items = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items });
  };

  const handleSubmit = async (e) => {
    if (viewMode) {
      onClose();
      return;
    }

    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = {
        ...formData,
        startDate: new Date(formData.startDate),
        endDate: new Date(formData.endDate),
        items: formData.items.map(item => ({
          ...item,
          startTime: new Date(item.startTime),
          endTime: item.endTime ? new Date(item.endTime) : null
        }))
      };

      if (formData.isGroupTrip) {
        data.participants = formData.participants;
      }

      if (itinerary) {
        await api.put(`/itineraries/${itinerary._id}`, data);
      } else {
        await api.post('/itineraries', data);
      }

      onClose();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to save itinerary');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
        <div className="modal-header">
          <h2>
            {viewMode ? 'View Itinerary' : itinerary ? 'Edit Itinerary' : 'Add Itinerary'}
          </h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Trip Name *</label>
            <input
              type="text"
              name="tripName"
              value={formData.tripName}
              onChange={handleChange}
              required
              disabled={viewMode}
            />
          </div>
          <div className="form-group">
            <label>Destination *</label>
            <input
              type="text"
              name="destination"
              value={formData.destination}
              onChange={handleChange}
              required
              disabled={viewMode}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Start Date *</label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                required
                disabled={viewMode}
              />
            </div>
            <div className="form-group">
              <label>End Date *</label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                required
                disabled={viewMode}
              />
            </div>
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              disabled={viewMode}
            />
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                name="isGroupTrip"
                checked={formData.isGroupTrip}
                onChange={handleChange}
                disabled={viewMode || !isOwner}
              />
              Group Trip (Plan with others)
            </label>
          </div>

          {formData.isGroupTrip && (
            <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
              <h4>Participants</h4>
              {isOwner && !viewMode && (
                <div className="form-group" style={{ position: 'relative' }}>
                  <label>Add Participants (by email)</label>
                  <input
                    type="email"
                    placeholder="Search by email..."
                    value={searchEmail}
                    onChange={(e) => handleSearchUsers(e.target.value)}
                  />
                  {showSearch && searchResults.length > 0 && (
                    <div style={{ 
                      position: 'absolute', 
                      backgroundColor: 'white', 
                      border: '1px solid #ddd', 
                      borderRadius: '4px',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      zIndex: 1000,
                      width: '100%',
                      marginTop: '0.25rem'
                    }}>
                      {searchResults.map(userResult => (
                        <div
                          key={userResult._id}
                          onClick={() => handleAddParticipant(userResult)}
                          style={{
                            padding: '0.75rem',
                            cursor: 'pointer',
                            borderBottom: '1px solid #eee'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#f0f0f0'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                        >
                          {userResult.name} ({userResult.email})
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div style={{ marginTop: '1rem' }}>
                <div style={{ 
                  padding: '0.5rem', 
                  backgroundColor: 'white', 
                  borderRadius: '4px',
                  marginBottom: '0.5rem'
                }}>
                  <strong>You</strong> {isOwner && <span className="badge badge-primary">Owner</span>}
                </div>
                {formData.participants.length > 0 ? (
                  formData.participants.map(userId => (
                    <div key={userId} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.5rem',
                      backgroundColor: 'white',
                      borderRadius: '4px',
                      marginBottom: '0.5rem'
                    }}>
                      <span>
                        <strong>{itinerary ? getParticipantName(userId) : 'User'}</strong>
                        {itinerary?.participants?.find(p => (p.user?._id || p.user) === userId)?.role === 'member' && 
                          <span className="badge badge-secondary" style={{ marginLeft: '0.5rem' }}>Member</span>
                        }
                      </span>
                      {isOwner && !viewMode && (
                        <button
                          type="button"
                          onClick={() => handleRemoveParticipant(userId)}
                          className="btn btn-danger"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <p style={{ color: '#666', fontSize: '0.875rem' }}>No other participants yet</p>
                )}
              </div>
            </div>
          )}

          {itinerary?.isGroupTrip && itinerary.participants && (
            <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#e7f3ff', borderRadius: '4px' }}>
              <h4>Group Members</h4>
              {itinerary.participants.map((participant, index) => (
                <div key={index} style={{ marginTop: '0.5rem' }}>
                  <strong>{participant.user?.name || 'Unknown'}</strong>
                  {participant.role === 'owner' && <span className="badge badge-primary" style={{ marginLeft: '0.5rem' }}>Owner</span>}
                  {participant.role === 'member' && <span className="badge badge-secondary" style={{ marginLeft: '0.5rem' }}>Member</span>}
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3>Itinerary Items</h3>
              {!viewMode && (
                <button
                  type="button"
                  onClick={() => {
                    setShowItemForm(!showItemForm);
                    setEditingItemIndex(null);
                    setItemForm({
                      title: '',
                      description: '',
                      location: '',
                      startTime: '',
                      endTime: '',
                      notes: ''
                    });
                  }}
                  className="btn btn-success"
                >
                  {showItemForm ? 'Cancel' : 'Add Item'}
                </button>
              )}
            </div>

            {showItemForm && !viewMode && (
              <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
                <div className="form-group">
                  <label>Title *</label>
                  <input
                    type="text"
                    name="title"
                    value={itemForm.title}
                    onChange={handleItemChange}
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    name="description"
                    value={itemForm.description}
                    onChange={handleItemChange}
                  />
                </div>
                <div className="form-group">
                  <label>Location</label>
                  <input
                    type="text"
                    name="location"
                    value={itemForm.location}
                    onChange={handleItemChange}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Start Time *</label>
                    <input
                      type="datetime-local"
                      name="startTime"
                      value={itemForm.startTime}
                      onChange={handleItemChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>End Time</label>
                    <input
                      type="datetime-local"
                      name="endTime"
                      value={itemForm.endTime}
                      onChange={handleItemChange}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Notes</label>
                  <textarea
                    name="notes"
                    value={itemForm.notes}
                    onChange={handleItemChange}
                  />
                </div>
                <button type="button" onClick={handleAddItem} className="btn btn-primary">
                  {editingItemIndex !== null ? 'Update Item' : 'Add Item'}
                </button>
              </div>
            )}

            {formData.items.length > 0 ? (
              <div>
                {formData.items.map((item, index) => (
                  <div key={index} className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div style={{ flex: 1 }}>
                        <h4>{item.title}</h4>
                        {item.description && <p>{item.description}</p>}
                        {item.location && <p><strong>Location:</strong> {item.location}</p>}
                        <p><strong>Start:</strong> {format(new Date(item.startTime), 'MMM dd, yyyy HH:mm')}</p>
                        {item.endTime && <p><strong>End:</strong> {format(new Date(item.endTime), 'MMM dd, yyyy HH:mm')}</p>}
                        {item.notes && <p><strong>Notes:</strong> {item.notes}</p>}
                      </div>
                      {!viewMode && (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            type="button"
                            onClick={() => handleEditItem(index)}
                            className="btn btn-secondary"
                            style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(index)}
                            className="btn btn-danger"
                            style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#666' }}>No itinerary items yet</p>
            )}
          </div>

          {error && <div className="error">{error}</div>}
          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              {viewMode ? 'Close' : 'Cancel'}
            </button>
            {!viewMode && (
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Saving...' : itinerary ? 'Update' : 'Add'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export default ItineraryModal;

