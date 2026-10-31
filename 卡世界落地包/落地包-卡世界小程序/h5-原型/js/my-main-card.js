(function () {
  'use strict'

  var DEMO_CARD = './assets/player-card-holo/demo-main-card.png'
  var API = 'https://cloud1-7g8ckb3c7815a011-1419431905.ap-shanghai.app.tcloudbase.com/webLoginApi'
  var KEY = 'sxf_fan_h5_session'
  var query = new URLSearchParams(location.search)
  var demo = ['127.0.0.1', 'localhost'].includes(location.hostname) && query.get('demo') === '1'
  var players = []
  var selectedId = ''
  var current = null

  var app = document.getElementById('app')
  var boot = document.getElementById('bootState')

  function html(value) {
    return String(value || '').replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    })
  }

  function toast(msg) {
    var el = document.getElementById('toast')
    el.textContent = msg
    el.classList.add('is-show')
    clearTimeout(toast._t)
    toast._t = setTimeout(function () { el.classList.remove('is-show') }, 2200)
  }

  function showBoot(message, retry) {
    app.hidden = true
    boot.hidden = false
    boot.className = 'mmc-state'
    boot.innerHTML = '<p>' + html(message) + '</p>' +
      (retry ? '<button type="button" id="bootRetry">重新加载</button>' : '')
    var btn = document.getElementById('bootRetry')
    if (btn) btn.onclick = retry
  }

  function api(action, data) {
    return fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({
        action: action,
        fanSessionToken: localStorage.getItem(KEY) || ''
      }, data || {}))
    }).then(function (r) { return r.json() }).then(function (r) {
      r = r && typeof r.body === 'string' ? JSON.parse(r.body) : r
      if (!r || !r.success) {
        var err = new Error((r && r.error) || '读取失败')
        err.code = r && r.code
        throw err
      }
      return r
    })
  }

  function login() {
    if (!/MicroMessenger/i.test(navigator.userAgent) && !demo) {
      showBoot('请在微信中打开卡世界。')
      return
    }
    showBoot('正在连接微信…')
    api('fanOAuthUrl', { returnUrl: location.origin + location.pathname + location.search })
      .then(function (r) { location.replace(r.authorizeUrl) })
      .catch(function (e) { showBoot(e.message, login) })
  }

  function currentCard(p) {
    if (p.displayTemplateId) {
      var card = (p.preloadedCards || []).filter(function (c) {
        return c.templateId === p.displayTemplateId
      })[0]
      if (card) {
        return {
          title: card.title || '展示卡',
          url: card.cardUrl || '',
          templateId: card.templateId || '',
          kind: 'preload',
          ready: card.status === 'ready' && !!card.cardUrl
        }
      }
    }
    return {
      title: '基础卡',
      url: p.cardUrl || '',
      templateId: '',
      kind: 'base',
      ready: !!p.cardUrl
    }
  }

  function holoMarkup(src, name) {
    var safeSrc = String(src).replace(/'/g, '%27')
    var aria = String(name || '球员卡').replace(/[<>&"]/g, '')
    return (
      '<div class="holo-card" data-effect="cosmos" style="--card-mask:url(\'' + safeSrc + '\')">' +
        '<button type="button" class="holo-card__rotator" aria-label="' + aria + ' 主卡">' +
          '<div class="holo-card__front"><img src="' + safeSrc + '" alt="' + aria + '"></div>' +
          '<div class="holo-card__shine" aria-hidden="true"></div>' +
          '<div class="holo-card__glare" aria-hidden="true"></div>' +
        '</button>' +
      '</div>'
    )
  }

  function mountHero(src, name, foil) {
    var mount = document.getElementById('heroCard')
    var badge = document.getElementById('foilBadge')
    if (!src) {
      mount.innerHTML = '<div class="mmc-empty-card"><span>资料待补充</span><small>去卡库制作或编辑主卡</small></div>'
      badge.hidden = true
      return
    }
    badge.hidden = !foil
    mount.innerHTML = holoMarkup(src, name)
    if (window.HoloCosmos) {
      window.HoloCosmos.bindAll(mount)
      var hero = mount.querySelector('.holo-card')
      setTimeout(function () { window.HoloCosmos.showcase(hero, 3600) }, 280)
    }
  }

  function paintStamps(p, card) {
    var hasFrame = !!(card.url || p.portraitUrl)
    var stamps = [
      { name: '金边框', on: hasFrame, state: hasFrame ? '已解锁' : '待制作主卡' },
      { name: '连胜贴纸', on: false, state: '成长中', locked: true },
      { name: '球队徽章', on: false, state: '锁定', locked: true }
    ]
    document.getElementById('stamps').innerHTML = stamps.map(function (s) {
      return '<div class="mmc-stamp' + (s.on ? ' is-on' : '') + (s.locked ? ' is-locked' : '') + '">' +
        '<p class="mmc-stamp__name">' + html(s.name) + '</p>' +
        '<p class="mmc-stamp__state">' + html(s.state) + '</p></div>'
    }).join('')
  }

  function paintTabs() {
    var nav = document.getElementById('playerTabs')
    if (players.length < 2) {
      nav.hidden = true
      nav.innerHTML = ''
      return
    }
    nav.hidden = false
    nav.innerHTML = players.map(function (p) {
      return '<button type="button" class="mmc-tab' + (p.id === selectedId ? ' is-active' : '') + '" data-player="' + html(p.id) + '">' +
        html(p.name || '球员') +
        (p.teamName ? '<small>' + html(p.teamName) + '</small>' : '') +
        '</button>'
    }).join('')
    Array.prototype.forEach.call(nav.querySelectorAll('[data-player]'), function (btn) {
      btn.onclick = function () {
        selectedId = btn.getAttribute('data-player')
        render()
      }
    })
  }

  function render() {
    if (!players.some(function (p) { return p.id === selectedId })) selectedId = players[0].id
    var p = players.filter(function (x) { return x.id === selectedId })[0]
    current = currentCard(p)
    var face = current.url || p.portraitUrl || ''
    var foil = !!current.url
    boot.hidden = true
    app.hidden = false
    paintTabs()
    mountHero(face, p.name, foil)
    document.getElementById('cardTitle').textContent = (p.name || '') + ' · ' + (current.title || '主卡')
    paintStamps(p, current)
    document.getElementById('btnEdit').textContent = current.url ? '编辑此卡' : '制作此卡'
    document.getElementById('btnShare').disabled = !face
  }

  function openEditor() {
    location.href = './player-cards.html'
  }

  function openShare() {
    var p = players.filter(function (x) { return x.id === selectedId })[0]
    var card = currentCard(p)
    var src = card.url || p.portraitUrl
    if (!src) { toast('暂无可分享的卡面'); return }
    var sheet = document.getElementById('shareSheet')
    var img = document.getElementById('sharePreview')
    img.src = src
    sheet.hidden = false
  }

  function bindActions() {
    document.getElementById('btnLibrary').onclick = function () {
      location.href = './player-cards.html'
    }
    document.getElementById('btnShare').onclick = openShare
    document.getElementById('btnShareClose').onclick = function () {
      document.getElementById('shareSheet').hidden = true
    }
    document.getElementById('shareSheet').onclick = function (e) {
      if (e.target === e.currentTarget) e.currentTarget.hidden = true
    }
    document.getElementById('btnLineup').onclick = function () {
      location.href = './player-card-game.html'
    }
    document.getElementById('btnEdit').onclick = openEditor
  }

  function demoPlayers() {
    return [{
      id: 'demo-1',
      name: '铁栋泽',
      teamName: '赛小蜂样队',
      cardUrl: DEMO_CARD,
      portraitUrl: DEMO_CARD,
      displayTemplateId: '',
      preloadedCards: []
    }]
  }

  function load() {
    showBoot('正在读取你的主卡…')
    var request = demo ? Promise.resolve({ players: demoPlayers() }) : api('listMyPlayerCards')
    request.then(function (r) {
      players = r.players || []
      if (!players.length) {
        showBoot('暂无已绑定的球员，请先完成球员登记。', function () {
          location.href = './me.html'
        })
        var btn = document.getElementById('bootRetry')
        if (btn) btn.textContent = '返回我的'
        return
      }
      selectedId = players[0].id
      render()
    }).catch(function (e) {
      if (e.code === 'PLAYER_CARD_AUTH_REQUIRED') {
        localStorage.removeItem(KEY)
        login()
        return
      }
      showBoot(e.message || '读取失败', load)
    })
  }

  bindActions()

  if (demo) load()
  else if (query.get('code') && query.get('state')) {
    showBoot('正在完成微信登录…')
    api('fanOAuth', { code: query.get('code'), state: query.get('state') })
      .then(function (r) {
        localStorage.setItem(KEY, r.fanSessionToken)
        history.replaceState({}, '', location.pathname + (query.get('demo') ? '?demo=1' : ''))
        load()
      })
      .catch(function (e) { showBoot(e.message, login) })
  } else if (localStorage.getItem(KEY)) load()
  else login()
})()
