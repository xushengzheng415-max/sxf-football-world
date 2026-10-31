var store = require('../../utils/store')

Page({
  data: {
    rows: [],
    pickerOpen: false,
    activeKey: '',
    pickerList: [],
    pctText: '0%',
    pctWidth: '0%',
    tip: '',
    challengeDisabled: true
  },
  onShow: function () { this.refresh() },
  refresh: function () {
    var rows = store.lineupRowsView()
    var active = this.data.activeKey
    for (var i = 0; i < rows.length; i++) {
      for (var j = 0; j < rows[i].cells.length; j++) {
        var c = rows[i].cells[j]
        c.activeClass = c.key === active ? 'is-active' : ''
      }
    }
    var pct = store.challengePercent()
    var can = store.canChallenge()
    this.setData({
      rows: rows,
      pctText: pct + '%',
      pctWidth: pct + '%',
      tip: can ? '可发起轻对战 · 不上榜' : '目标：凑齐 5 人（含门将）· 无胜负排名',
      challengeDisabled: !can
    })
  },
  onSlot: function (e) {
    var key = e.currentTarget.dataset.key
    var used = store.usedLineupIds()
    var owned = store.ownedPlayers()
    var pickerList = owned.map(function (p) {
      return {
        id: p.id,
        label: p.name + ' · ' + p.pos,
        usedClass: used.indexOf(p.id) >= 0 ? 'is-used' : ''
      }
    })
    this.setData({ activeKey: key, pickerOpen: true, pickerList: pickerList })
    this.refresh()
  },
  onPick: function (e) {
    var id = e.currentTarget.dataset.id
    var key = this.data.activeKey
    if (!key) return
    if (id && e.currentTarget.dataset && false) return
    /* used chips still fire; ignore used unless clearing */
    var used = store.usedLineupIds()
    if (id && used.indexOf(id) >= 0) {
      /* allow re-pick by moving */
    }
    store.setSlot(key, id || '')
    this.setData({ activeKey: '', pickerOpen: false })
    this.refresh()
    wx.showToast({ title: id ? '已放入阵容' : '已清空占位', icon: 'none' })
  },
  onSave: function () {
    try {
      wx.setStorageSync('sxf-card-lineup-v1', store.state.lineup)
    } catch (e) {}
    wx.showToast({ title: '阵容已保存（本地）', icon: 'none' })
  },
  onChallenge: function () {
    if (!store.canChallenge()) {
      wx.showToast({ title: '请先凑齐 5 人含门将', icon: 'none' })
      return
    }
    var my = 0
    for (var i = 0; i < store.state.lineup.length; i++) {
      var p = store.playerById(store.state.lineup[i].playerId)
      if (p) my += p.ovr || 0
    }
    var opp = 380 + (my % 17)
    var myScore = Math.round(my / 20)
    var oppScore = Math.round(opp / 20)
    var win = myScore >= oppScore
    store.state.battleLog.unshift({
      id: String(Date.now()),
      myScore: myScore,
      oppScore: oppScore,
      outcome: win ? '胜' : '负',
      comment: win ? '同城编队完成度更高' : '对手位置契合更好',
      at: Date.now()
    })
    if (store.state.battleLog.length > 20) store.state.battleLog.length = 20
    wx.showModal({
      title: '本场战报 · ' + (win ? '胜' : '负'),
      content: '比分 ' + myScore + '–' + oppScore + ' · 不上榜不掉卡',
      confirmText: '战报记录',
      cancelText: '继续调整',
      success: function (res) {
        if (res.confirm) wx.navigateTo({ url: '/pages/card/battle-log/battle-log' })
      }
    })
  },
  goLog: function () {
    wx.navigateTo({ url: '/pages/card/battle-log/battle-log' })
  }
})
