const _ = require('lodash')
const { client } = require('../../utils/lineat')
const { getenv, getFormDataNoCache } = require('../../utils/helpers')
const flexMonthTotal = require('../../flexMessage/monthTotal')

module.exports = async ({ event, req, args }) => {
  const datas = _.map(await getFormDataNoCache(getenv('ACCOUNTING_CSV')), data => ({
    ...data,
    money: _.parseInt(data.money),
  }))
  const [yearMonth] = args

  const monthTotalData = _.filter(datas, item => {
    return _.includes(item.date, yearMonth)
  })

  return await client.validateAndReplyMessage(event.replyToken, flexMonthTotal({ monthTotalData, yearMonth }))
}
