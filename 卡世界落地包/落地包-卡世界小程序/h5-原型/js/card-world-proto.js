(function () {
  'use strict';
  var DEMO = './assets/player-card-holo/demo-main-card.png';
  var album = [
    { name: '铁栋泽', ovr: 86, src: './assets/tie-dongze-card.png' },
    { name: '样卡A', ovr: 78, src: DEMO },
    { name: '样卡B', ovr: 81, src: DEMO }
  ];

  function toast(msg) {
    var el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('is-show');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { el.classList.remove('is-show'); }, 2200);
  }

  function holoMarkup(src, name) {
    var safeSrc = String(src).replace(/'/g, '%27');
    return (
      '<div class="holo-card" data-effect="cosmos" style="--card-mask:url(\'' + safeSrc + '\')">' +
        '<button type="button" class="holo-card__rotator" aria-label="' + name + ' 主卡">' +
          '<div class="holo-card__front"><img src="' + safeSrc + '" alt="' + name + '"></div>' +
          '<div class="holo-card__shine" aria-hidden="true"></div>' +
          '<div class="holo-card__glare" aria-hidden="true"></div>' +
        '</button>' +
      '</div>'
    );
  }

  function mountHero() {
    var mount = document.getElementById('heroCard');
    mount.innerHTML = holoMarkup(DEMO, '铁栋泽');
    if (window.HoloCosmos) {
      window.HoloCosmos.bindAll(mount);
      var hero = mount.querySelector('.holo-card');
      setTimeout(function () { window.HoloCosmos.showcase(hero, 3600); }, 280);
    }
  }

  function show(view) {
    document.getElementById('view-home').hidden = view !== 'home';
    document.getElementById('view-home-actions').hidden = view !== 'home';
    document.getElementById('view-album').hidden = view !== 'album';
    document.getElementById('view-lineup').hidden = view !== 'lineup';
    document.querySelectorAll('.cwp-tab').forEach(function (t) {
      t.classList.toggle('is-on', t.getAttribute('data-view') === view);
    });
    if (view === 'album') renderAlbum();
  }

  function renderAlbum() {
    var grid = document.getElementById('albumGrid');
    grid.innerHTML = album.map(function (c) {
      return '<div><img src="' + c.src + '" alt="' + c.name + '"><p style="margin:6px 0 0;font-size:11px;text-align:center;color:#9aa3b5">' +
        c.name + ' · ' + c.ovr + '</p></div>';
    }).join('');
  }

  function playMeetReveal() {
    var overlay = document.getElementById('meet-reveal');
    var pack = document.getElementById('meet-pack');
    var card = document.getElementById('meet-card3d');
    var whole = document.getElementById('meet-pack-whole');
    var closeBtn = document.getElementById('meet-reveal-close');
    document.getElementById('meet-reveal-title').textContent = '签约 · 新样卡';
    document.getElementById('meet-reveal-sub').textContent = '撕包中…';
    closeBtn.style.display = 'none';
    pack.className = 'meet-pack';
    if (whole) whole.style.display = '';
    card.className = 'meet-card3d';
    overlay.classList.add('is-show');

    setTimeout(function () { pack.classList.add('is-ripping'); }, 200);
    setTimeout(function () {
      if (whole) whole.style.display = 'none';
      pack.classList.add('is-split');
      document.getElementById('meet-reveal-sub').textContent = '卡弹出…';
    }, 700);
    setTimeout(function () { card.classList.add('show'); }, 1250);
    setTimeout(function () { pack.classList.add('is-gone'); }, 1550);
    setTimeout(function () {
      card.classList.add('flipped', 'glow', 'foil-on');
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
      card.style.setProperty('--mx', '50%');
      card.style.setProperty('--my', '40%');
      document.getElementById('meet-reveal-sub').textContent = '签约成功 · 滑动看箔光';
      closeBtn.style.display = '';
    }, 1900);
  }

  var meetCard = document.getElementById('meet-card3d');
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

  document.getElementById('meet-reveal-close').onclick = function () {
    document.getElementById('meet-pack').className = 'meet-pack';
    meetCard.className = 'meet-card3d';
    document.getElementById('meet-reveal').classList.remove('is-show');
    album.unshift({ name: '新签约', ovr: 80, src: './assets/tie-dongze-card.png' });
    renderAlbum();
    show('album');
    toast('已收入卡库');
  };

  document.querySelectorAll('.cwp-tab').forEach(function (t) {
    t.onclick = function () { show(t.getAttribute('data-view')); };
  });
  var lib = document.getElementById('btnLibrary');
  if (lib) lib.onclick = function () { show('album'); };
  document.getElementById('btnBackHome').onclick = function () { show('home'); };
  document.getElementById('btnBackHome2').onclick = function () { show('home'); };
  document.getElementById('btnLineup').onclick = function () { show('lineup'); };
  document.getElementById('btnMeet').onclick = playMeetReveal;
  document.getElementById('btnFreeMeet').onclick = playMeetReveal;
  document.getElementById('btnShare').onclick = function () {
    document.getElementById('shareSheet').hidden = false;
  };
  document.getElementById('btnShareClose').onclick = function () {
    document.getElementById('shareSheet').hidden = true;
  };
  document.getElementById('shareSheet').onclick = function (e) {
    if (e.target === e.currentTarget) e.currentTarget.hidden = true;
  };
  document.getElementById('btnEdit').onclick = function () { toast('编辑入口后续接正式卡套件'); };

  mountHero();
  renderAlbum();
})();
