"use strict"

const jwt = require('jsonwebtoken')

const { is, now, authen} = require('../../lib/util')

function decodeSession() {
  return function(req, res, next) {
    if (req.body.session) {
      jwt.verify(req.body.session, process.env.PRIVATE_SESSION_KEY, (err, decoded) => {
        if (err) {
          res.status(403).json({ explaination: 'Forbidden - Session expired'});
        } else {
          req.testId = decoded.testId;
          next();
        }
      })
    } else {
      res.status(403).json({explaination: 'Forbidden - Missing session'});
    }
  }
}

function createResult(helpers) {
  return function(req, res, next) {
    helpers.Database.TEST.find({ testId: `= ${req.testId}`}, ['examId', 'courseId', 'content', 'passScore', 'resolveMethod', 'assignedTo'])
    .then( data => {
      if (data.length === 0) {
        res.status(404).json({ error: 'Test not found' });
        return;
      }
      if (data[0].assignedTo !== req.uid) {
        res.status(403).json({ error: 'Forbidden'});
        return;
      }
      const test = data[0]
      const content = test.content;
      const result = {
        status: null,
        createdAt: now.timestamp(),
        score: {
          total: 0,
          sections: content.sections.map(section => { return { id: section.id, score: 0, points: 0} })
        }
      }
      Object.keys(content.questions).forEach( index => {
        const question = content.questions[index];
        helpers.log("\n# Scoring question " + question.problem);
        const section = result.score.sections.filter(s => s.id === question.section)[0];
        if ( __matchAnswer.call(helpers, question) ) {
          section.score += parseInt(question.score);
        }
        section.points += parseInt(question.score);
      })
      result.score.sections.forEach( section =>  result.score.total += section.score )
      if (result.score.total >= test.passScore) {
        result.status = 'passed';
        // notify that the exam has passed. it can be use for complete course action at receiver app
        helpers.onExamPassed({
          uid: req.uid,
          examId: data.examId,
          courseId: data.courseId
        });
      } else {
        result.status = 'failed';
      }
      req.result = result;
      next();
    })
    .catch(err => {
      helpers.alert && helpers.alert({
        action: 'create result',
        message: 'Could not read TEST. Database operation failed',
        error: err
      });
      res.status(500).json({ error: 'Failed to Access Database' });
    })
  }
}

function updateToDatabase(helpers) {
  return function(req, res) {
    if (req.body.finish) {
      const completedAt = now.timestamp()
      helpers.Database.TEST.set({testId: req.testId }, { completedAt, result: req.result })
      .then( () => res.status(200).json({ status: 'closed session'}))
      .catch(err => {
        helpers.alert && helpers.alert({
          action: 'update result to database',
          message: 'Could not update TEST. Database operation failed',
          error: err
        });
        res.status(500).json({ error: 'Failed to Access Database' });
      })
    } else {
      res.status(200).json({ status: 'not update'});
    }
  }
}

/* rule for correctAnswer
     1- Each answer item can be an object or a pattern(string). Array should be convert to Object {'0': 'xxx', '1': 'yyy'}
     2- For answer item that is an object, it should not nested any other object or array,
        each item of the oblect only accept pattern(string)
     3- Number is represent by a string, for example: ^250$
     4- Boolean is represent by a string, for example: ^true$
 */
function __matchAnswer({correctAnswers, userAnswers}) {
  if (!correctAnswers) {
    this.log({ error: 'No correct Answer found!!!' })
    return false
  }
  if (!userAnswers) {
    this.log('User not answer. match false')
    return false
  }
  for (let key in correctAnswers) {
    this.log(`\nMatching item: ${key}`)
    if ( !__match.call(this, correctAnswers[key], userAnswers[key]) ) {
      return false
    }
  }
  return true
}

function __match(ref, item) {
  if ( is('Object')(ref) ) {
    for (let key in ref) {
      this.log(`  Matching key: ${key}`)
      const pattern = ref[key].match(/^\/.*\//)[0].replace(/^\//,'').replace(/\/$/,'')  // str = /computer/i -> computer
      const flags = ref[key].match(/\/[^\/]*$/)[0].replace(/^\//,'')                    // str = /computer/i -> i
      const re = new RegExp(pattern,flags)
      const matched = item[key] !== undefined && re.test(item[key])
      this.log(`         ref[${key}]    = ${ref[key]}`)
      this.log(`            --> pattern = ${pattern}`)
      this.log(`            --> flags   = ${flags}`)
      this.log(`         item[${key}]   = ${item[key]}`)
      this.log(`         matched        : ${matched}`)
      if (!matched) { return false }
    }
    return true
  } else {
    const pattern = ref.match(/^\/.*\//)[0].replace(/^\//,'').replace(/\/$/,'')  // str = /computer/i -> computer
    const flags = ref.match(/\/[^\/]*$/)[0].replace(/^\//,'')                    // str = /computer/i -> i
    const re = new RegExp(pattern,flags)
    const matched = item !== undefined && re.test(item)
    this.log(`         ref            = ${ref}`)
    this.log(`            --> pattern = ${pattern}`)
    this.log(`            --> flags   = ${flags}`)
    this.log(`         item           = ${item}`)
    this.log(`         matched        : ${matched}`)
    return matched
  }
}

module.exports = [authen, decodeSession, createResult, updateToDatabase];
