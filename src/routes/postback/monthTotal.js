const _ = require('lodash')
const { client } = require('../../utils/lineat')
const { getenv, getCsv } = require('../../utils/helpers')
const flexMonthTotal = require('../../flexMessage/monthTotal')

module.exports = async ({ event, req, args }) => {
  const datas = _.map(await getCsv(getenv('ACCOUNTING_CSV', 0)), data => ({
    ...data,
    金額: _.parseInt(data['金額']),
  }))
  const [yearMonth] = args

  const monthTotalData = _.filter(datas, item => {
    return _.includes(item['日期'], yearMonth)
  })

  return await client.validateAndReplyMessage(event.replyToken, flexMonthTotal({ monthTotalData, yearMonth }))
}
