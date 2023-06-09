import express from "express";
import createError from "http-errors";
import GamesModel from "./model.js";
import createHttpError from "http-errors";
import {cloudinaryGameImagesUploader, jwtAuth} from "../../lib/tools.js";
import passport from "passport";
import q2m from "query-to-mongo"

const gamesRouter = express.Router();

gamesRouter.post("/", jwtAuth, async (req, res, next) => {
    console.log("we are here when we shouldnt")
    try {
        const newGame = new GamesModel({...req.body, owner: req.user._id})
        const { _id } = await newGame.save()
        res.status(201).send({ _id })
    } catch (error) {
        next(error)
    }
})

gamesRouter.get("/", async (req, res, next) => {
    try {
        const q = q2m(req.query)
        const games = await GamesModel.find(q.criteria, q.options.fields)
            .limit(q.options.limit)
            .skip(q.options.skip)
            .sort(q.options.sort)
            .populate({path: "owner", select: "name email avatar location trades"})
        const total = await GamesModel.countDocuments(q.criteria)

        res.send({
            links: q.links(process.env.BE_URL + "/games", total),
            total,
            numberOfPages: Math.ceil(total / q.options.limit),
            games
        })
    } catch (error) {
        next(error)
    }
})

gamesRouter.get("/:gameId", jwtAuth, async (req, res, next) => {
    try {
        const foundGame = await GamesModel.findById(req.params.gameId).populate({path: "owner", select: "name email avatar location trades"})
        if (foundGame) {
            res.send(foundGame)
        } else {
            next(createHttpError(404, `No game with id ${req.params.gameId}`))
        }
    } catch (error) {
        next(error)
    }
})

gamesRouter.put("/:gameId", jwtAuth, async (req, res, next) => {
    try {
        console.log("we edit", req.body)
        const updatedGame = await GamesModel.findByIdAndUpdate(
            req.params.gameId,
            req.body,
            {new: true, runValidators: true}
        )

        if (updatedGame) {
            res.send(updatedGame)
        } else {
            next(createHttpError(404, `No game with id ${req.params.gameId}`))
        }
    } catch (error) {
        next(error)
    }
})

gamesRouter.delete("/:gameId", jwtAuth, async (req, res, next) => {
    try {
        const deletedGame = await GamesModel.findByIdAndDelete(req.params.gameId)
        if (deletedGame) {
            res.status(204).send()
        } else {
            next(createHttpError(404, `No game with id ${req.params.gameId}`))
        }
    } catch (error) {
        next(error)
    }
})

gamesRouter.get("/me/games", jwtAuth, async (req, res, next) => {
    try {
        const ownGames = await GamesModel.find({owner: req.user._id}).populate({path: "owner", select: "name email avatar location trades"})
        res.send(ownGames)
    } catch (error) {
        next(error)
    }
})


gamesRouter.post("/:gameId/images", jwtAuth, cloudinaryGameImagesUploader, async (req, res, next) => {
    try {
        const updatedGame = await GamesModel.findByIdAndUpdate(
            req.params.gameId,
            { images: req.files.map(f => f.path) },
            { new: true, runValidators: true }
            ).populate({path: "owner", select: "name email avatar location trades"})
            res.send(updatedGame);
        } catch (error) {
            next(error);
        }
    }
    );

export default gamesRouter