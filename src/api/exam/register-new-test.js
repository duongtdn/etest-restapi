"use strict"

const jwt = require('jsonwebtoken')

const { now, ustring } = require('../../lib/util')

function validatepParams() {
  return function(req, res, next) {
    jwt.verify(req.body.params, process.env.APP_SHARE_KEY, (err, decoded) => {
      if (err) {
        res.status(400).json({ error: 'Bad Parameters' });
      } else {
        // req.ownerId = decoded.ownerId;
        req.uid = decoded.uid;
        req.examId = decoded.examId;
        req.courseId = decoded.courseId;
        next();
      }
    })
  }
}

function getExamStructure(helpers) {
  return function(req, res, next) {
    const examId = req.examId;
    if (!examId) {
      res.status(400).json({ error: 'Bad Parameters'});
    }
    helpers.Database.EXAM.find({ examId: `= ${examId}`})
    .then (exams => {
      if (exams.length === 0) {
        res.status(404).json({ error: 'Exam not found' });
        return;
      }
      // if (exams[0].owners && exams[0].owners.indexOf(req.ownerId) !== -1) {
      //   req.exam = exams[0]
      //   next()
      // } else {
      //   res.status(403).json({ error: 'Forbidden' })
      // }
      req.exam = exams[0];
      next();
    })
    .catch(err => {
      helpers.alert && helpers.alert({
        message: 'Could not read EXAM. Database operation failed',
        error: err
      });
      res.status(500).json({ error: 'Failed to Access Database' });
    })
  }
}

function getQuizzes(helpers) {
  return function(req, res, next) {
    const qbankIds = req.exam.questions.map(question => {
      return { qbankId: question.qbankId };
    })
    helpers.Database.batchGet({
      QBANK: {
        keys: qbankIds,
        projection: ['qbankId', 'questions']
      }
    })
    .then( data => {
      if (data && data.QBANK && data.QBANK.length > 0) {
        req.quizzes = data.QBANK;
        next();
      } else {
        res.status(404).json({ error: 'No Quest found'});
      }
    })
    .catch(err => {
      helpers.alert && helpers.alert({
        message: 'Could not batchGet QBANK. Database operation failed',
        error: err
      });
      res.status(500).json({ error: 'Failed to Access Database' });
    })
  }
}

function generateQuestions() {
  return function(req, res, next) {
    const questions = {};
    let index = 0;
    let err = '';
    req.exam.questions.forEach(question => {
      const quiz = req.quizzes.filter( _quiz => _quiz.qbankId === question.qbankId)[0]
      // the number alternative questions of each qbank must be greater then or equal to required rand number
      // otherwise, cannot make random questions
      if (question.number > quiz.questions.length) {
        err += `QBANK: ${quiz.qbankId} have only ${quiz.questions.length} questions, but exam required ${question.number} questions. `;
        return;
      }
      __urand(quiz.questions.length, question.number).forEach( num => {
        index++;
        questions[index] = {
          section: question.section,
          score: question.score,
          userAnswers: {},
          ...quiz.questions[num]
        };
      });
    })
    if (err.length > 0) {
      res.status(400).json ({ explaination: err });
      return;
    }
    req.questions = questions;
    next();
  }
}

function generateTest(helpers) {
  return function(req, res, next) {
    req.testId = 't_' + ustring(9);
    req.resultId = 'r_' + ustring(9);
    const test = {
      testId: req.testId,
      resultId: req.resultId,
      assignedTo: req.uid,
      examId: req.examId,
      courseId: req.courseId,
      title: req.exam.title,
      description: req.exam.description,
      duration: req.exam.duration,
      passScore: req.exam.passScore,
      content: {
        sections: req.exam.sections,
        questions: req.questions,
      },
      createAt: now.timestamp(),
    };
    helpers.Database.TEST.insert(test)
    .then(() => next())
    .catch(err => {
      helpers.alert && helpers.alert({
        message: 'Could not insert to TEST. Database operation failed',
        error: err
      });
      res.status(500).json({ error: 'Failed to Access Database' });
    });
  }
}

function signTokenTestId() {
  return function(req, res, next) {
    const opt = {}
    if (req.body.expiresIn) {
      opt.expiresIn = req.body.expiresIn;
    }
    if (req.body.notBefore) {
      opt.notBefore = req.body.notBefore;
    }
    req.signedTestId = jwt.sign({ testId: req.testId }, process.env.PRIVATE_TEST_KEY, opt);
    next();
  }
}

function response() {
  return function(req, res) {
    res.status(201).json({ testId: req.signedTestId, resultId: req.resultId });
  }
}

function __urand(length, count) {
  const barray = Array.from(new Array(length), (x,i) => i);
  const rlist = [];
  for (let i = 0; i < count; i++) {
    rlist.push(barray.splice(__rand(barray.length), 1));
  }
  return rlist;
}

function __rand(length) {
  return Math.floor(Math.random() * length);
}

module.exports = [validatepParams, getExamStructure, getQuizzes, generateQuestions, generateTest, signTokenTestId, response];
