"use strict"

const jwt = require('jsonwebtoken')

const { now, authen } = require('../../lib/util')

function validateAttachedSession() {
  return function(req, res, next) {
    if (req.body.session) {
      jwt.verify(req.body.session, process.env.PRIVATE_SESSION_KEY, (err, decoded) => {
        if (err) {
          res.status(404).json({ error: 'Session is invalid or expired'});
        } else {
          req.session = decoded.session;
          next();
        }
      });
    } else {
      next();
    }
  }
}

function getTestData(helpers) {
  return function(req, res, next) {
    if (!req.body.testId) {
      res.status(400).json({ error: 'Missing test Id' });
      return;
    }
    jwt.verify(req.body.testId, process.env.PRIVATE_TEST_KEY, (err, decoded) => {
      if (err) {
        res.status(404).json({ error: 'Invalid Test or Test has been expired'});
        return;
      }
      req.testId = decoded.testId;
      helpers.Database.TEST.find({ testId: `= ${req.testId}`})
      .then( data => {
        if (data.length > 0) {
          req.testData = data[0];
          if (req.testData.assignedTo !== req.uid) {
            res.status(403).json({ error:'Forbidden' });
            return;
          }
          if (req.testData.completedAt) {
            res.status(404).json({ error: 'Test has been finished'});
            return;
          }
          next();
        } else {
          res.status(404).json({ error:'Test not found' });
        }
      })
      .catch(err => {
        helpers.alert && helpers.alert({
          action: 'GET Test Data',
          message: 'Could not read TEST. Database operation failed',
          error: err
        });
        res.status(500).json({ error: 'Failed to Access Database' });
      })
    })
  }
}

function validateStoredSession() {
  return function(req, res, next) {
    if (req.testData.session) {
      if (req.body.session && req.body.session === req.testData.session) {
        next();
      } else {
        res.status(404).json({ error: 'Session mismatch'});
      }
    } else {
      next();
    }
  }
}

function signSessionToken(helpers) {
  return function(req, res, next) {
    if (req.testData.session) {
      next();
    } else {
      const testId = req.testId;
      const token = jwt.sign({ testId }, process.env.PRIVATE_SESSION_KEY, {expiresIn: `${req.testData.duration + 5}m`});
      req.testData.session = token;
      req.testData.startAt = now.timestamp();
      helpers.Database.TEST.update({ testId }, {session: token, startAt: req.testData.startAt})
      .then(() => next())
      .catch(err => {
        helpers.alert && helpers.alert({
          action: 'UPDATE Session to Test table',
          message: 'Could not write to TEST. Database operation failed',
          error: err
        });
        res.status(500).json({ error: 'Failed to create session' });
      });
    }
  }
}

function serializeTestContent() {
  return function(req, res, next) {
    const content = req.testData.content;
    const length = Object.keys(content.questions).length;
    const questions = [];
    for (let i = 0; i < length; i++) {
      const q = content.questions[i+1];
      questions.push({
        problem: q.problem,
        score: q.score,
        section: q.section,
      });
    }
    content.questions = questions;
    next();
  }
}

function response() {
  return function (req, res) {
    const data = {
      title: req.testData.title,
      description: req.testData.description,
      content: req.testData.content,
      session: req.testData.session,
      duration: req.testData.duration,
      startAt: req.testData.startAt,
      resultId: req.testData.resultId
    }
    res.status(201).json(data);
  }
}

module.exports = [authen, validateAttachedSession, getTestData, validateStoredSession, signSessionToken, serializeTestContent, response];
