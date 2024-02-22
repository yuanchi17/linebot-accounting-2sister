const _ = require('lodash')
const { getenv, log, errToPlainObj } = require('./helpers')
const axios = require('axios')
const line = require('@line/bot-sdk')

const config = {
  channelId: getenv('LINE_CHANNEL_ID'),
  channelSecret: getenv('LINE_CHANNEL_SECRET'),
  channelAccessToken: getenv('LINE_CHANNEL_ACCESSTOKEN'),
}

const client = new line.messagingApi.MessagingApiClient(config)

// 為了方便除錯
_.each(['pushMessage', 'replyMessage', 'multicast'], fn => {
  client[`${fn}Orig`] = client[fn]
  client[fn] = async (...args) => {
    try {
      // console.log('%j', args)
      return await client[`${fn}Orig`](...args)
    } catch (err) {
      throw _.set(err, 'args', args)
    }
  }
})

client.validateAndReplyMessage = async (replyToken, msgs) => {
  await client.validateMessage(msgs)
  await client.replyMessage({ replyToken, messages: _.castArray(msgs) })
}

client.validateMessage = async msgs => {
  try {
    msgs = _.castArray(msgs)
    return await axios.post('https://api.line.me/v2/bot/message/validate/reply', { messages: msgs }, {
      headers: {
        Authorization: `Bearer ${config.channelAccessToken}`,
      },
    })
  } catch (err) {
    log('validateMessage: %j', errToPlainObj(err))
    const data = err?.response?.data
    err.message = data?.details.length
      ? `${data.message}\n${_.map(data.details, detail => `${detail.property}: ${detail.message}`).join('\n')}`
      : err.message
    throw err
  }
}

module.exports = {
  line,
  client,
  middleware: line.middleware(config),
}
