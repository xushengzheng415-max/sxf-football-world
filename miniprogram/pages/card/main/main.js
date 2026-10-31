var store = require('../../utils/store')

Page({
  data: {
    hint: '',
    cardUrl: '',
    stats: [],
    stamps: []
  },
  onShow: function () {
    var p = store.mainPlayer()
    this.setData({
      hint: (p.name || '') + ' · ' + (p.pos || '') + ' · #' + (p.num || ''),
      cardUrl: p.cardUrl || store.CARD,
      stats: [
        { label: '综合', num: String(p.ovr || '—') },
        { label: '出场', num: String(p.apps || 0) },
        { label: '进球', num: String(p.goals || 0) },
        { label: '荣誉', num: String(p.honors || 0) }
      ],
      stamps: [
        { icon: '🥇', name: '熔金边框', lockedClass: '' },
        { icon: '✨', name: '首秀贴纸', lockedClass: '' },
        { icon: '🔒', name: '十场出勤', lockedClass: 'is-locked' },
        { icon: '🔒', name: '破门之夜', lockedClass: 'is-locked' }
      ]
    })
  },
  goTab: function (e) {
    var tab = e.currentTarget.dataset.tab
    var map = {
      album: '/pages/card/album-sign/album-sign',
      lineup: '/pages/card/lineup/lineup'
    }
    if (map[tab]) wx.redirectTo({ url: map[tab] })
  },
  onShare: function () {
    wx.showToast({ title: '长按主卡可保存（页面先行）', icon: 'none' })
  },
  onGrowth: function () {
    wx.showToast({ title: '本周出勤累计中', icon: 'none' })
  }
})
