var store = require('../../utils/store')

Page({
  data: {
    remainText: '',
    signBtn: '免费签约',
    signDisabled: false,
    signSuccess: false,
    successTitle: '',
    countHint: '',
    isEmpty: false,
    tiles: []
  },
  onShow: function () { this.refresh() },
  refresh: function () {
    var tiles = store.albumTiles()
    var remain = store.state.signRemain
    this.setData({
      remainText: remain > 0 ? ('今日剩余 ' + remain + ' 次') : '明日再来 · 免费 1 次/日',
      signBtn: remain > 0 ? '免费签约' : '今日已签约',
      signDisabled: remain < 1,
      signSuccess: !!store.state.signSuccess,
      successTitle: store.state.lastSignedName ? ('签约成功 · ' + store.state.lastSignedName) : '签约成功',
      countHint: '共 ' + tiles.length + ' 张',
      isEmpty: tiles.length === 0,
      tiles: tiles
    })
  },
  onSign: function () {
    var r = store.doFreeSign()
    if (!r.ok) {
      wx.showToast({ title: r.message, icon: 'none' })
      this.refresh()
      return
    }
    wx.showToast({ title: '签约成功：' + r.player.name, icon: 'none' })
    this.refresh()
  },
  goLineup: function () {
    wx.redirectTo({ url: '/pages/card/lineup/lineup' })
  }
})
