import authModel from '../model/auth.js';
import userModel from '../model/user.js';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

dotenv.config();

const emailFormat = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;

async function formatVerification(email, password) {
  if (email === '') {
    return {
      error: 'Email address field is empty',
      success: false,
      fault: 'email',
    };
  }
  if (!emailFormat.test(email)) {
    return {
      error: 'Invalid email address',
      success: false,
      fault: 'email',
    };
  }

  if (password === '') {
    return {
      error: 'Password field is empty',
      success: false,
      fault: 'password',
    };
  }
  if (password.length < 6) {
    return {
      error: 'Password must be 6 or more characters long',
      success: false,
      fault: 'password',
    };
  }
  // If all verifications pass
  return {
    success: true,
  };
}

const addUserData = async (req, res) => {
  const { email, profileImg, name } = req.body;
  let trimmedStr = name.trim();
  if (trimmedStr.length < 3) {
    return res
      .status(202)
      .json({ success: false, error: 'Name must be 3 or more character long' });
  }
  try {
    let foundUser = await authModel.findOne({ email: email });

    if (foundUser) {
      const newUser = new userModel({
        email: email,
        name: name,
        profileImg: profileImg,
      });
      await newUser.save();
      foundUser.isInitAuthComplete = true;
      await foundUser.save();
      const info = { email: foundUser.email };
      const token = jwt.sign(info, process.env.TOKEN_SECRET);
      return res.status(201).json({
        success: true,
        token: token,
      });
    }
  } catch (error) {
    console.error('Error:', error);
    return res
      .status(500)
      .json({ success: false, error: 'Internal Server Error' });
  }
};

const emailSignUp = async (req, res) => {
  const { email, password, isAgreedToTerms } = req.body;
  const verificationResult = await formatVerification(email, password);

  if (!verificationResult.success) {
    return res.status(200).json(verificationResult);
  }
  const otpCode = generateRandom4DigitNumber();
  const encryptPassword = await bcrypt.hash(password, 10);
  const currentTimestamp = Date.now();

  try {
    let foundUser = await authModel.findOne({ email: email });

    if (foundUser) {
      if (foundUser.authType) {
        if (foundUser.authType !== 'email') {
          return res.status(201).json({
            error: `Email address is already linked to ${foundUser.authType} account`,
            success: false,
            fault: 'none',
          });
        }
      }
      if (foundUser.isInitAuthComplete === true) {
        return res.status(201).json({
          error: 'Email address is already linked to an account',
          success: false,
          fault: 'none',
        });
      } else {
        foundUser.password = encryptPassword;
        foundUser.otp = otpCode;
        foundUser.isOtpValid = true;

        foundUser.otpTimeStamp = currentTimestamp;
        foundUser.isOtpIncorrect = 0;
        await foundUser.save();
        sendEmail(email, 'FuelGo OTP', otpCode);
        return res.status(202).json({ success: true });
      }
    } else {
      const newUser = new authModel({
        email: email,
        password: encryptPassword,
        authType: 'email',
        otp: otpCode,
        isOtpValid: true,
        isAgreedToTerms: isAgreedToTerms,
        otpTimeStamp: currentTimestamp,
        isOtpIncorrect: 0,
        isInitAuthComplete: false,
      });

      await newUser.save();
      sendEmail(email, 'FuelGo OTP', otpCode);
      return res.status(202).json({ success: true });
    }
  } catch (error) {
    console.error('Error:', error);
    return res
      .status(500)
      .json({ success: false, error: 'Internal Server Error' });
  }
};

