(function () {
  'use strict';

  var CARD_IMG = 'assets/tie-dongze-card.png';

  var PLAYERS = [
    { id: 'p1', name: '铁栋泽', en: 'TIE D.Z.', pos: '前锋', num: 10, ovr: 82, apps: 18, goals: 7, honors: 2, main: true },
    { id: 'p2', name: '周凯', en: 'ZHOU K.', pos: '中场', num: 8, ovr: 78, apps: 16, goals: 3, honors: 1, main: false },
    { id: 'p3', name: '李昊', en: 'LI H.', pos: '后卫', num: 4, ovr: 76, apps: 20, goals: 1, honors: 0, main: false },
    { id: 'p4', name: '陈宇', en: 'CHEN Y.', pos: '门将', num: 1, ovr: 79, apps: 15, goals: 0, honors: 1, main: false },
    { id: 'p5', name: '王磊', en: 'WANG L.', pos: '前锋', num: 9, ovr: 80, apps: 14, goals: 9, honors: 2, main: false },
    { id: 'p6', name: '赵鹏', en: 'ZHAO P.', pos: '后卫', num: 5, ovr: 74, apps: 12, goals: 0, honors: 0, main: false }
  ];

  var lineupSlots = [
    { key: 'st', label: '前锋', posTag: 'ST', playerId: 'p1' },
    { key: 'lm', label: '左边', posTag: 'LM', playerId: null },
    { key: 'rm', label: '右边', posTag: 'RM', playerId: null },
    { key: 'cb', label: '中卫', posTag: 'CB', playerId: null },
    { key: 'gk', label: '门将', posTag: 'GK', playerId: null }
  ];

  var activeSlot = null;
  var meetUsedToday = false;
  var lastMeetName = null;
  var challengeDone = false;
  var lastBattle = null; // { myScore, oppScore, outcome, comment, oppLineup, firstClear }
  var battleTimers = [];
  var battleSessionOppJitter = null;
  var viewingLogEntry = null; // history reopen entry
  var pendingChallenge = null; // { id, entry } from ?challenge=
  var activeReportEntry = null; // current report used for share/invite
  var BATTLE_LOG_KEY = 'sxf-battle-log-v1';
  var BATTLE_LOG_MAX = 20;

  var MOCK_OPPONENTS = [
    { id: 'opp1', name: '韩锋', pos: '前锋', posTag: 'ST', ovr: 84 },
    { id: 'opp2', name: '顾宁', pos: '中场', posTag: 'LM', ovr: 79 },
    { id: 'opp3', name: '沈岳', pos: '中场', posTag: 'RM', ovr: 77 },
    { id: 'opp4', name: '唐川', pos: '后卫', posTag: 'CB', ovr: 81 },
    { id: 'opp5', name: '白墨', pos: '门将', posTag: 'GK', ovr: 80 }
  ];

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function toast(msg) {
    var el = $('#toast');
    el.textContent = msg;
    el.classList.add('is-show');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { el.classList.remove('is-show'); }, 2200);
  }

  function holoMarkup(opts) {
    opts = opts || {};
    var mini = opts.mini ? ' holo-card--mini' : '';
    var aria = opts.name || '球员卡';
    return (
      '<div class="holo-card' + mini + '" data-effect="cosmos" style="--card-mask:url(\'' + CARD_IMG + '\')">' +
        '<button type="button" class="holo-card__rotator" aria-label="' + aria + ' 箔光卡">' +
          '<div class="holo-card__front"><img src="' + CARD_IMG + '" alt="' + aria + '" /></div>' +
          '<div class="holo-card__shine" aria-hidden="true"></div>' +
          '<div class="holo-card__glare" aria-hidden="true"></div>' +
        '</button>' +
      '</div>'
    );
  }

  /* Tabs */
  function switchTab(name) {
    $all('.view').forEach(function (v) {
      v.classList.toggle('is-active', v.dataset.view === name);
    });
    $all('.tab').forEach(function (t) {
      t.classList.toggle('is-active', t.dataset.tab === name);
    });
    if (name === 'album') renderAlbum();
    if (name === 'lineup') renderLineup();
  }

  $all('.tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      switchTab(tab.dataset.tab);
    });
  });

  /* Main card quick nav */
  $all('.quick-nav__btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var goto = btn.getAttribute('data-goto');
      if (goto) switchTab(goto);
    });
  });

  /* Main card */
  function renderHero() {
    var mount = $('#hero-card');
    mount.innerHTML = holoMarkup({ name: '铁栋泽' });
    window.HoloCosmos.bindAll(mount);
    var hero = mount.querySelector('.holo-card');
    setTimeout(function () { window.HoloCosmos.showcase(hero, 4200); }, 400);
    var main = PLAYERS.find(function (p) { return p.main; }) || PLAYERS[0];
    var grid = document.getElementById('ability-grid');
    if (grid && main) {
      var keys = [
        { k: 'ovr', l: '综合分' },
        { k: 'apps', l: '出场' },
        { k: 'goals', l: '进球' },
        { k: 'honors', l: '荣誉' }
      ];
      grid.innerHTML = keys.map(function (row) {
        return '<div class="stat"><div class="stat__num">' + (main[row.k] != null ? main[row.k] : '-') + '</div><div class="stat__label">' + row.l + '</div></div>';
      }).join('');
    }
  }

  $('#btn-share').addEventListener('click', function () {
    toast('已生成分享海报（原型 mock：可保存主卡图）');
  });
  $('#btn-growth').addEventListener('click', function () {
    toast('成长印记：本周出勤 +1，熔金边框已点亮');
  });
  $('#btn-gyro').addEventListener('click', function () {
    function go() {
      window.HoloCosmos.enableGyro();
      toast('已开启陀螺仪跟手（需 HTTPS / 授权）');
    }
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission().then(function (state) {
        if (state === 'granted') go();
        else toast('未获得方向权限，请用鼠标/手指滑动卡面');
      }).catch(function () { toast('设备不支持方向权限请求'); });
    } else {
      go();
    }
  });

  /* Album / meet */
  function renderAlbum() {
    var grid = $('#card-grid');
    var empty = $('#album-empty');
    var legend = $('#album-legend');
    var hint = $('#album-count-hint');
    var meetSuccess = $('#meet-success');

    if (!PLAYERS.length) {
      empty.hidden = false;
      legend.hidden = true;
      grid.innerHTML = '';
      hint.textContent = '卡册为空 · 先签约';
    } else {
      empty.hidden = true;
      legend.hidden = false;
      var meetCount = PLAYERS.filter(function (p) { return !p.main; }).length;
      hint.textContent = '共 ' + PLAYERS.length + ' 张 · 样卡 ' + meetCount + ' · 点按感受轻箔光';
      grid.innerHTML = PLAYERS.map(function (p) {
        return (
          '<div class="mini-slot' + (p.main ? ' is-main' : '') + '" data-id="' + p.id + '">' +
            holoMarkup({ mini: true, name: p.name }) +
            '<div class="mini-slot__meta"><strong>' + p.name + '</strong>' + p.pos + ' · OVR ' + (p.ovr || '-') + '</div>' +
          '</div>'
        );
      }).join('');
      window.HoloCosmos.bindAll(grid);
    }

    if (meetUsedToday && lastMeetName) {
      meetSuccess.hidden = false;
      $('#meet-success-title').textContent = '签约成功 · ' + lastMeetName;
      $('#meet-success-desc').textContent = '样卡已入册，去组阵凑齐 5 人发起轻挑战';
    } else {
      meetSuccess.hidden = true;
    }

    updateMeetBtn();
  }

  function updateMeetBtn() {
    var btn = $('#btn-meet');
    if (meetUsedToday) {
      btn.disabled = true;
      btn.textContent = '今日已签约';
      $('#meet-remain').textContent = '明日再来 · 免费 1 次/日';
    } else {
      btn.disabled = false;
      btn.textContent = '免费签约';
      $('#meet-remain').textContent = '今日剩余 1 次';
    }
  }

  $('#btn-meet').addEventListener('click', function () {
    if (meetUsedToday) return;
    meetUsedToday = true;
    var pool = ['孙毅', '马超', '刘洋', '高峰'];
    var name = pool[Math.floor(Math.random() * pool.length)];
    var ovr = 70 + Math.floor(Math.random() * 12);
    var newbie = {
      id: 'meet-' + Date.now(),
      name: name,
      en: 'MEET',
      pos: '中场',
      num: 7 + Math.floor(Math.random() * 10),
      ovr: ovr,
      apps: 2 + Math.floor(Math.random() * 10),
      goals: Math.floor(Math.random() * 5),
      honors: Math.floor(Math.random() * 2),
      main: false
    };
    PLAYERS.push(newbie);
    updateMeetBtn();
    playMeetReveal(newbie);
  });

  function playMeetReveal(player) {
    var overlay = $('#meet-reveal');
    var pack = $('#meet-pack');
    var card = $('#meet-card3d');
    var whole = $('#meet-pack-whole');
    var closeBtn = $('#meet-reveal-close');
    if (!overlay || !pack || !card) {
      toast('签约成功：获得「' + player.name + '」样卡');
      renderAlbum();
      return;
    }
    $('#meet-reveal-title').textContent = '签约 · ' + player.name;
    $('#meet-reveal-sub').textContent = '撕包中…';
    if (closeBtn) closeBtn.style.display = 'none';
    pack.className = 'meet-pack';
    pack.style.cssText = '';
    if (whole) whole.style.display = '';
    card.className = 'meet-card3d';
    overlay.classList.add('is-show');

    setTimeout(function () { pack.classList.add('is-ripping'); }, 200);
    setTimeout(function () {
      if (whole) whole.style.display = 'none';
      pack.classList.add('is-split');
      $('#meet-reveal-sub').textContent = '卡弹出…';
    }, 700);
    setTimeout(function () {
      card.classList.add('show');
      $('#meet-reveal-sub').textContent = '综合分 ' + player.ovr;
    }, 1250);
    setTimeout(function () {
      pack.classList.add('is-gone');
    }, 1550);
    setTimeout(function () {
      card.classList.add('flipped', 'glow', 'foil-on');
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
      card.style.setProperty('--mx', '50%');
      card.style.setProperty('--my', '40%');
      $('#meet-reveal-sub').textContent = '签约成功 · 滑动看箔光';
      if (closeBtn) closeBtn.style.display = '';
    }, 1900);
  }

  var meetCard = $('#meet-card3d');
  if (meetCard && !meetCard._foilBound) {
    meetCard._foilBound = true;
    meetCard.addEventListener('pointermove', function (e) {
      if (!meetCard.classList.contains('foil-on')) return;
      var r = meetCard.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width;
      var py = (e.clientY - r.top) / r.height;
      meetCard.style.setProperty('--mx', (px * 100) + '%');
      meetCard.style.setProperty('--my', (py * 100) + '%');
      meetCard.style.setProperty('--rx', ((0.5 - py) * 16) + 'deg');
      meetCard.style.setProperty('--ry', ((px - 0.5) * 18) + 'deg');
    });
  }

  var closeReveal = $('#meet-reveal-close');
  if (closeReveal) {
    closeReveal.addEventListener('click', function () {
      var overlay = $('#meet-reveal');
      var pack = $('#meet-pack');
      var card = $('#meet-card3d');
      if (pack) pack.className = 'meet-pack';
      if (card) {
        card.className = 'meet-card3d';
        card.style.removeProperty('--rx');
        card.style.removeProperty('--ry');
        card.style.removeProperty('--mx');
        card.style.removeProperty('--my');
      }
      if (overlay) overlay.classList.remove('is-show');
      renderAlbum();
      var success = $('#meet-success');
      if (success) success.hidden = false;
      toast('已收入卡册');
    });
  }

  $('#btn-goto-lineup').addEventListener('click', function () {
    switchTab('lineup');
  });

  /* Lineup */
  function playerById(id) {
    for (var i = 0; i < PLAYERS.length; i++) if (PLAYERS[i].id === id) return PLAYERS[i];
    return null;
  }

  function usedIds() {
    return lineupSlots.map(function (s) { return s.playerId; }).filter(Boolean);
  }

  function isLineupReady() {
    var filled = lineupSlots.filter(function (s) { return s.playerId; }).length;
    return filled === 5 && !!lineupSlots[4].playerId;
  }

  function renderLineup() {
    var pitch = $('#pitch-slots');
    var rows = [
      [lineupSlots[0]],
      [lineupSlots[1], lineupSlots[2]],
      [lineupSlots[3]],
      [lineupSlots[4]]
    ];
    pitch.innerHTML = rows.map(function (row) {
      return '<div class="slots__row">' + row.map(function (s) {
        var p = s.playerId ? playerById(s.playerId) : null;
        var filled = p ? ' is-filled' : '';
        var active = activeSlot === s.key ? ' is-active' : '';
        var body = p
          ? '<div class="slot__card">' + holoMarkup({ mini: true, name: p.name }) +
            '<div class="slot__badge"><span class="slot__rating">' + (p.ovr || 70) + '</span><span class="slot__pos">' + s.posTag + '</span></div>' +
            '<div class="slot__name">' + p.name + '</div></div>'
          : '<div class="slot__empty"><span class="slot__pos">' + s.posTag + '</span><span>点选</span><span>' + s.label + '</span></div>';
        return '<div class="slot' + filled + active + '" data-slot="' + s.key + '" role="button" tabindex="0">' + body + '</div>';
      }).join('') + '</div>';
    }).join('');

    $all('.slot', pitch).forEach(function (el) {
      el.addEventListener('click', function () {
        activeSlot = el.dataset.slot;
        renderLineup();
        openPicker();
      });
    });
    if (window.HoloCosmos) window.HoloCosmos.bindAll(pitch);

    updateChallenge();
  }

  function openPicker() {
    var picker = $('#picker');
    picker.classList.add('is-open');
    var used = usedIds();
    var list = $('#picker-list');
    list.innerHTML = PLAYERS.map(function (p) {
      var usedCls = used.indexOf(p.id) >= 0 ? ' is-used' : '';
      return '<button type="button" class="picker__chip' + usedCls + '" data-id="' + p.id + '">' +
        p.name + ' · ' + p.pos + '</button>';
    }).join('') +
      '<button type="button" class="picker__chip" data-id="">清空此位</button>';

    $all('.picker__chip', list).forEach(function (chip) {
      chip.addEventListener('click', function () {
        if (!activeSlot) return;
        var slot = lineupSlots.find(function (s) { return s.key === activeSlot; });
        if (!slot) return;
        var id = chip.dataset.id || null;
        if (id) {
          lineupSlots.forEach(function (s) {
            if (s.playerId === id) s.playerId = null;
          });
        }
        slot.playerId = id;
        activeSlot = null;
        picker.classList.remove('is-open');
        renderLineup();
        toast(id ? '已放入阵容' : '已清空占位');
      });
    });
  }

  function updateChallenge() {
    var filled = lineupSlots.filter(function (s) { return s.playerId; }).length;
    var pct = Math.min(100, filled * 18 + (lineupSlots[4].playerId ? 10 : 0));
    if (filled === 5 && lineupSlots[4].playerId) pct = 100;
    if (challengeDone) pct = 100;
    $('#challenge-bar').style.width = pct + '%';
    $('#challenge-pct').textContent = pct + '%';

    var tip;
    if (challengeDone && lastBattle) {
      tip = '本周已战 · ' + lastBattle.outcome + ' ' + lastBattle.myScore + '–' + lastBattle.oppScore + ' · 点「再战一局」开下一场（不上榜）';
    } else if (challengeDone) {
      tip = '本周已有战报 · 点「再战一局」换对手再打';
    } else if (filled < 5) {
      tip = '目标：凑齐 5 人（含门将）· 轻对战不上榜';
    } else if (!lineupSlots[4].playerId) {
      tip = '还差门将占位 · 填满后可发起轻挑战';
    } else {
      tip = '阵容已满 · 点发起轻挑战 → 对战揭晓';
    }
    $('#challenge-tip').textContent = tip;

    var btn = $('#btn-challenge');
    var viewBtn = $('#btn-view-report');
    var saveBtn = $('#btn-save-lineup');
    if (challengeDone) {
      btn.disabled = !isLineupReady();
      btn.textContent = '再战一局';
      if (viewBtn) {
        viewBtn.hidden = !lastBattle;
      }
      if (saveBtn) saveBtn.hidden = !!lastBattle; // keep row to 查看战报 | 再战一局
    } else if (isLineupReady()) {
      btn.disabled = false;
      btn.textContent = '发起轻挑战';
      if (viewBtn) viewBtn.hidden = true;
      if (saveBtn) saveBtn.hidden = false;
    } else {
      btn.disabled = true;
      btn.textContent = '发起轻挑战';
      if (viewBtn) viewBtn.hidden = true;
      if (saveBtn) saveBtn.hidden = false;
    }
  }

  function clearBattleTimers() {
    battleTimers.forEach(function (t) { clearTimeout(t); });
    battleTimers = [];
  }

  function battleLater(fn, ms) {
    var id = setTimeout(fn, ms);
    battleTimers.push(id);
    return id;
  }

  function getMyLineupPlayers() {
    return lineupSlots.map(function (s) {
      var p = s.playerId ? playerById(s.playerId) : null;
      return {
        key: s.key,
        posTag: s.posTag,
        name: p ? p.name : '空位',
        ovr: p ? (p.ovr || 70) : 0,
        filled: !!p
      };
    });
  }

  function calcMyScore(lineupPlayers) {
    var sum = 0;
    var filledOther = 0;
    lineupPlayers.forEach(function (p) {
      sum += p.ovr || 0;
      if (p.key === 'gk' && p.filled) sum += 3;
      else if (p.key === 'st' && p.filled) sum += 2;
      else if (p.filled) filledOther += 1;
    });
    sum += filledOther; // +1 per other filled
    return sum;
  }

  function rollOppLineup(reroll) {
    // Base OVRs sum ~401; apply session jitter ±8 once, or re-roll slightly for 再战
    var base = MOCK_OPPONENTS.map(function (o) {
      return { id: o.id, name: o.name, pos: o.pos, posTag: o.posTag, ovr: o.ovr };
    });
    if (battleSessionOppJitter == null || reroll) {
      battleSessionOppJitter = Math.floor(Math.random() * 17) - 8; // -8..+8
    }
    // Distribute jitter across positions for visual variety
    var jitter = battleSessionOppJitter;
    var adj = [0, 0, 0, 0, 0];
    var remain = jitter;
    for (var i = 0; i < 4; i++) {
      var step = remain === 0 ? 0 : (remain > 0 ? 1 : -1) * Math.min(2, Math.abs(remain));
      // slight random split
      step = remain === 0 ? 0 : (Math.random() < 0.5 ? (remain > 0 ? 1 : -1) : (remain > 0 ? 2 : -2));
      if (Math.abs(step) > Math.abs(remain)) step = remain;
      adj[i] = step;
      remain -= step;
    }
    adj[4] = remain;
    base.forEach(function (o, i) {
      o.ovr = Math.max(70, Math.min(88, o.ovr + adj[i]));
    });
    return base;
  }

  function calcOppScore(oppLineup) {
    var sum = 0;
    oppLineup.forEach(function (o) { sum += o.ovr; });
    // mirror position bonus for fairness (~+8 when full)
    sum += 3 + 2 + 3;
    return sum;
  }

  function decideOutcome(myScore, oppScore) {
    var diff = myScore - oppScore;
    if (diff > 5) return '胜';
    if (Math.abs(diff) <= 5) return '平';
    return '负';
  }

  function pickComment(outcome, lineupPlayers) {
    if (outcome === '胜') {
      var st = lineupPlayers.find(function (p) { return p.key === 'st'; });
      if (st && st.ovr >= 80) return '前场压制奏效';
      return '门将稳住了后场';
    }
    if (outcome === '平') return '势均力敌，下周再约';
    return '略逊一筹，下周再战';
  }

  function battleMiniHtml(name, posTag, ovr) {
    return (
      '<div class="battle-mini">' +
        '<img class="battle-mini__art" src="' + CARD_IMG + '" alt="" />' +
        '<div class="battle-mini__meta"><strong>' + name + '</strong><span>' + posTag + '</span></div>' +
        '<div class="battle-mini__ovr">' + ovr + '</div>' +
      '</div>'
    );
  }

  function hideAllBattlePhases() {
    var vs = $('#battle-vs');
    var rev = $('#battle-reveal');
    var rep = $('#battle-report');
    if (vs) vs.hidden = true;
    if (rev) rev.hidden = true;
    if (rep) rep.hidden = true;
  }

  function openOverlay() {
    var overlay = $('#result-overlay');
    overlay.hidden = false;
    overlay.setAttribute('aria-hidden', 'false');
    overlay.classList.add('is-show', 'is-battle-mode');
  }

  function hideResult() {
    clearBattleTimers();
    viewingLogEntry = null;
    var overlay = $('#result-overlay');
    overlay.classList.remove('is-show', 'is-battle-mode');
    hideAllBattlePhases();
    overlay.hidden = true;
    overlay.setAttribute('aria-hidden', 'true');
    var live = $('#result-actions-live');
    var hist = $('#result-actions-history');
    if (live) live.hidden = false;
    if (hist) hist.hidden = true;
  }

  function persistBattle() {
    try {
      localStorage.setItem('sxf-challenge-done-v1', challengeDone ? '1' : '0');
      localStorage.setItem('sxf-lineup-v1', JSON.stringify(lineupSlots.map(function (s) {
        return { key: s.key, playerId: s.playerId };
      })));
      if (lastBattle) {
        localStorage.setItem('sxf-battle-v1', JSON.stringify(lastBattle));
      }
    } catch (e) { /* ignore */ }
  }

  function makeBattleId() {
    return 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function loadBattleLog() {
    try {
      var raw = localStorage.getItem(BATTLE_LOG_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function saveBattleLog(arr) {
    try {
      localStorage.setItem(BATTLE_LOG_KEY, JSON.stringify((arr || []).slice(0, BATTLE_LOG_MAX)));
    } catch (e) { /* ignore */ }
  }

  function findLogEntry(id) {
    if (!id) return null;
    var log = loadBattleLog();
    for (var i = 0; i < log.length; i++) {
      if (log[i] && log[i].id === id) return log[i];
    }
    return null;
  }

  function formatShanghaiTime(ts) {
    try {
      return new Date(ts).toLocaleString('zh-CN', {
        timeZone: 'Asia/Shanghai',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } catch (e) {
      var d = new Date(ts);
      return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0');
    }
  }

  function lineupShortNames(lineup) {
    if (!lineup || !lineup.length) return '空阵';
    return lineup.map(function (p) { return p.name || '?'; }).join('·');
  }

  function battleToLogEntry(battle, extra) {
    extra = extra || {};
    var mine = getMyLineupPlayers();
    var oppName = battle.oppName || extra.oppName || '对手';
    if (!battle.oppName && !extra.oppName && battle.oppLineup && battle.oppLineup.length) {
      oppName = (battle.oppLineup[0].name || '对手') + '队';
    }
    return {
      id: battle.logId || makeBattleId(),
      ts: Date.now(),
      result: battle.outcome,
      myScore: battle.myScore,
      oppScore: battle.oppScore,
      commentary: battle.comment || '',
      lineup: mine.map(function (p) {
        return { key: p.key, name: p.name, ovr: p.ovr, pos: p.posTag };
      }),
      oppName: oppName,
      oppLineup: (battle.oppLineup || []).map(function (o) {
        return { id: o.id, name: o.name, pos: o.pos, posTag: o.posTag || o.pos, ovr: o.ovr };
      }),
      vsChallengeId: extra.vsChallengeId || battle.vsChallengeId || null
    };
  }

  function prependBattleLog(entry) {
    if (!entry || !entry.id) return;
    var log = loadBattleLog().filter(function (e) { return e && e.id !== entry.id; });
    log.unshift(entry);
    saveBattleLog(log);
  }

  function challengeShareUrl(id) {
    var base = location.href.split('?')[0].split('#')[0];
    return base + '?challenge=' + encodeURIComponent(id);
  }

  function buildShareText(entry) {
    var names = lineupShortNames(entry.lineup);
    return (
      '【赛小蜂足球】轻对战战报\n' +
      '结果：' + entry.result + ' ' + entry.myScore + '-' + entry.oppScore + '\n' +
      '阵容：' + names + '\n' +
      '来应战：' + challengeShareUrl(entry.id)
    );
  }

  function copyText(text, okMsg) {
    okMsg = okMsg || '战报已复制';
    function fallback() {
      try {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        var ok = document.execCommand('copy');
        document.body.removeChild(ta);
        if (ok) {
          toast(okMsg);
          return;
        }
      } catch (e) { /* fall through */ }
      try {
        window.prompt('复制战报链接', text);
      } catch (e2) { /* ignore */ }
      toast(okMsg);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        toast(okMsg);
      }).catch(function () {
        fallback();
      });
      return;
    }
    fallback();
  }

  function shareReportEntry(entry) {
    if (!entry) {
      toast('暂无战报可分享');
      return;
    }
    copyText(buildShareText(entry), '战报已复制');
  }

  function inviteChallengeEntry(entry) {
    if (!entry) {
      toast('暂无战报可邀请');
      return;
    }
    var text = '【赛小蜂足球】邀请你应战\n' + challengeShareUrl(entry.id) + '\n不上榜 · 不掉卡';
    copyText(text, '应战链接已复制');
  }

  function logEntryToBattle(entry) {
    return {
      myScore: entry.myScore,
      oppScore: entry.oppScore,
      outcome: entry.result,
      comment: entry.commentary || '',
      oppLineup: entry.oppLineup || [],
      firstClear: false,
      logId: entry.id,
      oppName: entry.oppName,
      fromHistory: true
    };
  }

  function openBattleLog() {
    var overlay = $('#blog-overlay');
    var list = $('#blog-list');
    var empty = $('#blog-empty');
    var log = loadBattleLog();
    list.innerHTML = '';
    if (!log.length) {
      empty.hidden = false;
    } else {
      empty.hidden = true;
      log.forEach(function (entry) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'blog-row';
        var badgeClass = entry.result === '胜' ? 'is-win' : entry.result === '平' ? 'is-draw' : 'is-lose';
        btn.innerHTML =
          '<span class="blog-row__badge ' + badgeClass + '">' + entry.result + '</span>' +
          '<span class="blog-row__main">' +
            '<span class="blog-row__score">' + entry.myScore + '–' + entry.oppScore +
              (entry.oppName ? ' · vs ' + entry.oppName : '') + '</span>' +
            '<span class="blog-row__meta">' + lineupShortNames(entry.lineup) + '</span>' +
          '</span>' +
          '<span class="blog-row__time">' + formatShanghaiTime(entry.ts) + '<br>Asia/Shanghai</span>';
        btn.addEventListener('click', function () {
          closeBattleLog();
          viewingLogEntry = entry;
          activeReportEntry = entry;
          showReportPanel(logEntryToBattle(entry), { history: true });
        });
        list.appendChild(btn);
      });
    }
    overlay.hidden = false;
    overlay.setAttribute('aria-hidden', 'false');
    overlay.classList.add('is-show');
  }

  function closeBattleLog() {
    var overlay = $('#blog-overlay');
    overlay.classList.remove('is-show');
    overlay.hidden = true;
    overlay.setAttribute('aria-hidden', 'true');
  }

  function updateChallengeBanner() {
    var banner = $('#challenge-banner');
    if (!banner) return;
    if (!pendingChallenge || !pendingChallenge.entry) {
      banner.hidden = true;
      return;
    }
    var entry = pendingChallenge.entry;
    banner.hidden = false;
    $('#challenge-banner-title').textContent =
      '应战：对方战报 ' + entry.result + ' ' + entry.myScore + '-' + entry.oppScore;
    $('#challenge-banner-sub').textContent =
      '对方阵容 ' + lineupShortNames(entry.lineup) + ' · 用我的阵容应战 · 不上榜';
  }

  function showReportPanel(battle, opts) {
    opts = opts || {};
    hideAllBattlePhases();
    var rep = $('#battle-report');
    rep.hidden = false;
    openOverlay();

    var badge = $('#result-outcome-badge');
    badge.textContent = battle.outcome;
    badge.className = 'result-badge-inline';
    if (battle.outcome === '胜') badge.classList.add('is-win');
    else if (battle.outcome === '平') badge.classList.add('is-draw');
    else badge.classList.add('is-lose');

    var titlePrefix = opts.history ? '历史战报' : '本场战报';
    $('#result-title').innerHTML = titlePrefix + ' <span class="result-badge-inline ' +
      (battle.outcome === '胜' ? 'is-win' : battle.outcome === '平' ? 'is-draw' : 'is-lose') +
      '" id="result-outcome-badge">' + battle.outcome + '</span>';

    $('#result-sub').textContent = '比分 ' + battle.myScore + '–' + battle.oppScore + ' · 不上榜 · 不掉卡';
    $('#report-my-score').textContent = String(battle.myScore);
    $('#report-opp-score').textContent = String(battle.oppScore);
    $('#report-comment').textContent = battle.comment || '';

    var badges = $('#result-badges');
    if (badges) {
      badges.style.display = (!opts.history && battle.firstClear) ? '' : 'none';
    }

    var live = $('#result-actions-live');
    var hist = $('#result-actions-history');
    if (opts.history) {
      if (live) live.hidden = true;
      if (hist) hist.hidden = false;
      viewingLogEntry = opts.entry || viewingLogEntry || findLogEntry(battle.logId);
      activeReportEntry = viewingLogEntry;
    } else {
      if (live) live.hidden = false;
      if (hist) hist.hidden = true;
      viewingLogEntry = null;
      if (battle.logId) {
        activeReportEntry = findLogEntry(battle.logId) || activeReportEntry;
      }
    }
  }

  function runRevealPhase(battle) {
    hideAllBattlePhases();
    var rev = $('#battle-reveal');
    rev.hidden = false;
    openOverlay();

    var mineEl = $('#battle-score-mine');
    var oppEl = $('#battle-score-opp');
    var word = $('#battle-result-word');
    var comment = $('#battle-comment');
    mineEl.textContent = '0';
    oppEl.textContent = '0';
    word.className = 'battle-reveal__word';
    word.textContent = battle.outcome;
    comment.className = 'battle-reveal__comment';
    comment.textContent = battle.comment;

    var duration = 1100;
    var start = Date.now();
    function tick() {
      var t = Math.min(1, (Date.now() - start) / duration);
      var ease = 1 - Math.pow(1 - t, 3);
      mineEl.textContent = String(Math.round(battle.myScore * ease));
      oppEl.textContent = String(Math.round(battle.oppScore * ease));
      if (t < 1) {
        battleLater(tick, 32);
      } else {
        mineEl.textContent = String(battle.myScore);
        oppEl.textContent = String(battle.oppScore);
        word.classList.add('is-show');
        if (battle.outcome === '胜') word.classList.add('is-win');
        else if (battle.outcome === '平') word.classList.add('is-draw');
        else word.classList.add('is-lose');
        comment.classList.add('is-show');
        battleLater(function () { showReportPanel(battle); }, 700);
      }
    }
    tick();
  }

  function runVsPhase(battle, skippable) {
    hideAllBattlePhases();
    clearBattleTimers();
    var vs = $('#battle-vs');
    vs.hidden = false;
    openOverlay();

    var mine = getMyLineupPlayers();
    var myCards = $('#battle-my-cards');
    var oppCards = $('#battle-opp-cards');
    myCards.innerHTML = mine.map(function (p) {
      return battleMiniHtml(p.name, p.posTag, p.ovr);
    }).join('');
    oppCards.innerHTML = battle.oppLineup.map(function (o) {
      return battleMiniHtml(o.name, o.posTag, o.ovr);
    }).join('');
    $('#battle-my-ovr').textContent = String(mine.reduce(function (a, p) { return a + p.ovr; }, 0));
    $('#battle-opp-ovr').textContent = String(battle.oppLineup.reduce(function (a, o) { return a + o.ovr; }, 0));

    var skipped = false;
    function goReveal() {
      if (skipped) return;
      skipped = true;
      clearBattleTimers();
      runRevealPhase(battle);
    }
    vs.onclick = function () { goReveal(); };
    battleLater(goReveal, 1200);
  }

  function buildBattle(reroll, challengeEntry) {
    var mine = getMyLineupPlayers();
    var myScore = calcMyScore(mine);
    var oppLineup;
    var oppScore;
    var oppName;
    var vsChallengeId = null;

    if (challengeEntry) {
      // Challenge sharer's recorded lineup/score as opponent
      oppLineup = (challengeEntry.lineup || []).map(function (p) {
        return {
          id: 'chal-' + (p.key || p.name),
          name: p.name,
          pos: p.pos,
          posTag: p.pos || p.posTag || 'ST',
          ovr: p.ovr || 70
        };
      });
      if (!oppLineup.length) {
        oppLineup = rollOppLineup(true);
        oppScore = challengeEntry.myScore || calcOppScore(oppLineup);
      } else {
        oppScore = challengeEntry.myScore != null ? challengeEntry.myScore : calcOppScore(oppLineup);
      }
      oppName = '挑战·' + lineupShortNames(challengeEntry.lineup).split('·')[0];
      vsChallengeId = challengeEntry.id;
    } else {
      oppLineup = rollOppLineup(!!reroll);
      oppScore = calcOppScore(oppLineup);
      // Keep oppScore in ~390–410 band after jitter
      if (oppScore < 390) oppScore = 390 + (oppScore % 10);
      if (oppScore > 418) oppScore = 400 + (oppScore % 10);
      oppName = (oppLineup[0] && oppLineup[0].name ? oppLineup[0].name : '对手') + '队';
    }

    var outcome = decideOutcome(myScore, oppScore);
    var comment = pickComment(outcome, mine);
    var firstClear = !challengeDone;
    var logId = makeBattleId();
    return {
      myScore: myScore,
      oppScore: oppScore,
      outcome: outcome,
      comment: comment,
      oppLineup: oppLineup,
      oppName: oppName,
      firstClear: firstClear || (lastBattle && lastBattle.firstClear),
      logId: logId,
      vsChallengeId: vsChallengeId
    };
  }

  function startBattleFlow(opts) {
    opts = opts || {};
    if (!isLineupReady()) {
      toast(opts.challengeEntry ? '请先填满 5 人（含门将）再应战' : '请先填满 5 人（含门将）');
      return;
    }
    var challengeEntry = opts.challengeEntry || null;
    // viewing again without reroll / challenge — reopen last report
    if (!opts.reroll && !challengeEntry && challengeDone && lastBattle) {
      activeReportEntry = findLogEntry(lastBattle.logId) || activeReportEntry;
      showReportPanel(lastBattle, { history: false });
      return;
    }
    var battle = buildBattle(!!opts.reroll, challengeEntry);
    if (!challengeDone) {
      battle.firstClear = true;
      challengeDone = true;
    } else if (lastBattle && lastBattle.firstClear) {
      battle.firstClear = true;
    }
    lastBattle = battle;
    var entry = battleToLogEntry(battle, {
      vsChallengeId: battle.vsChallengeId || null,
      oppName: battle.oppName
    });
    prependBattleLog(entry);
    activeReportEntry = entry;
    persistBattle();
    updateChallenge();
    if (challengeEntry) {
      pendingChallenge = null;
      updateChallengeBanner();
      try {
        var u = new URL(location.href);
        u.searchParams.delete('challenge');
        history.replaceState(null, '', u.pathname + u.search + u.hash);
      } catch (e) { /* ignore */ }
    }
    runVsPhase(battle, true);
  }

  $('#btn-save-lineup').addEventListener('click', function () {
    var filled = lineupSlots.filter(function (s) { return s.playerId; }).length;
    if (filled < 5) {
      toast('请先填满 5 个占位再保存');
      return;
    }
    try {
      localStorage.setItem('sxf-lineup-v1', JSON.stringify(lineupSlots.map(function (s) {
        return { key: s.key, playerId: s.playerId };
      })));
    } catch (e) { /* ignore */ }
    toast('阵容已保存（本地 mock）');
    updateChallenge();
  });

  var btnViewReport = $('#btn-view-report');
  if (btnViewReport) {
    btnViewReport.addEventListener('click', function () {
      if (lastBattle) showReportPanel(lastBattle);
      else toast('还没有战报');
    });
  }

  $('#btn-challenge').addEventListener('click', function () {
    if (!isLineupReady()) {
      toast('请先填满 5 人（含门将）');
      return;
    }
    if (challengeDone) {
      battleSessionOppJitter = null; // 再战换对手
      startBattleFlow({ reroll: true });
      return;
    }
    startBattleFlow({ reroll: false });
  });

  $('#btn-result-close').addEventListener('click', function () {
    hideResult();
  });

  var btnReplay = $('#btn-replay');
  if (btnReplay) {
    btnReplay.addEventListener('click', function () {
      if (!isLineupReady()) {
        toast('请先填满 5 人（含门将）');
        return;
      }
      battleSessionOppJitter = null; // force re-roll
      startBattleFlow({ reroll: true });
    });
  }

  $('#btn-share-lineup').addEventListener('click', function () {
    var entry = activeReportEntry;
    if (!entry && lastBattle && lastBattle.logId) entry = findLogEntry(lastBattle.logId);
    if (!entry && lastBattle) {
      entry = battleToLogEntry(lastBattle, { oppName: lastBattle.oppName });
      // ensure id exists for share link even if log missing
      if (!findLogEntry(entry.id)) prependBattleLog(entry);
      activeReportEntry = entry;
    }
    shareReportEntry(entry);
  });

  var btnInvite = $('#btn-invite-challenge');
  if (btnInvite) {
    btnInvite.addEventListener('click', function () {
      var entry = activeReportEntry;
      if (!entry && lastBattle && lastBattle.logId) entry = findLogEntry(lastBattle.logId);
      if (!entry && lastBattle) {
        entry = battleToLogEntry(lastBattle, { oppName: lastBattle.oppName });
        if (!findLogEntry(entry.id)) prependBattleLog(entry);
        activeReportEntry = entry;
      }
      inviteChallengeEntry(entry);
    });
  }

  var btnOpenLogReport = $('#btn-open-log-from-report');
  if (btnOpenLogReport) {
    btnOpenLogReport.addEventListener('click', function () {
      hideResult();
      openBattleLog();
    });
  }

  var btnShareHist = $('#btn-share-history');
  if (btnShareHist) {
    btnShareHist.addEventListener('click', function () {
      shareReportEntry(viewingLogEntry || activeReportEntry);
    });
  }
  var btnInviteHist = $('#btn-invite-history');
  if (btnInviteHist) {
    btnInviteHist.addEventListener('click', function () {
      inviteChallengeEntry(viewingLogEntry || activeReportEntry);
    });
  }
  var btnHistClose = $('#btn-history-close');
  if (btnHistClose) {
    btnHistClose.addEventListener('click', function () {
      viewingLogEntry = null;
      hideResult();
    });
  }

  var btnBattleLog = $('#btn-battle-log');
  if (btnBattleLog) {
    btnBattleLog.addEventListener('click', function () {
      openBattleLog();
    });
  }
  var btnBlogClose = $('#btn-blog-close');
  if (btnBlogClose) {
    btnBlogClose.addEventListener('click', closeBattleLog);
  }
  var blogOverlay = $('#blog-overlay');
  if (blogOverlay) {
    blogOverlay.addEventListener('click', function (e) {
      if (e.target === blogOverlay) closeBattleLog();
    });
  }

  var btnAccept = $('#btn-accept-challenge');
  if (btnAccept) {
    btnAccept.addEventListener('click', function () {
      if (!pendingChallenge || !pendingChallenge.entry) {
        toast('挑战已过期');
        updateChallengeBanner();
        return;
      }
      if (!isLineupReady()) {
        toast('请先填满 5 人（含门将）再应战');
        return;
      }
      startBattleFlow({ reroll: true, challengeEntry: pendingChallenge.entry });
    });
  }

  $('#result-overlay').addEventListener('click', function (e) {
    if (e.target === $('#result-overlay')) {
      // only close from report phase (not mid VS/reveal) — or allow close anytime
      var rep = $('#battle-report');
      if (rep && !rep.hidden) hideResult();
    }
  });

  function restoreLineup() {
    try {
      var raw = localStorage.getItem('sxf-lineup-v1');
      if (raw) {
        var saved = JSON.parse(raw);
        saved.forEach(function (row) {
          var slot = lineupSlots.find(function (s) { return s.key === row.key; });
          if (slot) slot.playerId = row.playerId;
        });
      }
    } catch (e) { /* ignore */ }
    try {
      challengeDone = localStorage.getItem('sxf-challenge-done-v1') === '1';
    } catch (e) { /* ignore */ }
    try {
      var braw = localStorage.getItem('sxf-battle-v1');
      if (braw) lastBattle = JSON.parse(braw);
    } catch (e) { /* ignore */ }
    if (lastBattle) {
      if (!lastBattle.logId) {
        lastBattle.logId = makeBattleId();
        persistBattle();
      }
      var existing = findLogEntry(lastBattle.logId);
      if (!existing) {
        var seeded = battleToLogEntry(lastBattle, { oppName: lastBattle.oppName });
        seeded.id = lastBattle.logId;
        prependBattleLog(seeded);
        activeReportEntry = seeded;
      } else {
        activeReportEntry = existing;
      }
    }
  }

  function consumeChallengeParam() {
    var id = null;
    try {
      id = new URL(location.href).searchParams.get('challenge');
    } catch (e) {
      var m = location.search.match(/[?&]challenge=([^&]+)/);
      id = m ? decodeURIComponent(m[1]) : null;
    }
    if (!id) return;
    var entry = findLogEntry(id);
    if (!entry) {
      toast('挑战已过期');
      try {
        var u = new URL(location.href);
        u.searchParams.delete('challenge');
        history.replaceState(null, '', u.pathname + u.search + u.hash);
      } catch (e2) { /* ignore */ }
      return;
    }
    pendingChallenge = { id: id, entry: entry };
    updateChallengeBanner();
    switchTab('lineup');
  }

  function seedDemoBattleLogIfNeeded() {
    var demo = null;
    try {
      demo = new URL(location.href).searchParams.get('demo');
    } catch (e) {
      var m = location.search.match(/[?&]demo=([^&]+)/);
      demo = m ? decodeURIComponent(m[1]) : null;
    }
    if (demo !== 'battle-log') return false;
    var sample = {
      id: 'bdemo1share',
      ts: Date.now() - 3600 * 1000,
      result: '平',
      myScore: 403,
      oppScore: 404,
      commentary: '势均力敌，下周再约',
      lineup: [
        { key: 'st', name: '铁栋泽', ovr: 82, pos: 'ST' },
        { key: 'lm', name: '周凯', ovr: 78, pos: 'LM' },
        { key: 'rm', name: '王磊', ovr: 80, pos: 'RM' },
        { key: 'cb', name: '李昊', ovr: 76, pos: 'CB' },
        { key: 'gk', name: '陈宇', ovr: 79, pos: 'GK' }
      ],
      oppName: '韩锋队',
      oppLineup: [
        { name: '韩锋', posTag: 'ST', ovr: 84 },
        { name: '顾宁', posTag: 'LM', ovr: 79 },
        { name: '沈岳', posTag: 'RM', ovr: 77 },
        { name: '唐川', posTag: 'CB', ovr: 81 },
        { name: '白墨', posTag: 'GK', ovr: 80 }
      ]
    };
    var sample2 = {
      id: 'bdemo2win',
      ts: Date.now() - 7200 * 1000,
      result: '胜',
      myScore: 412,
      oppScore: 398,
      commentary: '前场压制奏效',
      lineup: sample.lineup.slice(),
      oppName: '对手队',
      oppLineup: sample.oppLineup.slice()
    };
    saveBattleLog([sample, sample2]);
    lastBattle = {
      myScore: sample.myScore,
      oppScore: sample.oppScore,
      outcome: sample.result,
      comment: sample.commentary,
      oppLineup: sample.oppLineup,
      firstClear: true,
      logId: sample.id,
      oppName: sample.oppName
    };
    challengeDone = true;
    activeReportEntry = sample;
    persistBattle();
    // ensure lineup full for UI
    var ids = ['p1', 'p2', 'p5', 'p3', 'p4'];
    lineupSlots.forEach(function (s, i) { s.playerId = ids[i]; });
    try {
      localStorage.setItem('sxf-lineup-v1', JSON.stringify(lineupSlots.map(function (s) {
        return { key: s.key, playerId: s.playerId };
      })));
    } catch (e) { /* ignore */ }
    return true;
  }

  /* boot */
  restoreLineup();
  var isDemoLog = seedDemoBattleLogIfNeeded();
  renderHero();
  if (isDemoLog) {
    switchTab('lineup');
    updateChallenge();
    openBattleLog();
    // keep toast visible for demo screenshot
    var tel = $('#toast');
    if (tel) {
      tel.textContent = '战报已复制';
      tel.classList.add('is-show');
    }
  } else {
    switchTab('main');
    updateChallengeBanner();
    consumeChallengeParam();
  }
})();
