const mongoose = require('mongoose');

const officeExpenseSchema = new mongoose.Schema({
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
officeExpenseSchema.index({ userId: 1, expenseDate: -1 });
officeExpenseSchema.index({ userId: 1, category: 1 });

// Update updatedOn before saving
officeExpenseSchema.pre('save', function(next) {
  this.updatedOn = Date.now();
  next();
});

const OfficeExpense = mongoose.model('OfficeExpense', officeExpenseSchema);

module.exports = OfficeExpense;
