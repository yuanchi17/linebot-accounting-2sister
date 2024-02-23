const _ = require('lodash')
const { client } = require('../../utils/lineat')
const { log } = require('../../utils/helpers')
const flexText = require('../../flexMessage/text')
const fs = require('fs')
const path = require('path')

module.exports = async ({ event, req }) => {
  try {
    // 解析參數
    const [fn, ...args] = JSON.parse(_.get(event, 'postback.data', '[]'))

    if (!_.isString(fn) || !fn) return // 沒有指定的 fn
    const fnPath = path.resolve(__dirname, `${fn}.js`)
    if (!fs.existsSync(fnPath)) throw new Error(`postback：${fn}.js 不存在`) // 確認檔案存在
    try {
      await require(fnPath)({ event, req, args })
    } catch (err) {
      err.message = `postback ${fn}: ${err.message}`
      throw err
    }
  } catch (err) {
    log(err)
    return await client.replyMessage(event.replyToken, flexText(err.message))
  }
}
