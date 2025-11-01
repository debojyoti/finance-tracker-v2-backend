const mongoose = require('mongoose');

const expenseCategorySchema = new mongoose.Schema({
  expenseCategoryName: {
    type: String,
    required: [true, 'Expense category name is required'],
    unique: true,
    trim: true
  },
  expenseCategoryIcon: {
    type: String,
    trim: true,
    default: ''
  },
  createdOn: {
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
expenseCategorySchema.index({ userId: 1, expenseCategoryName: 1 });

const ExpenseCategory = mongoose.model('ExpenseCategory', expenseCategorySchema);

module.exports = ExpenseCategory;
