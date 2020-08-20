require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const morgan = require('morgan')
const cors = require('cors')
const helmet = require('helmet')
const { NODE_ENV } = require('./config')
const articlesRouter = require('./articles/router')
const usersRouter = require('./users/router')
const commentsRouter = require('./comments/router')


const app = express()


const urlencodedParser = bodyParser.urlencoded({extended: false})

const morganOption = ( NODE_ENV === 'production')
    ? 'tiny'
    : 'common' ;

app.use(morgan(morganOption))
app.use(helmet())
app.use(cors())
app.use('/api/articles', articlesRouter)
app.use('/api/users', usersRouter)
app.use('/api/comments', commentsRouter)



module.exports = app
