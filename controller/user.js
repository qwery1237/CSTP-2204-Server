import userModel from "../model/user.js";
import stationModel from "../model/station.js";
import avatarModel from "../model/avatar.js";
import frameModel from "../model/frame.js";
import dotenv from "dotenv";
import axios from "axios";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";
import chatModel from "../model/chat.js";

dotenv.config();
const sendUserData = async (req, res) => {
  if (req?.decodedEmail) {
    const foundUser = await userModel.findOne({ email: req.decodedEmail });
    if (foundUser) {
      const data = foundUser;

      return res.status(201).json({ success: true, data: data });
    }
  }
  return res.status(201).json({ success: false });
};
async function getGasStations(req, res) {
  const { latitude, longitude } = req.body;

  let radius = 1000;
  let isGasStation20 = false;

  let gasStations = [];

  const responseData = await axios.get(
    `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&rankby=distance&type=gas_station&key=${process.env.GOOGLE_API_KEY}`
  );

  gasStations = responseData.data.results;

  gasStations.map(async (station) => {
    const gs = await getGasStation(
      station.geometry.location.lat,
      station.geometry.location.lng
    );

    if (gs.length !== 0) {
    } else {
      try {
        let imageLink =
          "https://th.bing.com/th/id/R.525e321d9bb82204216f813ee99339ff?rik=O7dfJF5hfrK0Kg&pid=ImgRaw&r=0";
        if (station.photos) {
          const photoRef = station.photos[0].photo_reference;

          const imageUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${400}&photoreference=${photoRef}&key=${
            process.env.GOOGLE_API_KEY
          }`;
          const response = await axios.get(imageUrl);
          imageLink = response.request.res.responseUrl;
        }
        const stationLat = parseFloat(station.geometry.location.lat);
        const stationLng = parseFloat(station.geometry.location.lng);
        const newStation = new stationModel();
        newStation.name = station.name;
        newStation.profileImg = imageLink;
        newStation.address = station.vicinity;
        newStation.placeId = station.place_id;
        newStation.latlng.latitude = stationLat;
        newStation.latlng.longitude = stationLng;
        newStation.fuelGoRating.rating = 0;
        newStation.fuelGoRating.totalRating = 0;
        newStation.price.diesel.price = 0;
        newStation.price.midGrade.price = 0;
        newStation.price.premium.price = 0;
        newStation.price.regular.price = 0;
        newStation.amenities.airPump.isValid = false;
        newStation.amenities.atm.isValid = false;
        newStation.amenities.carWash.isValid = false;
        newStation.amenities.convenienceStore.isValid = false;
        newStation.amenities.evChargingStation.isValid = false;

        if (station.types.includes("atm")) {
          newStation.amenities.atm.isValid = true;
        }
        if (station.types.includes("convenience_store")) {
          newStation.amenities.convenienceStore.isValid = true;
        }
        if (station.types.includes("car_wash")) {
          newStation.amenities.carWash.isValid = true;
        }
        if (station.types.includes("car_repair")) {
          newStation.amenities.airPump.isValid = true;
        }
        if (station.types.includes("electric_vehicle_station")) {
          newStation.amenities.evChargingStation.isValid = true;
        }

        newStation.location = {
          type: "Point",
          coordinates: [stationLng, stationLat],
        };
        await newStation.save();
      } catch (error) {
        console.error("Axios error:", error);
      }
    }
  });
  let gasStationList = null;
  try {
    gasStationList = await stationModel.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [longitude, latitude],
          },
          distanceField: "dist.calculated",

          maxDistance: 10000,

          spherical: true,
        },
      },
      {
        $limit: 20,
      },
    ]);
    for (const station of gasStationList) {
      const gasStationLatitude = station.latlng.latitude;
      const gasStationLongitude = station.latlng.longitude;
      const distanceResponse = await axios.get(
        `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${latitude},${longitude}&destinations=${gasStationLatitude},${gasStationLongitude}&key=${process.env.GOOGLE_API_KEY}`
      );

      const distance = distanceResponse.data.rows[0].elements[0].distance.text;

      station.distanceFromUser = distance;
    }
  } catch (error) {
    console.log(error);
  }

  return res.status(201).json({ success: true, data: gasStationList });
  // }
}
async function getGasStation(latitude, longitude) {
  const specificStation = await stationModel.aggregate([
    {
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [longitude, latitude],
        },

        distanceField: "distance",

        maxDistance: 10,
        spherical: true,
      },
    },
    {
      $limit: 1,
    },
  ]);
  return specificStation;
}
const getGasStationData = async (req, res) => {
  const id = req.params.id;
  const currentTimestamp = Date.now();
  try {
    let foundStation = await stationModel.findOne({ placeId: id });

    if (foundStation) {
      return res.status(201).json({
        success: true,
        data: foundStation,
        currentTimestamp: currentTimestamp,
      });
    } else {
      return res.status(201).json({
        success: false,
      });
    }
  } catch (error) {
    console.error("Error:", error);
    return res.status(201).json({
      success: false,
    });
  }
};

const addComment = async (req, res) => {
  const currentTimestamp = Date.now();
  const { placeId, rating, photosVideos, comment } = req.body;
  if (req?.decodedEmail) {
    const foundStation = await stationModel.findOne({ placeId: placeId });
    if (foundStation) {
      const currentTimestamp = Date.now();
      foundStation.reviews.push({
        email: req?.decodedEmail,
        photosVideos: photosVideos,
        rating: rating,
        comment: comment,
        timeStamp: currentTimestamp,
      });

      await foundStation.save();

      return res
        .status(201)
        .json({
          success: true,
          data: foundStation.reviews,
          currentTimestamp: currentTimestamp,
        });
    } else {
      return res.status(201).json({ success: false });
    }
  }
  return res.status(201).json({ success: false });
};
const editComment = async (req, res) => {
  const { placeId, rating, photosVideos, comment } = req.body;
  const currentTimestamp = Date.now();
  if (req?.decodedEmail) {
    let foundStation = await stationModel.findOne({ placeId: placeId });
    const index = foundStation.reviews.findIndex(
      (review) => review.email === req.decodedEmail
    );

    if (index !== -1) {
      foundStation.reviews[index].photosVideos = photosVideos;
      foundStation.reviews[index].rating = rating;
      foundStation.reviews[index].comment = comment;
      foundStation.reviews[index].timeStamp = currentTimestamp;

      await foundStation.save();

      return res
        .status(201)
        .json({
          success: true,
          data: foundStation.reviews,
          currentTimestamp: currentTimestamp,
        });
    } else {
      return res.status(201).json({ success: false });
    }
  }
  return res.status(201).json({ success: false });
};
const deleteComment = async (req, res) => {
  const { placeId } = req.body;

  if (req?.decodedEmail) {
    try {
      let foundStation = await stationModel.findOne({ placeId: placeId });

      if (foundStation) {
        const index = foundStation.reviews.findIndex(
          (review) => review.email === req.decodedEmail
        );

        if (index !== -1) {
          foundStation.reviews.splice(index, 1);

          await foundStation.save();

          return res
            .status(201)
            .json({ success: true, data: foundStation.reviews });
        } else {
          return res.status(201).json({ success: false });
        }
      } else {
        return res.status(201).json({ success: false });
      }
    } catch (error) {
      console.error("Error:", error);
      return res.status(201).json({ success: false });
    }
  }

  return res.status(201).json({ success: false });
};

const likeComment = async (req, res) => {
  const { placeId, commentUserEmail } = req.body;

  if (req?.decodedEmail) {
    try {
      let foundStation = await stationModel.findOne({ placeId: placeId });

      if (foundStation) {
        const index = foundStation.reviews.findIndex(
          (review) => review.email === commentUserEmail
        );

        if (index !== -1) {
          foundStation.reviews[index].likes.push(req.decodedEmail);

          await foundStation.save();

          return res.status(201).json({ success: true });
        } else {
          return res.status(201).json({ success: false });
        }
      } else {
        return res.status(201).json({ success: false });
      }
    } catch (error) {
      console.error("Error:", error);
      return res.status(201).json({ success: false });
    }
  }

  return res.status(201).json({ success: false });
};
const unLikeComment = async (req, res) => {
  const { placeId, commentUserEmail } = req.body;

  if (req?.decodedEmail) {
    try {
      let foundStation = await stationModel.findOne({ placeId: placeId });

      if (foundStation) {
        const index = foundStation.reviews.findIndex(
          (review) => review.email === commentUserEmail
        );

        if (index !== -1) {
          const index2 = foundStation.reviews[index].likes.findIndex(
            (review) => review === req.decodedEmail
          );
          foundStation.reviews[index].likes.splice(index2, 1);
          await foundStation.save();

          return res.status(201).json({ success: true });
        } else {
          return res.status(201).json({ success: false });
        }
      } else {
        return res.status(201).json({ success: false });
      }
    } catch (error) {
      console.error("Error:", error);
      return res.status(201).json({ success: false });
    }
  }

  return res.status(201).json({ success: false });
};
const addFavourite = async (req, res) => {
  const { placeId } = req.body;

  try {
    let foundUser = await userModel.findOne({ email: req?.decodedEmail });

    if (foundUser) {
      if (!foundUser.favourite.includes(placeId)) {
        foundUser.favourite.push(placeId);
        await foundUser.save();
        return res.status(201).json({
          success: true,
          data: foundUser.favourite,
          message: "Added to favourites successfully.",
        });
      } else {
        return res.status(201).json({
          success: false,
          message: "Item already exists in favourites.",
        });
      }
    } else {
      return res
        .status(201)
        .json({ success: false, message: "Station not found." });
    }
  } catch (error) {
    console.error("Error:", error);
    return res
      .status(201)
      .json({ success: false, message: "Internal server error." });
  }
};
const deleteFavourite = async (req, res) => {
  const { placeId } = req.body;

  try {
    let foundUser = await userModel.findOne({ email: req?.decodedEmail });

    if (foundUser) {
      const index = foundUser.favourite.indexOf(placeId);
      if (index !== -1) {
        foundUser.favourite.splice(index, 1);
        await foundUser.save();
        return res.status(201).json({
          success: true,
          data: foundUser.favourite,
          message: "Deleted from favourites successfully.",
        });
      } else {
        return res.status(201).json({
          success: false,
          message: "Item does not exist in favourites.",
        });
      }
    } else {
      return res
        .status(201)
        .json({ success: false, message: "Station not found." });
    }
  } catch (error) {
    console.error("Error:", error);
    return res
      .status(201)
      .json({ success: false, message: "Internal server error." });
  }
};
const editNameAndProfileImg = async (req, res) => {
  const { name, profileImg } = req.body;

  try {
    let foundUser = await userModel.findOne({ email: req?.decodedEmail });

    if (foundUser) {
      foundUser.name = name;
      foundUser.profileImg = profileImg;
      await foundUser.save();
      return res.status(201).json({
        success: true,
        data: {
          name: foundUser.name,
          profileImg: foundUser.profileImg,
        },
      });
    } else {
      return res
        .status(201)
        .json({ success: false, message: "Station not found." });
    }
  } catch (error) {
    console.error("Error:", error);
    return res
      .status(201)
      .json({ success: false, message: "Internal server error." });
  }
};
const getFavouriteStations = async (req, res) => {
  try {
    const { stations, lat, lng } = req.body;

    let stationListArray = [];

    await Promise.all(stations.map(async (station) => {
      const stationz = await stationModel.findOne({ placeId: station });
      const gasStationLatitude = stationz.latlng.latitude;
      const gasStationLongitude = stationz.latlng.longitude;
      const distanceResponse = await axios.get(
        `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${lat},${lng}&destinations=${gasStationLatitude},${gasStationLongitude}&key=${process.env.GOOGLE_API_KEY}`
      );
      const distance = distanceResponse.data.rows[0].elements[0].distance.text;
      const stationObject = stationz.toObject();
      stationObject.distanceFromUser = distance;
      
      stationListArray.push(stationObject);
  }));
  
    
    
    return res.status(201).json({ success: true, data: stationListArray });
  } catch (error) {
    console.error("Error:", error);
    return res
      .status(201)
      .json({ success: false, message: "Internal server error." });
  }
};
const purchaseGiftCard = async (req, res) => {
  try {
    const { giftCardType, amount } = req.body;
    const foundUser = await userModel.findOne({ email: req?.decodedEmail });
    const pointAmount = amount * 100;

    const giftCardCode = "a1Qsnd7b912312wr343weeewwe";
    if (foundUser) {
      let points = foundUser.points;
      if (points >= pointAmount) {
        foundUser.points = points - pointAmount;
        foundUser.pointHistory.push({
          reason: `$${amount} ${giftCardType}`,
          isRedeem: true,
          pointsAmount: -amount,
        });
        foundUser.save();
        sendGiftCard(foundUser.email, "Gift card code", giftCardCode);
        return res.status(201).json({
          success: true,
          message: "Gift card code sent to your email",
        });
      } else {
        return res
          .status(201)
          .json({ success: false, message: "Not enough points" });
      }
    }
  } catch (error) {
    return res
      .status(201)
      .json({ success: false, message: "Internal server error." });
  }
};

const purchaseFrame = async (req, res) => {
  try {
    const { id } = req.body;
    const foundUser = await userModel.findOne({ email: req?.decodedEmail });
    const pointAmount = 25;

    if (foundUser) {
      let points = foundUser.points;
      if (points >= pointAmount) {
        foundUser.points = points - pointAmount;
        foundUser.pointHistory.push({
          reason: `Frame purchased`,
          isRedeem: true,
          pointsAmount: pointAmount,
        });
        foundUser.framesOwned.push(id);
        foundUser.save();

        return res
          .status(201)
          .json({ success: true, message: "Purchased successfully" });
      } else {
        return res
          .status(201)
          .json({ success: false, message: "Not enough points" });
      }
    }
  } catch (error) {
    return res
      .status(201)
      .json({ success: false, message: "Internal server error." });
  }
};
const purchaseAvatar = async (req, res) => {
  try {
    const { id } = req.body;
    const foundUser = await userModel.findOne({ email: req?.decodedEmail });
    const pointAmount = 25;
    if (foundUser) {
      let points = foundUser.points;
      if (points >= pointAmount) {
        foundUser.points = points - pointAmount;
        foundUser.pointHistory.push({
          reason: `Avatar purchased`,
          isRedeem: true,
          pointsAmount: pointAmount,
        });
        foundUser.avatarOwned.push(id);
        foundUser.save();

        return res
          .status(201)
          .json({ success: true, message: "Purchased successfully" });
      } else {
        return res
          .status(201)
          .json({ success: false, message: "Not enough points" });
      }
    }
  } catch (error) {
    return res
      .status(201)
      .json({ success: false, message: "Internal server error." });
  }
};

const changeFrame = async (req, res) => {
  try {
    const { link } = req.body;
    const foundUser = await userModel.findOne({ email: req?.decodedEmail });

    foundUser.frame = link;
    foundUser.save();

    return res.status(201).json({ success: true, data: foundUser.frame });
  } catch (error) {
    console.error("Error:", error);
    return res
      .status(201)
      .json({ success: false, message: "Internal server error." });
  }
};

const changeAvatar = async (req, res) => {
  try {
    const { link } = req.body;
    const foundUser = await userModel.findOne({ email: req?.decodedEmail });

    foundUser.profileImg = link;
    foundUser.save();

    return res.status(201).json({ success: true, data: foundUser.profileImg });
  } catch (error) {
    console.error("Error:", error);
    return res
      .status(201)
      .json({ success: false, message: "Internal server error." });
  }
};
const getAllAvatar = async (req, res) => {
  try {
    const allAvatar = await avatarModel.find({});

    return res.status(201).json({ success: true, data: allAvatar });
  } catch (error) {
    console.error("Error:", error);
    return res
      .status(201)
      .json({ success: false, message: "Internal server error." });
  }
};
const getAllFrame = async (req, res) => {
  try {
    const allFrame = await frameModel.find({});

    return res.status(201).json({ success: true, data: allFrame });
  } catch (error) {
    console.error("Error:", error);
    return res
      .status(201)
      .json({ success: false, message: "Internal server error." });
  }
};

const getFriendInvitationLink = async (req, res) => {
  try {
   
    const link =   Buffer.from(req?.decodedEmail).toString('base64');
    return res.status(201).json({ success: true, data: link });
  } catch (error) {
    return res
      .status(201)
      .json({ success: false, message: "Internal server error." });
  }
};


const updateGasPrices = async (req, res) => {
  try {
    const { placeId, lat, lng, diesel, midGrade, premium, regular } = req.body;
    const foundStation = await stationModel.findOne({ placeId: placeId });
    const foundUser = await userModel.findOne({ email: req.decodedEmail });
    const distanceInKm = getDistanceFromLatLonInKm(
      lat,
      lng,
      foundStation.latlng.latitude,
      foundStation.latlng.longitude
    );
    const distanceInMeters = distanceInKm * 1000;
    if (distanceInMeters > 200) {
      return res.status(201).json({
        success: false,
        message: "Distance between you and station must be 200 meters or less",
      });
    }
    const recentEntry = foundStation.priceHistory
      .filter((entry) => entry.email === req?.decodedEmail)
      .reduce(
        (mostRecent, current) => {
          return current.timeStamp > mostRecent.timeStamp
            ? current
            : mostRecent;
        },
        { timeStamp: 0 }
      );
    const currentTimestamp = Date.now();
    if (isNextTimestampWithin24Hour(currentTimestamp, recentEntry.timeStamp)) {
      const timeDifferenceInSeconds = Math.floor(
        (currentTimestamp - recentEntry.timeStamp) / 1000
      );
      let timeDifference = "";
      if (timeDifferenceInSeconds < 60) {
        timeDifference = `${timeDifferenceInSeconds} sec`;
      } else if (timeDifferenceInSeconds < 3600) {
        timeDifference = `${Math.floor(timeDifferenceInSeconds / 60)} min`;
      } else {
        timeDifference = `${Math.floor(timeDifferenceInSeconds / 3600)} hr`;
      }

      return res
        .status(201)
        .json({ success: false, message: `You updated ${timeDifference} ago, you can only update once 24 hour` });
    }
    let points = 0;
    if (diesel && diesel > 0) {
      foundStation.price.diesel.price = diesel;
      foundStation.price.diesel.email = req?.decodedEmail;
      foundStation.price.diesel.name = foundUser.name
      foundStation.price.diesel.timeStamp = currentTimestamp;
      points = points + 10;
    }
    if (regular && regular > 0) {
      foundStation.price.regular.price = regular;
      foundStation.price.regular.email = req?.decodedEmail;
      foundStation.price.regular.name = foundUser.name
      foundStation.price.regular.timeStamp = currentTimestamp;
      points = points + 10;
    }
    if (midGrade && midGrade > 0) {
      foundStation.price.midGrade.price = midGrade;
      foundStation.price.midGrade.email = req?.decodedEmail;
      foundStation.price.midGrade.name = foundUser.name
      foundStation.price.midGrade.timeStamp = currentTimestamp;
      points = points + 10;
    }
    if (premium && premium > 0) {
      foundStation.price.premium.price = premium;
      foundStation.price.premium.email = req?.decodedEmail;
      foundStation.price.premium.name = foundUser.name
      foundStation.price.premium.timeStamp = currentTimestamp;
      points = points + 10;
    }
    if (points === 0) {
      return res
        .status(201)
        .json({ success: false, message: "Please enter fuel prices" });
    }
   
    foundStation.priceHistory.push({
      email: foundUser.email,
      name: foundUser.name,
      timeStamp: currentTimestamp,
      points: points,
    });

    foundStation.save();
    foundUser.points += points;
    foundUser.totalPoints += points;

    foundUser.pointHistory.push({
      reason: `Price update`,
      isRedeem: false,
      pointsAmount: points,
    });
    foundUser.save()
    return res.status(201).json({
      success: true,
      message: "Successfully updated",
      data: {
        price: foundStation.price,
        priceHistory: foundStation.priceHistory,
        currentTimestamp: currentTimestamp,
      },
    });
  } catch (error) {
    return res
      .status(201)
      .json({ success: false, message: "Internal server error." });
  }
};

const addChat = async (req, res) => {
  try {
    const currentTimestamp = Date.now();
    const { isNewChat, message, chatType, chatId } = req.body;
    const foundUser = await userModel.findOne({ email: req?.decodedEmail });
    if (isNewChat) {
      let recentmsg = message;
      if (chatType === "video") {
        recentmsg = "Video";
      } else if (chatType === "image") {
        recentmsg = "Image";
      }
      const newChat = new chatModel({
        user: req?.decodedEmail,
        recentChat: recentmsg,
      });
      newChat.chat.push({
        isChatByUser: true,
        message: message,
        chatType: chatType,
        timeStamp: currentTimestamp,
      });
      newChat.save();
      foundUser.chat.push(newChat._id);
      foundUser.save();
      return res.status(201).json({
        success: true,
      });
    } else {
      const foundChat = await chatModel.findOne({ _id: chatId });
      foundChat.chat.push({
        isChatByUser: true,
        message: message,
        chatType: chatType,
        timeStamp: currentTimestamp,
      });
      foundChat.save();
      return res.status(201).json({
        success: true,
      });
    }
  } catch (error) {
    return res.status(201).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// utils
function isNextTimestampWithin24Hour(currentTimestamp, prevTimestamp) {
  prevTimestamp = prevTimestamp + 60 * 60 * 24 * 1000;

  if (currentTimestamp <= prevTimestamp) {
    return true;
  } else {
    return false;
  }
}
function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

function getDistanceFromLatLonInKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance;
}

const transporter = nodemailer.createTransport({
  service: "Gmail",
  port: 465,
  secure: true,
  auth: {
    user: process.env.gmail,
    pass: process.env.gmailPassword,
  },
});
function sendGiftCard(toEmail, subject, code) {
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
            <p>Your gift code is:</p>
            <p>${code}</p>
           
            <p>This code is just for visual purposes</p>
          </div>
        </body>
      </html>`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("Error sending email:", error);
    } else {
      console.log("Email sent:", info.response);
    }
  });
}

export {
  sendUserData,
  getGasStations,
  getGasStationData,
  addComment,
  editComment,
  deleteComment,
  addFavourite,
  deleteFavourite,
  editNameAndProfileImg,
  getFavouriteStations,
  purchaseGiftCard,
  purchaseFrame,
  purchaseAvatar,
  changeFrame,
  changeAvatar,
  getFriendInvitationLink,
  updateGasPrices,
  likeComment,
  unLikeComment,
  addChat,
  getAllAvatar,
  getAllFrame,
};
