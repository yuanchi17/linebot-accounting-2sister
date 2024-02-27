const _ = require('lodash')
const { getFormDataNoCache, getenv } = require('../../utils/helpers')
const AccountingService = require('../../services/accounting')

module.exports = async ({ event, req, args }) => {
  const [itemsObj, text] = args
  const oldDatas = _.orderBy(await getFormDataNoCache(getenv('ACCOUNTING_CSV')), 'id', 'desc')

  await AccountingService.sendGoogleForm({ event, itemsObj, text, oldDatas })
}