const emailLogIn = async (req, res) => {
  const { email, password } = req.body;
  const verificationResult = await formatVerification(email, password);
  if (!verificationResult.success) {
    return res.status(200).json(verificationResult);
  }
  try {
    let foundUser = await authModel.findOne({ email: email });

    if (foundUser) {
      if (foundUser.authType) {
        if (foundUser.authType !== 'email') {
          return res.status(201).json({
            error: `Email address is already linked to ${foundUser.authType} account`,
            success: false,
            fault: 'none',
          });
        }
      }
      if (foundUser.isInitAuthComplete === true) {
        const matchPassword = await bcrypt.compare(
          password,
          foundUser.password
        );
        if (matchPassword) {
          const info = { email: foundUser.email };
          const token = jwt.sign(info, process.env.TOKEN_SECRET);
          return res.status(201).json({
            success: true,
            token: token,
          });
        } else {
          return res.status(201).json({
            error: 'Wrong email or password',
            success: false,
            fault: 'none',
          });
        }
      } else {
        return res.status(201).json({
          error: 'Wrong email or password',
          success: false,
          fault: 'none',
        });
      }
    } else {
      return res.status(201).json({
        error: 'Account with this email does not exist',
        success: false,
        fault: 'none',
      });
    }
  } catch (error) {
    console.error('Error:', error);
    return res
      .status(500)
      .json({ success: false, error: 'Internal Server Error' });
  }
};
const Oauth = async (req, res) => {
  const { email } = req.body;

  try {
    let foundUser = await authModel.findOne({ email: email });

    if (foundUser) {
      if (foundUser.authType) {
        if (foundUser.authType === 'email') {
          return res.status(201).json({
            error: `Email address is already linked to ${foundUser.authType} account`,
            success: false,
            fault: 'none',
          });
        }
      }
      if (foundUser.isInitAuthComplete === true) {
        const info = { email: foundUser.email };
        const token = jwt.sign(info, process.env.TOKEN_SECRET);
        return res.status(201).json({
          success: true,
          token: token,
          stageTwo: false,
        });
      } else {
        return res.status(201).json({
          success: true,
          stageTwo: true,
        });
      }
    } else {
      const newUser = new authModel({
        email: email,
        authType: 'Google',
        isInitAuthComplete: false,
        isAgreedToTerms: true,
      });
      await newUser.save();
      return res.status(201).json({
        success: true,
        stageTwo: true,
      });
    }
  } catch (error) {
    console.error('Error:', error);
    return res
      .status(500)
      .json({ success: false, error: 'Internal Server Error' });
  }
};

const otpResend = async (req, res) => {
  const { email } = req.body;

  const otpCode = generateRandom4DigitNumber();

  const currentTimestamp = Date.now();
  try {
    let foundUser = await authModel.findOne({ email: email });

    if (foundUser) {
      foundUser.otp = otpCode;
      foundUser.isOtpValid = true;
      foundUser.otpTimeStamp = currentTimestamp;
      foundUser.isOtpIncorrect = 0;
      await foundUser.save();
      sendEmail(email, 'FuelGo OTP', otpCode);
      return res.status(202).json({ success: true });
    }
  } catch (error) {
    console.error('Error:', error);
    return res
      .status(500)
      .json({ success: false, error: 'Internal Server Error' });
  }
};
const otpValidation = async (req, res) => {
  const { email, otp } = req.body;
  if (otp === '') {
    return res.status(201).json({ success: false, error: 'Invalid Code' });
  }

  const currentTimestamp = Date.now();
  try {
    let foundUser = await authModel.findOne({ email: email });

    if (foundUser) {
      if (foundUser.isOtpValid === true) {
        if (
          isNextTimestampWithin30Minutes(
            currentTimestamp,
            foundUser.otpTimeStamp
          )
        ) {
          if (foundUser.isOtpIncorrect <= 3) {
            let incorrect = foundUser.isOtpIncorrect;
            incorrect = incorrect + 1;
            foundUser.isOtpIncorrect = incorrect;
            if (foundUser.otp === parseInt(otp)) {
              foundUser.isOtpValid = false;
              await foundUser.save();

              // const token = jwt.sign({email:foundUser.email}, process.env.TOKEN_SECRET);

              return res.status(202).json({ success: true });
            } else {
              await foundUser.save();
              return res
                .status(201)
                .json({ success: false, error: 'Invalid Code' });
            }
          } else {
            foundUser.isOtpValid = false;
            await foundUser.save();
            return res.status(201).json({
              success: false,
              error: 'Code expired after multiple failed entries',
            });
          }
        } else {
          foundUser.isOtpValid = false;
          await foundUser.save();
          return res
            .status(201)
            .json({ success: false, error: 'Invalid or expired Code' });
        }
      } else {
        return res
          .status(201)
          .json({ success: false, error: 'Invalid or expired Code' });
      }
    }
  } catch (error) {
    console.error('Error:', error);
    return res
      .status(500)
      .json({ success: false, error: 'Internal Server Error' });
  }
};

