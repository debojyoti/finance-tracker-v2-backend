const mongoose = require('mongoose');

const budgetSettingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  defaultMonthlyBudget: {
    type: Number,
    required: [true, 'Default monthly budget is required'],
    min: [0, 'Budget cannot be negative'],
    default: 0
  }
}, {
  timestamps: true
});

budgetSettingSchema.index({ userId: 1 }, { unique: true });

const BudgetSetting = mongoose.model('BudgetSetting', budgetSettingSchema);

module.exports = BudgetSetting;
