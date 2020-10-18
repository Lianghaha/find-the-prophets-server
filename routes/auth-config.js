const token_expire_time = 15 * 1000

module.exports = {
   token_expire_time,
}

//encrypt和decrypt以及generate以禁用
//Heroku 已push
//已简单测试Auth
//TODO
//Auth问题不大，再玩一会看看会不会出Bug，之后就琢磨更改encrypt decrypt
//Bug Logout的时候，cookie没清空