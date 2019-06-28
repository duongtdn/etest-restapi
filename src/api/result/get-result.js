"use strict"

const { authen } = require('../../lib/util')

function validateParams() {
  return function(req, res, next) {
    if (req.query.r) {
      next()
      return
    }
    res.status(400).json({ explaination: 'invalid query'})
  }
}

function responseResultData(helpers) {
  return function(req, res) {
    const resultId = req.query.r
    helpers.Collections.Tests.find({ resultId }, ["resultId", "title", "description", "startAt", "assignedTo", "result", "content.sections"], (data) => {
      if (data && data.length > 0) {
        if (data[0].assignedTo !== req.uid) {
          res.status(403).json({ explaination: 'forbidden'})
        } else {
          delete data[0].assignedTo
          res.status(200).json({data: data[0]})
        }
      } else {
        res.status(404).json({ explaination: 'not found'})
      }
    })
  }
}

module.exports = [validateParams, authen, responseResultData]
