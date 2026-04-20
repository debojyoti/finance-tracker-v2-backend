const mongoose = require('mongoose');

const earningTypeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

earningTypeSchema.index({ userId: 1, name: 1 });
earningTypeSchema.index({ userId: 1, isActive: 1 });

const EarningType = mongoose.model('EarningType', earningTypeSchema);

module.exports = EarningType;
