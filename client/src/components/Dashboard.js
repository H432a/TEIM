import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';

function Dashboard() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [itineraries, setItineraries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalExpenses: 0,
    totalTrips: 0,
    recentExpenses: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

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
    if (expense.paidBy && (expense.paidBy._id || expense.paidBy) === user.id) {
      const totalPeople = (expense.participants?.length || 0) + 1;
      return expense.amount / totalPeople;
    }
    return expense.amount;
  };

  const fetchData = async () => {
    try {
      const [expensesRes, itinerariesRes] = await Promise.all([
        api.get('/expenses'),
        api.get('/itineraries')
      ]);

      const expensesData = expensesRes.data;
      const itinerariesData = itinerariesRes.data;

      setExpenses(expensesData);
      setItineraries(itinerariesData);

      const totalExpenses = expensesData.reduce((sum, exp) => {
        return sum + calculateUserShare(exp);
      }, 0);
      
      const recentExpenses = expensesData
        .filter(exp => {
          const expDate = new Date(exp.date);
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return expDate >= weekAgo;
        })
        .reduce((sum, exp) => sum + calculateUserShare(exp), 0);

      setStats({
        totalExpenses,
        totalTrips: itinerariesData.length,
        recentExpenses
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  const recentExpensesList = expenses.slice(0, 5);
  const upcomingTrips = itineraries
    .filter(trip => new Date(trip.startDate) >= new Date())
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
    .slice(0, 5);

  return (
    <div className="container">
      <h1>Dashboard</h1>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Expenses</h3>
          <div className="value">₹{stats.totalExpenses.toFixed(2)}</div>
        </div>
        <div className="stat-card">
          <h3>Total Trips</h3>
          <div className="value">{stats.totalTrips}</div>
        </div>
        <div className="stat-card">
          <h3>This Week</h3>
          <div className="value">₹{stats.recentExpenses.toFixed(2)}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>Recent Expenses</h2>
            <Link to="/expenses" className="btn btn-primary">View All</Link>
          </div>
          {recentExpensesList.length > 0 ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Amount</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentExpensesList.map(expense => {
                  const userShare = calculateUserShare(expense);
                  return (
                    <tr key={expense._id}>
                      <td>
                        {expense.title}
                        {expense.isSplit && expense.participants && expense.participants.length > 0 && (
                          <span style={{ fontSize: '0.75rem', color: '#666', marginLeft: '0.5rem' }}>
                            (Split with {expense.participants
                              .filter(p => {
                                const pUserId = p.user?._id || p.user;
                                const pUserIdStr = pUserId?.toString ? pUserId.toString() : pUserId;
                                const userIdStr = user.id?.toString ? user.id.toString() : user.id;
                                return pUserIdStr !== userIdStr && pUserId !== user.id;
                              })
                              .map(p => p.user?.name || 'Unknown')
                              .join(', ')})
                          </span>
                        )}
                      </td>
                      <td>₹{userShare.toFixed(2)}</td>
                      <td>{format(new Date(expense.date), 'MMM dd, yyyy')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">
              <h3>No expenses yet</h3>
              <p>Start tracking your travel expenses!</p>
            </div>
          )}
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>Upcoming Trips</h2>
            <Link to="/itineraries" className="btn btn-primary">View All</Link>
          </div>
          {upcomingTrips.length > 0 ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Trip Name</th>
                  <th>Destination</th>
                  <th>Start Date</th>
                </tr>
              </thead>
              <tbody>
                {upcomingTrips.map(trip => (
                  <tr key={trip._id}>
                    <td>{trip.tripName}</td>
                    <td>{trip.destination}</td>
                    <td>{format(new Date(trip.startDate), 'MMM dd, yyyy')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">
              <h3>No upcoming trips</h3>
              <p>Create your first itinerary!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;

