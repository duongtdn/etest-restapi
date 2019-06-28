"use strict"

const Builder = require('express-api-builder')

const api = Builder()

api.add('/exam/session', {
  post: require('./exam/new-session'),
  put: require('./exam/end-session')
})

api.add('/register/exam', {
  post: require('./exam/register-new-test')
})

api.add ('/exam/solution', {
  put: require('./exam/update-answers')
})

api.add ('/result', {
  get: require('./result/get-result.js')
})

module.exports = api
