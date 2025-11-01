const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firebaseUserId: {
    type: String,
    required: [true, 'Firebase User ID is required'],
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
  },
  loginMedium: {
    type: String,
    required: [true, 'Login medium is required'],
    enum: ['google', 'facebook', 'email'],
    default: 'google'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Update the updatedAt field before updating
userSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: Date.now() });
  next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;
