const express = require("express")
const router = express.Router()
const utils = require("../utils")

const getRelativeDate = (inputDate) => {
   var delta = Math.round(
      (utils.getCurrentTime().timeNumeric - inputDate) / 1000
   )

   var minute = 60,
      hour = minute * 60,
      day = hour * 24,
      week = day * 7,
      month = week * 4,
      year = month * 12

   var fuzzy

   if (delta < 30) {
      fuzzy = "just then"
   } else if (delta < minute) {
      fuzzy = delta + " seconds ago"
   } else if (delta < 2 * minute) {
      fuzzy = "a minute ago"
   } else if (delta < hour) {
      fuzzy = Math.floor(delta / minute) + " minutes ago"
   } else if (Math.floor(delta / hour) == 1) {
      fuzzy = "1 hour ago"
   } else if (delta < day) {
      fuzzy = Math.floor(delta / hour) + " hours ago"
   } else if (delta < day * 2) {
      fuzzy = "yesterday"
   } else if (delta < week) {
      fuzzy = Math.floor(delta / day) + " days ago"
   } else if (Math.floor(delta / week) == 1) {
      fuzzy = "1 week ago"
   } else if (delta < month) {
      fuzzy = Math.floor(delta / week) + " weeks ago"
   } else if (Math.floor(delta / month) == 1) {
      fuzzy = "1 month ago"
   } else if (delta < year) {
      fuzzy = Math.floor(delta / month) + " months ago"
   } else if (Math.floor(delta / year) == 1) {
      fuzzy = "1 year ago"
   } else {
      fuzzy = Math.floor(delta / year) + " years ago"
   }
   return fuzzy
}

const updatePredictions = async (prediction_id) => {
   const query = `UPDATE predictions SET score = ROUND((SELECT AVG(overall_score) FROM reviews WHERE prediction_id = ${prediction_id}), 1) WHERE prediction_id = ${prediction_id};UPDATE predictions SET num_review = (SELECT COUNT(*) FROM reviews WHERE prediction_id = ${prediction_id}) WHERE prediction_id = ${prediction_id};SELECT prophet_id FROM predictions WHERE prediction_id = ${prediction_id}`

   let result = false
   await utils
      .sqlPromise(query)
      .then((response) => {
         result = response[2][0]["prophet_id"]
         // console.log("updatePredictions prophet_id: " + result)
      })
      .catch((err) => {
         console.log(err)
      })
   return result
}
const updateProphets = async (prophet_id) => {
   const query = `UPDATE prophets SET score = ROUND((SELECT AVG(score) FROM predictions WHERE prophet_id = ${prophet_id}), 1) WHERE prophet_id = ${prophet_id};UPDATE prophets SET num_prediction = (SELECT COUNT(*) FROM predictions WHERE prophet_id = ${prophet_id}) WHERE prophet_id = ${prophet_id};`
   console.log(query)
   await utils
      .sqlPromise(query)
      .then((response) => {})
      .catch((err) => {
         console.log(err)
      })
}

router.get("/api/refreshALLps", async (req, res) => {
   for (var i = 0; i < 10; i++) {
      await updatePredictions(i)
      updateProphets(i)
   }
})

router.post("/api/review", async (req, res) => {
   utils.refreshToken(req)
   const {
      accuracy,
      difficulty,
      content,
      overall_score,
      prediction_id,
   } = req.body
   const { identity } = utils.parseCookie(req.headers.cookie)
   const posted_date = utils.getCurrentTime().timeNumeric
   const posted_date_readable = utils.getCurrentTime().timeReadable

   let status = 1,
      message = "Post Review Failed"

   let predictionAvgScore = false,
      num_review = false
   const query = `INSERT INTO reviews (author_identity, accuracy, difficulty, content, posted_date, posted_date_readable, overall_score, prediction_id) VALUES ("${identity}", ${accuracy}, ${difficulty}, "${content}", "${posted_date}", "${posted_date_readable}", ${overall_score}, ${prediction_id});SELECT AVG(overall_score) as avg_score, COUNT(*) as num_review FROM reviews WHERE prediction_id = ${prediction_id}`
   await utils
      .sqlPromise(query)
      .then(async (response) => {
         predictionAvgScore = Math.round(response[1][0]["avg_score"] * 10) / 10
         num_review = response[1][0]["num_review"]
         status = 0
         message = "Post Reivew Successful"
         res.json({ status: status, message: message, dbResponse: response })
      })
      .catch((err) => {
         res.json({ status: 1, message: err.sqlMessage })
         console.log(err)
      })
   if (status === 0) {
      const prophet_id = await updatePredictions(prediction_id)
      console.log("avg_score: " + predictionAvgScore)
      console.log("num_review: " + num_review)
      console.log("prophet_id: " + prophet_id)
      if (prophet_id) {
         updateProphets(prophet_id)
      }
   }
})

router.get("/api/review", async (req, res) => {
   utils.refreshToken(req)
   const { predictionID } = req.query

   let status = 1,
      message = "Get Reviews Failed, "

   const query = `SELECT * FROM reviews WHERE prediction_id = ${predictionID} ORDER BY posted_date DESC;`
   utils
      .sqlPromise(query)
      .then(async (result) => {
         if (result.length > 0) {
            for (const review of result) {
               review["relative_date"] = getRelativeDate(review.posted_date)
               review["author"] = await utils.getUserByIdentity(
                  review.author_identity
               )
            }
            status = 0
            message = "Get Reviews Successful"
            res.json({ status: status, message: message, result })
         } else {
            res.json({
               status: status,
               message: (message += "No Review Found"),
               result,
            })
         }
      })
      .catch((err) => {
         res.json({
            status: status,
            message: (message += "Database Error"),
            error: err,
         })
         console.log(err)
      })
})

router.post("/api/comment", async (req, res) => {
   utils.refreshToken(req)
   const { content, prophet_id } = req.body
   const { identity } = utils.parseCookie(req.headers.cookie)
   const posted_date = utils.getCurrentTime().timeNumeric
   const posted_date_readable = utils.getCurrentTime().timeReadable

   let status = 1,
      message = "Post Review Failed"

   const query = `INSERT INTO comments (author_identity, content, posted_date, posted_date_readable, prophet_id) VALUES ("${identity}", "${content}", "${posted_date}", "${posted_date_readable}", ${prophet_id});`
   utils
      .sqlPromise(query)
      .then(async (response) => {
         status = 0
         message = "Post Coment Successful"
         res.json({ status: status, message: message, dbResponse: response })
      })
      .catch((err) => {
         res.json({ status: 1, message: err.sqlMessage })
         console.log(err)
      })
})

router.get("/api/comment", async (req, res) => {
   utils.refreshToken(req)
   const { prophetID } = req.query

   let status = 1,
      message = "Get Comments Failed, "

   const query = `SELECT * FROM comments WHERE prophet_id = ${prophetID} ORDER BY posted_date DESC;`
   utils
      .sqlPromise(query)
      .then(async (result) => {
         if (result.length > 0) {
            for (const comment of result) {
               comment["relative_date"] = getRelativeDate(comment.posted_date)
               comment["author"] = await utils.getUserByIdentity(
                  comment.author_identity
               )
            }
            status = 0
            message = "Get Comments Successful"
            res.json({ status: status, message: message, result })
         } else {
            res.json({
               status: status,
               message: (message += "No Comment Found"),
               result,
            })
         }
      })
      .catch((err) => {
         res.json({
            status: status,
            message: (message += "Database Error"),
            error: err,
         })
         console.log(err)
      })
})

module.exports = router
