(function () {
  'use strict'

  var FALLBACK_CARD = 'assets/tie-dongze-card.png'
  var Api = window.CardWorldApi
  var DEMO = /[?&]demo=1(?:&|$)/.test(location.search) &&
    (/^file:/.test(location.protocol) || /localhost|127\.0\.0\.1/.test(location.hostname))

  var PLAYERS = []
  var lineupSlots = [
    { key: 'st', label: '前锋', posTag: 'ST', playerId: null },
    { key: 'lm', label: '左边', posTag: 'LM', playerId: null },
    { key: 'rm', label: '右边', posTag: 'RM', playerId: null },
    { key: 'cb', label: '中卫', posTag: 'CB', playerId: null },
    { key: 'gk', label: '门将', posTag: 'GK', playerId: null }
  ]
  var activeSlot = null
  var albumMeta = null
  var lineupMeta = null
  var mainMeta = null
  var lastBattle = null
  var battleTimers = []
  var signing = false
  var battling = false
  var cityGateOpen = false

  var CITY_OPTIONS = [
    { code: '410100', name: '郑州市' },
    { code: '410300', name: '洛阳市' },
    { code: '410200', name: '开封市' },
    { code: '411000', name: '许昌市' },
    { code: '411300', name: '南阳市' }
  ]

  function $(sel, root) { return (root || document).querySelector(sel) }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)) }

  function toast(msg) {
    var el = $('#toast')
    if (!el) return
    el.textContent = msg
    el.classList.add('is-show')
    clearTimeout(toast._t)
    toast._t = setTimeout(function () { el.classList.remove('is-show') }, 2200)
  }

  function cardSrc(url) {
    return url || FALLBACK_CARD
  }

  function holoMarkup(opts) {
    opts = opts || {}
    var src = cardSrc(opts.src)
    var mini = opts.mini ? ' holo-card--mini' : ''
    var aria = opts.name || '球员卡'
    return (
      '<div class="holo-card' + mini + '" data-effect="cosmos" style="--card-mask:url(\'' + src.replace(/'/g, '%27') + '\')">' +
        '<button type="button" class="holo-card__rotator" aria-label="' + aria + ' 箔光卡">' +
          '<div class="holo-card__front"><img src="' + src + '" alt="' + aria + '" /></div>' +
          '<div class="holo-card__shine" aria-hidden="true"></div>' +
          '<div class="holo-card__glare" aria-hidden="true"></div>' +
        '</button>' +
      '</div>'
    )
  }

  function playerById(id) {
    for (var i = 0; i < PLAYERS.length; i++) if (PLAYERS[i].id === id) return PLAYERS[i]
    return null
  }

  function mapTile(tile) {
    var meta = String(tile.metaText || '')
    var parts = meta.split('·')
    var pos = (parts[0] || '').trim() || '球员'
    var numMatch = meta.match(/#(\d+)/)
    return {
      id: String(tile.id),
      name: String(tile.name || '球员'),
      pos: pos,
      num: numMatch ? Number(numMatch[1]) : 0,
      ovr: Number(tile.ovrText) || 0,
      cardUrl: tile.cardUrl || '',
      main: !!tile.isMain,
      skill: tile.skillText || ''
    }
  }

  function applyAlbum(res) {
    albumMeta = res
    PLAYERS = (res.tiles || []).map(mapTile)
  }

  function applyLineup(res) {
    lineupMeta = res
    var flat = []
    ;(res.rows || []).forEach(function (row) {
      var cells = (row && row.cells) || (Array.isArray(row) ? row : null)
      if (cells) {
        cells.forEach(function (slot) { if (slot && slot.key) flat.push(slot) })
      } else if (row && row.key) {
        flat.push(row)
      }
    })
    if (flat.length) {
      lineupSlots.forEach(function (slot) {
        var hit = flat.filter(function (s) { return s.key === slot.key })[0]
        slot.playerId = hit && hit.playerId ? String(hit.playerId) : null
        if (hit && hit.posTag) slot.posTag = hit.posTag
        if (hit && hit.label) slot.label = hit.label
      })
    }
  }

  function switchTab(name) {
    $all('.view').forEach(function (v) {
      v.classList.toggle('is-active', v.dataset.view === name)
    })
    $all('.tab').forEach(function (t) {
      t.classList.toggle('is-active', t.dataset.tab === name)
    })
    if (name === 'album') renderAlbum()
    if (name === 'lineup') renderLineup()
    if (name === 'main') renderHero()
  }

  $all('.tab').forEach(function (tab) {
    tab.addEventListener('click', function () { switchTab(tab.dataset.tab) })
  })
  $all('.quick-nav__btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var goto = btn.getAttribute('data-goto')
      if (goto) switchTab(goto)
    })
  })

  function renderHero() {
    var mount = $('#hero-card')
    var hint = $('.panel__head .hint', $('#view-main'))
    var grid = $('#ability-grid')
    var growth = $('.growth-row', $('#view-main'))
    var m = mainMeta
    if (!m || m.empty) {
      mount.innerHTML = '<div class="mmc-empty-card" style="min-height:220px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:#9aa3b5"><strong>还没有主卡</strong><small>先去「卡册·签约」领取今日样卡</small></div>'
      if (hint) hint.textContent = '签约后显示主卡'
      if (grid) grid.innerHTML = ''
      return
    }
    if (hint) {
      hint.textContent = [m.name, m.positionLabel, m.numberText].filter(Boolean).join(' · ')
    }
    mount.innerHTML = holoMarkup({ name: m.name, src: m.cardUrl })
    if (window.HoloCosmos) {
      window.HoloCosmos.bindAll(mount)
      var hero = mount.querySelector('.holo-card')
      setTimeout(function () { window.HoloCosmos.showcase(hero, 4200) }, 400)
    }
    if (grid) {
      grid.innerHTML = (m.stats || []).map(function (s) {
        return '<div class="stat"><div class="stat__num">' + (s.num != null ? s.num : '-') + '</div><div class="stat__label">' + (s.label || '') + '</div></div>'
      }).join('')
    }
    if (growth && Array.isArray(m.stamps)) {
      growth.innerHTML = m.stamps.map(function (s) {
        return '<div class="stamp ' + (s.lockedClass || '') + '"><div class="stamp__icon">' + (s.icon || '') + '</div><div class="stamp__name">' + (s.name || '') + '</div></div>'
      }).join('')
    }
  }

  function updateMeetBtn() {
    var btn = $('#btn-meet')
    var remain = $('#meet-remain')
    if (!btn) return
    if (!albumMeta) {
      btn.disabled = true
      btn.textContent = '加载中…'
      return
    }
    btn.disabled = !!albumMeta.signDisabled || signing
    btn.textContent = albumMeta.signBtn || '免费签约'
    if (remain) remain.textContent = albumMeta.remainText || ''
  }

  function renderAlbum() {
    var grid = $('#card-grid')
    var empty = $('#album-empty')
    var legend = $('#album-legend')
    var hint = $('#album-count-hint')
    var meetSuccess = $('#meet-success')
    updateMeetBtn()

    if (!PLAYERS.length) {
      empty.hidden = false
      legend.hidden = true
      grid.innerHTML = ''
      if (hint) hint.textContent = albumMeta && albumMeta.countText ? albumMeta.countText : '卡册为空 · 先签约'
    } else {
      empty.hidden = true
      legend.hidden = false
      if (hint) hint.textContent = (albumMeta && albumMeta.countText) || ('共 ' + PLAYERS.length + ' 张')
      grid.innerHTML = PLAYERS.map(function (p) {
        return (
          '<div class="mini-slot' + (p.main ? ' is-main' : '') + '" data-id="' + p.id + '">' +
            holoMarkup({ mini: true, name: p.name, src: p.cardUrl }) +
            '<div class="mini-slot__meta"><strong>' + p.name + '</strong>' + p.pos + ' · OVR ' + (p.ovr || '-') + '</div>' +
          '</div>'
        )
      }).join('')
      if (window.HoloCosmos) window.HoloCosmos.bindAll(grid)
    }

    if (albumMeta && albumMeta.lastSignedName) {
      meetSuccess.hidden = false
      $('#meet-success-title').textContent = albumMeta.lastSignText || ('签约成功 · ' + albumMeta.lastSignedName)
      $('#meet-success-desc').textContent = '样卡已入册，去组阵凑齐 5 人发起轻挑战'
    } else {
      meetSuccess.hidden = true
    }
  }

  function usedIds() {
    return lineupSlots.map(function (s) { return s.playerId }).filter(Boolean)
  }

  function renderLineup() {
    var pitch = $('#pitch-slots')
    var rows = [
      [lineupSlots[0]],
      [lineupSlots[1], lineupSlots[2]],
      [lineupSlots[3]],
      [lineupSlots[4]]
    ]
    pitch.innerHTML = rows.map(function (row) {
      return '<div class="slots__row">' + row.map(function (s) {
        var p = s.playerId ? playerById(s.playerId) : null
        var filled = p ? ' is-filled' : ''
        var active = activeSlot === s.key ? ' is-active' : ''
        var body = p
          ? '<div class="slot__card">' + holoMarkup({ mini: true, name: p.name, src: p.cardUrl }) +
            '<div class="slot__badge"><span class="slot__rating">' + (p.ovr || 70) + '</span><span class="slot__pos">' + s.posTag + '</span></div>' +
            '<div class="slot__name">' + p.name + '</div></div>'
          : '<div class="slot__empty"><span class="slot__pos">' + s.posTag + '</span><span>点选</span><span>' + s.label + '</span></div>'
        return '<div class="slot' + filled + active + '" data-slot="' + s.key + '" role="button" tabindex="0">' + body + '</div>'
      }).join('') + '</div>'
    }).join('')

    $all('.slot', pitch).forEach(function (el) {
      el.addEventListener('click', function () {
        activeSlot = el.dataset.slot
        renderLineup()
        openPicker()
      })
    })
    if (window.HoloCosmos) window.HoloCosmos.bindAll(pitch)
    updateChallenge()
  }

  function openPicker() {
    var picker = $('#picker')
    picker.classList.add('is-open')
    var used = usedIds()
    var list = $('#picker-list')
    list.innerHTML = PLAYERS.map(function (p) {
      var usedCls = used.indexOf(p.id) >= 0 ? ' is-used' : ''
      return '<button type="button" class="picker__chip' + usedCls + '" data-id="' + p.id + '">' +
        p.name + ' · ' + p.pos + ' · ' + (p.ovr || '-') + '</button>'
    }).join('') +
      '<button type="button" class="picker__chip" data-id="">清空此位</button>'

    $all('.picker__chip', list).forEach(function (chip) {
      chip.addEventListener('click', function () {
        if (!activeSlot) return
        var id = chip.dataset.id || ''
        var key = activeSlot
        activeSlot = null
        picker.classList.remove('is-open')
        if (DEMO) {
          var slot = lineupSlots.filter(function (s) { return s.key === key })[0]
          if (slot) {
            if (id) lineupSlots.forEach(function (s) { if (s.playerId === id) s.playerId = null })
            slot.playerId = id || null
          }
          renderLineup()
          toast(id ? '已放入阵容' : '已清空占位')
          return
        }
        Api.setSlot(key, id).then(function (res) {
          applyLineup(res)
          renderLineup()
          toast(id ? '已放入阵容' : '已清空占位')
        }).catch(handleApiError)
      })
    })
  }

  function updateChallenge() {
    var tip = $('#challenge-tip')
    var pctEl = $('#challenge-pct')
    var bar = $('#challenge-bar')
    var btn = $('#btn-challenge')
    var meta = lineupMeta || {}
    if (pctEl) pctEl.textContent = meta.pctText || '0%'
    if (bar) bar.style.width = meta.pctWidth || '0%'
    if (tip) tip.textContent = meta.tip || '凑齐 5 人（含门将）发起轻挑战'
    if (btn) {
      btn.disabled = !!meta.challengeDisabled || battling
      btn.textContent = lastBattle ? '再战一局' : '发起轻挑战'
    }
  }

  function handleApiError(err) {
    var code = err && err.code
    if (code === 'WORLD_LOGIN_REQUIRED' || code === 'SERVICE_PRIVATE_AUTH_REQUIRED') {
      toast('请先登录')
      setTimeout(function () { Api.goLogin() }, 600)
      return
    }
    if (code === 'WORLD_CITY_REQUIRED') {
      openCityGate()
      return
    }
    if (code === 'WORLD_PHONE_UNBOUND') {
      toast(err.message || '请先绑定手机号')
      setTimeout(function () { Api.goLogin() }, 800)
      return
    }
    toast((err && err.message) || '操作失败，请重试')
  }

  function openCityGate() {
    if (cityGateOpen) return
    cityGateOpen = true
    var app = $('.app')
    if (app) app.hidden = true
    var mask = document.createElement('div')
    mask.id = 'city-gate'
    mask.style.cssText = 'position:fixed;inset:0;z-index:80;background:rgba(0,0,0,.72);display:flex;align-items:flex-end;justify-content:center'
    mask.innerHTML =
      '<div style="width:100%;max-width:430px;background:#121826;border-radius:18px 18px 0 0;padding:20px 16px calc(20px + env(safe-area-inset-bottom));color:#f3f5fa">' +
        '<h2 style="margin:0 0 6px;font-size:18px">选择所在城市</h2>' +
        '<p style="margin:0 0 14px;color:#9aa3b5;font-size:13px">赛小蜂足球世界按同城名册签约，选择后可随时在档案中调整。</p>' +
        '<div id="city-gate-list" style="display:grid;gap:8px"></div>' +
      '</div>'
    document.body.appendChild(mask)
    var list = mask.querySelector('#city-gate-list')
    list.innerHTML = CITY_OPTIONS.map(function (c) {
      return '<button type="button" data-code="' + c.code + '" data-name="' + c.name + '" style="text-align:left;padding:14px 16px;border-radius:12px;border:1px solid rgba(255,215,130,.2);background:rgba(255,255,255,.04);color:#f3f5fa;font-size:15px">' + c.name + '</button>'
    }).join('')
    $all('button', list).forEach(function (btn) {
      btn.onclick = function () {
        Api.saveCity(btn.getAttribute('data-code'), btn.getAttribute('data-name'))
        cityGateOpen = false
        mask.remove()
        bootCloud()
      }
    })
  }

  function playMeetReveal(player) {
    var overlay = $('#meet-reveal')
    var pack = $('#meet-pack')
    var card = $('#meet-card3d')
    var whole = $('#meet-pack-whole')
    var closeBtn = $('#meet-reveal-close')
    var img = $('#meet-reveal-img')
    if (!overlay || !pack || !card) {
      toast('签约成功：获得「' + player.name + '」')
      renderAlbum()
      return
    }
    if (img) img.src = cardSrc(player.cardUrl)
    $('#meet-reveal-title').textContent = '签约 · ' + player.name
    $('#meet-reveal-sub').textContent = '档案展开中…'
    if (closeBtn) closeBtn.style.display = 'none'
    pack.className = 'meet-pack'
    pack.style.cssText = ''
    if (whole) whole.style.display = ''
    card.className = 'meet-card3d'
    overlay.classList.add('is-show')
    setTimeout(function () { pack.classList.add('is-ripping') }, 200)
    setTimeout(function () {
      if (whole) whole.style.display = 'none'
      pack.classList.add('is-split')
      $('#meet-reveal-sub').textContent = '卡弹出…'
    }, 700)
    setTimeout(function () {
      card.classList.add('show')
      $('#meet-reveal-sub').textContent = '综合分 ' + (player.ovr || '-')
    }, 1250)
    setTimeout(function () { pack.classList.add('is-gone') }, 1550)
    setTimeout(function () {
      card.classList.add('flipped', 'glow', 'foil-on')
      $('#meet-reveal-sub').textContent = '签约成功 · 滑动看箔光'
      if (closeBtn) closeBtn.style.display = ''
    }, 1900)
  }

  $('#btn-meet').addEventListener('click', function () {
    if (signing || (albumMeta && albumMeta.signDisabled)) return
    if (DEMO) {
      var newbie = {
        id: 'meet-' + Date.now(),
        name: '样卡球员',
        pos: '中场',
        ovr: 75,
        cardUrl: '',
        main: false
      }
      PLAYERS.push(newbie)
      albumMeta = albumMeta || {}
      albumMeta.signDisabled = true
      albumMeta.signBtn = '今日已签约'
      albumMeta.remainText = '明日再来 · 免费 1 次/日'
      albumMeta.lastSignedName = newbie.name
      albumMeta.lastSignText = '签约成功 · ' + newbie.name
      playMeetReveal(newbie)
      return
    }
    signing = true
    updateMeetBtn()
    Api.sign({ mode: 'free_daily' }).then(function (res) {
      signing = false
      var card = res.card || {}
      var player = {
        id: String(card.playerId || ''),
        name: String(card.name || '新球员'),
        pos: String(card.positionLabel || '球员'),
        ovr: Number(card.ovrText) || 0,
        cardUrl: card.cardUrl || '',
        main: false
      }
      return Promise.all([Api.album(), Api.mainCard(), Api.lineup()]).then(function (rows) {
        applyAlbum(rows[0])
        mainMeta = rows[1]
        applyLineup(rows[2])
        playMeetReveal(player)
        renderHero()
      })
    }).catch(function (err) {
      signing = false
      updateMeetBtn()
      handleApiError(err)
    })
  })

  var closeReveal = $('#meet-reveal-close')
  if (closeReveal) {
    closeReveal.addEventListener('click', function () {
      var overlay = $('#meet-reveal')
      var pack = $('#meet-pack')
      var card = $('#meet-card3d')
      if (pack) pack.className = 'meet-pack'
      if (card) card.className = 'meet-card3d'
      if (overlay) overlay.classList.remove('is-show')
      renderAlbum()
      toast('已收入卡册')
    })
  }

  $('#btn-goto-lineup').addEventListener('click', function () { switchTab('lineup') })

  $('#btn-save-lineup').addEventListener('click', function () {
    if (DEMO) { toast('阵容已保存（演示）'); return }
    var slots = lineupSlots.map(function (s) { return { key: s.key, playerId: s.playerId || '' } })
    Api.saveLineup(slots).then(function (res) {
      toast(res.ok ? ('阵容已保存 · 战力 ' + (res.power || '-')) : '阵容已保存')
      return Api.lineup().then(function (lineup) {
        applyLineup(lineup)
        renderLineup()
      })
    }).catch(handleApiError)
  })

  function clearBattleTimers() {
    battleTimers.forEach(function (t) { clearTimeout(t) })
    battleTimers = []
  }

  function battleLater(fn, ms) {
    var id = setTimeout(fn, ms)
    battleTimers.push(id)
  }

  function hideAllBattlePhases() {
    ;['#battle-vs', '#battle-reveal', '#battle-report'].forEach(function (sel) {
      var el = $(sel)
      if (el) el.hidden = true
    })
  }

  function openOverlay() {
    var overlay = $('#result-overlay')
    overlay.hidden = false
    overlay.setAttribute('aria-hidden', 'false')
    overlay.classList.add('is-show', 'is-battle-mode')
  }

  function hideResult() {
    clearBattleTimers()
    var overlay = $('#result-overlay')
    overlay.classList.remove('is-show', 'is-battle-mode')
    hideAllBattlePhases()
    overlay.hidden = true
    overlay.setAttribute('aria-hidden', 'true')
  }

  function battleMiniHtml(name, posTag, ovr, src) {
    return (
      '<div class="battle-mini">' +
        '<img class="battle-mini__art" src="' + cardSrc(src) + '" alt="" />' +
        '<div class="battle-mini__meta"><strong>' + name + '</strong><span>' + posTag + '</span></div>' +
        '<div class="battle-mini__ovr">' + ovr + '</div>' +
      '</div>'
    )
  }

  function showBattleFlow(result) {
    var outcomeMap = { win: '胜', lose: '负', draw: '平' }
    var outcome = outcomeMap[result.result] || result.result || '平'
    lastBattle = {
      myScore: result.scoreMine,
      oppScore: result.scoreOpp,
      outcome: outcome,
      comment: result.comment || '',
      oppLabel: result.opponentLabel || '系统对手'
    }
    openOverlay()
    hideAllBattlePhases()
    var vs = $('#battle-vs')
    vs.hidden = false
    var myCards = $('#battle-my-cards')
    var oppCards = $('#battle-opp-cards')
    myCards.innerHTML = lineupSlots.map(function (s) {
      var p = s.playerId ? playerById(s.playerId) : null
      return battleMiniHtml(p ? p.name : '空位', s.posTag, p ? p.ovr : 0, p && p.cardUrl)
    }).join('')
    var oppRows = result.opponentRows || []
    var oppFlat = []
    oppRows.forEach(function (row) {
      if (Array.isArray(row)) row.forEach(function (s) { oppFlat.push(s) })
      else if (row && row.slots) row.slots.forEach(function (s) { oppFlat.push(s) })
      else if (row && row.key) oppFlat.push(row)
    })
    oppCards.innerHTML = (oppFlat.length ? oppFlat : [{ name: '对手', posTag: '-', ovr: '-', player: {} }]).map(function (s) {
      var name = (s.player && s.player.name) || s.name || '对手'
      var ovr = (s.player && s.player.ovr) || s.ovr || '-'
      var pos = s.posTag || (s.player && s.player.position) || ''
      var url = (s.player && s.player.cardUrl) || ''
      return battleMiniHtml(name, pos, ovr, url)
    }).join('')
    $('#battle-my-ovr').textContent = result.myPower || result.scoreMine || 0
    $('#battle-opp-ovr').textContent = result.oppPower || result.scoreOpp || 0

    function goReveal() {
      clearBattleTimers()
      vs.hidden = true
      var rev = $('#battle-reveal')
      rev.hidden = false
      $('#battle-score-mine').textContent = result.scoreMine
      $('#battle-score-opp').textContent = result.scoreOpp
      $('#battle-result-word').textContent = outcome
      $('#battle-comment').textContent = result.comment || ''
      battleLater(goReport, 1600)
    }

    function goReport() {
      $('#battle-reveal').hidden = true
      var rep = $('#battle-report')
      rep.hidden = false
      $('#result-outcome-badge').textContent = outcome
      $('#result-sub').textContent = '比分 ' + result.scoreMine + '–' + result.scoreOpp + ' · 不上榜'
      $('#report-my-score').textContent = result.scoreMine
      $('#report-opp-score').textContent = result.scoreOpp
      var comment = $('#result-comment')
      if (comment) comment.textContent = result.comment || ''
      updateChallenge()
    }

    var skip = $('#battle-vs-skip')
    if (skip) skip.onclick = goReveal
    battleLater(goReveal, 2200)
  }

  $('#btn-challenge').addEventListener('click', function () {
    if (battling) return
    if (DEMO) {
      showBattleFlow({
        result: 'draw',
        scoreMine: 2,
        scoreOpp: 2,
        comment: '势均力敌，下周再约',
        myPower: 400,
        oppPower: 401,
        opponentLabel: '演示对手',
        opponentRows: []
      })
      return
    }
    battling = true
    updateChallenge()
    Api.battle().then(function (res) {
      battling = false
      showBattleFlow(res)
      return Api.battleLog().then(function (log) {
        window.__battleLog = log
      })
    }).catch(function (err) {
      battling = false
      updateChallenge()
      handleApiError(err)
    })
  })

  ;['#btn-history-close', '#result-overlay'].forEach(function (sel) {
    var el = $(sel)
    if (!el) return
    if (sel === '#result-overlay') {
      el.addEventListener('click', function (e) {
        if (e.target === el) hideResult()
      })
    } else {
      el.addEventListener('click', hideResult)
    }
  })

  var closeReport = $('#btn-close-result')
  if (closeReport) closeReport.addEventListener('click', hideResult)

  $('#btn-share').addEventListener('click', function () {
    toast(mainMeta && !mainMeta.empty ? '长按主卡即可保存分享' : '先签约主卡再分享')
  })
  $('#btn-growth').addEventListener('click', function () {
    toast('成长印记按周解锁，规则由平台统一发放')
  })
  $('#btn-gyro').addEventListener('click', function () {
    function go() {
      if (window.HoloCosmos) window.HoloCosmos.enableGyro()
      toast('已开启陀螺仪跟手')
    }
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission().then(function (state) {
        if (state === 'granted') go()
        else toast('未获得方向权限')
      }).catch(function () { toast('设备不支持方向权限请求') })
    } else go()
  })

  function renderBattleLog(log) {
    var overlay = $('#blog-overlay')
    var empty = $('#blog-empty')
    var list = $('#blog-list')
    overlay.hidden = false
    overlay.setAttribute('aria-hidden', 'false')
    var rows = (log && log.rows) || []
    if (!rows.length) {
      empty.hidden = false
      list.innerHTML = ''
      return
    }
    empty.hidden = true
    list.innerHTML = rows.map(function (row) {
      return '<button type="button" class="blog-item" data-id="' + row.id + '">' +
        '<span class="blog-item__result ' + (row.resultClass || '') + '">' + row.resultText + '</span>' +
        '<span class="blog-item__score">' + row.scoreText + '</span>' +
        '<span class="blog-item__meta">' + (row.opponentText || '') + ' · ' + (row.timeText || '') + '</span>' +
        '<span class="blog-item__comment">' + (row.comment || '') + '</span></button>'
    }).join('')
  }

  $('#btn-battle-log').addEventListener('click', function () {
    if (DEMO) {
      renderBattleLog({ rows: [] })
      return
    }
    Api.battleLog().then(renderBattleLog).catch(handleApiError)
  })
  var blogClose = $('#btn-blog-close')
  if (blogClose) {
    blogClose.addEventListener('click', function () {
      var overlay = $('#blog-overlay')
      overlay.hidden = true
      overlay.setAttribute('aria-hidden', 'true')
    })
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    })
  }

  function showBoot(message, retry, retryLabel) {
    var app = $('.app')
    var boot = document.getElementById('boot-state')
    if (!boot) {
      boot = document.createElement('section')
      boot.id = 'boot-state'
      boot.className = 'panel'
      boot.style.cssText = 'margin:24px 16px;padding:28px 18px;text-align:center'
      app.parentNode.insertBefore(boot, app)
    }
    app.hidden = true
    boot.hidden = false
    boot.innerHTML = '<p style="color:#9aa3b5;line-height:1.7">' + escapeHtml(message).replace(/\n/g, '<br>') + '</p>' +
      (retry ? '<button type="button" class="btn btn--gold" id="boot-retry" style="margin-top:16px">' + escapeHtml(retryLabel || '重新加载') + '</button>' : '')
    var btn = document.getElementById('boot-retry')
    if (btn) btn.onclick = retry
  }

  function hideBoot() {
    var app = $('.app')
    var boot = document.getElementById('boot-state')
    if (boot) boot.hidden = true
    if (app) app.hidden = false
  }

  function bootCloud() {
    if (!Api.sessionToken()) {
      showBoot('请先从服务号「我的」登录后再进入赛小蜂足球世界。', function () { Api.goLogin() }, '去登录')
      return
    }
    if (!Api.savedCity()) {
      openCityGate()
      return
    }
    var step = 'cardWorldLogin'
    showBoot('正在进入赛小蜂足球世界…')
    Api.login().then(function () {
      step = 'cardWorldMainCard'
      return Api.mainCard()
    }).then(function (main) {
      mainMeta = main
      step = 'cardWorldAlbum'
      return Api.album()
    }).then(function (album) {
      applyAlbum(album)
      step = 'cardWorldLineup'
      return Api.lineup()
    }).then(function (lineup) {
      applyLineup(lineup)
      hideBoot()
      renderHero()
      switchTab('main')
      updateChallenge()
      if (mainMeta && mainMeta.empty) toast('先去签约领取今日样卡')
    }).catch(function (err) {
      var view = Api.describeBootError(err, step, !!Api.savedCity())
      if (view.type === 'city') {
        openCityGate()
        return
      }
      if (view.type === 'login') {
        showBoot(view.message, function () { Api.goLogin() }, '去登录')
        return
      }
      showBoot(view.message, bootCloud, '重新加载')
    })
  }

  function bootDemo() {
    PLAYERS = [
      { id: 'p1', name: '铁栋泽', pos: '前锋', num: 10, ovr: 82, cardUrl: '', main: true }
    ]
    mainMeta = {
      empty: false,
      name: '铁栋泽',
      positionLabel: '前锋',
      numberText: '#10',
      cardUrl: '',
      stats: [
        { label: '综合', num: '82' },
        { label: '出场', num: '18' },
        { label: '进球', num: '7' },
        { label: '助攻', num: '2' }
      ],
      stamps: [
        { icon: '🥇', name: '熔金边框', lockedClass: '' },
        { icon: '✨', name: '首秀贴纸', lockedClass: '' },
        { icon: '🔒', name: '十场出勤', lockedClass: 'is-locked' },
        { icon: '🔒', name: '破门之夜', lockedClass: 'is-locked' }
      ]
    }
    albumMeta = { signDisabled: false, signBtn: '免费签约', remainText: '今日剩余 1 次', countText: '共 1 张', tiles: [] }
    lineupMeta = { pctText: '20%', pctWidth: '20%', tip: '演示模式 · 可本地体验', challengeDisabled: true }
    lineupSlots[0].playerId = 'p1'
    hideBoot()
    renderHero()
    switchTab('main')
    updateChallenge()
  }

  if (DEMO) bootDemo()
  else bootCloud()
})();
