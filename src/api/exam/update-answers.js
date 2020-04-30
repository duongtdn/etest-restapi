"use strict"

const jwt = require('jsonwebtoken')

function decodeSession() {
  return function(req, res, next) {
    if (req.body.session) {
      jwt.verify(req.body.session, process.env.PRIVATE_SESSION_KEY, (err, decoded) => {
        if (err) {
          res.status(403).json({ error: 'Forbidden'});
        } else {
          req.testId = decoded.testId;
          next();
        }
      })
    } else {
      res.status(400).json({error: 'Bad parameters'});
      next();
    }
  }
}

function updateAnswers(helpers) {
  return function(req, res) {
    const questions = {};
    req.body.questions.forEach( q => {
      if (q.userAnswers) {
        questions[q.index+1] = { userAnswers: q.userAnswers };
      }
    })
    helpers.Database.TEST.update(
      { testId: req.testId },
      {
        content: { questions }
      }
    )
    .then( () => {
      res.status(200).json({ message: 'ok' });
    })
    .catch(err => {
      helpers.alert && helpers.alert({
        action: 'Update Answer',
        message: 'Could not update to TEST. Database operation failed',
        error: err
      });
      res.status(500).json({ error: 'Failed to Access Database' });
    });
  }
}

module.exports = [decodeSession, updateAnswers];
