const mongoose = require('mongoose');

const earningTransactionSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  type: {
    type: String,
    required: [true, 'Type is required'],
    enum: {
      values: ['salary', 'freelance', 'others'],
      message: 'Type must be either "salary", "freelance", or "others"'
    }
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
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
earningTransactionSchema.index({ userId: 1, createdOn: -1 });
earningTransactionSchema.index({ userId: 1, type: 1 });

const EarningTransaction = mongoose.model('EarningTransaction', earningTransactionSchema);

module.exports = EarningTransaction;
