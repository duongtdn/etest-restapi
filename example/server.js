" use strict"

require('dotenv').config()

const api = require('../src/api/main')

api.helpers({ Collections: require('./database') })

const express = require('express')
const app = express()

const path = require('path')
app.use('/assets', express.static(path.join(__dirname, '../build')))
app.use('/quizzes', (req, res, next) => setTimeout(next, 1000), express.static(path.join(__dirname, 'quizzes')))

app.use('/', api.generate())

const PORT = 3400
app.listen(PORT, (err) => {
  if (err) {
    console.log('Failed to start API Server')
  } else {
    console.log(`EXAM: API Server is running at port ${PORT}`)
  }
})
