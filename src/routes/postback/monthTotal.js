const _ = require('lodash')
const { client } = require('../../utils/lineat')
const { getenv, getFormDataNoCache } = require('../../utils/helpers')
const flexMonthTotal = require('../../flexMessage/monthTotal')

module.exports = async ({ event, req, args }) => {
  const [yearMonth] = args
  const coveredIds = []

  const datas = await getFormDataNoCache(getenv('ACCOUNTING_CSV'))
  const monthTotalData = _.chain(datas)
    .filter(item => { return _.includes(item.date, yearMonth) })
    .orderBy('id', 'desc')
    .map(item => {
      if (item?.coverId) coveredIds.push(item?.coverId)
      if (_.includes(coveredIds, item?.coverId)) return null
      return {
        ...item,
        money: _.parseInt(item.money),
      }
    })
    .value()

  return await client.validateAndReplyMessage(event.replyToken, flexMonthTotal({ monthTotalData, yearMonth }))
}
