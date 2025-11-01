const mongoose = require('mongoose');

const expenseTypeSchema = new mongoose.Schema({
  expenseTypeName: {
    type: String,
    required: [true, 'Expense type name is required'],
    unique: true,
    trim: true
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
expenseTypeSchema.index({ userId: 1, expenseTypeName: 1 });

const ExpenseType = mongoose.model('ExpenseType', expenseTypeSchema);

module.exports = ExpenseType;
