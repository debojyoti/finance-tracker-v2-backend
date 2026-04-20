const mongoose = require('mongoose');

const recurringExpenseSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
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
  frequency: {
    type: String,
    required: [true, 'Frequency is required'],
    enum: {
      values: ['monthly', 'yearly'],
      message: 'Frequency must be either "monthly" or "yearly"'
    }
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required'],
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  expenseCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ExpenseCategory',
    required: [true, 'Expense category is required']
  },
  expenseTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ExpenseType',
    required: false
  },
  need_or_want: {
    type: String,
    required: [true, 'Need or want is required'],
    enum: {
      values: ['need', 'want'],
      message: 'Need or want must be either "need" or "want"'
    }
  },
  reportingMode: {
    type: String,
    enum: {
      values: ['standard', 'yearly_only', 'lifetime_only'],
      message: 'reportingMode must be standard, yearly_only, or lifetime_only'
    },
    default: 'standard'
  },
  description: {
    type: String,
    trim: true,
    default: ''
  }
}, {
  timestamps: true
});

recurringExpenseSchema.index({ userId: 1, isActive: 1 });
recurringExpenseSchema.index({ userId: 1, frequency: 1 });
recurringExpenseSchema.index({ userId: 1, startDate: 1 });

const RecurringExpense = mongoose.model('RecurringExpense', recurringExpenseSchema);

module.exports = RecurringExpense;
