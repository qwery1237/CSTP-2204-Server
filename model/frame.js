import mongoose from "mongoose";
const frameSchema = new mongoose.Schema({
  link: {  
      type: String,
  },
  isPurchaseable : {
    type: Boolean
  },
  levelCap : {
    type: Number
  },
});

const frameModel = mongoose.model("Frame", frameSchema);
export default frameModel;
