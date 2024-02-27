const _ = require('lodash')
const { getFormDataNoCache, getenv } = require('../../utils/helpers')
const AccountingService = require('../../services/accounting')

module.exports = async ({ event, req, args }) => {
  const [checkCoverInfo] = args
  const oldDatas = _.orderBy(_.filter(await getFormDataNoCache(getenv('ACCOUNTING_CSV')), data => data.date === checkCoverInfo.date), 'id', 'desc')
  const newDatas = _.orderBy(_.filter(await getFormDataNoCache(getenv('ACCOUNTING_TEMP_CSV')), data => _.includes(data.id, checkCoverInfo.id), 'id', 'asc'))

  const isExist = _.find(oldDatas, oldData => _.includes(oldData.id, checkCoverInfo.id))
  await AccountingService.sendGoogleFormByTempData({ event, newDatas, isExist })
}
