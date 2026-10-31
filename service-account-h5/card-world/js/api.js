(function (global) {
  'use strict'
  /**
   * 正式入口：https://www.sxffootball.cn/service-account-h5/card-world/
   * 档案不在本页创建。登录态沿用服务号「我的」的 sxf_referee_h5_session，
   * 请求打主仓 webLoginApi 的 cardWorld* action。
   * 球员/球队主档只读主仓，本页不另建球员库。
   */
  var API = 'https://cloud1-7g8ckb3c7815a011-1419431905.ap-shanghai.app.tcloudbase.com/webLoginApi'
  var KEY = 'sxf_referee_h5_session'
  var CITY_KEY = 'sxf_card_world_city'

  function sessionToken() {
    try { return localStorage.getItem(KEY) || '' } catch (e) { return '' }
  }

  function savedCity() {
    try {
      var raw = localStorage.getItem(CITY_KEY)
      if (!raw) return null
      var parsed = JSON.parse(raw)
      if (parsed && /^\d{4,6}$/.test(String(parsed.cityCode || ''))) return parsed
    } catch (e) { /* ignore */ }
    return null
  }

  function saveCity(cityCode, cityName) {
    try {
      localStorage.setItem(CITY_KEY, JSON.stringify({
        cityCode: String(cityCode || ''),
        cityName: String(cityName || '')
      }))
    } catch (e) { /* ignore */ }
  }

  function entryContext() {
    var extra = {}
    try {
      var q = new URLSearchParams(location.search || '')
      var playerId = q.get('playerId') || q.get('player_id') || ''
      if (playerId) extra.playerId = playerId
    } catch (e) { /* ignore */ }
    return extra
  }

  function fail(action, message, code) {
    var err = new Error(message || '操作失败，请重试')
    err.code = code || ''
    err.action = action || ''
    return err
  }

  function api(action, data) {
    var body = Object.assign({
      action: action,
      serviceSessionToken: sessionToken()
    }, entryContext(), data || {})
    var city = savedCity()
    if (city && !body.cityCode) {
      body.cityCode = city.cityCode
      body.cityName = city.cityName
    }
    return fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (r) {
      if (!r.ok) throw fail(action, '接口 HTTP ' + r.status, 'HTTP_' + r.status)
      return r.json().catch(function () {
        throw fail(action, '接口返回无法解析', 'BAD_RESPONSE')
      })
    }, function (networkErr) {
      throw fail(action, (networkErr && networkErr.message) || '网络异常，请稍后重试', 'NETWORK')
    }).then(function (r) {
      if (r && typeof r.body === 'string') {
        try { r = JSON.parse(r.body) } catch (e) {
          throw fail(action, '接口返回无法解析', 'BAD_RESPONSE')
        }
      }
      if (!r || !r.success) {
        throw fail(action, (r && (r.error || r.message)) || '操作失败，请重试', (r && r.code) || '')
      }
      return r
    })
  }

  function goLogin() {
    try { localStorage.removeItem(KEY) } catch (e) { /* ignore */ }
    location.href = '../me.html'
  }

  function describeBootError(err, step, hasCity) {
    var code = String((err && err.code) || '')
    var action = String((err && err.action) || step || '')
    var message = String((err && err.message) || '').trim() || '暂时无法进入，请稍后重试'
    if (code === 'WORLD_CITY_REQUIRED') return { type: 'city' }
    if (!hasCity && (code === 'WORLD_PROFILE_INIT_FAILED' || message.indexOf('档案初始化失败') >= 0)) {
      return { type: 'city' }
    }
    var text = message
    if (action || code) {
      text += '\n失败接口：' + (action || 'cardWorld') + (code ? '（' + code + '）' : '')
    }
    if (code === 'WORLD_LOGIN_REQUIRED' || code === 'SERVICE_PRIVATE_AUTH_REQUIRED' || code === 'WORLD_PHONE_UNBOUND') {
      return { type: 'login', message: text }
    }
    return { type: 'retry', message: text }
  }

  global.CardWorldApi = {
    KEY: KEY,
    API: API,
    sessionToken: sessionToken,
    savedCity: savedCity,
    saveCity: saveCity,
    entryContext: entryContext,
    describeBootError: describeBootError,
    goLogin: goLogin,
    login: function (extra) { return api('cardWorldLogin', extra) },
    mainCard: function (extra) { return api('cardWorldMainCard', extra) },
    album: function (extra) { return api('cardWorldAlbum', extra) },
    lineup: function (extra) { return api('cardWorldLineup', extra) },
    ownedCards: function (extra) { return api('cardWorldOwnedCards', extra) },
    battleLog: function (extra) { return api('cardWorldBattleLog', extra) },
    sign: function (extra) { return api('cardWorldSignSameCity', extra) },
    setSlot: function (key, playerId) { return api('cardWorldSetSlot', { key: key, playerId: playerId || '' }) },
    saveLineup: function (slots) { return api('cardWorldSaveLineup', { slots: slots || [] }) },
    setRosterSize: function (size) { return api('cardWorldSetRosterSize', { rosterSize: size }) },
    battle: function (extra) { return api('cardWorldBattle', extra) },
    membership: function (extra) { return api('cardWorldMembership', extra) }
  }
})(window);
