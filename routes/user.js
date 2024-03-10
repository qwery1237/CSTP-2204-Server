
import express from 'express'
import { sendUserData,getGasStations} from '../controller/user.js';
import validateToken from '../middleware/verifyToken.js';
const userRouter = express.Router();


userRouter.get("/getuserdata",validateToken, sendUserData);
userRouter.post("/getgasstations",getGasStations)

export {userRouter}