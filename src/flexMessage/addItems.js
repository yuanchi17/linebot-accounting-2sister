const _ = require('lodash')
const dayjs = require('dayjs')

module.exports = accountItems => {
  const spendItems = accountItems['支出'] || []
  const incomeItems = accountItems['收入'] || []
  const accountItem = {
    date: spendItems[0]?.date || incomeItems[0]?.date,
    id: spendItems[0]?.id || incomeItems[0]?.id,
  }

  return {
    altText: `記帳 - ${accountItem.date}`,
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
                text: `記帳 - ${accountItem.date}`,
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
          {
            type: 'box',
            layout: 'vertical',
            margin: 'lg',
            spacing: 'sm',
            contents: _.map(accountItems, (items, type) => ({
              type: 'box',
              layout: 'horizontal',
              spacing: 'sm',
              alignItems: 'flex-start',
              contents: [
                {
                  type: 'text',
                  text: type,
                  color: '#aaaaaa',
                  size: 'sm',
                  flex: 0,
                },
                {
                  type: 'box',
                  layout: 'vertical',
                  margin: 'lg',
                  spacing: 'sm',
                  flex: 1,
                  contents: _.map(items, item => {
                    if (!item.status) return
                    return {
                      type: 'text',
                      text: `${item?.item} ${item?.money}`,
                      wrap: true,
                      color: '#666666',
                      size: 'sm',
                      flex: 5,
                    }
                  }),
                },
              ],
            })),
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
            style: 'primary',
            height: 'sm',
            action: {
              type: 'postback',
              label: '當月統計',
              data: JSON.stringify(['monthTotal', dayjs(accountItem.date).format('YYYY.MM')]),
            },
          },
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
