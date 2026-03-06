const mongoose = require('mongoose');

const accomplishmentTagSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tag name is required'],
    trim: true
  },
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

// Unique compound index so a user can't have duplicate tag names
accomplishmentTagSchema.index({ userId: 1, name: 1 }, { unique: true });

const AccomplishmentTag = mongoose.model('AccomplishmentTag', accomplishmentTagSchema);

module.exports = AccomplishmentTag;
