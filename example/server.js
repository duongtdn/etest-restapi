" use strict"

require('dotenv').config()

const api = require('../src/api/main')

// helpers database driver
const DatabaseHelper = require('@realmjs/dynamodb-helper')
const aws = { region: process.env.REGION, endpoint: process.env.ENDPOINT }
if (process.env.PROXY) {
  console.log('# User proxy-agent')
  process.env.NODE_TLS_REJECT_UNAUTHORIZED= '0'
  const proxy = require('proxy-agent')
  aws.httpOptions = { agent: proxy(process.env.PROXY) }
}
const dbh = new DatabaseHelper({ aws, measureExecutionTime: true })
dbh.addTable([{ table: 'TEST', indexes: ['RESULT']}, 'EXAM', 'QBANK'])
api.helpers({ Database: dbh.drivers})

api.helpers({
  onExamPassed({uid, examId}) {
    console.log(`exam has passed`)
  }
})

api.helpers({
  alert({message, action, error}) {
    console.log(`\nALERT: -----------------------------------------------------------`)
    console.log(`--> by action: ${action}`)
    console.log(`--> ${message}`)
    console.log(error)
    console.log(`------------------------------------------------------------------`)
  },
  log(msg) {
    if (process.env.MODE && process.env.MODE.toLowerCase() === 'development') {
      console.log(msg)
    }
  }
})

const express = require('express')
const app = express()

app.use('/', (req,res,next) => { console.log(`${req.method.toUpperCase()} request to: ${req.path}`); next() }, api.generate())

const path = require('path')
app.use('/assets', express.static(path.join(__dirname, '../build')))
app.use('/quizzes', (req, res, next) => setTimeout(next, 0), express.static(path.join(__dirname, 'quizzes')))

// hack to gen token for register test, for example only
// curl localhost:3410/gen
// curl localhost:3410/register/exam -H "Content-Type: application/json" -d '{"params":"token"}'  -X POST
const jwt = require('jsonwebtoken');
app.use('/gen', (req, res) => {
  const uid = '220f71d0-2800-11ea-91a8-9f528720b885';
  const courseId = 'c-01';
  const examId = 'c-01-f';
  const token = jwt.sign({uid, examId, courseId}, process.env.APP_SHARE_KEY);
  res.status(200).send(token + '\n');
})

const PORT = 3410
app.listen(PORT, (err) => {
  if (err) {
    console.log('Failed to start API Server')
  } else {
    console.log(`EXAM: API Server is running at port ${PORT}`)
  }
})
