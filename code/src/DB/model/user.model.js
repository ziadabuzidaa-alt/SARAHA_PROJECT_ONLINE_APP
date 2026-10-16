import mongoose from "mongoose";
import { GenderEnum, ProviderEnums, RoleEnum } from "../../common/index.js";

export const users = [];

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      minlength: 2,
      maxlength: 25,
      required: true,
    },
    lastName: {
      type: String,
      minlength: 2,
      maxlength: 25,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: function () {
        return this.provider === ProviderEnums.SYSTEM;
      },
    },
    age: {
      type: Number,
    },
    phone: {
      type: String,
    },
    gender: {
      type: Number,
      enum: Object.values(GenderEnum),
      default: GenderEnum.Male,
    },
    role: {
      type: Number,
      enum: Object.values(RoleEnum),
      default: RoleEnum.USER,
    },
    provider: {
      type: Number,
      enum: Object.values(ProviderEnums),
      default: ProviderEnums.SYSTEM,
    },
    oldPassword: [String],
    gallery: [String],
    visitCount: { type: Number, default: 0 },
    changeCredentialsTime: Date,
    profilePicture: String,
    coverPictures: [String],
    address: String,
    confirmEmail: Date,
  },
  {
    timestamps: true,
    validateBeforeSave: true,
    optimisticConcurrency: true,
    collection: "SARAHA_USER",
    strict: true,
    strictQuery: true,
    autoIndex: true,
  },
);
userSchema
  .virtual("username")
  .set(function (value) {
    const [firstName, lastName] = value.split(" ");
    this.set("firstName", firstName);
    this.set("lastName", lastName);
  })
  .get(function () {
    return `${this.firstName} ${this.lastName}`;
  });

export const userModel =
  mongoose.models.USER || mongoose.model("USER", userSchema);
