const _ = require('lodash')
const { log } = require('../../utils/helpers')
const flexText = require('../../flexMessage/flexText')
const fs = require('fs')
const path = require('path')

module.exports = async ({ event, line }) => {
  try {
    // 解析參數
    const [fn, ...args] = JSON.parse(_.get(event, 'postback.data', '[]'))

    if (!_.isString(fn) || !fn) return // 沒有指定的 fn
    const fnPath = path.resolve(__dirname, `${fn}.js`)
    if (!fs.existsSync(fnPath)) throw new Error(`postback：${fn}.js 不存在`) // 確認檔案存在
    try {
      await require(fnPath)({ event, line, args })
    } catch (err) {
      err.message = `postback ${fn}: ${err.message}`
      throw err
    }
  } catch (err) {
    log(err)
    return await line.replyMessage(event.replyToken, flexText(err.message))
  }
}
