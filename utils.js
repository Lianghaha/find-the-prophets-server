const mySqlConnection = require("./SQL-config")
const { token_expire_time } = require("./routes/auth-config")

const utilities = {
   sqlPromise(query) {
      return new Promise((resolve, reject) => {
         mySqlConnection.query(query, function (err, result) {
            if (err) {
               return reject(err)
            } else {
               resolve(result)
            }
         })
      })
   },
   getCurrentTime() {
      let d = new Date()
      let timeNumeric = d.getTime()
      let timeReadable = `${d.getFullYear()}/${
         d.getMonth() + 1
      }/${d.getDate()} @ ${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}`
      return { timeNumeric, timeReadable }
   },
   parseCookie(input) {
      if (input) {
         const str = input.split(";")
         // console.log(str)
         var result = {}
         for (var i = 0; i < str.length; i++) {
            var cur = str[i].split("=")
            result[cur[0].trim()] = cur[1]
         }
         return result
      }
      return false
   },
   async getUserById(user_id) {
      const query = `SELECT * From users WHERE user_id = ${user_id}`
      let result = []
      await this.sqlPromise(query)
         .then((response) => {
            result = response
         })
         .catch((err) => {
            result = err
         })
      return result
   },
   async getUserByIdentity(identity) {
      const query = `SELECT * From users WHERE identity = "${identity}"`
      let result = []
      await this.sqlPromise(query)
         .then((response) => {
            result = response
         })
         .catch((err) => {
            result = err
         })
      return result
   },
   //Sever passively update last_request time of an existing token if the token is not expired
   async refreshToken(req) {
      console.log("============== refreshToken ==============")
      console.log(req.headers.cookie)
      if (req.headers.cookie) {
         const { identity, token } = this.parseCookie(req.headers.cookie)
         let status = 1,
            message = "Unknown Error"

         const query = `SELECT token, last_request FROM tokens WHERE identity = "${identity}";`
         await this.sqlPromise(query)
            .then(async (response) => {
               if (response.length === 0) {
                  message = "Cannot find token with given identity"
               } else {
                  db_token = response[0].token
                  db_last_request = response[0].last_request
                  // console.log("token: " + token)
                  // console.log("db_token: " + db_token)
                  //Check whether tokens match
                  if (token === db_token) {
                     //Check whether token is expired
                     const { timeNumeric, timeReadable } = this.getCurrentTime()
                     if (timeNumeric - db_last_request < token_expire_time) {
                        message = "Token Valid, Try To Update last_request"
                        //Update last_request and last_request_redable
                        var query2 = `UPDATE tokens SET last_request = "${timeNumeric}", last_request_readable = "${timeReadable}" WHERE identity = "${identity}";`
                        await this.sqlPromise(query2)
                           .then(() => {
                              status = 0
                              message = "Token Refresh Successful"
                           })
                           .catch(() => {
                              message = "Token Redresh Failed"
                           })
                     } else message = "Token Expired"
                  } else message = "Tokens Don't Match"
               }
            })
            .catch((err) => {
               message = err.sqlMessage
            })
         console.log({ status: status, message: message })
         return { status: status, message: message }
      } else console.log("Token Not Found")
   },
}
module.exports = utilities
