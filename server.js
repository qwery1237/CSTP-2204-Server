import express from 'express';
const app = express();
// import http from "http";
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();
const port = process.env.PORT || 3000;
import { authRouter } from './routes/auth.js';
import { userRouter } from './routes/user.js';
// import initializeSocket from "./controller/chat.js";
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// const server = http.createServer(app);

app.use('/auth/', authRouter);
app.use('/user/', userRouter);

// initializeSocket(server);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
