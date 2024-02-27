const _ = require('lodash')
const { client } = require('../utils/lineat')
const { default: axios } = require('axios')
const { log, errToPlainObj, httpBuildQuery, getNowDate, getenv, getFormDataNoCache } = require('../utils/helpers')
const dayjs = require('dayjs')
const flexAddItems = require('../flexMessage/addItems')
const flexCheckSameItems = require('../flexMessage/checkCoverItems')
const flexText = require('../flexMessage/text')

exports.getAccountDatas = async () => {
  return _.map(await getFormDataNoCache(getenv('ACCOUNTING_CSV')), data => ({
    ...data,
    coverId: data?.coverId || '',
    money: _.parseInt(data.money),
  }))
}

exports.parseText = textArr => {
  const obj = {}
  let type = ''
  _.each(textArr, (text, index) => {
    if (_.includes(['收入', '支出'], text)) {
      type = text
      obj[type] = []
      return
    }

    if (!type) return
    text = text.split(' ')
    obj[type].push({
      date: getNowDate(),
      id: `${dayjs().unix()}${_.padStart(index, 2, 0)}`,
      money: _.parseInt(text[1]) || 0,
      ps: text.slice(2).join(' ') || '',
      title: text[0] || '',
    })
  })
  return obj
}

exports.checkSameDatas = async itemsObj => {
  // 取得當日的資料，並由新到舊排序
  const oldDatas = _.orderBy(_.filter(await exports.getAccountDatas(), ['date', getNowDate()]), 'id', 'desc')
  // 若當日無舊資料，則不需核對是否有重複
  if (!oldDatas.length) return

  const sameTitleAndMoneyIds = []
  let hasSameData = false
  for (const [type, items] of _.toPairs(itemsObj)) {
    for (let i = 0; i < items.length; i++) {
      // 如果有相同標題，跟使用者確認是否需要覆蓋資料
      const sameData = _.find(oldDatas, ['title', items[i].title])
      if (!sameData) continue
      if (items[i].money === sameData.money) {
        sameTitleAndMoneyIds.push(items[i].id)
        continue
      }
      hasSameData = true
      itemsObj[type][i] = {
        ...items[i],
        sameData,
      }
    }
  }

  // 若標題及金額皆相同，則移除
  if (sameTitleAndMoneyIds.length) {
    _.remove(itemsObj['支出'], i => _.includes(sameTitleAndMoneyIds, i.id))
    _.remove(itemsObj['收入'], i => _.includes(sameTitleAndMoneyIds, i.id))
  }
  return hasSameData
}

exports.sendGoogleForm = async ({ event, itemsObj, text }) => {
  for (const [type, items] of _.toPairs(itemsObj)) {
    for (let i = 0; i < items.length; i++) {
      let status = false
      try {
        const params = {}
        params[`entry.${getenv('ACCOUNTING_ITEM_ID')}`] = items[i].id
        params[`entry.${getenv('ACCOUNTING_ITEM_DATE')}`] = items[i].date
        params[`entry.${getenv('ACCOUNTING_ITEM_MONEY')}`] = items[i].money
        params[`entry.${getenv('ACCOUNTING_ITEM_PS')}`] = items[i].ps
        params[`entry.${getenv('ACCOUNTING_ITEM_TITLE')}`] = items[i].title
        params[`entry.${getenv('ACCOUNTING_ITEM_COVER_ID')}`] = items[i]?.sameData?.id || ''
        params[`entry.${getenv('ACCOUNTING_ITEM_TYPE')}`] = type
        params[`entry.${getenv('ACCOUNTING_ITEM_TEXT')}`] = text

        await axios.post(`https://docs.google.com/forms/d/e/${getenv('GOOGLE_FORM_ID')}/formResponse`, httpBuildQuery(params))
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
  return await client.validateAndReplyMessage(event.replyToken, flexAddItems(itemsObj))
}

exports.sendTempGoogleForm = async ({ itemsObj, text }) => {
  for (const [type, items] of _.toPairs(itemsObj)) {
    for (let i = 0; i < items.length; i++) {
      try {
        const params = {}
        params[`entry.${getenv('ACCOUNTING_ITEM_ID')}`] = items[i].id
        params[`entry.${getenv('ACCOUNTING_ITEM_DATE')}`] = items[i].date
        params[`entry.${getenv('ACCOUNTING_ITEM_MONEY')}`] = items[i].money
        params[`entry.${getenv('ACCOUNTING_ITEM_PS')}`] = items[i].ps
        params[`entry.${getenv('ACCOUNTING_ITEM_TITLE')}`] = items[i].title
        params[`entry.${getenv('ACCOUNTING_ITEM_COVER_ID')}`] = items[i]?.sameData?.id || ''
        params[`entry.${getenv('ACCOUNTING_ITEM_TYPE')}`] = type
        params[`entry.${getenv('ACCOUNTING_ITEM_TEXT')}`] = text

        await axios.post(`https://docs.google.com/forms/d/e/${getenv('GOOGLE_FORM_TEMP_ID')}/formResponse`, httpBuildQuery(params))
      } catch (err) {
        log(errToPlainObj(err))
      }
    }
  }
}

exports.sendGoogleFormByTempData = async ({ event, newDatas, isExist }) => {
  if (isExist) return await client.validateAndReplyMessage(event.replyToken, flexText('此筆已紀錄過'))
  for (const data of newDatas) {
    data.money = _.parseInt(data.money)
    try {
      const params = {}
      params[`entry.${getenv('ACCOUNTING_ITEM_ID')}`] = data.id
      params[`entry.${getenv('ACCOUNTING_ITEM_DATE')}`] = data.date
      params[`entry.${getenv('ACCOUNTING_ITEM_MONEY')}`] = data.money
      params[`entry.${getenv('ACCOUNTING_ITEM_PS')}`] = data.ps
      params[`entry.${getenv('ACCOUNTING_ITEM_TITLE')}`] = data.title
      params[`entry.${getenv('ACCOUNTING_ITEM_COVER_ID')}`] = data?.coverId
      params[`entry.${getenv('ACCOUNTING_ITEM_TYPE')}`] = data.type
      params[`entry.${getenv('ACCOUNTING_ITEM_TEXT')}`] = data.text

      await axios.post(`https://docs.google.com/forms/d/e/${getenv('GOOGLE_FORM_ID')}/formResponse`, httpBuildQuery(params))
    } catch (err) {
      log(errToPlainObj(err))
    }
  }
  return await client.validateAndReplyMessage(event.replyToken, flexAddItems(_.groupBy(newDatas, 'type')))
}

exports.main = async ({ event, req, text }) => {
  const textArr = _.compact(text.split('\n'))

  const itemsObj = exports.parseText(textArr)
  if (!itemsObj) return

  const hasSameData = await exports.checkSameDatas(itemsObj)
  if (hasSameData) {
    await exports.sendTempGoogleForm({ itemsObj, text })
    return await client.validateAndReplyMessage(event.replyToken, flexCheckSameItems({ itemsObj, text }))
  }

  await exports.sendGoogleForm({ event, itemsObj, text })
}
