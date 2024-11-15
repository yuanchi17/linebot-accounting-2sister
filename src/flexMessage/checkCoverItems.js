const _ = require('lodash')

module.exports = ({ itemsObj }) => {
  const checkCoverItems = _.filter(_.compact([...itemsObj['支出'] || [], ...itemsObj['收入'] || []]), item => item?.sameData)
  const checkCoverInfo = {
    date: checkCoverItems[0]?.date,
    id: checkCoverItems[0]?.id.slice(0, 10), // 同筆項目的 id 的前 10 碼都會一樣
  }

  return {
    altText: `重複記帳了嗎 - ${checkCoverInfo.date}`,
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
                text: `重複記帳了嗎 - ${checkCoverInfo.date}`,
                size: 'sm',
              },
            ],
          },
          {
            type: 'separator',
          },
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'md',
            contents: _.map(checkCoverItems, item => ({
              type: 'box',
              layout: 'vertical',
              margin: 'md',
              spacing: 'sm',
              contents: [
                {
                  type: 'box',
                  layout: 'horizontal',
                  spacing: 'sm',
                  alignItems: 'flex-start',
                  contents: [
                    {
                      type: 'text',
                      text: '舊紀錄',
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
                      contents: [
                        {
                          type: 'text',
                          text: `${item.sameData.type} ${item.sameData.title} ${item.sameData.money} ${item.sameData.ps}`,
                          wrap: true,
                          color: '#666666',
                          size: 'sm',
                          flex: 5,
                        },
                      ],
                    },
                  ],
                },
                {
                  type: 'box',
                  layout: 'horizontal',
                  spacing: 'sm',
                  alignItems: 'flex-start',
                  contents: [
                    {
                      type: 'text',
                      text: '新紀錄',
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
                      contents: [
                        {
                          type: 'text',
                          text: `${item.sameData.type} ${item.title} ${item.money} ${item.ps}`,
                          wrap: true,
                          color: '#666666',
                          size: 'sm',
                          flex: 5,
                        },
                      ],
                    },
                  ],
                },
                {
                  type: 'separator',
                  color: '#333333',
                },
              ],
            })),
          },
        ],

      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          {
            type: 'text',
            text: '若無需覆蓋紀錄，請略過此提醒，並重新留言記帳',
            align: 'center',
            wrap: true,
            size: 'sm',
            color: '#FF0000',
          },
          {
            type: 'button',
            style: 'secondary',
            height: 'sm',
            action: {
              type: 'postback',
              label: '我要覆蓋舊紀錄',
              data: JSON.stringify(['coverOldDatas', checkCoverInfo]),
            },
          },
        ],
      },
    },
  }
}
