const _ = require('lodash')
const { getCsv, getenv } = require('../../utils/helpers')
const AccountingService = require('../../services/accounting')

module.exports = async ({ event, req, args }) => {
  const [itemsObj, text] = args
  const oldDatas = _.orderBy(await getCsv(getenv('ACCOUNTING_CSV'), 0), '流水號', 'desc')

  await AccountingService.sendGoogleForm({ event, itemsObj, text, oldDatas })
}
