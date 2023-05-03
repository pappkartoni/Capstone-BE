import Express from "express"
import cors from "cors"
import {createServer} from "http" //for chat
import {badRequestHandler, unauthorizedHandler, notfoundHandler, forbiddenErrorHandler, genericErrorHandler} from "./errors.js"
import passport from "passport"
import usersRouter from "./api/users/index.js"
import gamesRouter from "./api/games/index.js"

const server = Express()
const port = process.env.PORT || 3001
const whitelist = [process.env.FE_DEV_URL, process.env.BE_DEV_URL]
server.use(cors({
    origin: (currentOrigin, corsNext) => {
        if (!currentOrigin || whitelist.indexOf(currentOrigin) !== -1) {
            corsNext(null, true)
        } else {
            corsNext(createHttpError(400, `Origin ${currentOrigin} is not whitelisted.`))
        }
    }
}))

server.use(Express.json())
server.use(passport.initialize())

server.use("/users", usersRouter)
server.use("/games", gamesRouter)

server.use(badRequestHandler)
server.use(unauthorizedHandler)
server.use(forbiddenErrorHandler)
server.use(notfoundHandler)
server.use(genericErrorHandler)

//TODO chat here

export default server