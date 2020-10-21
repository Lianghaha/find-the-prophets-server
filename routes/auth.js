const express = require("express")
const router = express.Router()
const utils = require("../utils")
// const CryptoJS = require("crypto-js")
const { token_expire_time } = require("./auth-config.js")
const SHA256 = require("crypto-js/sha256")

const generateToken = (user_id, email, timeNumeric) => {
   const result = SHA256(user_id + email + timeNumeric)
   // console.log("Token Generated: " + result)
   return result.toString()
}

//Used in SignUp, create new row in "tokens" table
const insertNewToken = async (user_id, email) => {
   const { timeNumeric, timeReadable } = utils.getCurrentTime()
   const token = generateToken(user_id, email, timeNumeric)
   // console.log("insertNewToken: " + token)

   let status = 1,
      tokenResult = "",
      message = ""

   const query = `INSERT INTO tokens (user_id, identity, token, last_request, last_request_readable) VALUES ("${user_id}", "${email}", "${token}", "${timeNumeric}", "${timeReadable}");`
   await utils
      .sqlPromise(query)
      .then(() => {
         status = 0
         tokenResult = token
      })
      .catch((err) => {
         console.log(err)
         message = err
      })
   return { status: status, token: tokenResult, message: message }
}

//Used in Login, update existing row in "tokens" table with new token and last_request time
const updateToken = async (user_id, email) => {
   const { timeNumeric, timeReadable } = utils.getCurrentTime()
   const token = generateToken(user_id, email, timeNumeric)

   //Default tokenRequest info
   let status = 1,
      tokenResult = "",
      message = ""

   const query = `UPDATE tokens SET token = "${token}", last_request = "${timeNumeric}", last_request_readable = "${timeReadable}" WHERE user_id = ${user_id};`
   await utils
      .sqlPromise(query)
      .then((result) => {
         if (result.affectedRows === 1) {
            console.log("Login Update Token Successful")
            status = 0
            tokenResult = token
         } else {
            message = "0 or more than 1 token changed"
         }
      })
      .catch((err) => {
         console.log(err)
         message = err
      })
   return { status: status, token: tokenResult, message: message }
}

//SignUp Api Helper
const checkEmail = (input) => {
   const regex = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/
   return regex.test(input)
}

//SignUp Api Helper
const checkUsername = (input) => {
   let regex = /^[a-zA-Z0-9]+$/
   return regex.test(input) && input.length >= 6
}

//Status code 0: Sucess, 1:
router.post("/api/signup", async (req, res) => {
   console.clear()
   const { email, username, encPassword } = req.body

   let queryString = {}
   queryString.email = email
   queryString.username = username
   queryString.encPassword = encPassword
   console.log("\n================================ SignUp Debugging ")
   console.table(queryString)

   //Check User Info Validity
   // if (!checkEmail(email)) return res.json({ status: 2, message: "Invalid Email" })
   // if (!checkUsername(username)) return res.json({ status: 3, message: "Invalid Username" })

   const query = `INSERT INTO users (identity, username, password) VALUES ("${email}", "${username}", "${encPassword}");SELECT LAST_INSERT_ID();`
   utils
      .sqlPromise(query)
      .then(async (result) => {
         const user_id = result[0].insertId
         const tokenRequest = await insertNewToken(user_id, email)
         res.json({
            status: 0,
            message: "Register User Successful",
            tokenRequest: tokenRequest,
         })
      })
      .catch((err) => {
         res.json({ status: 1, message: err.sqlMessage })
         console.log(err)
      })
})

router.post("/api/login", async (req, res) => {
   const { email, encPassword } = req.body

   let queryString = {}
   queryString.email = email
   queryString.encPassword = encPassword
   console.log("\n================================ Login Debugging ")
   console.table(queryString)

   let status = 1,
      message = "Login Failed",
      tokenRequest = "",
      userInfo = ""

   const query = `SELECT * FROM users WHERE identity = "${email}";`
   utils
      .sqlPromise(query)
      .then(async (result) => {
         //Check whether SQL return empty list
         //Which means Username doesn't exist
         if (result[0]) {
            dbUser_id = result[0]["user_id"]
            dbEmail = result[0]["email"]
            dbPassword = result[0]["password"]
            //Check Password
            if (encPassword === dbPassword) {
               status = 0
               message = "Login Successful"
               tokenRequest = await updateToken(dbUser_id, dbEmail)
               userInfo = {
                  identity: result[0].identity,
                  username: result[0].username,
               }
            } else {
               message = "Password Incorrect"
            }
         } else {
            message = "Email doesn't exist"
         }
         res.json({
            status: status,
            message: message,
            tokenRequest: tokenRequest,
            userInfo: userInfo,
         })
      })
      .catch((err) => {
         console.log(err)
         res.json({
            status: 1,
            message: "Login Failed, database error" + err,
            err,
         })
      })
})

//Client actively request to check token
router.post("/api/check_token", async (req, res) => {
   const { identity, token } = req.body
   let status = 1,
      message = "Unknown Error"

   const query = `SELECT token, last_request FROM tokens WHERE identity = "${identity}";`
   utils
      .sqlPromise(query)
      .then(async (response) => {
         if (response.length === 0) {
            message = "Cannot find token with given identity"
         } else {
            db_token = response[0].token
            db_last_request = response[0].last_request
            //Check whether tokens match
            if (token === db_token) {
               //Check whether token is expired
               const currentTime = utils.getCurrentTime().timeNumeric
               if (currentTime - db_last_request < token_expire_time) {
                  status = 0
                  message = "Token Valid"
               } else message = "Token Expired"
            } else message = "Tokens don't match"
         }
         res.json({ status: status, message: message })
      })
      .catch((err) => {
         res.json({ status: 1, message: err.sqlMessage })
         console.log(err)
      })
})

module.exports = router
