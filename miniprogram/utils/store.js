/**
 * 小程序本地演示名册，不负责正式档案初始化。
 * 服务号正式入口是 H5：/service-account-h5/card-world/
 * 档案由主仓 webLoginApi 的 cardWorldLogin 按服务号会话创建，球员主档仍用主站数据。
 * 文案：签约 / 入队建档；禁止抽卡 / 开包 / 卡池话术
 */
var CARD = '/assets/demo-card.png'

var state = {
  players: [
    { id: 'p1', name: '铁栋泽', en: 'TIE D.Z.', pos: '前锋', num: 10, ovr: 82, apps: 18, goals: 7, honors: 2, main: true, cardUrl: CARD },
    { id: 'p2', name: '周凯', en: 'ZHOU K.', pos: '中场', num: 8, ovr: 78, apps: 16, goals: 3, honors: 1, main: false, cardUrl: CARD },
    { id: 'p3', name: '李昊', en: 'LI H.', pos: '后卫', num: 4, ovr: 76, apps: 20, goals: 1, honors: 0, main: false, cardUrl: CARD },
    { id: 'p4', name: '陈宇', en: 'CHEN Y.', pos: '门将', num: 1, ovr: 79, apps: 15, goals: 0, honors: 1, main: false, cardUrl: CARD },
    { id: 'p5', name: '王磊', en: 'WANG L.', pos: '前锋', num: 9, ovr: 80, apps: 14, goals: 9, honors: 2, main: false, cardUrl: CARD },
    { id: 'p6', name: '赵鹏', en: 'ZHAO P.', pos: '后卫', num: 5, ovr: 74, apps: 12, goals: 0, honors: 0, main: false, cardUrl: CARD }
  ],
  ownedIds: ['p1'],
  signRemain: 1,
  lastSignedName: '',
  signSuccess: false,
  lineup: [
    { key: 'st', label: '前锋', posTag: 'ST', playerId: 'p1' },
    { key: 'lm', label: '左边', posTag: 'LM', playerId: '' },
    { key: 'rm', label: '右边', posTag: 'RM', playerId: '' },
    { key: 'cb', label: '中卫', posTag: 'CB', playerId: '' },
    { key: 'gk', label: '门将', posTag: 'GK', playerId: '' }
  ],
  battleLog: []
}

function playerById(id) {
  for (var i = 0; i < state.players.length; i++) if (state.players[i].id === id) return state.players[i]
  return null
}

function ownedPlayers() {
  var list = []
  for (var i = 0; i < state.ownedIds.length; i++) {
    var p = playerById(state.ownedIds[i])
    if (p) list.push(p)
  }
  return list
}

function mainPlayer() {
  for (var i = 0; i < state.players.length; i++) if (state.players[i].main) return state.players[i]
  return state.players[0]
}

function albumTiles() {
  return ownedPlayers().map(function (p) {
    return {
      id: p.id,
      name: p.name,
      pos: p.pos,
      num: p.num,
      cardUrl: p.cardUrl,
      isMain: !!p.main,
      metaText: p.pos + ' · #' + p.num,
      mainLabel: p.main ? '主卡' : ''
    }
  })
}

function lineupFilledCount() {
  var n = 0
  for (var i = 0; i < state.lineup.length; i++) if (state.lineup[i].playerId) n++
  return n
}

function lineupHasGk() {
  return !!(state.lineup[4] && state.lineup[4].playerId)
}

function challengePercent() {
  var filled = lineupFilledCount()
  var pct = Math.min(100, filled * 18 + (lineupHasGk() ? 10 : 0))
  if (filled === 5 && lineupHasGk()) pct = 100
  return pct
}

function canChallenge() {
  return lineupFilledCount() === 5 && lineupHasGk()
}

function doFreeSign() {
  if (state.signRemain < 1) return { ok: false, message: '今日免费签约次数已用完' }
  var pool = []
  for (var i = 0; i < state.players.length; i++) {
    if (state.ownedIds.indexOf(state.players[i].id) < 0) pool.push(state.players[i])
  }
  if (!pool.length) return { ok: false, message: '同城可签球员已全部入册' }
  /* 同城确定性：按名册顺序取下一位可签球员，不做随机开包 */
  var pick = pool[0]
  state.ownedIds.push(pick.id)
  state.signRemain = 0
  state.lastSignedName = pick.name
  state.signSuccess = true
  return { ok: true, player: pick }
}

function usedLineupIds() {
  var ids = []
  for (var i = 0; i < state.lineup.length; i++) if (state.lineup[i].playerId) ids.push(state.lineup[i].playerId)
  return ids
}

function setSlot(key, playerId) {
  for (var i = 0; i < state.lineup.length; i++) {
    if (state.lineup[i].playerId === playerId) state.lineup[i].playerId = ''
  }
  for (var j = 0; j < state.lineup.length; j++) {
    if (state.lineup[j].key === key) state.lineup[j].playerId = playerId || ''
  }
}

function lineupRowsView() {
  var slots = state.lineup
  function cell(s) {
    var p = s.playerId ? playerById(s.playerId) : null
    return {
      key: s.key,
      posTag: s.posTag,
      label: s.label,
      filled: !!p,
      name: p ? p.name : '点选占位',
      cardUrl: p ? p.cardUrl : '',
      filledClass: p ? 'is-filled' : ''
    }
  }
  return [
    { cells: [cell(slots[0])] },
    { cells: [cell(slots[1]), cell(slots[2])] },
    { cells: [cell(slots[3])] },
    { cells: [cell(slots[4])] }
  ]
}

module.exports = {
  state: state,
  CARD: CARD,
  playerById: playerById,
  ownedPlayers: ownedPlayers,
  mainPlayer: mainPlayer,
  albumTiles: albumTiles,
  lineupFilledCount: lineupFilledCount,
  lineupHasGk: lineupHasGk,
  challengePercent: challengePercent,
  canChallenge: canChallenge,
  doFreeSign: doFreeSign,
  usedLineupIds: usedLineupIds,
  setSlot: setSlot,
  lineupRowsView: lineupRowsView
}
