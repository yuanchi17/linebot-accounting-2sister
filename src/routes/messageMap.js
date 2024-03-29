const _ = require('lodash')
const { client } = require('../utils/lineat')
const AccountingService = require('../services/accounting')

/**
 * 關鍵字處理的函式，訊息必須完全相同才處理
 */
const keywordHandlers = {}

keywordHandlers['/lineId'] = require('../services/lineId')

module.exports = async ({ event, req }) => {
  const text = _.trim(event.message.text)
  if (keywordHandlers[text]) return await keywordHandlers[text]({ event, req })

  if (_.includes(text, '支出') || _.includes(text, '收入')) return await AccountingService.main({ event, req, text })

  if (text === '二姐記帳使用說明') return await client.validateAndReplyMessage(event.replyToken, require('../flexMessage/intro')())
}
