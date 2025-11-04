import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

function ExpenseModal({ expense, onClose }) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: '',
    category: 'Other',
    date: new Date().toISOString().split('T')[0],
    isSplit: false,
    splitType: 'equal',
    participants: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [participantDetails, setParticipantDetails] = useState({}); // Store participant details for display

  useEffect(() => {
    if (expense) {
      // Extract participant IDs properly, handling both populated and unpopulated cases
      const participantIds = expense.participants?.map(p => {
        const userId = p.user?._id || p.user?._id || p.user;
        return userId ? (userId.toString ? userId.toString() : userId) : null;
      }).filter(id => id !== null) || [];
      
      // Store participant details for display
      const details = {};
      expense.participants?.forEach(p => {
        const userId = p.user?._id || p.user;
        if (userId) {
          const userIdStr = userId.toString ? userId.toString() : userId;
          details[userIdStr] = {
            name: p.user?.name || 'Unknown',
            email: p.user?.email || ''
          };
        }
      });
      setParticipantDetails(details);
      
      setFormData({
        title: expense.title || '',
        description: expense.description || '',
        amount: expense.amount ? String(expense.amount) : '',
        category: expense.category || 'Other',
        date: expense.date ? new Date(expense.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        isSplit: expense.isSplit || false,
        splitType: expense.splitType || 'equal',
        participants: participantIds
      });
    } else {
      // Reset form when not editing
      setFormData({
        title: '',
        description: '',
        amount: '',
        category: 'Other',
        date: new Date().toISOString().split('T')[0],
        isSplit: false,
        splitType: 'equal',
        participants: []
      });
      setParticipantDetails({});
    }
  }, [expense]);

  const handleChange = (e) => {
    let value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    
    // For amount field, ensure it stays as a string to preserve decimal input
    if (e.target.name === 'amount' && e.target.type === 'number') {
      value = e.target.value; // Keep as string to preserve user input
    }
    
    setFormData({
      ...formData,
      [e.target.name]: value
    });
  };

  const handleSearchUsers = async (email) => {
    setSearchEmail(email);
    if (email.length < 2) {
      setSearchResults([]);
      setShowSearch(false);
      return;
    }

    try {
      const response = await api.get(`/expenses/users/search?email=${encodeURIComponent(email)}`);
      if (response.data && response.data.length > 0) {
        setSearchResults(response.data);
        setShowSearch(true);
      } else {
        setSearchResults([]);
        setShowSearch(false);
      }
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
      setShowSearch(false);
    }
  };

  const handleAddParticipant = (selectedUser) => {
    const userId = selectedUser._id || selectedUser.id;
    setFormData(prevFormData => {
      // Check if participant already exists (handle both string and object comparisons)
      const exists = prevFormData.participants.some(p => {
        const pId = typeof p === 'string' ? p : (p?._id || p);
        return pId === userId || pId?.toString() === userId?.toString();
      });
      
      if (!exists) {
        // Store participant details for display
        setParticipantDetails(prev => ({
          ...prev,
          [userId]: { name: selectedUser.name, email: selectedUser.email }
        }));
        
        return {
          ...prevFormData,
          participants: [...prevFormData.participants, userId]
        };
      }
      return prevFormData;
    });
    setSearchEmail('');
    setSearchResults([]);
    setShowSearch(false);
  };

  const handleRemoveParticipant = (userId) => {
    setFormData(prevFormData => ({
      ...prevFormData,
      participants: prevFormData.participants.filter(p => {
        const pId = typeof p === 'string' ? p : (p?._id || p?.toString() || p);
        const userIdStr = typeof userId === 'string' ? userId : (userId?._id || userId?.toString() || userId);
        return pId !== userIdStr && pId?.toString() !== userIdStr?.toString();
      })
    }));
  };

  const getParticipantName = (userId) => {
    // First check if we have participant details stored
    if (participantDetails[userId]) {
      return participantDetails[userId].name;
    }
    // Then check if it's from an existing expense
    if (expense?.participants) {
      const userIdStr = typeof userId === 'string' ? userId : (userId?.toString() || userId);
      const participant = expense.participants.find(p => {
        const pUserId = p.user?._id || p.user;
        const pUserIdStr = pUserId?.toString ? pUserId.toString() : pUserId;
        return pUserIdStr === userIdStr || pUserId === userId;
      });
      if (participant?.user?.name) {
        return participant.user.name;
      }
    }
    return 'User';
  };

  const calculateSplitAmount = () => {
    if (!formData.isSplit || !formData.amount || formData.participants.length === 0) {
      return 0;
    }
    const totalParticipants = formData.participants.length + 1; // +1 for current user
    return parseFloat(formData.amount) / totalParticipants;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Debug: Log the current state
    console.log('Form Data:', formData);
    console.log('Is Split:', formData.isSplit);
    console.log('Participants:', formData.participants);
    console.log('Participants Length:', formData.participants.length);

    if (formData.isSplit && (!formData.participants || formData.participants.length === 0)) {
      setError('Please add at least one participant for split expenses');
      return;
    }

    setLoading(true);

    try {
      const data = {
        ...formData,
        amount: parseFloat(formData.amount),
        paidBy: user.id
      };

      // Ensure participants are sent as an array of IDs
      if (formData.isSplit) {
        data.participants = formData.participants.map(p => {
          // Handle both string and object IDs
          return typeof p === 'string' ? p : (p?._id || p?.toString() || p);
        });
      }

      console.log('Sending data:', data);

      if (expense) {
        await api.put(`/expenses/${expense._id}`, data);
      } else {
        await api.post('/expenses', data);
      }

      onClose();
    } catch (error) {
      console.error('Error saving expense:', error);
      setError(error.response?.data?.message || 'Failed to save expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h2>{expense ? 'Edit Expense' : 'Add Expense'}</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>Amount (INR) *</label>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              step="0.01"
              min="0"
              required
            />
          </div>
          <div className="form-group">
            <label>Category *</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
            >
              <option value="Transportation">Transportation</option>
              <option value="Accommodation">Accommodation</option>
              <option value="Food">Food</option>
              <option value="Shopping">Shopping</option>
              <option value="Entertainment">Entertainment</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="form-group">
            <label>Date *</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                name="isSplit"
                checked={formData.isSplit}
                onChange={handleChange}
              />
              Split this expense
            </label>
          </div>

          {formData.isSplit && (
            <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
              <div className="form-group">
                <label>Split Type</label>
                <select
                  name="splitType"
                  value={formData.splitType}
                  onChange={handleChange}
                >
                  <option value="equal">Equal Split</option>
                  <option value="unequal">Unequal Split</option>
                </select>
              </div>

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
                    marginTop: '0.25rem',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}>
                    {searchResults.map(user => (
                      <div
                        key={user._id}
                        onClick={() => handleAddParticipant(user)}
                        style={{
                          padding: '0.75rem',
                          cursor: 'pointer',
                          borderBottom: '1px solid #eee'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#f0f0f0'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                      >
                        {user.name} ({user.email})
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {formData.participants && formData.participants.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                  <label>Participants ({formData.participants.length}):</label>
                  <div style={{ marginTop: '0.5rem' }}>
                    <div style={{ 
                      padding: '0.5rem', 
                      backgroundColor: 'white', 
                      borderRadius: '4px',
                      marginBottom: '0.5rem'
                    }}>
                      <strong>You</strong> - ₹{calculateSplitAmount().toFixed(2)}
                    </div>
                    {formData.participants.map((userId, index) => {
                      const userIdStr = typeof userId === 'string' ? userId : (userId?._id || userId?.toString() || userId);
                      return (
                        <div key={userIdStr || index} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.5rem',
                          backgroundColor: 'white',
                          borderRadius: '4px',
                          marginBottom: '0.5rem'
                        }}>
                          <span>
                            <strong>{getParticipantName(userIdStr)}</strong> - ₹{calculateSplitAmount().toFixed(2)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveParticipant(userIdStr)}
                            className="btn btn-danger"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          >
                            Remove
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ marginTop: '0.5rem', padding: '0.5rem', backgroundColor: '#e7f3ff', borderRadius: '4px' }}>
                    <strong>Total: ₹{formData.amount || '0.00'}</strong> (Split between {formData.participants.length + 1} people)
                  </div>
                </div>
              )}
            </div>
          )}

          {error && <div className="error">{error}</div>}
          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : expense ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ExpenseModal;
