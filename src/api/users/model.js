import mongoose from "mongoose"
import bcrypt from "bcrypt"

const { Schema, model } = mongoose

const locationSchema = new Schema(
    {
        name: {type: String, required: true},
        lat: {type: Number, required: true},
        lon: {type: Number, required: true},
        country: {type: String, required: true}
    }
)

const UsersSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    avatar: { type: String },
    password: { type: String },
    refreshToken: { type: String },
    googleId: { type: String },
    trades: { type: Number, default: 0 },
    about: { type: String },
    location: {type: locationSchema}
  },
  {
    timestamps: true,
  }
)

UsersSchema.pre("save", async function() {
    const newUserData = this
    if (newUserData.isModified("password")) {
        const plainPw = newUserData.password
        const hash = await bcrypt.hash(plainPw, 16)
        newUserData.password = hash
    }
})

UsersSchema.pre("findOneAndUpdate", async function () {
    const update = {...this.getUpdate()}
    if (update.password) {
        const plainPw = update.password
        const hash = await bcrypt.hash(plainPw, 16)
        update.password = hash
        this.setUpdate(update)
    }
})

UsersSchema.methods.toJSON = function() {
    const current = this.toObject()
    delete current.password
    delete current.createdAt
    delete current.updatedAt
    delete current.__v

    return current
}

UsersSchema.static("checkCredentials", async function(email, plainPw) {
    const user = await this.findOne({email})
    if (user) {
        const match = await bcrypt.compare(plainPw, user.password)
        if (match) {
            return user
        } else {
            return null
        }
    } else {
        return null
    }
})

export default model("user", UsersSchema)