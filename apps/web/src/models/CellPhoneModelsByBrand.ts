import mongoose, { Schema } from 'mongoose';

const CellPhoneModelsByBrandSchema: Schema = new Schema(
  {
    Cell_Phone_Brand: { type: String },
    Cell_Phone_Models: [{ type: Schema.Types.ObjectId, ref: 'CellPhoneModelBrand' }],
    ACL: { type: Object },
  },
  {
    timestamps: true,
    collection: 'Cell_Phone_Models_By_Brand',
  },
);

export default mongoose.model('CellPhoneModelsByBrand', CellPhoneModelsByBrandSchema);
