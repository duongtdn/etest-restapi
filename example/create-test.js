"use strict"

require('dotenv').config()

const http = require('http')
const jwt = require('jsonwebtoken')

const ownerId = 'app-id'
console.log(`Owner ID is ${ownerId}`)

const examId = 'emb-01-final-exam'
console.log(`Exam ID is ${examId}`)

const uid = '4fc9d440-8f7a-11e9-95d5-315e185d3a06'
console.log(`User ID is ${uid}`)

const params = jwt.sign({ ownerId, examId, uid }, process.env.SHARE_AUTH_KEY)
console.log(`\nParams is ${params}\n`)

console.log('Requesting api: POST /register/exam\n')
const data = JSON.stringify({ params })

const endpoint = {
  hostname: 'localhost',
  port: 3400,
  path: '/register/exam',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}
const req = http.request(endpoint, (res) => {
  console.log(`statusCode: ${res.statusCode}`)
  res.on('data', (d) => {
    process.stdout.write(d)
  })
})
req.on('error', (error) => {
  console.error(error)
})
req.write(data)
req.end()
