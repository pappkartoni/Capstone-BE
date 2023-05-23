import mongoose from "mongoose"

const {Schema, model} = mongoose

const OfferSchema = new Schema(
    {
        by: {type: Schema.Types.ObjectId, ref: "user", required: true},
        to: {type: Schema.Types.ObjectId, ref: "user", required: true},
        game: {type: Schema.Types.ObjectId, ref: "game", required: true},
        offer: [{type: Schema.Types.ObjectId, ref: "game"}],
        status: {type: String, enum: ["pending", "declined", "accepted", "unavailable"], default: "pending"}
    },
    {
        timestamps: true
    }
)

export default model("offer", OfferSchema)