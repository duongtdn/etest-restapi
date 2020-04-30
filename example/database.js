"use strict"

const fs = require('fs')

const Tests = [
  {
    testId: 'test-01',
    resultId: 'r-test-01',
    assignedTo: '4fc9d440-8f7a-11e9-95d5-315e185d3a06', //awesome@team.com
    examId: 'emb-01-final-exam',
    title: 'Embedded - 01: Final Exam',
    description: 'Final Test for course Embedded - 01',
    createAt: (() => new Date())().getTime(),
    duration: 30,
    // session: 'session',
    content: {
      sections: [
        {id: 'sc1', title: 'Section 1', description: 'Here is the section 1'},
        {id: 'sc2', title: 'Section 2', description: 'Here is the section 2'}
      ],
      questions: [
        {
          problem: 'choice-0.0', correctAnswers: {'$1': '/^false$/i', '$2': '/^true$/i', '$3': '/^false$/i'}, score: 10, section: 'sc1'
        },
        {
          problem: 'dragdrop-0.0', correctAnswers: {'$1': {top: '/^310$/', left: '/^20$/'}, '$2': {top: '/^160$/', left: '/^30$/'}, '$3': {top: '/^70$/', left: '/^510$/'}}, score: 10, section: 'sc1'
        },
        {
          problem: 'dragdrop-0.1', correctAnswers: {'$1': {top: '/^310$/', left: '/^20$/'}, '$2': {top: '/^160$/', left: '/^30$/'}, '$3': {top: '/^70$/', left: '/^510$/'}}, score: 10, section: 'sc1'
        },
        {
          problem: 'text-0.1', correctAnswers: {'$1': '/^computer$/i', '$2': '/^2005$/i'}, score: 10, section: 'sc2'
        },
      ]
    },
    passScore: 30,
    startAt: 1559894402883,
    result: {
      "status":"passed",
      "createdAt":1559894402883,
      "detail":{
        "totalScore":20,
        "sectionScores":[
          {"id":"sc1","score":20, "points":30},
          {"id":"sc2","score":0, "points":30}
        ]
      }
    }
  }
]

const Exams = [
  {
    "examId": "c-01-f",
    "title": "Final Test",
    "description": "This exam test your knowledge and skill after course Embedded ARM Programming for Beginner",
    "sections": [
      {"id": "sc1", "title": "Section 1", "description": "Section 1 composed 10 quizzes about Text"},
      {"id": "sc2", "title": "Section 2", "description": "Section 1 composed 10 quizzes about Choice"},
      {"id": "sc3", "title": "Section 3", "description": "Section 3 composed 5 quizzes about DragDrop"}
    ],
    "questions": [
      {"qbankId": "_qtxt_0_", "number": 6, "score": 10, "section": "sc1"},
      {"qbankId": "_qtxt_1_", "number": 4, "score": 10, "section": "sc1"},
      {"qbankId": "_qmch_0_", "number": 6, "score": 10, "section": "sc2"},
      {"qbankId": "_qmch_1_", "number": 4, "score": 10, "section": "sc2"},
      {"qbankId": "_qdrd_0_", "number": 5, "score": 10, "section": "sc3"}
    ],
    "duration": 30,
    "passScore": 200,
    "owners": ["app-id"]
  }
]

// Get Qbanks
const Qbanks =  JSON.parse(fs.readFileSync('example/quizzes/qbanks.json',  'utf8'))
console.log('Found QBANKS')
console.log(`Found ${Qbanks.length} records in Qbanks\n`)
for (let i = 0; i < Qbanks.length; i++) {
  const qbank = Qbanks[i]
  console.log(`+ qbankId: ${qbank.qbankId} / ${qbank.title}`)
  console.log(`  ${qbank.questions.length} quizzes\n`)
}
console.log('')
const json = JSON.stringify(Qbanks,null,4)
fs.writeFileSync('example/Qbanks.json', json)
console.log('Qbanks were written to example/Qbanks.json')

module.exports = {
    Tests: {
      find({ testId, resultId }, projection, done) {
        if ({}.toString.call(projection) === '[object Function]') {
          done= projection
        }
        setTimeout(() => {
          const data = Tests.filter( _test => _test.testId === testId || _test.resultId === resultId )
          if (data.length > 0) {
            let test = {}
            if ({}.toString.call(projection) === '[object Array]') {
              projection.forEach( prop => {
                const p = prop.split(".")
                if (p.length === 1) {
                  const k = p[0]
                  test[k] = data[0][k]
                } else {
                  const k = p[0]
                  const l = p[1]
                  if (!test[k]) { test[k] = {} }
                  test[k][l] = data[0][k][l]
                }
              })
            } else {
              test = {...data[0]}
            }
            done && done([test])
          } else {
            done && done([])
          }
        }, 500)
        return this
      },
      update({ testId, ...props }, done) {
        setTimeout(() => {
          let updated = false
          Tests.forEach(test => {
            if (test.testId === testId) {
              for (let key in props) {
                if (typeof props[key] === 'object' && !!props[key]) {
                  // nested object
                  test[key] = {...test[key], ...props[key]}
                } else {
                  test[key] = props[key]
                }
              }
              updated = true
            }
          })
          if (!updated) {
            Tests.push({ testId, ...props })
          }
          done && done(null, props)
        }, 500)
        return this
      },
      updateUserAnswers({ testId, questions }, done) {
        setTimeout(() => {
          Tests.forEach(test => {
            if (test.testId === testId) {
              questions.forEach( q => {
                const question = test.content.questions[q.index]
                question.userAnswers = q.userAnswers
              })
            }
          })
          done && done(null)
        },500)
      }
    },
    Exams: {
      find({ examId }, done) {
        setTimeout(() => {
          done && done(Exams.filter( _exam => _exam.examId === examId))
        }, 500)
        return this
      }
    },
    Qbanks: {
      find({qbankIds}, projection, done) {
        if ({}.toString.call(projection) === '[object Function]') {
          done= projection
        }
        setTimeout(() => {
          const data = Qbanks.filter( _qt => qbankIds.indexOf(_qt.qbankId) !== -1 )
          if (data.length === 0) {
            done && done([])
            return
          }
          const quizzes = data.map( _data => {
            if ({}.toString.call(projection) === '[object Array]') {
              const quiz = {}
              projection.forEach( prop => {
                const p = prop.split(".")
                if (p.length === 1) {
                  const k = p[0]
                  quiz[k] =_data[k]
                } else {
                  const k = p[0]
                  const l = p[1]
                  if (!quiz[k]) { quiz[k] = {} }
                  quiz[k][l] = _data[k][l]
                }
              })
              return {...quiz}
            } else {
              return {..._data}
            }
          })
          done && done(quizzes)
        }, 500)
        return this
      }
    }
  }

