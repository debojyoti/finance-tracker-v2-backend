const mongoose = require('mongoose');

const recurringSavingPlanSchema = new mongoose.Schema({
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
  assetType: {
    type: String,
    required: [true, 'Asset type is required'],
    enum: {
      values: ['saving', 'investment'],
      message: 'Asset type must be either "saving" or "investment"'
    }
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: {
      values: ['fixed', 'topup'],
      message: 'Category must be either "fixed" or "topup"'
    }
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  isActive: {
    type: Boolean,
    default: true
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
recurringSavingPlanSchema.index({ userId: 1, isActive: 1 });
recurringSavingPlanSchema.index({ userId: 1, assetType: 1 });
recurringSavingPlanSchema.index({ userId: 1, frequency: 1 });

// Update updatedOn before saving
recurringSavingPlanSchema.pre('save', function(next) {
  this.updatedOn = Date.now();
  next();
});

const RecurringSavingPlan = mongoose.model('RecurringSavingPlan', recurringSavingPlanSchema);

module.exports = RecurringSavingPlan;
