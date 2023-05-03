import mongoose from "mongoose"

export const badRequestHandler = (err, req, res, next) => {
  if (err.status === 400 || err instanceof mongoose.Error.ValidationError || err instanceof mongoose.Error.CastError) {
    res.status(400).send({ message: err.message })
  } else {
    next(err)
  }
}

export const unauthorizedHandler = (err, req, res, next) => {
  if (err.status === 401) {
    res.status(401).send({ success: false, message: err.message })
  } else {
    next(err)
  }
}

export const forbiddenErrorHandler = (err, req, res, next) => {
  if (err.status === 403) {
    res.status(403).send({ success: false, message: err.message })
  } else {
    next(err)
  }
}

export const notfoundHandler = (err, req, res, next) => {
  if (err.status === 404) {
    res.status(404).send({ success: false, message: err.message })
  } else {
    next(err)
  }
}

export const genericErrorHandler = (err, req, res, next) => {
  console.log(err)
  res.status(500).send({ message: "We gonna fix this ASAP!" })
}