const mongoose = require('mongoose');

const expenseTransactionSchema = new mongoose.Schema({
  expenseTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ExpenseType',
    required: false
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
  reportingMode: {
    type: String,
    enum: {
      values: ['standard', 'yearly_only', 'lifetime_only'],
      message: 'reportingMode must be standard, yearly_only, or lifetime_only'
    },
    default: 'standard'
  },
  entryPurpose: {
    type: String,
    enum: {
      values: ['regular', 'punishment'],
      message: 'entryPurpose must be regular or punishment'
    },
    default: 'regular'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  recurringExpenseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RecurringExpense',
    required: false
  },
  // Deterministic key for idempotent materialization: "<recurringExpenseId>_<YYYY-MM>" or "<recurringExpenseId>_<YYYY>"
  recurringOccurrenceKey: {
    type: String,
    required: false
  }
}, {
  timestamps: true
});

expenseTransactionSchema.index({ userId: 1, expense_date: -1 });
expenseTransactionSchema.index({ userId: 1, expenseCategory: 1 });
expenseTransactionSchema.index({ userId: 1, expenseTypeId: 1 });
expenseTransactionSchema.index({ userId: 1, need_or_want: 1 });
expenseTransactionSchema.index({ userId: 1, reportingMode: 1 });
expenseTransactionSchema.index({ userId: 1, entryPurpose: 1 });
expenseTransactionSchema.index({ recurringOccurrenceKey: 1 }, { unique: true, sparse: true });

const ExpenseTransaction = mongoose.model('ExpenseTransaction', expenseTransactionSchema);

module.exports = ExpenseTransaction;
