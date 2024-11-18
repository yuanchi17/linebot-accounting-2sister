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

exports.parseText = ({ textArr, textId }) => {
  const obj = {}
  let type = ''
  _.each(textArr, (text, index) => {
    if (_.includes(['收入', '支出'], text.trim())) {
      type = text
      obj[type] = []
      return
    }
    if (!type) return

    text = text.split(' ')
    const item = {
      date: getNowDate(),
      id: `${textId}${_.padStart(index, 2, 0)}`,
      money: _.parseInt(text[1]) || 0,
      ps: text.slice(2).join(' ') || '',
      title: text[0] || '',
      textId,
    }
    if (!item.money) return

    obj[type].push(item)
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
      if (items[i].money === sameData.money && items[i].ps === sameData.ps) {
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

exports.sendGoogleForm = async ({ event, itemsObj }) => {
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
        params[`entry.${getenv('ACCOUNTING_ITEM_TEXT_ID')}`] = items[i].textId

        await axios.post(`https://docs.google.com/forms/d/e/${getenv('GOOGLE_FORM_ID')}/formResponse`, httpBuildQuery(params))
      } catch (err) {
        log(errToPlainObj(err))
      }
      itemsObj[type][i] = items[i]
    }
  }
  return await client.validateAndReplyMessage(event.replyToken, flexAddItems(itemsObj))
}

exports.sendTempGoogleForm = async ({ itemsObj }) => {
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
        params[`entry.${getenv('ACCOUNTING_TEMP_ITEM_TEXT_ID')}`] = items[i]?.textId

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

exports.sendTextGoogleForm = async ({ textId, text }) => {
  try {
    const params = {}
    params[`entry.${getenv('FORM_PARAM_TEXT_ID')}`] = textId
    params[`entry.${getenv('FORM_PARAM_TEXT_TEXT')}`] = text

    await axios.post(`https://docs.google.com/forms/d/e/${getenv('GOOGLE_FORM_TEXT_ID')}/formResponse`, httpBuildQuery(params))
  } catch (err) {
    log(errToPlainObj(err))
  }
}

exports.main = async ({ event, req, text }) => {
  const textId = dayjs().unix()
  const textArr = _.compact(text.split('\n'))

  const itemsObj = exports.parseText({ textArr, textId })
  if (!itemsObj) return

  const hasSameData = await exports.checkSameDatas(itemsObj)
  if (hasSameData) {
    await exports.sendTempGoogleForm({ itemsObj })
    return await client.validateAndReplyMessage(event.replyToken, flexCheckSameItems({ itemsObj }))
  }

  if (!itemsObj['收入']?.length && !itemsObj['支出']?.length) return await client.validateAndReplyMessage(event.replyToken, flexText('這些項目可能已經記錄過，或是格式輸入錯誤(被你氣鼠XD)'))

  await Promise.all([
    exports.sendTextGoogleForm({ event, textId, text }),
    exports.sendGoogleForm({ event, itemsObj }),
  ])
}
