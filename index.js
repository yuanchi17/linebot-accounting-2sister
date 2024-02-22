require('dotenv').config()

const _ = require('lodash')
const { client } = require('./src/utils/lineat')
const { log } = require('./src/utils/helpers')
const functions = require('@google-cloud/functions-framework')

const handleEvent = async ctx => {
  const { event, req } = ctx
  const lineId = _.get(event, 'source.userId')
  if (!lineId) return
  try { // 封鎖好友會抓不到
    await client.getProfile(event.source.userId)
  } catch (err) {
    log(`無法從 LINE 取得使用者資料, lineId = ${lineId}`)
  }

  switch (event.type) {
    case 'message':
      if (event.message.type === 'text') return await require('./src/routes/messageMap')({ event, req })
      // return client.replyMessage(event.replyToken, require('./src/flexMessage/notFound')())
      break
    case 'postback':
      return await require('./src/routes/postback')({ event, req })
    default:
      break
  }
}

functions.http('main', async (req, res) => {
  try {
    const ctx = { req }

    // 處理 events
    const events = _.get(req, 'body.events', [])
    await Promise.all(_.map(events, event => handleEvent({ ...ctx, event })))
    res.status(200).send('OK')
  } catch (err) {
    log('ERROR', err)
    res.status(err.status || 500).send(err.message)
  }
})
