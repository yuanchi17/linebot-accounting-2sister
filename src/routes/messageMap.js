const _ = require('lodash')
const accountingService = require('../services/accounting')

/**
 * 關鍵字處理的函式，訊息必須完全相同才處理
 */
const keywordHandlers = {}

keywordHandlers['/lineId'] = require('../services/lineId')

module.exports = async ({ event, req }) => {
  const text = _.trim(event.message.text)
  if (keywordHandlers[text]) return await keywordHandlers[text]({ event, req })

  if (_.includes(text, '支出') || _.includes(text, '收入')) return await accountingService({ event, req, text })
}
