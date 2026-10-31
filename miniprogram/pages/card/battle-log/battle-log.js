var store = require('../../utils/store')

Page({
  data: { isEmpty: true, rows: [] },
  onShow: function () {
    var log = store.state.battleLog || []
    var rows = log.map(function (e) {
      var d = new Date(e.at || Date.now())
      var mm = d.getMonth() + 1
      var dd = d.getDate()
      var hh = d.getHours()
      var mi = d.getMinutes()
      return {
        id: e.id,
        outcome: e.outcome || '—',
        scoreText: (e.myScore || 0) + '–' + (e.oppScore || 0),
        comment: e.comment || '',
        timeText: mm + '/' + dd + ' ' + hh + ':' + (mi < 10 ? '0' + mi : mi)
      }
    })
    this.setData({ isEmpty: rows.length === 0, rows: rows })
  },
  goLineup: function () {
    wx.redirectTo({ url: '/pages/card/lineup/lineup' })
  }
})