const forgetPassword = async (req, res) => {
  const { email } = req.body;

  if (email === '') {
    return res.status(200).json({
      error: 'Email address field is empty',
      success: false,
    });
  }
  if (!emailFormat.test(email)) {
    return res.status(200).json({
      error: 'Invalid email address',
      success: false,
    });
  }
  try {
    let foundUser = await authModel.findOne({ email: email });

    if (foundUser) {
      if (foundUser.authType) {
        if (foundUser.authType !== 'email') {
          return res.status(201).json({
            error: `Email address is already linked to ${foundUser.authType} account`,
            success: false,
            fault: 'none',
          });
        }
      }
      if (foundUser.isInitAuthComplete === true) {
        const currentTimestamp = Date.now();
        const info = {
          email: foundUser.email,
          timeStamp: currentTimestamp,
        };
        const token = jwt.sign(info, process.env.TOKEN_SECRET);
        sendChangePasswordLink(
          email,
          'FuelGo change password',
          'http://localhost:5173/changepassword/' + token
        );
        return res.status(200).json({
          success: true,
        });
      } else {
        return res.status(200).json({
          error: 'Account with this email does not exist',
          success: false,
        });
      }
    } else {
      return res.status(200).json({
        error: 'Account with this email does not exist',
        success: false,
      });
    }
  } catch (error) {
    console.error('Error:', error);
    return res
      .status(500)
      .json({ success: false, error: 'Internal Server Error' });
  }
};

async function changePasswordParamVerification(req, res) {
  try {
    const { id } = req.body;
    const data = jwt.verify(id, process.env.TOKEN_SECRET);
    const { timeStamp, email } = data;
    let foundUser = await authModel.findOne({ email: email });

    if (foundUser) {
      const currentTimestamp = Date.now();
      if (isNextTimestampWithin30Minutes(currentTimestamp, timeStamp)) {
        return res.status(200).json({
          success: true,
        });
      } else {
        return res.status(200).json({
          success: false,
        });
      }
    } else {
      return res.status(200).json({
        success: false,
      });
    }
  } catch (error) {
    console.error('Error:', error);
    return res
      .status(500)
      .json({ success: false, error: 'Internal Server Error' });
  }
}
async function changePassword(req, res) {
  try {
    const { id, password, confirmPassword } = req.body;
    const data = jwt.verify(id, process.env.TOKEN_SECRET);
    const { timeStamp, email } = data;
    let foundUser = await authModel.findOne({ email: email });

    if (foundUser) {
      const currentTimestamp = Date.now();
      if (isNextTimestampWithin30Minutes(currentTimestamp, timeStamp)) {
        if (password === '') {
          return res.status(200).json({
            error: 'Password field is empty',
            success: false,
            fault: 'password',
          });
        }
        if (password.length < 6) {
          return res.status(200).json({
            error: 'Password must be 6 or more characters long',
            success: false,
            fault: 'password',
          });
        }
        if (confirmPassword === '') {
          return res.status(200).json({
            error: 'Confirm password field is empty',
            success: false,
            fault: 'confirmpassword',
          });
        }
        if (confirmPassword.length < 6) {
          return res.status(200).json({
            error: 'Confirm password must be 6 or more characters long',
            success: false,
            fault: 'confirmpassword',
          });
        }
        if (confirmPassword !== password) {
          return res.status(200).json({
            error: 'Confirm password does not match with password',
            success: false,
            fault: 'confirmpassword',
          });
        }
        const encryptPassword = await bcrypt.hash(password, 10);
        foundUser.password = encryptPassword;
        await foundUser.save();
        const info = { email: email };
        const token = jwt.sign(info, process.env.TOKEN_SECRET);
        return res.status(200).json({
          success: true,
          token: token,
        });
      } else {
        return res.status(200).json({
          success: false,
          fault: 'badlink',
        });
      }
    } else {
      return res.status(200).json({
        success: false,
        fault: 'badlink',
      });
    }
  } catch (error) {
    console.error('Error:', error);
    return res
      .status(500)
      .json({ success: false, error: 'Internal Server Error' });
  }
}

