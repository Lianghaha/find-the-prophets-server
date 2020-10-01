const express = require("express")
const app = express()
const port = process.env.PORT || 3001
const utilities = require("./utilities")
const path = require("path")

//Secrets
// if (process.env.NODE_ENV !== "production") {
require("dotenv").config()
// }

console.clear()

app.use(express.static(path.join(__dirname, "build")))

//SQL
const mySqlConnection = require("./SQL-config")
mySqlConnection.connect((err) => {
   if (err) {
      console.log(
         "Database not connected! : " + JSON.stringify(err, undefined, 2)
      )
   } else console.log("Database Connected!")
})

app.get("/api/search/prophets", (req, res) => {
   //Default query values
   let orderBySort = "ORDER BY score DESC"
   let whereScoreAbove = "WHERE score > 0"
   let whereKeyWord = ""
   let whereProphetID = ""

   const { sort, scoreAbove, keyWord, prophetID } = req.query

   //Print queryStrings for Debugging
   let queryString = {}
   queryString.sort = sort
   queryString.scoreAbove = scoreAbove
   queryString.keyWord = keyWord
   queryString.prophetID = prophetID
   // console.table(queryString)

   if (sort) {
      querySort = sort
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

   var query = `SELECT * FROM prophets ${whereScoreAbove} ${whereKeyWord} ${whereProphetID} ${orderBySort}`
   console.log("Prophets query: \n" + query)
   utilities
      .sqlPromise(query)
      .then((result) => {
         res.json({ status: "success", result })
      })
      .catch((err) => {
         res.json({ status: "fail", err })
         console.log(err)
      })
})

app.get("/api/search/predictions", (req, res) => {
   //Default query values
   let orderBySort = "ORDER BY score DESC"
   let whereScoreAbove = "WHERE score > 0"
   let whereKeyWord = ""
   let whereProphetID = ""
   let wherePredictionID = ""

   const { sort, scoreAbove, keyWord, prophetID, predictionID } = req.query

   //Print queryStrings for Debugging
   let queryString = {}
   queryString.sort = sort
   queryString.scoreAbove = scoreAbove
   queryString.keyWord = keyWord
   queryString.prophetID = prophetID
   queryString.predictionID = predictionID

   console.table(queryString)

   if (sort) {
      querySort = sort
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

   var query = `SELECT * FROM predictions ${whereScoreAbove} ${whereKeyWord} ${whereProphetID} ${wherePredictionID} ${orderBySort}`
   console.log("Predictions query: \n" + query)
   utilities
      .sqlPromise(query)
      .then((result) => {
         res.json({ status: "success", result })
      })
      .catch((err) => {
         res.json({ status: "fail", err })
         console.log(err)
      })
})

app.get("/api/test", (req, res) => {
   var query = "SELECT * FROM test"
   utilities
      .sqlPromise(query)
      .then((result) => {
         res.send({ status: "success", message: "haha", result })
      })
      .catch((err) => console.log(err))
})

app.get("/*", (req, res) => {
   res.sendFile(path.join(__dirname, "build", "index.html"))
})

app.listen(port, () => {
   console.log(`Server Started at http://localhost:${port}`)
})
