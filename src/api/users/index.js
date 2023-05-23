import express from "express";
import createError from "http-errors";
import UsersModel from "./model.js";
import createHttpError from "http-errors";
import {cloudinaryAvatarUploader, createTokens, jwtAuth, verifyAndRefreshTokens} from "../../lib/tools.js";
import passport from "passport";

const usersRouter = express.Router();

usersRouter.get("/googlelogin",    passport.authenticate("google", { scope: ["profile", "email"] }));

usersRouter.get("/googlecallback", passport.authenticate("google", { session: false }),
    (req, res, next) => {
        try {
            res.redirect(
                `${process.env.FE_URL}/?accessToken=${req.user.accessToken}&refreshToken=${req.user.refreshToken}`
            ); //not sure about this one
        } catch (error) {
            next(error);
        }
    }
);

usersRouter.get("/", async (req, res, next) => {
    try {
        const { q } = req.query;
        let query = {};

        if (q) {
            query.$or = [
                { name: { $regex: q, $options: "i" } },
                { email: { $regex: q, $options: "i" } },
            ];
        }

        const users = await UsersModel.find(query).select("-refreshToken");
        res.status(200).json(users);
    } catch (error) {
        next(error);
    }
});

usersRouter.get("/me", jwtAuth, async (req, res, next) => {
    try {
        const currentUser = await UsersModel.findById(req.user._id);

        if (currentUser) {
            res.status(200).json(currentUser);
        } else {
            next(createError(404, "User not found"));
        }
    } catch (error) {
        next(error);
    }
});

usersRouter.put("/me", jwtAuth, async (req, res, next) => {
    try {
        const updates = req.body;
        console.log("updates are", updates)
        const currentUser = await UsersModel.findById(req.user._id);
        const updatedUser = await UsersModel.findByIdAndUpdate(
            currentUser,
            updates,
            {
                new: true,
                runValidators: true,
            }
        );

        if (updatedUser) {
            res.status(200).json(updatedUser);
        } else {
            next(createError(404, "User not found"));
        }
    } catch (error) {
        next(error);
    }
});

usersRouter.post("/me/avatar", jwtAuth, cloudinaryAvatarUploader,
    async (req, res, next) => {
        try {
            const updatedUser = await UsersModel.findByIdAndUpdate(
                req.user._id,
                { avatar: req.file.path },
                { new: true, runValidators: true }
            );
            res.send(updatedUser);
        } catch (error) {
            next(error);
        }
    }
);

usersRouter.get("/:userId", async (req, res, next) => {
    try {
        const users = await UsersModel.findById(req.params.userId);
        if (users) {
            res.send(users);
        } else {
            next(createError(404, `User with id ${req.params.userId} not found`));
        }
    } catch (error) {
        next(error);
    }
});

usersRouter.post("/register", async (req, res, next) => {
    try {
        const newUser = new UsersModel(req.body);
        const { _id } = await newUser.save();
        const { accessToken, refreshToken } = await createTokens(newUser);

        res.send({ _id, accessToken, refreshToken });
    } catch (error) {
        next(error);
    }
});

usersRouter.post("/login", async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const user = await UsersModel.checkCredentials(email, password);
        if (user) {
            const { accessToken, refreshToken } = await createTokens(user);
            res.send({ accessToken, refreshToken });
        } else {
            next(createHttpError(401, "Invalid credentials"));
        }
    } catch (error) {
        next(error);
    }
});

usersRouter.delete("/login", jwtAuth, async (req, res, next) => {
    try {
        const user = await UsersModel.findByIdAndUpdate(req.user._id, {
            refreshToken: undefined,
        });
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

usersRouter.post("/session/refresh", async (req, res, next) => {
    try {
        const { currentRefreshToken } = req.body;
        const { accessToken, refreshToken } = await verifyAndRefreshTokens(
            currentRefreshToken
        );
        res.send({ accessToken, refreshToken });
    } catch (error) {
        next(error);
    }
});

export default usersRouter;
