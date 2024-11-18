const _ = require('lodash')
const { client } = require('../utils/lineat')
const { default: axios } = require('axios')
const { log, errToPlainObj, httpBuildQuery, getNowDate, getenv, getFormDataNoCache, getDate } = require('../utils/helpers')
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
  const obj = { }
  let accountDate = ''
  let type = ''
  _.each(textArr, (text, index) => {
    text = text.trim()

    // 如果第一行有日期，就依此日期為主
    if (index === 0 && /^(\d{1,2})\/(\d{1,2})$/.test(text)) {
      accountDate = getDate(text)
      return
    }

    if (_.includes(['收入', '支出'], text)) {
      type = text
      obj[type] = []
      return
    }
    if (!type) return

    text = text.split(' ')
    const item = {
      date: accountDate || getNowDate(),
      id: `${textId}${_.padStart(index, 2, 0)}`,
      money: _.parseInt(text[1]) || 0,
      ps: text.slice(2).join(' ') || '',
      title: text[0] || '',
      textId,
    }
    if (!item.money) return

    obj[type].push(item)
  })
  return { obj, accountDate }
}

exports.checkSameDatas = async (itemsObj, accountDate) => {
  // 取得當筆記帳日期的資料，並由新到舊排序
  const oldDatas = _.orderBy(_.filter(await exports.getAccountDatas(), ['date', accountDate]), 'id', 'desc')
  // 若當筆記帳日期無舊資料，則不需核對是否有重複
  if (!oldDatas.length) return

  const sameDataIds = []
  let hasSameData = false
  for (const [type, items] of _.toPairs(itemsObj)) {
    for (let i = 0; i < items.length; i++) {
      const newData = items[i]
      // 如果有相同標題，跟使用者確認是否需要覆蓋資料
      const sameData = _.find(oldDatas, ['title', newData.title])
      if (!sameData) continue

      if (newData.money === sameData.money && newData.ps === sameData.ps) {
        sameDataIds.push(newData.id)
        continue
      }
      hasSameData = true
      itemsObj[type][i] = {
        ...newData,
        sameData,
      }
    }
  }

  // 只保留需詢問是否要覆蓋的資料
  if (sameDataIds.length) {
    _.remove(itemsObj['支出'], i => _.includes(sameDataIds, i.id))
    _.remove(itemsObj['收入'], i => _.includes(sameDataIds, i.id))
  }
  return hasSameData
}

exports.sendGoogleForm = async ({ itemsObj }) => {
  for (const [type, items] of _.toPairs(itemsObj)) {
    for (let i = 0; i < items.length; i++) {
      const item = { ...items[i], type, coverId: items[i]?.sameData?.id || '' }
      await exports.sendGoogleFormByItem(item)
      itemsObj[type][i] = items[i]
    }
  }
}

exports.sendGoogleFormByItem = async item => {
  try {
    const params = {}
    params[`entry.${getenv('ACCOUNTING_ITEM_ID')}`] = item.id
    params[`entry.${getenv('ACCOUNTING_ITEM_DATE')}`] = item.date
    params[`entry.${getenv('ACCOUNTING_ITEM_MONEY')}`] = item.money
    params[`entry.${getenv('ACCOUNTING_ITEM_PS')}`] = item.ps
    params[`entry.${getenv('ACCOUNTING_ITEM_TITLE')}`] = item.title
    params[`entry.${getenv('ACCOUNTING_ITEM_COVER_ID')}`] = item?.coverId
    params[`entry.${getenv('ACCOUNTING_ITEM_TYPE')}`] = item.type
    params[`entry.${getenv('ACCOUNTING_ITEM_TEXT_ID')}`] = item.textId

    await axios.post(`https://docs.google.com/forms/d/e/${getenv('GOOGLE_FORM_ID')}/formResponse`, httpBuildQuery(params))
  } catch (err) {
    log(errToPlainObj(err))
  }
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
        params[`entry.${getenv('ACCOUNTING_TEMP_ITEM_TEXT_ID')}`] = items[i]?.textId

        await axios.post(`https://docs.google.com/forms/d/e/${getenv('GOOGLE_FORM_TEMP_ID')}/formResponse`, httpBuildQuery(params))
      } catch (err) {
        log(errToPlainObj(err))
      }
    }
  }
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

  const { obj: itemsObj, accountDate } = exports.parseText({ textArr, textId })
  if (!itemsObj) return

  const hasSameData = await exports.checkSameDatas(itemsObj, accountDate)
  if (hasSameData) {
    await exports.sendTempGoogleForm({ itemsObj, text })
    return await client.validateAndReplyMessage(event.replyToken, flexCheckSameItems({ itemsObj }))
  }

  if (!itemsObj['收入']?.length && !itemsObj['支出']?.length) return await client.validateAndReplyMessage(event.replyToken, flexText('這些項目可能已經記錄過，或是格式輸入錯誤(被你氣鼠XD)'))

  await Promise.all([
    exports.sendTextGoogleForm({ textId, text }),
    exports.sendGoogleForm({ itemsObj }),
  ])

  return await client.validateAndReplyMessage(event.replyToken, flexAddItems(itemsObj))
}
