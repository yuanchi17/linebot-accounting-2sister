const _ = require('lodash')
const { client } = require('../utils/lineat')
const { default: axios } = require('axios')
const { log, errToPlainObj, httpBuildQuery, getNowDate, getenv } = require('../utils/helpers')
const dayjs = require('dayjs')
const flexAddItems = require('../flexMessage/addItems')

exports.parseText = textArr => {
  const obj = {}
  let type = ''
  _.each(textArr, text => {
    if (_.includes(['收入', '支出'], text)) {
      type = text
      obj[type] = []
      return
    }

    if (!type) return
    text = text.split(' ')
    obj[type].push({
      date: getNowDate(),
      id: dayjs().unix(),
      item: text[0] || '',
      money: _.parseInt(text[1]) || 0,
      ps: text.slice(2).join(' ') || '',
    })
  })
  return obj
}

exports.sendGoogleForm = async ({ itemsObj, text }) => {
  for (const [type, items] of _.toPairs(itemsObj)) {
    for (let i = 0; i < items.length; i++) {
      let status = false
      try {
        await axios.post(`https://docs.google.com/forms/d/e/${getenv('GOOGLE_FORM_ID')}/formResponse`, httpBuildQuery({
          'entry.1149326686': items[i].id,
          'entry.1345193851': items[i].date,
          'entry.1507749764': items[i].money,
          'entry.1776025564': items[i].ps,
          'entry.843058971': items[i].item,
          'entry.1483739267': type,
          'entry.1708061059': text,
        }))
        status = true
      } catch (err) {
        log(errToPlainObj(err))
      }
      itemsObj[type][i] = {
        ...items[i],
        status,
      }
    }
  }
}

module.exports = async ({ event, req, text }) => {
  const textArr = _.compact(text.split('\n'))

  const itemsObj = exports.parseText(textArr)
  if (!itemsObj) return

  await exports.sendGoogleForm({ itemsObj, text })
  return await client.validateAndReplyMessage(event.replyToken, flexAddItems(itemsObj))
}
