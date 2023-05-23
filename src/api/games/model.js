import mongoose from "mongoose"
import bcrypt from "bcrypt"

const { Schema, model } = mongoose

const GamesSchema = new Schema(
    {
        name: {type: String, required: true},
        description: {type: String, required: true},
        images: [{type: String}],
        owner: {type: Schema.Types.ObjectId, ref: "user"},
        asking: {type: Number, required: true},
        variance: {type: Number, required: true},
        available: {type: Boolean, required: true, default: true}
    },
    {
        timestamps: true,
    }
)

export default model("game", GamesSchema)