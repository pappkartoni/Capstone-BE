import express from "express";
import {jwtAuth, sendAcceptedTradeEmails} from "../../lib/tools.js";
import OffersModel from "./model.js"
import UsersModel from "../users/model.js";
import GamesModel from "../games/model.js"
import createHttpError from "http-errors";


const offersRouter = express.Router()

offersRouter.post("/:userid/game/:gameId", jwtAuth, async (req, res, next) => {
    try {
        const newOffer = new OffersModel({by: req.user._id, to: req.params.userid, game: req.params.gameId, offer: req.body.offer})
        const {_id} = await newOffer.save()
        res.status(201).send({_id})
    } catch (error) {
        console.log(error)
    }
})

offersRouter.put("/:offerId/decline", jwtAuth, async (req, res, next) => {
    try {
        const offer = await OffersModel.findById(req.params.offerId).populate("to by offer game")
        if (offer) {
            if (offer.by._id.toString() === req.user._id || offer.to._id.toString() === req.user._id)  {
                offer.status = "declined"
                offer.save()
                console.log(offer)
                res.send(offer)
            } else {
                next(createHttpError(401, `You can't edit the offer with id ${req.params.offerId}`))
            }
        } else {
            next(createHttpError(404, `No offer with id ${req.params.offerId}`))
        }

    } catch (error) {
        next(error)
    }
})

offersRouter.put("/:offerId/accept", jwtAuth, async (req, res, next) => {
    try {
        const offer = await OffersModel.findById(req.params.offerId).populate("to by offer game")
        if (offer) {
            console.log("we lit bois", offer.to._id, req.user._id)
            if (offer.to._id.toString() === req.user._id)  {
                offer.status = "accepted"
                offer.save()
                await GamesModel.findByIdAndUpdate(offer.game._id, {"available": false})
                offer.offer.forEach(async g => await GamesModel.findByIdAndUpdate(g._id, {"available": false}))
                await UsersModel.findByIdAndUpdate(req.user._id, {$inc: {"trades": 1}} )
                await UsersModel.findByIdAndUpdate(offer.by, {$inc: {"trades": 1}} )

                await sendAcceptedTradeEmails(offer) //maybe
                res.send(offer)
            } else {
                next(createHttpError(401, `You can't accept the offer with id ${req.params.offerId}`))
            }
        } else {
            next(createHttpError(404, `No offer with id ${req.params.offerId}`))
        }

    } catch (error) {
        next(error)
    }
})

offersRouter.get("/", jwtAuth, async (req, res, next) => {
    try {
        const offers = await OffersModel.find()
        res.send(offers)
    } catch (error) {
        next(error)
    }
})

offersRouter.get("/from/me", jwtAuth, async (req, res, next) => {
    try {
        const offers = await OffersModel.find({by: req.user._id}).populate([
            {path: "to", select: "name avatar email"},
            {path: "game", select: "name asking images"},
            {path: "offer", select: "name asking images"},
        ])

        res.send(offers)
    } catch (error) {
        next(error)
    }
})

offersRouter.get("/to/me", jwtAuth, async (req, res, next) => {
    try {
        const offers = await OffersModel.find({to: req.user._id}).populate([
            {path: "by", select: "name avatar email"},
            {path: "game", select: "name asking images"},
            {path: "offer", select: "name asking images"},
        ])

        res.send(offers)
    } catch (error) {
        next(error)
    }
})

offersRouter.get("/:userId/accepted", async (req, res, next) => {
    try {
        const offers = await OffersModel.find({$and: [{status: "accepted"}, {$or: [{to: req.params.userId}, {by: req.params.userId}]}]}).populate([
            {path: "by", select: "name avatar email"},
            {path: "to", select: "name avatar email"},
            {path: "game", select: "name asking images"},
            {path: "offer", select: "name asking images"},
        ])
        res.send(offers)
    } catch (error) {
        next(error)
    }
})

offersRouter.get("/:offerId", jwtAuth, async (req, res, next) => {
    try {
        const offer = await OffersModel.findById(req.params.offerId)
        .populate([
            {path: "by", select: "name avatar email"},
            {path: "to", select: "name avatar email"},
            {path: "game", select: "name asking images"},
            {path: "offer", select: "name asking images"},
        ])
        if (offer) res.send(offer)
        else next(createHttpError(`No offer with ID ${req.params.offerId}`))
    } catch (error) {
        next(error)
    }
})

export default offersRouter