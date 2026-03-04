import mongoose, { Schema } from 'mongoose';

const VehicleSchema: Schema = new Schema(
  {
    price: { type: Number, required: true },
    name: { type: String, required: true },
    color: { type: String },
    ACL: { type: Object },
  },
  {
    timestamps: true,
    collection: 'B4aVehicle',
  },
);

export default mongoose.model('Vehicle', VehicleSchema);