function isNextTimestampWithin30Minutes(currentTimestamp, prevTimestamp) {
  prevTimestamp = prevTimestamp + 30 * 60 * 1000;

  if (currentTimestamp <= prevTimestamp) {
    return true;
  } else {
    return false;
  }
}

function generateRandom4DigitNumber() {
  const randomNumber = Math.floor(Math.random() * 10000);

  const fourDigitNumber = randomNumber.toString().padStart(4, '0');

  return fourDigitNumber;
}
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  port: 465,
  secure: true,
  auth: {
    user: process.env.gmail,
    pass: process.env.gmailPassword,
  },
});

function sendChangePasswordLink(toEmail, subject, message) {
  const mailOptions = {
    from: process.env.gmail,
    to: toEmail,
    subject: subject,
    text: message,
    html: ` <html>
        <head>
          <style>
          
            body {
              font-family: Arial, sans-serif;
              background-color: black;
              padding: 20px;
              color: black;
            }
            .container {
            
              border-radius: 5px;
              padding: 20px;
            }
            @media (prefers-color-scheme: dark) {
              .body {
                color: white; 
              }
            }
            .green{
              color: rgb(14,165,233)
            }
            p {
              font-size: 18px;
              margin-bottom: 20px;
            }
            .otp-code {
              font-size: 36px;
              font-weight: bold;
              color: #15803d;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Fuel<span class="green">Go</span></h1>
            <p>Click the link to change password:</p>

            <a href=${message}>Change password</a>
            <p>This code will expire in 30 minutes</p>
          </div>
        </body>
      </html>`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email:', error);
    } else {
      console.log('Email sent:', info.response);
    }
  });
}
function sendEmail(toEmail, subject, message) {
  const mailOptions = {
    from: process.env.gmail,
    to: toEmail,
    subject: subject,
    text: message,
    html: ` <html>
        <head>
          <style>
          
            body {
              font-family: Arial, sans-serif;
              background-color: black;
              padding: 20px;
              color: black;
            }
            .container {
            
              border-radius: 5px;
              padding: 20px;
            }
            @media (prefers-color-scheme: dark) {
              .body {
                color: white; 
              }
            }
            .green{
              color: rgb(14,165,233)
            }
            p {
              font-size: 18px;
              margin-bottom: 20px;
            }
            .otp-code {
              font-size: 36px;
              font-weight: bold;
              color: #15803d;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Fuel<span class="green">Go</span></h1>
            <p>Your OTP code is:</p>
            <p class="otp-code">${message}</p>
            <p>This code will expire in 30 minutes</p>
          </div>
        </body>
      </html>`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email:', error);
    } else {
      console.log('Email sent:', info.response);
    }
  });
}
export {
  emailSignUp,
  otpValidation,
  otpResend,
  addUserData,
  emailLogIn,
  forgetPassword,
  changePasswordParamVerification,
  changePassword,
  Oauth,
};
