const express = require("express")
const router = express.Router()
const utils = require("../utils")

router.post("/api/review", async (req, res) => {
   utils.refreshToken(req)
   const { accuracy, difficulty, content, overall_score } = req.body
   const { identity } = utils.parseCookie(req.headers.cookie)
   const posted_date = utils.getCurrentTime().timeReadable

   let status = 1,
      message = "Post Review Failed"

   const query = `INSERT INTO reviews (identity, accuracy, difficulty, content, posted_date, overall_score) VALUES ("${identity}", ${accuracy}, ${difficulty}, "${content}", "${posted_date}", ${overall_score});`
   utils
      .sqlPromise(query)
      .then(async (response) => {
         status = 0
         message = "Post Reivew Successful"
         res.json({ status: status, message: message, dbResponse: response })
         //TODO
         //Update prediction and prophet score
      })
      .catch((err) => {
         res.json({ status: 1, message: err.sqlMessage })
         console.log(err)
      })
})

router.get("/api/review", async (req, res) => {
   utils.refreshToken(req)
   const { accuracy, difficulty, content, overall_score } = req.body
   const { identity } = utils.parseCookie(req.headers.cookie)
   const posted_date = utils.getCurrentTime().timeReadable

   let status = 1,
      message = "Post Review Failed"

   const query = `INSERT INTO reviews (identity, accuracy, difficulty, content, posted_date, overall_score) VALUES ("${identity}", ${accuracy}, ${difficulty}, "${content}", "${posted_date}", ${overall_score});`
   utils
      .sqlPromise(query)
      .then(async (response) => {
         status = 0
         message = "Post Reivew Successful"
         res.json({ status: status, message: message, dbResponse: response })
         //TODO
         //Update prediction and prophet score
      })
      .catch((err) => {
         res.json({ status: 1, message: err.sqlMessage })
         console.log(err)
      })
})

router.post("/api/comment", async (req, res) => {
   utils.refreshToken(req)
   const { content } = req.body
   const { identity } = utils.parseCookie(req.headers.cookie)
   const posted_date = utils.getCurrentTime().timeReadable

   let status = 1,
      message = "Post Review Failed"

   const query = `INSERT INTO comments (identity, content, posted_date) VALUES ("${identity}", "${content}", "${posted_date}");`
   utils
      .sqlPromise(query)
      .then(async (response) => {
         status = 0
         message = "Post Coment Successful"
         res.json({ status: status, message: message, dbResponse: response })
         //TODO
         //Update prediction and prophet score
      })
      .catch((err) => {
         res.json({ status: 1, message: err.sqlMessage })
         console.log(err)
      })
})

router.get("/api/comment", async (req, res) => {
   utils.refreshToken(req)
   const { accuracy, difficulty, content, overall_score } = req.body
   const { identity } = utils.parseCookie(req.headers.cookie)
   const posted_date = utils.getCurrentTime().timeReadable

   let status = 1,
      message = "Post Review Failed"

   const query = `INSERT INTO reviews (identity, accuracy, difficulty, content, posted_date, overall_score) VALUES ("${identity}", ${accuracy}, ${difficulty}, "${content}", "${posted_date}", ${overall_score});`
   utils
      .sqlPromise(query)
      .then(async (response) => {
         status = 0
         message = "Post Reivew Successful"
         res.json({ status: status, message: message, dbResponse: response })
         //TODO
         //Update prediction and prophet score
      })
      .catch((err) => {
         res.json({ status: 1, message: err.sqlMessage })
         console.log(err)
      })
})

module.exports = router
