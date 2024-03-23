import mongoose from "mongoose";
const chatSchema = new mongoose.Schema({
  recentChat: {  
      type: String,
  },
  user : {
    type : String
  },
  agent : {
    type : String
  },
  chat : [
    {
        chatType : {
            type: String
        },
        message: {
            type : String
        },
        timeStamp: {
            type : Number
        },
        isChatByUser: {
            type: Boolean
        }
    }
  ]
  
});

const chatModel = mongoose.model("Chat", chatSchema);
export default chatModel;
