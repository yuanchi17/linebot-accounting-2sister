module.exports = text => {
  text = _.truncate(_.toString(text), {
    length: 5000,
  })
  return {
    type: 'text',
    text,
  }
}
