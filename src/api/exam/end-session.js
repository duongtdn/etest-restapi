"use strict"

const jwt = require('jsonwebtoken')

const { is, now, authen} = require('../../lib/util')

function decodeSession() {
  return function(req, res, next) {
    if (req.body.session) {
      jwt.verify(req.body.session, process.env.PRIVATE_SESSION_KEY, (err, decoded) => {
        if (err) {
          res.status(403).json({ explaination: 'Forbidden - Session expired'})
        } else {
          req.testId = decoded.testId
          next()
        }
      })
    } else {
      res.status(403).json({explaination: 'Forbidden - Missing session'})
    }
  }
}

function createResult(helpers) {
  return function(req, res, next) {
    helpers.Collections.Tests.find({ testId: req.testId }, ['content', 'passScore', 'resolveMethod', 'assignedTo'], data => {
      if (data.length === 0) {
        res.status(404).json({ error: 'Test not found' })
        return
      }
      if (data[0].assignedTo !== req.uid) {
        res.status(403).json({ explaination: 'forbidden'})
        return
      }
      const test = data[0]
      const content = test.content
      const result = {
        status: null,
        createdAt: now.timestamp(),
        detail: {
          totalScore: 0,
          sectionScores: content.sections.map(section => { return { id: section.id, score: 0, points: 0} })
        }
      }
      content.questions.forEach(question => {
        console.log("\n# Scoring question " + question.problem)
        const section = result.detail.sectionScores.filter(s => s.id === question.section)[0]
        if ( _matchAnswer(question) ) {
          section.score += parseInt(question.score)
        }
        section.points += parseInt(question.score)
      })
      result.detail.sectionScores.forEach( section =>  result.detail.totalScore += section.score )
      result.status = result.detail.totalScore >= test.passScore ? 'passed' : 'failed'
      req.result = result
      next()
    })
  }
}

function updateToDatabase(helpers) {
  return function(req, res) {
    if (req.body.finish) {
      const completedAt = now.timestamp()
      helpers.Collections.Tests.update({testId: req.testId, completedAt, result: req.result}, err => {
        if (err) {
          res.status(500).json({ error: 'Access Database failed'})
        } else {
          res.status(200).json({ status: 'closed session'})
        }
      })
    } else {
      res.status(200).json({ status: 'not update'})
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
function _matchAnswer({correctAnswers, userAnswers}) {
  if (!correctAnswers) {
    console.log({ error: 'No correct Answer found!!!' })
    return false
  }
  if (!userAnswers) {
    console.log('User not answer. match false')
    return false
  }
  for (let key in correctAnswers) {
    console.log(`\nMatching item: ${key}`)
    if ( !_match(correctAnswers[key], userAnswers[key]) ) {
      return false
    }
  }
  return true
}

function _match(ref, item) {
  if ( is('Object')(ref) ) {
    for (let key in ref) {
      console.log(`  Matching key: ${key}`)
      const pattern = ref[key].match(/^\/.*\//)[0].replace(/^\//,'').replace(/\/$/,'')  // str = /computer/i -> computer
      const flags = ref[key].match(/\/[^\/]*$/)[0].replace(/^\//,'')                    // str = /computer/i -> i
      const re = new RegExp(pattern,flags)
      const matched = item[key] !== undefined && re.test(item[key])
      console.log(`         ref[${key}]    = ${ref[key]}`)
      console.log(`            --> pattern = ${pattern}`)
      console.log(`            --> flags   = ${flags}`)
      console.log(`         item[${key}]   = ${item[key]}`)
      console.log(`         matched        : ${matched}`)
      if (!matched) { return false }
    }
    return true
  } else {
    const pattern = ref.match(/^\/.*\//)[0].replace(/^\//,'').replace(/\/$/,'')  // str = /computer/i -> computer
    const flags = ref.match(/\/[^\/]*$/)[0].replace(/^\//,'')                    // str = /computer/i -> i
    const re = new RegExp(pattern,flags)
    const matched = item !== undefined && re.test(item)
    console.log(`         ref            = ${ref}`)
    console.log(`            --> pattern = ${pattern}`)
    console.log(`            --> flags   = ${flags}`)
    console.log(`         item           = ${item}`)
    console.log(`         matched        : ${matched}`)
    return matched
  }
}

module.exports = [authen, decodeSession, createResult, updateToDatabase]
