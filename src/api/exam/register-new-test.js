"use strict"

const jwt = require('jsonwebtoken')

const { now } = require('../../lib/util')

function validatepParams() {
  return function(req, res, next) {
    jwt.verify(req.body.params, process.env.SHARE_AUTH_KEY, (err, decoded) => {
      if (err) {
        res.status(400).json({ explaination: 'Bad Parameters' })
      } else {
        req.ownerId = decoded.ownerId
        req.uid = decoded.uid
        req.examId = decoded.examId
        next()
      }
    })
  }
}

function getExamStructure(helpers) {
  return function(req, res, next) {
    const examId = req.examId
    if (!examId) {
      res.status(400).json({ explaination: 'Missing exam id'})
    }
    helpers.Collections.Exams.find({ examId }, exams => {
      if (exams.length === 0) {
        res.status(404).json({ explaination: 'Exam not found' })
        return
      }
      if (exams[0].owners && exams[0].owners.indexOf(req.ownerId) !== -1) {
        req.exam = exams[0]
        next()
      } else {
        res.status(403).json({ explaination: 'Forbidden' })
        return
      }
    })
  }
}

function getQuizzes(helpers) {
  return function(req, res, next) {
    const qbankIds = req.exam.questions.map(question => {
      return question.qbankId
    })
    helpers.Collections.Qbanks.find({ qbankIds }, ['qbankId', 'questions'], quizzes => {
      if (quizzes.length > 0) {
        req.quizzes = quizzes
        next()
      } else {
        res.status(404).json({ explaination: 'No quiz found. Access to QBANKS may be failed'})
      }
    })
  }
}

function generateQuestions() {
  return function(req, res, next) {
    const questions = []
    let err = ''
    req.exam.questions.forEach(question => {
      const quiz = req.quizzes.filter( _quiz => _quiz.qbankId === question.qbankId)[0]
      // the number alternative questions of each qbank must be greater then or equal to required rand number
      // otherwise, cannot make random questions
      if (question.number > quiz.questions.length) {
        err += `QBANK: ${quiz.qbankId} have only ${quiz.questions.length} questions, but exam required ${question.number} questions. `
        return
      }
      _urand(quiz.questions.length, question.number).forEach( num => {
        questions.push({
          section: question.section,
          score: question.score,
          ...quiz.questions[num]
        })
      })
    })
    if (err.length > 0) {
      res.status(400).json ({ explaination: err })
      return
    }
    req.questions = questions
    next()
  }
}

function generateTest(helpers) {
  return function(req, res, next) {
    req.testId = 't_' + Math.random().toString(36).substr(2,9)
    req.resultId = 'r_' + Math.random().toString(36).substr(2,9)
    const test = {
      testId: req.testId,
      resultId: req.resultId,
      assignedTo: req.uid,
      examId: req.examId,
      title: req.exam.title,
      description: req.exam.description,
      duration: req.exam.duration,
      passScore: req.exam.passScore,
      content: {
        sections: req.exam.sections,
        questions: req.questions
      },
      createAt: now.timestamp()
    }
    helpers.Collections.Tests.update(test, (err) => {
      if (err) {
        res.status(500).json({ explaination: 'Write to DB failed'})
      } else {
        next()
      }
    })
  }
}

function signTokenTestId() {
  return function(req, res, next) {
    const opt = {}
    if (req.body.expiresIn) {
      opt.expiresIn = req.body.expiresIn
    }
    if (req.body.notBefore) {
      opt.notBefore = req.body.notBefore
    }
    req.singedTestId = jwt.sign({ testId: req.testId }, process.env.PRIVATE_TEST_KEY, opt)
    next()
  }
}

function response() {
  return function(req, res) {
    res.status(201).json({ testId: req.singedTestId, resultId: req.resultId })
  }
}

function _urand(length, count) {
  const barray = Array.from(new Array(length), (x,i) => i)
  const rlist = []
  for (let i = 0; i < count; i++) {
    rlist.push(barray.splice(_rand(barray.length), 1))
  }
  return rlist
}

function _rand(length) {
  return Math.floor(Math.random() * length)
}

module.exports = [validatepParams, getExamStructure, getQuizzes, generateQuestions, generateTest, signTokenTestId, response]
