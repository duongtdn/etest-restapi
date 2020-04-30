# exam-api-core

## Install

`npm install exam-api-core`

### Create API Server

Example code below demonstrate how to create a server using exam-app

```javascript
" use strict"

// get the api
const api = require('exam-app')

// add database driver into helpers
api.helpers({ Collections: require('./database-driver') })

// create server using api
const express = require('express')
const app = express()

app.use('/', api.generate())

const PORT = 3400
app.listen(PORT, (err) => {
  if (err) {
    console.log('Failed to start API Server')
  } else {
    console.log(`EXAM: API Server is running at port ${PORT}`)
  }
})

```

### Configure enviroment parameter

The following `environment parameter` must be set

```
PRIVATE_AUTH_KEY=key-to-authen-realm-with-account-server
PRIVATE_SESSION_KEY=key-to-encode-session
PRIVATE_TEST_KEY=key-to-encode-test
APP_SHARE_KEY=share-auth-key-between-apps-to-allow-api-invoke
```
