import mongoose from "mongoose";
const avatarSchema = new mongoose.Schema({
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

const avatarModel = mongoose.model("Avatar", avatarSchema);
export default avatarModel;
