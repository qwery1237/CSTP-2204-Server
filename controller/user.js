import userModel from "../model/user.js";
import localitiesModel from "../model/localities.js";
import stationModel from "../model/station.js";
import dotenv from "dotenv";
import axios from "axios";
import jwt from "jsonwebtoken";

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
        let imageLink = "https://th.bing.com/th/id/R.525e321d9bb82204216f813ee99339ff?rik=O7dfJF5hfrK0Kg&pid=ImgRaw&r=0"
        if(station.photos){
          const photoRef = station.photos[0].photo_reference;

          const imageUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${400}&photoreference=${photoRef}&key=${
            process.env.GOOGLE_API_KEY
          }`;
          const response = await axios.get(imageUrl);
           imageLink = response.request.res.responseUrl;
        }
       const stationLat = parseFloat(station.geometry.location.lat)
       const stationLng = parseFloat(station.geometry.location.lng)
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
          coordinates: [
            stationLng,
            stationLat,
          ],
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
        $limit: 20 
    }
  ]);
  for (const station of gasStationList) {
    const gasStationLatitude = station.latlng.latitude;
    const gasStationLongitude = station.latlng.longitude;
    const distanceResponse = await axios.get(`https://maps.googleapis.com/maps/api/distancematrix/json?origins=${latitude},${longitude}&destinations=${gasStationLatitude},${gasStationLongitude}&key=${process.env.GOOGLE_API_KEY}`);
    
    const distance = distanceResponse.data.rows[0].elements[0].distance.text;

    station.distanceFromUser = distance;

  }
}catch(error){
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
    }
    ,
    {
        $limit: 1
    }
  ]);
  return specificStation;
}

export { sendUserData, getGasStations };
