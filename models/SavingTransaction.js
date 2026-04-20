const mongoose = require('mongoose');

const savingTransactionSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  type: {
    type: String,
    required: [true, 'Type is required'],
    enum: {
      values: ['add', 'withdraw'],
      message: 'Type must be either "add" or "withdraw"'
    }
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  assetType: {
    type: String,
    required: [true, 'Asset type is required'],
    enum: {
      values: ['saving', 'investment'],
      message: 'Asset type must be either "saving" or "investment"'
    }
  },
  createdOn: {
    type: Date,
    default: Date.now
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: {
      values: ['fixed', 'topup'],
      message: 'Category must be either "fixed" or "topup"'
    }
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  }
});

// Index for faster queries
savingTransactionSchema.index({ userId: 1, createdOn: -1 });
savingTransactionSchema.index({ userId: 1, type: 1 });
savingTransactionSchema.index({ userId: 1, category: 1 });
savingTransactionSchema.index({ userId: 1, assetType: 1 });

const SavingTransaction = mongoose.model('SavingTransaction', savingTransactionSchema);

module.exports = SavingTransaction;
