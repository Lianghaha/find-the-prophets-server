const mySqlConnection = require('./SQL-config')

const utilities = {
    checkAuthenticated(req, res, next) {
        if (req.isAuthenticated()) {
            return next()
        }
        req.flash("error", "Please Login First!")
        res.redirect('/login')
    },

    checkNotAuthenticated(req, res, next) {
        if (!req.isAuthenticated()) {
            return next()
        }
        req.flash("error", "Already Logged in")
        res.redirect('/camps')

    },
    sqlPromise(query) {
        return new Promise((resolve, reject) => {
            mySqlConnection.query(query, function (err, result) {
                if (err) {
                    return reject(err)
                }
                else {
                    resolve(result)
                }
            })
        })
    }
}
module.exports = utilities