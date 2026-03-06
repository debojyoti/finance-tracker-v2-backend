const mongoose = require('mongoose');

const accomplishmentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  minutes: {
    type: Number,
    required: [true, 'Minutes is required'],
    min: [0, 'Minutes cannot be negative']
  },
  date: {
    type: Date,
    required: [true, 'Date is required']
  },
  tags: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AccomplishmentTag'
  }],
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  createdOn: {
    type: Date,
    default: Date.now
  }
});

// Indexes for faster queries
accomplishmentSchema.index({ userId: 1, date: 1 });
accomplishmentSchema.index({ userId: 1, tags: 1 });

const Accomplishment = mongoose.model('Accomplishment', accomplishmentSchema);

module.exports = Accomplishment;
