'use strict'
const _ = require('lodash')
const { client } = require('../utils/lineat')
const flexText = require('../flexMessage/text')

module.exports = async ({ event }) => {
  const userId = _.get(event, 'source.userId')
  return await client.validateAndReplyMessage(event.replyToken, flexText(userId))
}
