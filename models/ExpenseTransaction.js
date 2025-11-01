const mongoose = require('mongoose');

const expenseTransactionSchema = new mongoose.Schema({
  expenseTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ExpenseType',
    required: [true, 'Expense type is required']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  expenseCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ExpenseCategory',
    required: [true, 'Expense category is required']
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  expense_date: {
    type: Date,
    required: [true, 'Expense date is required'],
    default: Date.now
  },
  need_or_want: {
    type: String,
    required: [true, 'Need or want is required'],
    enum: {
      values: ['need', 'want'],
      message: 'Need or want must be either "need" or "want"'
    }
  },
  could_have_saved: {
    type: Number,
    default: 0,
    min: [0, 'Could have saved amount cannot be negative']
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  }
}, {
  timestamps: true
});

// Index for faster queries
expenseTransactionSchema.index({ userId: 1, expense_date: -1 });
expenseTransactionSchema.index({ userId: 1, expenseCategory: 1 });
expenseTransactionSchema.index({ userId: 1, expenseTypeId: 1 });
expenseTransactionSchema.index({ userId: 1, need_or_want: 1 });

const ExpenseTransaction = mongoose.model('ExpenseTransaction', expenseTransactionSchema);

module.exports = ExpenseTransaction;
