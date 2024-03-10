import mongoose from "mongoose";
const localitiesSchema = new mongoose.Schema({
  location: {
    type: {
      type: String,
      enum:["Point"],
      default: "Point"
    },
    coordinates: { type: [Number], required: true },
  },
});
localitiesSchema.index({location: "2dsphere"})
const localitiesModel = mongoose.model("Localities", localitiesSchema);
export default localitiesModel;
