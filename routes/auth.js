const express = require("express")
const router = express.Router()
const utilities = require("../utilities")
const CryptoJS = require("crypto-js")

//Can decrypt both String and Object
const decrypt = (Base64Data) => {
   //Base64 processing is required to clear "malformed utf-8 data" error
   let deBase64Data = CryptoJS.enc.Base64.parse(Base64Data).toString(
      CryptoJS.enc.Utf8
   )
   let decryptedData = CryptoJS.AES.decrypt(
      deBase64Data,
      process.env.SECRET
   ).toString(CryptoJS.enc.Utf8)
   let deJSONData = JSON.parse(decryptedData)
   return deJSONData
}

const generateToken = (dataObject) => {
   let JSONData = JSON.stringify(dataObject)
   let encryptedData = CryptoJS.AES.encrypt(
      JSONData,
      process.env.SECRET
   ).toString()
   //Base64 processing is required to clear "malformed utf-8 data" error
   let Base64Data = CryptoJS.enc.Base64.stringify(
      CryptoJS.enc.Utf8.parse(encryptedData)
   )
   return Base64Data
}

const getCurrentTime = () => {
   let d = new Date()
   let timeNumeric = d.getTime()
   let timeReadable = `${d.getFullYear()}/${
      d.getMonth() + 1
   }/${d.getDate()} @ ${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}`
   return { timeNumeric, timeReadable }
}

const postNewToken = async (user_id, email) => {
   const { timeNumeric, timeReadable } = getCurrentTime()
   const token = generateToken([user_id, email, timeNumeric])

   var query = `INSERT INTO tokens (user_id, identity, token, last_request, last_request_readable) VALUES ("${user_id}", "${email}", "${token}", "${timeNumeric}", "${timeReadable}");`
   //    console.log(`Post New Token: Query: \n ${query} \n`)

   let postTokenStatus = "fail"
   let tokenResult = "Post New Token Failed"

   await utilities
      .sqlPromise(query)
      .then(() => {
         postTokenStatus = "success"
         tokenResult = token
      })
      .catch((err) => {
         console.log(err)
      })
   return { status: postTokenStatus, result: tokenResult }
}

const refreshToken = async (user_id, email) => {
   const { timeNumeric, timeReadable } = getCurrentTime()
   const token = generateToken([user_id, email, timeNumeric])

   var query = `UPDATE tokens SET token = "${token}", last_request = "${timeNumeric}", last_request_readable = "${timeReadable}" WHERE user_id = ${user_id};`
   console.log(query)

   //Default tokenRequest info
   let refreshTokenStatus = "fail"
   let tokenResult = "Refresh Token Failed"

   await utilities
      .sqlPromise(query)
      .then((result) => {
         if (result.affectedRows) {
            console.log("Refresh Token Succeed")
            refreshTokenStatus = "success"
            tokenResult = token
         } else {
            tokenResult += ": 0 row or more than 1 row changed"
         }
      })
      .catch((err) => {
         console.log(err)
      })
   return { status: refreshTokenStatus, result: tokenResult }
}

router.post("/api/signup", async (req, res) => {
   const { email, username, AESpassword } = req.query

   let queryString = {}
   queryString.email = email
   queryString.username = username
   queryString.password = decrypt(AESpassword)
   console.log("\n================================ Register Debugging ")
   console.table(queryString)
   var query = `INSERT INTO users (identity, username, password) VALUES ("${email}", "${username}", "${AESpassword}");SELECT LAST_INSERT_ID();`
   // console.log(`Prophets query: \n ${query} \n`)
   utilities
      .sqlPromise(query)
      .then(async (result) => {
         const user_id = result[0].insertId
         const tokenRequest = await postNewToken(user_id, email)
         res.json({
            status: "success",
            message: "Register User Successful",
            tokenRequest: tokenRequest,
         })
      })
      .catch((err) => {
         res.json({ status: "fail", message: "Register User Failed", err })
         console.log(err)
      })
})


router.post("/api/login", async (req, res) => {
   const { email, AESpassword } = req.query

   let queryString = {}
   queryString.email = email
   queryString.password = decrypt(AESpassword)
   console.log("\n================================ Login Debugging ")
   console.table(queryString)

   var query = `SELECT * FROM users WHERE identity = "${email}";`
   // console.log(`Prophets query: \n ${query} \n`)
   utilities
      .sqlPromise(query)
      .then(async (result) => {
         let status = "fail",
            message = "Login Failed",
            tokenRequest = ""
         //Check whether SQL return empty list
         //Which means Username doesn't exist
         if (result[0]) {
            dbUser_id = result[0]["user_id"]
            dbEmail = result[0]["email"]
            dbPassword = result[0]["password"]
            //Check Password
            if (decrypt(AESpassword) === decrypt(dbPassword)) {
               status = "success"
               message = "Login Successful"
               tokenRequest = await refreshToken(dbUser_id, dbEmail)
            } else {
               message += ", password Incorrect"
            }
         } else {
            message += ", email doesn't exist"
         }
         res.json({
            status: status,
            message: message,
            tokenRequest: tokenRequest,
         })
      })
      .catch((err) => {
         console.log(err)
         res.json({
            status: "fail",
            message: "Login Failed, database error",
            err,
         })
      })
})

router.get("/api/test", async (req, res) => {
   //    res.send({ tokenRequest: await refreshToken() })
})

module.exports = router
