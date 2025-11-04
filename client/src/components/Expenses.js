import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { format } from 'date-fns';
import ExpenseModal from './ExpenseModal';
import { useAuth } from '../context/AuthContext';

function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [categoryStats, setCategoryStats] = useState({});

  useEffect(() => {
    fetchExpenses();
    fetchCategoryStats();
  }, []);

  const fetchExpenses = async () => {
    try {
      const response = await api.get('/expenses');
      setExpenses(response.data);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategoryStats = async () => {
    try {
      const response = await api.get('/expenses/stats/category');
      setCategoryStats(response.data);
    } catch (error) {
      console.error('Error fetching category stats:', error);
    }
  };

  const handleAdd = () => {
    setEditingExpense(null);
    setShowModal(true);
  };

  const handleEdit = (expense) => {
    setEditingExpense(expense);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        await api.delete(`/expenses/${id}`);
        fetchExpenses();
        fetchCategoryStats();
      } catch (error) {
        console.error('Error deleting expense:', error);
        alert('Failed to delete expense');
      }
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingExpense(null);
    fetchExpenses();
    fetchCategoryStats();
  };

  const { user } = useAuth();
  
  const calculateUserShare = (expense) => {
    if (!expense.isSplit || !expense.participants) {
      return expense.amount;
    }
    const userParticipant = expense.participants.find(
      p => {
        const pUserId = p.user?._id || p.user;
        const pUserIdStr = pUserId?.toString ? pUserId.toString() : pUserId;
        const userIdStr = user.id?.toString ? user.id.toString() : user.id;
        return pUserIdStr === userIdStr || pUserId === user.id;
      }
    );
    if (userParticipant) {
      return userParticipant.amount;
    }
    // If user is the owner/paidBy and not in participants, calculate their share
    if (expense.paidBy && ((expense.paidBy._id || expense.paidBy) === user.id)) {
      const totalPeople = (expense.participants?.length || 0) + 1;
      return expense.amount / totalPeople;
    }
    return expense.amount;
  };

  const totalExpenses = expenses.reduce((sum, exp) => {
    if (exp.isSplit) {
      return sum + calculateUserShare(exp);
    }
    return sum + exp.amount;
  }, 0);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Expenses</h1>
        <button onClick={handleAdd} className="btn btn-primary">Add Expense</button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Expenses (Your Share)</h3>
          <div className="value">₹{totalExpenses.toFixed(2)}</div>
        </div>
        <div className="stat-card">
          <h3>Total Count</h3>
          <div className="value">{expenses.length}</div>
        </div>
      </div>

      <div className="card">
        <h2>Expenses by Category</h2>
        {Object.keys(categoryStats).length > 0 ? (
          <table className="table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Amount (INR)</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(categoryStats).map(([category, amount]) => (
                <tr key={category}>
                  <td>{category}</td>
                  <td>₹{amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No expenses by category yet</p>
        )}
      </div>

      <div className="card">
        <h2>All Expenses</h2>
        {expenses.length > 0 ? (
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Description</th>
                <th>Amount (INR)</th>
                <th>Your Share</th>
                <th>Category</th>
                <th>Date</th>
                <th>Split</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map(expense => {
                const userShare = expense.isSplit ? calculateUserShare(expense) : expense.amount;
                return (
                  <tr key={expense._id}>
                    <td>
                      {expense.title}
                      {expense.isSplit && expense.participants && expense.participants.length > 0 && (
                        <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
                          Split with: {expense.participants
                            .filter(p => {
                              const pUserId = p.user?._id || p.user;
                              const pUserIdStr = pUserId?.toString ? pUserId.toString() : pUserId;
                              const userIdStr = user.id?.toString ? user.id.toString() : user.id;
                              return pUserIdStr !== userIdStr && pUserId !== user.id;
                            })
                            .map(p => p.user?.name || 'Unknown')
                            .join(', ')}
                        </div>
                      )}
                    </td>
                    <td>{expense.description || '-'}</td>
                    <td>₹{expense.amount.toFixed(2)}</td>
                    <td>₹{userShare.toFixed(2)}</td>
                    <td>
                      <span className="badge badge-primary">{expense.category}</span>
                    </td>
                    <td>{format(new Date(expense.date), 'MMM dd, yyyy')}</td>
                    <td>
                      {expense.isSplit ? (
                        <span className="badge badge-success">
                          Split ({(expense.participants?.length || 0) + 1} people)
                        </span>
                      ) : (
                        <span className="badge badge-secondary">Individual</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleEdit(expense)}
                          className="btn btn-secondary"
                          style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(expense._id)}
                          className="btn btn-danger"
                          style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <h3>No expenses yet</h3>
            <p>Click "Add Expense" to start tracking your travel expenses!</p>
          </div>
        )}
      </div>

      {showModal && (
        <ExpenseModal
          expense={editingExpense}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
}

export default Expenses;

