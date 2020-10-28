const express = require("express")
const router = express.Router()
const utils = require("../utils")
// const CryptoJS = require("crypto-js")
const SHA256 = require("crypto-js/sha256")
const CryptoJS = require("crypto-js")
const { OAuth2Client } = require("google-auth-library")
const client = new OAuth2Client(
   "120159497383-33l93k1jfajaoa1t1sm39qtnhmeoq9u5.apps.googleusercontent.com"
)

const decrypt = (str) => {
   // console.log("decrypt str: " + str)
   // console.log("decrypt REACT_APP_SECRET: " + process.env.REACT_APP_SECRET)
   const decrypt = CryptoJS.AES.decrypt(str, process.env.REACT_APP_SECRET)
   return decrypt.toString(CryptoJS.enc.Utf8)
}

const generateToken = (identity, timeNumeric) => {
   const result = SHA256(identity + timeNumeric)
   // console.log("Token Generated: " + result)
   return result.toString()
}

//Used in SignUp, create new row in "tokens" table
const insertNewToken = async (identity) => {
   const { timeNumeric, timeReadable } = utils.getCurrentTime()
   const token = generateToken(identity, timeNumeric)
   // console.log("insertNewToken: " + token)

   let status = 1,
      tokenResult = "",
      message = ""

   const query = `INSERT INTO tokens (identity, token, last_request, last_request_readable) VALUES ("${identity}", "${token}", "${timeNumeric}", "${timeReadable}");`
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
const updateToken = async (identity) => {
   const { timeNumeric, timeReadable } = utils.getCurrentTime()
   const token = generateToken(identity, timeNumeric)

   //Default tokenRequest info
   let status = 1,
      tokenResult = "",
      message = ""

   const query = `UPDATE tokens SET token = "${token}", last_request = "${timeNumeric}", last_request_readable = "${timeReadable}" WHERE identity = ${identity};`
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

//Only used when normal SignUp not GoogleSignUp
router.post("/api/signup", async (req, res) => {
   console.clear()
   const { email, username, encPassword } = req.body

   let queryString = {}
   queryString.email = email
   queryString.username = username
   queryString.encPassword = encPassword
   console.log("\n===============SignUp Debugging=================")
   console.table(queryString)

   //Check User Info Validity
   // if (!checkEmail(email)) return res.json({ status: 2, message: "Invalid Email" })
   // if (!checkUsername(username)) return res.json({ status: 3, message: "Invalid Username" })

   const query = `INSERT INTO users (identity, username, password) VALUES ("${email}", "${username}", "${encPassword}");SELECT LAST_INSERT_ID();`
   utils
      .sqlPromise(query)
      .then(async (result) => {
         const tokenRequest = await insertNewToken(email)
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

//Only used when normal Login not GoogleLogin
router.post("/api/login", async (req, res) => {
   const { email, encPassword } = req.body

   let queryString = {}
   queryString.email = email
   queryString.encPassword = encPassword
   console.log("\n===============Login Debugging=================")
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
            console.log(result[0])
            dbEmail = result[0]["identity"]
            dbPassword = result[0]["password"]
            // console.log("encPassword: " + encPassword)
            // console.log("dbPassword: " + dbPassword)
            // console.log("decrypt encPassword: " + decrypt(encPassword))
            // console.log("decrypt dbPassword: " + decrypt(dbPassword))

            //Check Password
            if (decrypt(encPassword) === decrypt(dbPassword)) {
               status = 0
               message = "Login Successful"
               tokenRequest = await updateToken(dbEmail)
               userInfo = {
                  identity: result[0].identity,
                  username: result[0].username,
                  profile_img: result[0].profile_img
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
   res.json(await utils.refreshToken(req))
   // const { identity, token } = req.body
   // let status = 1,
   //    message = "Unknown Error"

   // const query = `SELECT token, last_request FROM tokens WHERE identity = "${identity}";`
   // utils
   //    .sqlPromise(query)
   //    .then(async (response) => {
   //       if (response.length === 0) {
   //          message = "Cannot find token with given identity"
   //       } else {
   //          db_token = response[0].token
   //          db_last_request = response[0].last_request
   //          //Check whether tokens match
   //          if (token === db_token) {
   //             //Check whether token is expired
   //             const currentTime = utils.getCurrentTime().timeNumeric
   //             if (currentTime - db_last_request < token_expire_time) {
   //                status = 0
   //                message = "Token Valid"
   //             } else message = "Token Expired"
   //          } else message = "Tokens don't match"
   //       }
   //       res.json({ status: status, message: message })
   //    })
   //    .catch((err) => {
   //       res.json({ status: 1, message: err.sqlMessage })
   //       console.log(err)
   //    })
})

async function verify(tokenID) {
   const ticket = await client.verifyIdToken({
      idToken: tokenID,
      audience:
         "120159497383-33l93k1jfajaoa1t1sm39qtnhmeoq9u5.apps.googleusercontent.com",
   })
   const payload = ticket.getPayload()
   const userInfo = {
      googleAcID: payload["sub"],
      username: payload["name"] + " - Google User",
      profile_img: payload["picture"],
   }
   return userInfo
}

router.post("/api/google_login", async (req, res) => {
   const { tokenID } = req.body
   let status = 1,
      userInfo = [],
      message = "Unknown Error",
      tokenRequest = ""

   await verify(tokenID)
      .then((response) => {
         userInfo = response
         message = "Google TokenID verification Successful"
      })
      .catch((err) => {
         message = "Google TokenID verification Failed"
         console.log(err)
      })

   // Try register
   if (userInfo.length !== 0) {
      const query = `INSERT INTO users (identity, username, profile_img) VALUES ("${
         userInfo.googleAcID
      }", "${userInfo.username}", "${
         userInfo.profile_img
      }");SELECT LAST_INSERT_ID();`
      await utils
         .sqlPromise(query)
         .then(async (response) => {
            tokenRequest = await insertNewToken(userInfo.googleAcID)
            if (tokenRequest.status === 0) {
               message = "User Sign Up Successful"
               status = 0
            } else message = "User Login Failed, Could Not Insert New Token"
         })
         .catch(async (err) => {
            //User already exist in database
            message = "Sign Up New User Failed, Try Login"
            tokenRequest = await updateToken(userInfo.googleAcID)
            if (tokenRequest.status === 0) {
               message = "User Login Successful"
               status = 0
            } else message = "User Login Failed, Could Not Refresh Token"
         })
   }
   res.json({ status, userInfo, message, tokenRequest })
})

module.exports = router
