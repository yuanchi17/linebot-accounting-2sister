'use strict'
const _ = require('lodash')
const flexText = require('../flexMessage/flexText')

module.exports = async ({ event }) => {
  const userId = _.get(event, 'source.userId')
  return await client.validateAndReplyMessage(event.replyToken, flexText(userId))
}
