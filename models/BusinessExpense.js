const mongoose = require('mongoose');

const businessExpenseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  expenseDate: {
    type: Date,
    required: [true, 'Expense date is required']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  createdOn: {
    type: Date,
    default: Date.now
  },
  updatedOn: {
    type: Date,
    default: Date.now
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  }
});

// Index for faster queries
businessExpenseSchema.index({ userId: 1, expenseDate: -1 });
businessExpenseSchema.index({ userId: 1, category: 1 });

// Update updatedOn before saving
businessExpenseSchema.pre('save', function(next) {
  this.updatedOn = Date.now();
  next();
});

const BusinessExpense = mongoose.model('BusinessExpense', businessExpenseSchema);

module.exports = BusinessExpense;
