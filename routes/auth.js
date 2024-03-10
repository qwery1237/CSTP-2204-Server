import express from 'express';
import {
  emailSignUp,
  otpValidation,
  otpResend,
  addUserData,
  emailLogIn,
  forgetPassword,
  changePasswordParamVerification,
  changePassword,
  Oauth,
} from '../controller/auth.js';
const authRouter = express.Router();

authRouter.post('/emailsignup', emailSignUp);
authRouter.post('/otpvalidation', otpValidation);
authRouter.post('/otpresend', otpResend);
authRouter.post('/adduserdata', addUserData);
authRouter.post('/emaillogin', emailLogIn);
authRouter.post('/forgetpassword', forgetPassword);
authRouter.post(
  '/changepasswordparamverification',
  changePasswordParamVerification
);
authRouter.post('/changepassword', changePassword);
authRouter.post('/oauth', Oauth);

export { authRouter };
