const mongoose = require('mongoose');

const weeklyBudgetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  weekStartDate: {
    type: Date,
    required: [true, 'Week start date is required']
  },
  weekEndDate: {
    type: Date,
    required: [true, 'Week end date is required']
  },
  amount: {
    type: Number,
    required: [true, 'Budget amount is required'],
    min: [0, 'Budget amount cannot be negative']
  },
  source: {
    type: String,
    enum: {
      values: ['auto', 'manual'],
      message: 'Source must be auto or manual'
    },
    default: 'auto'
  }
}, {
  timestamps: true
});

// One budget row per user per week
weeklyBudgetSchema.index({ userId: 1, weekStartDate: 1 }, { unique: true });

const WeeklyBudget = mongoose.model('WeeklyBudget', weeklyBudgetSchema);

module.exports = WeeklyBudget;
