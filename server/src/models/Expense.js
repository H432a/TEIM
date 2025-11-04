const mongoose = require('mongoose');

const expenseSplitSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  paid: {
    type: Boolean,
    default: false
  }
});

const expenseSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    required: true,
    enum: ['Transportation', 'Accommodation', 'Food', 'Shopping', 'Entertainment', 'Other'],
    default: 'Other'
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  isSplit: {
    type: Boolean,
    default: false
  },
  splitType: {
    type: String,
    enum: ['equal', 'unequal', 'percentage'],
    default: 'equal'
  },
  participants: [expenseSplitSchema],
  paidBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Expense', expenseSchema);

