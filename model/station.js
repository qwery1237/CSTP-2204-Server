import mongoose from "mongoose";
const stationSchema = new mongoose.Schema({
  location: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
    },
    coordinates: { type: [Number], required: true },
  },
  latlng: {
    latitude: {
      type: Number,
    },
    longitude: {
      type: Number,
    },
  },
  name: {
    type: String,
  },
  profileImg: {
    type: String,
  },
  address: {
    type: String,
  },
  priceHistory: [
    {
      email: {
        type: String,
      },
      name: {
        type: String,
      },
      timeStamp: {
        type: Number,
      },
      points: {
        type: Number,
      },
    },
  ],
  price: {
    regular: {
      price: {
        type: Number,
        default: 0,
      },
      timeStamp: {
        type: Number,
      },
      email: {
        type: String,
      },
      name: {
        type: String,
      },
    },
    midGrade: {
      price: {
        type: Number,
        default: 0,
      },
      timeStamp: {
        type: Number,
      },
      email: {
        type: String,
      },
      name: {
        type: String,
      },
    },
    premium: {
      price: {
        type: Number,
        default: 0,
      },
      timeStamp: {
        type: Number,
      },
      email: {
        type: String,
      },
      name: {
        type: String,
      },
    },
    diesel: {
      price: {
        type: Number,
        default: 0,
      },
      timeStamp: {
        type: Number,
      },
      email: {
        type: String,
      },
      name: {
        type: String,
      },
    },
  },
  amenities: {
    carWash: {
      isValid: {
        type: Boolean,
      },
      name: {
        default: "Car wash",
        type: String,
      },
    },
    atm: {
      isValid: {
        type: Boolean,
      },
      name: {
        default: "ATM",
        type: String,
      },
    },
    airPump: {
      isValid: {
        type: Boolean,
      },
      name: {
        default: "Air pump",
        type: String,
      },
    },
    convenienceStore: {
      isValid: {
        type: Boolean,
      },
      name: {
        default: "Convenience store",
        type: String,
      },
    },
    evChargingStation: {
      isValid: {
        type: Boolean,
      },
      name: {
        default: "Ev charging station",
        type: String,
      },
    },
  },
  fuelGoRating: {
    rating: {
      type: Number,
      default: 0,
      required: true,
    },
    totalRating: {
      type: Number,
      default: 0,
      required: true,
    },
  },
  placeId: {
    type: String,
  },
  reviews: [
    {
      rating: {
        type: Number,
      },
      comment: {
        type: String,
      },
      timeStamp: {
        type: Number,
      },
      photosVideos: [
        {
          type: String,
        },
      ],
      email: {
        type: String,
      },
      likes: [
        {
          type: String,
        },
      ],
    },
  ],
});

stationSchema.index({ location: "2dsphere" });
const stationModel = mongoose.model("Station", stationSchema);
export default stationModel;
