import mongoose from "mongoose";
const authSchema = {
    email: {
        type: String,
        required: true,
      },
      password : {
        type: String
      },
      authType : {
        type: String 
      },
      otp: {
        type: Number,
      },
      isOtpValid: {
        type: Boolean,
      },
      otpTimeStamp: {
        type: Number,
      },
      isOtpIncorrect: {
        type: Number,
      },
      isInitAuthComplete : {
        type : Boolean
      },
      isAgreedToTerms :{
        type: Boolean
      }
}

const authModel = mongoose.model("Authentification", authSchema);

export default authModel;