import jwt from "jsonwebtoken";
import UsersModel from "../api/users/model.js";
import createHttpError from "http-errors";
import GoogleStrategy from "passport-google-oauth20";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { v2 as cloudinary } from "cloudinary";
import sgMail from "@sendgrid/mail"

export const createAccessToken = (payload) =>
  new Promise((resolve, reject) =>
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: "150m" },
      (err, token) => {
        if (err) reject(err);
        else resolve(token);
      }
    )
  );

export const verifyAccessToken = (token) =>
  new Promise((resolve, reject) =>
    jwt.verify(token, process.env.JWT_SECRET, (err, payload) => {
      if (err) reject(err);
      else resolve(payload);
    })
  );

export const createRefreshToken = (payload) =>
  new Promise((resolve, reject) =>
    jwt.sign(
      payload,
      process.env.REFRESH_SECRET,
      { expiresIn: "150m" },
      (err, token) => {
        if (err) reject(err);
        else resolve(token);
      }
    )
  );

export const verifyRefreshToken = (token) =>
  new Promise((resolve, reject) =>
    jwt.verify(token, process.env.REFRESH_SECRET, (err, payload) => {
      if (err) reject(err);
      else resolve(payload);
    })
  );

export const createTokens = async (user) => {
  console.log(user);
  const accessToken = await createAccessToken({ _id: user._id });
  const refreshToken = await createRefreshToken({ _id: user._id });

  user.refreshToken = refreshToken;
  await user.save();

  return { accessToken, refreshToken };
};

export const verifyAndRefreshTokens = async (currentRefreshToken) => {
  try {
    console.log("bla", currentRefreshToken);
    const { _id } = await verifyRefreshToken(currentRefreshToken);
    console.log(_id);
    const user = await UsersModel.findById(_id);
    console.log(user);
    if (!user) throw new createHttpError(404, `User with id ${_id} not found.`);
    if (user.refreshToken && user.refreshToken === currentRefreshToken) {
      const { accessToken, refreshToken } = await createTokens(user);
      return { accessToken, refreshToken };
    } else {
      throw new createHttpError(401, "Invalid refresh token.");
    }
  } catch (error) {
    throw new createHttpError(401, "Please log in.");
  }
};

export const jwtAuth = async (req, res, next) => {
  if (!req.headers.authorization) {
    next(createHttpError(401, "No bearer token provided. 🐻"));
  } else {
    const accessToken = req.headers.authorization.replace("Bearer ", "");
    try {
      const payload = await verifyAccessToken(accessToken);
      req.user = { _id: payload._id };
      next();
    } catch (error) {
      console.log(error);
      next(createHttpError(401, "Invalid token."));
    }
  }
};

export const googleStrategy = new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_ID,
    clientSecret: process.env.GOOGLE_SECRET,
    callbackURL: `${process.env.BE_URL}/users/googlecallback`,
  },
  async (_, __, profile, pnext) => {
    try {
      const { email, given_name, family_name, sub, picture } = profile._json;
      const user = await UsersModel.findOne({ email });
      if (user) {
        const { accessToken, refreshToken } = await createTokens(user);
        pnext(null, { accessToken, refreshToken });
      } else {
        const newUser = await UsersModel({
          name: given_name + " " + family_name,
          email,
          avatar: picture,
          googleId: sub,
        });

        const created = await newUser.save();
        const { accessToken, refreshToken } = await createTokens(created);
        pnext(null, { accessToken, refreshToken });
      }
    } catch (error) {
      pnext(error);
    }
  }
);

export const cloudinaryAvatarUploader = multer({
  storage: new CloudinaryStorage({
    cloudinary,
    params: {
      folder: "bge/avatars",
    },
  }),
}).single("avatar");

export const cloudinaryGameImagesUploader = multer({
  storage: new CloudinaryStorage({
    cloudinary,
    params: {
      folder: "bge/gameimages"
    },
  }),
}).array("gameimages")


sgMail.setApiKey(process.env.SENDGRID_KEY)

export const sendAcceptedTradeEmails = async (trade) => {
  console.log(trade)
  const msg1 = {
    to: trade.by.email,
    from: process.env.SENDER_EMAIL,
    subject: `Accepted Trade for ${trade.game.name}`,
    html: `Hey, ${trade.by.name},
            ${trade.to.name} has accepted your trade offer for their game ${trade.game.name}.
            Please contact them via their mail ${trade.to.email} to finalize the trade.

            Cheers,
            BGE
          `
  }
  const msg2 = {
    to: trade.to.email,
    from: process.env.SENDER_EMAIL,
    subject: `Accepted Trade for ${trade.game.name}`,
    html: `Hey, ${trade.to.name},
            You have accepted ${trade.to.name}'s offer for your game ${trade.game.name}.
            Please contact them via their mail ${trade.by.email} to finalize the trade.

            Cheers,
            BGE
          `
  }

  try {
    console.log("pling")
    await sgMail.send(msg1)
    await sgMail.send(msg2)
  } catch (error) {
    console.log(error)
  }
}