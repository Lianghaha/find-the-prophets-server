const express = require("express")
const app = express()
const port = process.env.PORT || 3001
const utils = require("./utils")
const path = require("path")

//Secrets
// if (process.env.NODE_ENV !== "production") {
require("dotenv").config()
// }

console.clear()

app.use(express.static(path.join(__dirname, "build")))
app.use(express.urlencoded({ extended: true }))
app.use(express.json())

//SQL Connect
const mySqlConnection = require("./SQL-config")
mySqlConnection.connect((err) => {
   if (err) {
      console.log(
         "Database not connected! : " + JSON.stringify(err, undefined, 2)
      )
   } else console.log("Database Connected!")
})

const authRoutes = require("./routes/auth.js")
app.use(authRoutes)
const commentReviewRoutes = require("./routes/comment_review")
app.use(commentReviewRoutes)

// app.get("/api/test", (req, res) => {
//    const test = req.headers
//    utils.refreshToken(req)
//    res.json({test})
// })

app.get("/api/search/prophets", (req, res) => {
   utils.refreshToken(req)

   //Default query values
   let orderBySort = "ORDER BY score DESC"
   let whereScoreAbove = "WHERE score > -1"
   let whereKeyWord = ""
   let whereProphetID = ""

   const { sort, scoreAbove, keyWord, prophetID } = req.query

   if (sort) {
      orderBySort = `ORDER BY score ${sort}`
   }
   if (scoreAbove) {
      whereScoreAbove = `WHERE score > ${scoreAbove}`
   }
   if (keyWord) {
      whereKeyWord = `AND (name LIKE "%${keyWord}%" OR description LIKE "%${keyWord}%")`
   }
   if (prophetID) {
      whereProphetID = `AND prophet_id = ${prophetID}`
   }

   const query = `SELECT * FROM prophets ${whereScoreAbove} ${whereKeyWord} ${whereProphetID} ${orderBySort}`
   utils
      .sqlPromise(query)
      .then((result) => {
         res.json({ status: 0, result })
      })
      .catch((err) => {
         res.json({ status: 1, err })
         console.log(err)
      })
})

app.get("/api/search/predictions", (req, res) => {
   utils.refreshToken(req)
   //Default query values
   let orderBySort = "ORDER BY score DESC"
   let whereScoreAbove = "WHERE score >= -1"
   let whereKeyWord = ""
   let whereProphetID = ""
   let wherePredictionID = ""

   const {
      sort,
      scoreAbove,
      keyWord,
      prophetID,
      predictionID,
      page,
      numPerPage,
   } = req.query

   //Print queryStrings for Debugging
   // let queryString = {}
   // queryString.sort = sort
   // queryString.scoreAbove = scoreAbove
   // queryString.keyWord = keyWord
   // queryString.prophetID = prophetID
   // queryString.predictionID = predictionID
   // queryString.page = page
   // queryString.numPerPage = numPerPage
   // console.table(queryString)

   if (sort) {
      orderBySort = `ORDER BY score ${sort}`
   }
   if (scoreAbove) {
      whereScoreAbove = `WHERE score > ${scoreAbove}`
   }
   if (keyWord) {
      whereKeyWord = `AND (title LIKE "%${keyWord}%" OR description LIKE "%${keyWord}%")`
   }
   if (prophetID) {
      whereProphetID = `AND prophet_id = ${prophetID}`
   }

   if (predictionID) {
      wherePredictionID = `AND prediction_id = ${predictionID}`
   }

   const query = `SELECT * FROM predictions ${whereScoreAbove} ${whereKeyWord} ${whereProphetID} ${wherePredictionID} ${orderBySort}`
   let showLoadMoreButton = true,
      result = []
   utils
      .sqlPromise(query)
      .then((response) => {
         if (page) {
            const startIndex = (page - 1) * numPerPage
            const endIndex = page * numPerPage
            result = response.slice(startIndex, endIndex)
            if (endIndex >= response.length) {
               showLoadMoreButton = false
            }
         } else result = response
         // console.log(response.length)
         // console.log(result.length)
         res.json({ status: 0, result: result, showLoadMoreButton })
      })
      .catch((err) => {
         res.json({ status: 1, err })
         console.log(err)
      })
})

app.get("/*", (req, res) => {
   res.sendFile(path.join(__dirname, "build", "index.html"))
})

app.listen(port, () => {
   console.log(`Server Started at http://localhost:${port}`)
})
