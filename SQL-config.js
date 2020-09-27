var mysql = require("mysql")
require("dotenv").config()

var mySqlConnection = mysql.createConnection({
    host: process.env.AWS_END_POINT,
    user: "root",
    password: process.env.AWS_PW,
    database: "haha",
    multipleStatements: true
})

module.exports = mySqlConnection 