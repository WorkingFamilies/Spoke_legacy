import 'babel-polyfill'
import bodyParser from 'body-parser'
import express from 'express'
import appRenderer from './middleware/app-renderer'
import { graphqlExpress, graphiqlExpress } from 'apollo-server-express'
import { makeExecutableSchema, addMockFunctionsToSchema } from 'graphql-tools'
import { schema, resolvers } from './api/schema'
import { accessRequired } from './api/errors'
import mocks from './api/mocks'
import { createLoaders } from './models'
import passport from 'passport'
import cookieSession from 'cookie-session'
import { setupAuth0Passport } from './auth-passport'
import wrap from './wrap'
import { log } from '../lib'
import nexmo from './api/lib/nexmo'
import twilio from './api/lib/twilio'
import { seedZipCodes } from './seeds/seed-zip-codes'
import { runMigrations } from '../migrations'
import { setupUserNotificationObservers } from './notifications'
import { TwimlResponse } from 'twilio'
import { r } from './models'

process.on('uncaughtException', (ex) => {
  log.error(ex)
  process.exit(1)
})
const DEBUG = process.env.NODE_ENV === 'development'

const loginCallbacks = setupAuth0Passport()
if (!process.env.PASSPORT_STRATEGY) {
  // default to legacy Auth0 choice

} else {

}
if (!process.env.SUPPRESS_SEED_CALLS) {
  seedZipCodes()
}
if (!process.env.SUPPRESS_MIGRATIONS) {
  runMigrations()
}
setupUserNotificationObservers()
const app = express()
// Heroku requires you to use process.env.PORT
const port = process.env.DEV_APP_PORT || process.env.PORT

// Don't rate limit heroku
app.enable('trust proxy')
if (!DEBUG) {
  app.use(express.static(process.env.PUBLIC_DIR, {
    maxAge: '180 days'
  }))
}

app.use(bodyParser.json({ limit: '50mb' }))
app.use(bodyParser.urlencoded({ extended: true }))

app.use(cookieSession({
  cookie: {
    httpOnly: true,
    secure: !DEBUG,
    maxAge: null
  },
  secret: process.env.SESSION_SECRET
}))
app.use(passport.initialize())
app.use(passport.session())

app.post('/nexmo', wrap(async (req, res) => {
  try {
    const messageId = await nexmo.handleIncomingMessage(req.body)
    res.send(messageId)
  } catch (ex) {
    log.error(ex)
    res.send('done')
  }
}))

app.post('/twilio', twilio.webhook(), wrap(async (req, res) => {
  try {
    await twilio.handleIncomingMessage(req.body)
  } catch (ex) {
    log.error(ex)
  }

  const resp = new TwimlResponse()
  res.writeHead(200, { 'Content-Type': 'text/xml' })
  res.end(resp.toString())
}))

app.post('/nexmo-message-report', wrap(async (req, res) => {
  try {
    const body = req.body
    await nexmo.handleDeliveryReport(body)
  } catch (ex) {
    log.error(ex)
  }
  res.send('done')
}))

app.post('/twilio-message-report', wrap(async (req, res) => {
  try {
    const body = req.body
    await twilio.handleDeliveryReport(body)
  } catch (ex) {
    log.error(ex)
  }
  const resp = new TwimlResponse()
  res.writeHead(200, { 'Content-Type': 'text/xml' })
  res.end(resp.toString())
}))

// const accountSid = process.env.TWILIO_API_KEY
// const authToken = process.env.TWILIO_AUTH_TOKEN
// const client = require('twilio')(accountSid, authToken)
// app.get('/incomingmessages', (req, res) => {
//   client.sms.messages.list(function(err, data) {
//     const listOfMessages = data.sms_messages
//     listOfMessages.forEach(function(message){
//       if(message.direction == "inbound"){
//         return console.log(message.body)
//       }
//     })
//   })
// })

app.get('/allmessages/:organizationId', wrap(async (req, res) => {
  const orgId = req.params.organizationId
  const { limit, offset, minTimestamp } = req.query
  await accessRequired(req.user, orgId, 'SUPERVOLUNTEER', /* superadmin*/true)

  const messages = await r.knex('message')
    .select(
      'message.id',
      'message.text',
      'user.first_name AS user_first_name',
      'user.last_name AS user_last_name',
      'user.cell AS user_number',
      'campaign_contact.first_name AS contact_first_name',
      'campaign_contact.last_name AS contact_last_name',
      'message.contact_number',
      'message.created_at',
      'message.is_from_contact'
    )
    .join('assignment', 'message.assignment_id', 'assignment.id')
    .join('user', 'user.id', 'assignment.user_id')
    .join('campaign', 'assignment.campaign_id', 'campaign.id')
    .join('campaign_contact', 'campaign_contact.cell', 'message.contact_number')
    .where('campaign.organization_id', orgId)
    .andWhere('message.created_at', '>=', minTimestamp || '1970-01-01')
    .limit(limit || 500)
    .offset(offset || 0)
    .orderBy('message.created_at', 'desc')
  return res.json(messages)
}))

app.get('/logout-callback', (req, res) => {
  req.logOut()
  res.redirect('/')
})

if (loginCallbacks) {
  app.get('/login-callback', ...loginCallbacks)
}

const executableSchema = makeExecutableSchema({
  typeDefs: schema,
  resolvers,
  allowUndefinedInResolve: false
})
addMockFunctionsToSchema({
  schema: executableSchema,
  mocks,
  preserveResolvers: true
})

app.use('/graphql', graphqlExpress((request) => ({
  schema: executableSchema,
  context: {
    loaders: createLoaders(),
    user: request.user
  }
})))
app.get('/graphiql', graphiqlExpress({
  endpointURL: '/graphql'
}))


// This middleware should be last. Return the React app only if no other route is hit.
app.use(appRenderer)


if (port) {
  app.listen(port, () => {
    log.info(`Node app is running on port ${port}`)
  })
}

export default app
