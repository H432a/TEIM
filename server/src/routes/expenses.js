const express = require('express');
const Expense = require('../models/Expense');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all expenses for the authenticated user (including split expenses where user is a participant)
router.get('/', auth, async (req, res) => {
  try {
    const userExpenses = await Expense.find({ user: req.user._id })
      .populate('participants.user', 'name email')
      .populate('paidBy', 'name email')
      .sort({ date: -1 });
    const splitExpenses = await Expense.find({ 
      'participants.user': req.user._id,
      isSplit: true
    })
      .populate('participants.user', 'name email')
      .populate('paidBy', 'name email')
      .sort({ date: -1 });
    
    // Combine and deduplicate
    const allExpenses = [...userExpenses];
    splitExpenses.forEach(exp => {
      if (!allExpenses.find(e => e._id.toString() === exp._id.toString())) {
        allExpenses.push(exp);
      }
    });
    
    res.json(allExpenses.sort((a, b) => new Date(b.date) - new Date(a.date)));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get a single expense
router.get('/:id', auth, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id)
      .populate('participants.user', 'name email')
      .populate('paidBy', 'name email');
    
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    
    // Check if user has access (owner or participant)
    const hasAccess = expense.user.toString() === req.user._id.toString() ||
      (expense.isSplit && expense.participants.some(p => p.user.toString() === req.user._id.toString()));
    
    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.json(expense);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new expense
router.post('/', auth, async (req, res) => {
  try {
    const { isSplit, participants, splitType, amount, paidBy } = req.body;
    
    // Set paidBy to current user if not specified
    const paidById = paidBy || req.user._id;
    
    // If splitting, calculate amounts for each participant
    let participantsData = [];
    if (isSplit && participants && participants.length > 0) {
      if (splitType === 'equal') {
        // Include the payer in the split calculation
        const totalPeople = participants.length + 1;
        const perPerson = amount / totalPeople;
        participantsData = participants.map(userId => ({
          user: userId,
          amount: perPerson,
          paid: false
        }));
      } else if (splitType === 'unequal') {
        // Amounts should be provided in request
        participantsData = participants.map(p => ({
          user: p.userId || p.user,
          amount: p.amount,
          paid: p.paid || false
        }));
      } else if (splitType === 'percentage') {
        // Percentages should be provided in request
        participantsData = participants.map(p => ({
          user: p.userId || p.user,
          amount: (amount * p.percentage) / 100,
          paid: p.paid || false
        }));
      }
    }
    
    const expense = new Expense({
      ...req.body,
      user: req.user._id,
      paidBy: paidById,
      participants: participantsData,
      isSplit: isSplit || false
    });
    
    await expense.save();
    await expense.populate('participants.user', 'name email');
    await expense.populate('paidBy', 'name email');
    
    res.status(201).json(expense);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update an expense
router.put('/:id', auth, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    
    // Check if user has access
    const hasAccess = expense.user.toString() === req.user._id.toString() ||
      expense.paidBy.toString() === req.user._id.toString();
    
    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const { isSplit, participants, splitType, amount } = req.body;
    
    // Recalculate split amounts if needed
    let participantsData = expense.participants || [];
    if (isSplit && participants && participants.length > 0) {
      if (splitType === 'equal') {
        // Include the payer in the split calculation
        const totalPeople = participants.length + 1;
        const perPerson = amount / totalPeople;
        participantsData = participants.map(userId => {
          const existing = expense.participants.find(p => p.user.toString() === userId.toString());
          return {
            user: userId,
            amount: perPerson,
            paid: existing ? existing.paid : false
          };
        });
      } else if (splitType === 'unequal' || splitType === 'percentage') {
        participantsData = participants.map(p => ({
          user: p.userId || p.user,
          amount: p.amount || (splitType === 'percentage' ? (amount * p.percentage) / 100 : 0),
          paid: p.paid || false
        }));
      }
    }
    
    const updatedExpense = await Expense.findByIdAndUpdate(
      req.params.id,
      { ...req.body, participants: participantsData },
      { new: true, runValidators: true }
    )
      .populate('participants.user', 'name email')
      .populate('paidBy', 'name email');
    
    res.json(updatedExpense);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Mark participant as paid
router.patch('/:id/participant/:participantId/paid', auth, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    
    const participant = expense.participants.id(req.params.participantId);
    if (!participant) {
      return res.status(404).json({ message: 'Participant not found' });
    }
    
    // Only the participant themselves or the expense owner can mark as paid
    if (participant.user.toString() !== req.user._id.toString() && 
        expense.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    participant.paid = !participant.paid;
    await expense.save();
    
    await expense.populate('participants.user', 'name email');
    await expense.populate('paidBy', 'name email');
    
    res.json(expense);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete an expense
router.delete('/:id', auth, async (req, res) => {
  try {
    const expense = await Expense.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get expenses by category
router.get('/stats/category', auth, async (req, res) => {
  try {
    const userExpenses = await Expense.find({ user: req.user._id });
    const splitExpenses = await Expense.find({ 
      'participants.user': req.user._id,
      isSplit: true
    });
    
    const stats = {};
    
    // Add user's own expenses
    userExpenses.forEach(expense => {
      stats[expense.category] = (stats[expense.category] || 0) + expense.amount;
    });
    
    // Add user's share from split expenses
    splitExpenses.forEach(expense => {
      const userParticipant = expense.participants.find(
        p => p.user.toString() === req.user._id.toString()
      );
      if (userParticipant) {
        stats[expense.category] = (stats[expense.category] || 0) + userParticipant.amount;
      }
    });
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Search users by email (for adding to split expenses)
router.get('/users/search', auth, async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ message: 'Email query parameter is required' });
    }
    
    const users = await User.find({
      email: { $regex: email, $options: 'i' },
      _id: { $ne: req.user._id }
    }).select('name email').limit(10);
    
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

