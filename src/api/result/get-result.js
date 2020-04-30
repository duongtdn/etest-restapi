"use strict"

const { authen } = require('../../lib/util')

function validateParams() {
  return function(req, res, next) {
    if (req.query.r) {
      next();
    } else {
      res.status(400).json({ error: 'Bad request'});
    }
  }
}

function responseResultData(helpers) {
  return function(req, res) {
    const resultId = req.query.r
    helpers.Database.RESULT.find({ resultId: `= ${resultId}` }, ["title", "description", "startAt", "assignedTo", "result", "content"])
    .then( data => {
      if (data && data.length > 0) {
        if (data[0].assignedTo !== req.uid) {
          res.status(403).json({ error: 'Forbidden'});
        } else {
          delete data[0].assignedTo;
          res.status(200).json(data[0]);
        }
      } else {
        res.status(404).json({ error: 'Resource not found'});
      }
    })
    .catch(err => {
      helpers.alert && helpers.alert({
        action: 'get result',
        message: 'Could not read to RESULT. Database operation failed',
        error: err
      });
      res.status(500).json({ error: 'Failed to Access Database' });
    });
  }
}

module.exports = [validateParams, authen, responseResultData];
