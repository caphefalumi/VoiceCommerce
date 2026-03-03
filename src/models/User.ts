import mongoose, { Schema } from 'mongoose';

const UserSchema: Schema = new Schema({
  username: { type: String, unique: true },
  email: { type: String, unique: true },
  password: { type: String },
  emailVerified: { type: Boolean, default: false },
  authData: { type: Object },
  ACL: { type: Object },
}, {
  timestamps: true,
  collection: '_User'
});

export default mongoose.model('User', UserSchema);
