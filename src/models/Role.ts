import mongoose, { Schema } from 'mongoose';

const RoleSchema: Schema = new Schema({
  name: { type: String, required: true, unique: true },
  users: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  roles: [{ type: Schema.Types.ObjectId, ref: 'Role' }],
  ACL: { type: Object },
}, {
  timestamps: true,
  collection: '_Role'
});

export default mongoose.model('Role', RoleSchema);
