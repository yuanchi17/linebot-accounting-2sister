const _ = require('lodash')
const { client } = require('../../utils/lineat')
const { getFormDataNoCache, getenv } = require('../../utils/helpers')
const AccountingService = require('../../services/accounting')
const flexAddItems = require('../../flexMessage/addItems')
const flexText = require('../../flexMessage/text')

module.exports = async ({ event, req, args }) => {
  const [checkCoverInfo] = args
  const oldDatas = _.orderBy(_.filter(await getFormDataNoCache(getenv('ACCOUNTING_CSV')), data => data.date === checkCoverInfo.date), 'id', 'desc')
  const newDatas = _.orderBy(_.filter(await getFormDataNoCache(getenv('ACCOUNTING_TEMP_CSV')), data => _.includes(data.id, checkCoverInfo.id), 'id', 'asc'))

  const isExist = _.find(oldDatas, oldData => _.includes(oldData.id, checkCoverInfo.id))
  if (isExist) return await client.validateAndReplyMessage(event.replyToken, flexText('此筆已紀錄過'))

  await AccountingService.sendTextGoogleForm({
    text: newDatas[0]?.text,
    textId: newDatas[0]?.textId,
  })
  for (const data of newDatas) {
    data.money = _.parseInt(data.money)
    await AccountingService.sendGoogleFormByItem(data)
  }

  return await client.validateAndReplyMessage(event.replyToken, flexAddItems(_.groupBy(newDatas, 'type')))
}
