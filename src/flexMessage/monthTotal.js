const _ = require('lodash')

module.exports = ({ monthTotalData, yearMonth }) => {
  const spendItems = _.filter(monthTotalData, { type: '支出' }) || []
  const incomeItems = _.filter(monthTotalData, { type: '收入' }) || []

  return {
    altText: `當月統計 - ${yearMonth}`,
    type: 'flex',
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: `當月統計 - ${yearMonth}`,
                size: 'sm',
              },
            ],
          },
          {
            layout: 'vertical',
            spacing: 'sm',
            type: 'box',
            contents: [
              {
                type: 'text',
                text: `收入：$${_.sumBy(incomeItems, 'money') || 0}`,
                weight: 'bold',
                size: 'md',
              },
              {
                type: 'text',
                text: `支出：$${_.sumBy(spendItems, 'money') || 0}`,
                weight: 'bold',
                size: 'md',
              },
            ],
          },
          {
            type: 'separator',
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'horizontal',
        spacing: 'md',
        contents: [
          {
            type: 'button',
            style: 'secondary',
            height: 'sm',
            action: {
              type: 'message',
              label: '使用說明',
              text: '二姐記帳使用說明',
            },
          },
        ],
      },
    },
  }
}
