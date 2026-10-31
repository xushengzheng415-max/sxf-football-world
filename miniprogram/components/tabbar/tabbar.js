Component({
  properties: {
    active: { type: String, value: 'main' }
  },
  data: {
    mainOn: 'is-on',
    albumOn: '',
    lineupOn: ''
  },
  observers: {
    active: function (v) {
      this.setData({
        mainOn: v === 'main' ? 'is-on' : '',
        albumOn: v === 'album' ? 'is-on' : '',
        lineupOn: v === 'lineup' ? 'is-on' : ''
      })
    }
  },
  methods: {
    go: function (e) {
      var tab = e.currentTarget.dataset.tab
      if (!tab || tab === this.data.active) return
      var map = {
        main: '/pages/card/main/main',
        album: '/pages/card/album-sign/album-sign',
        lineup: '/pages/card/lineup/lineup'
      }
      wx.redirectTo({ url: map[tab] })
    }
  }
})
