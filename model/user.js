import mongoose from 'mongoose';
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  profileImg: {
    type: String,
    required: true,
  },
  favourite: [
    {
      type: String,
    },
  ],
  points: {
    type: Number,
    default: 0,
  },
  totalPoints: {
    type: Number,
    default: 0,
  },
  pointHistory: [
    {
      isRedeem: {
        type: Boolean,
      },
      reason: {
        type: String,
      },
      pointsAmount: {
        type: Number,
      },
      pointsLeft: {
        type: Number,
      },
    },
  ],
  framesOwned: [
    {
      type: String,
    },
  ],
  avatarOwned: [
    {
      type: String,
    },
  ],
  frame: {
    type: String,
  },
  chat: [{ type: String }],
});

const userModel = mongoose.model('User', userSchema);

export default userModel;
