/**
 * Galaxy/Cosmos Holofoil tilt + foil driver (poke-holo layer model).
 * Idle CSS auto-holo runs until pointer; showcase is a longer boost loop.
 */
(function (global) {
  'use strict';

  var MAX_TILT = 16;
  var cards = [];

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function setVars(el, px, py, active) {
    var rect = el.getBoundingClientRect();
    if (rect.width < 4) return;
    var x = clamp((px - rect.left) / rect.width, 0, 1);
    var y = clamp((py - rect.top) / rect.height, 0, 1);
    var dx = x - 0.5;
    var dy = y - 0.5;
    var fromCenter = Math.min(1, Math.sqrt(dx * dx + dy * dy) * 2);
    var rotateY = dx * MAX_TILT * 2;
    var rotateX = -dy * MAX_TILT * 2;

    el.style.setProperty('--pointer-x', (x * 100).toFixed(2) + '%');
    el.style.setProperty('--pointer-y', (y * 100).toFixed(2) + '%');
    el.style.setProperty('--pointer-from-left', x.toFixed(3));
    el.style.setProperty('--pointer-from-top', y.toFixed(3));
    el.style.setProperty('--pointer-from-center', Math.max(0.35, fromCenter).toFixed(3));
    el.style.setProperty('--pointer-dx', (dx * 100).toFixed(2));
    el.style.setProperty('--pointer-dy', (dy * 100).toFixed(2));
    el.style.setProperty('--rotate-x', rotateY.toFixed(2) + 'deg');
    el.style.setProperty('--rotate-y', rotateX.toFixed(2) + 'deg');
    el.style.setProperty('--card-opacity', active ? '0.52' : '0.28');
    el.style.setProperty('--foil-opacity', active ? '0.52' : '0.28');
    el.style.setProperty('--glare-opacity', active ? '0.45' : '0.22');
  }

  /** Return to CSS idle auto-holo (keep vivid defaults, clear inline tilt) */
  function releaseToIdle(el) {
    el.classList.remove('is-active', 'is-pointer', 'is-showcase');
    ['--pointer-x', '--pointer-y', '--pointer-from-left', '--pointer-from-top',
      '--pointer-from-center', '--pointer-dx', '--pointer-dy',
      '--rotate-x', '--rotate-y', '--card-opacity', '--foil-opacity', '--glare-opacity'
    ].forEach(function (k) { el.style.removeProperty(k); });
  }

  function reset(el) {
    releaseToIdle(el);
  }

  function bindCard(root) {
    if (!root || root.__holoBound) return;
    root.__holoBound = true;
    var rotator = root.querySelector('.holo-card__rotator') || root;
    var img = root.querySelector('.holo-card__front img');

    function applyMask() {
      if (!img) return;
      var src = img.currentSrc || img.src;
      if (src) root.style.setProperty('--card-mask', 'url("' + src + '")');
    }
    applyMask();
    if (img && !img.complete) img.addEventListener('load', applyMask);

    function onMove(clientX, clientY) {
      root.classList.add('is-active', 'is-pointer');
      root.classList.remove('is-showcase');
      setVars(root, clientX, clientY, true);
    }

    rotator.addEventListener('pointerenter', function (e) {
      try { rotator.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      onMove(e.clientX, e.clientY);
    });
    rotator.addEventListener('pointermove', function (e) {
      onMove(e.clientX, e.clientY);
    });
    rotator.addEventListener('pointerleave', function () {
      releaseToIdle(root);
    });
    rotator.addEventListener('pointercancel', function () {
      releaseToIdle(root);
    });

    cards.push(root);
  }

  function bindAll(scope) {
    var nodes = (scope || document).querySelectorAll('.holo-card');
    for (var i = 0; i < nodes.length; i++) bindCard(nodes[i]);
  }

  var gyroEnabled = false;
  function onOrient(e) {
    if (!gyroEnabled || !cards.length) return;
    var beta = e.beta || 0;
    var gamma = e.gamma || 0;
    var x = clamp(0.5 + gamma / 45, 0, 1);
    var y = clamp(0.5 + (beta - 45) / 45, 0, 1);
    cards.forEach(function (el) {
      if (el.classList.contains('is-pointer')) return;
      var rect = el.getBoundingClientRect();
      if (rect.width < 8) return;
      el.classList.add('is-active');
      setVars(el, rect.left + x * rect.width, rect.top + y * rect.height, true);
    });
  }

  function enableGyro() {
    if (gyroEnabled) return;
    gyroEnabled = true;
    window.addEventListener('deviceorientation', onOrient);
  }

  /**
   * Longer, more vivid entry showcase, then hand off to CSS auto-holo.
   * @param {HTMLElement} el
   * @param {number} [durationMs=4200]
   */
  function showcase(el, durationMs) {
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    var t0 = performance.now();
    var dur = durationMs || 4200;
    el.classList.add('is-active', 'is-showcase');
    el.classList.remove('is-pointer');

    function frame(now) {
      var p = Math.min(1, (now - t0) / dur);
      /* two full sweeps across the card */
      var ang = p * Math.PI * 4;
      var x = 0.5 + Math.cos(ang) * 0.42;
      var y = 0.5 + Math.sin(ang * 0.85) * 0.36;
      var rect = el.getBoundingClientRect();
      setVars(el, rect.left + x * rect.width, rect.top + y * rect.height, true);
      if (p < 1 && el.classList.contains('is-showcase')) {
        requestAnimationFrame(frame);
      } else if (!el.classList.contains('is-pointer')) {
        releaseToIdle(el);
      }
    }
    requestAnimationFrame(frame);
  }

  global.HoloCosmos = {
    bindAll: bindAll,
    bindCard: bindCard,
    enableGyro: enableGyro,
    showcase: showcase,
    reset: reset,
    releaseToIdle: releaseToIdle
  };
})(window);
