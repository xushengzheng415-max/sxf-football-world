'use strict'

var assert = require('assert')
var fs = require('fs')
var path = require('path')
var vm = require('vm')

function loadApi(locationSearch) {
  var store = {}
  var context = {
    URLSearchParams: URLSearchParams,
    console: console,
    location: {
      search: locationSearch || '',
      href: 'http://127.0.0.1/service-account-h5/card-world/index.html',
      origin: 'http://127.0.0.1'
    },
    localStorage: {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : '' },
      setItem: function (k, v) { store[k] = String(v) },
      removeItem: function (k) { delete store[k] }
    },
    fetch: function () { throw new Error('fetch not stubbed') }
  }
  context.window = context
  vm.createContext(context)
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'api.js'), 'utf8'), context)
  context.__store = store
  return context
}

var api = loadApi('').CardWorldApi

var login = api.describeBootError(
  { message: '请重新连接微信', code: 'WORLD_LOGIN_REQUIRED', action: 'cardWorldLogin' },
  'cardWorldLogin',
  true
)
assert.strictEqual(login.type, 'login')
assert.ok(login.message.indexOf('请重新连接微信') >= 0)
assert.ok(login.message.indexOf('失败接口：cardWorldLogin（WORLD_LOGIN_REQUIRED）') >= 0)
assert.ok(login.message.indexOf('档案初始化失败') < 0)

var city = api.describeBootError(
  { message: '请选择城市', code: 'WORLD_CITY_REQUIRED', action: 'cardWorldLogin' },
  'cardWorldLogin',
  false
)
assert.strictEqual(city.type, 'city')

var initNoCity = api.describeBootError(
  { message: '卡世界档案初始化失败，请稍后重试', code: 'WORLD_PROFILE_INIT_FAILED', action: 'cardWorldLogin' },
  'cardWorldLogin',
  false
)
assert.strictEqual(initNoCity.type, 'city')

var initWithCity = api.describeBootError(
  { message: '卡世界档案初始化失败，请稍后重试', code: 'WORLD_PROFILE_INIT_FAILED', action: 'cardWorldLogin' },
  'cardWorldLogin',
  true
)
assert.strictEqual(initWithCity.type, 'retry')
assert.ok(initWithCity.message.indexOf('卡世界档案初始化失败，请稍后重试') === 0)
assert.ok(initWithCity.message.indexOf('失败接口：cardWorldLogin（WORLD_PROFILE_INIT_FAILED）') >= 0)

var specific = api.describeBootError(
  { message: '球员主档不存在', code: 'WORLD_PLAYER_UNBOUND', action: 'cardWorldMainCard' },
  'cardWorldLogin',
  true
)
assert.strictEqual(specific.type, 'retry')
assert.ok(specific.message.indexOf('球员主档不存在') >= 0)
assert.ok(specific.message.indexOf('失败接口：cardWorldMainCard（WORLD_PLAYER_UNBOUND）') >= 0)
assert.ok(specific.message.indexOf('档案初始化失败') < 0)

var stepped = api.describeBootError(new Error('网络异常，请稍后重试'), 'cardWorldAlbum', true)
assert.ok(stepped.message.indexOf('失败接口：cardWorldAlbum') >= 0)

var withPlayer = loadApi('?playerId=player-42')
var posted = null
withPlayer.fetch = function (url, opts) {
  posted = { url: url, body: JSON.parse(opts.body) }
  return Promise.resolve({
    ok: true,
    json: function () {
      return Promise.resolve({ success: false, code: 'WORLD_PROFILE_INIT_FAILED', error: '卡世界档案初始化失败，请稍后重试' })
    }
  })
}
withPlayer.localStorage.setItem('sxf_referee_h5_session', 'session-token')
withPlayer.localStorage.setItem('sxf_card_world_city', JSON.stringify({ cityCode: '410100', cityName: '郑州市' }))
withPlayer.CardWorldApi.login().then(function () {
  throw new Error('login should fail')
}, function (err) {
  assert.strictEqual(posted.body.action, 'cardWorldLogin')
  assert.strictEqual(posted.body.serviceSessionToken, 'session-token')
  assert.strictEqual(posted.body.playerId, 'player-42')
  assert.strictEqual(posted.body.cityCode, '410100')
  assert.strictEqual(posted.body.cityName, '郑州市')
  assert.strictEqual(err.action, 'cardWorldLogin')
  assert.strictEqual(err.code, 'WORLD_PROFILE_INIT_FAILED')
  assert.strictEqual(err.message, '卡世界档案初始化失败，请稍后重试')
  var view = withPlayer.CardWorldApi.describeBootError(err, 'cardWorldLogin', true)
  assert.strictEqual(view.type, 'retry')
  console.log('boot-error.test.js ok')
}).catch(function (err) {
  console.error(err)
  process.exit(1)
})
