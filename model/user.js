import mongoose from "mongoose";
const userSchema = {
    email: {
        type: String,
        required: true,
      },
      name : {
        type: String,
        required: true,
      },
      profileImg : {
        type: String ,
        required: true,
      },
      favourite: [
        {
          type: String,
        },
      ],
     
}

const userModel = mongoose.model("User", userSchema);

export default userModel;