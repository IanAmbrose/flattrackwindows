const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');
const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  currentGroup: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    default: null,
  },
});

UserSchema.plugin(passportLocalMongoose);

const User = mongoose.model('User', UserSchema);

module.exports = User;
