/* Decoy client name: a block of light-gray ink tiles (same vibe as the 50x50 grid). Hover / click wipes the tile colour
   away for a moment and shows terminal-style symbols, then the ink comes back.
   Nothing real is in here, on purpose. The block's length is random on every mount,
   so it never hints at a real name. Vanilla JS, no libraries.
   Hover  -> only the hovered characters scramble.
   Click  -> a quick radial wave from the pointer.                                      */
const _redact = (function () {
  var SYM = '█▓▒░#@%&*<>/\\|+=?!$~^';
  var REST = '█';
  var STEP = 48;                                   // ms per swap: stepped, no easing
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var pick = function () { return SYM.charAt((Math.random() * SYM.length) | 0); };

  function scramble(span, steps, delay) {
    if (reduced || !span.isConnected) return;
    clearTimeout(span._t);
    var n = 0;
    function tick() {
      if (!span.isConnected) return;
      if (n >= steps) { span.textContent = REST; span.classList.remove('hot', 'live'); return; }
      span.textContent = pick();
      span.classList.add('live');
      span.classList.toggle('hot', n < 2);          // tiny quick transform at the start only
      n++;
      span._t = setTimeout(tick, STEP + ((Math.random() * 14) | 0));
    }
    span._t = setTimeout(tick, delay || 0);
  }

  function wave(box, x, y) {
    box.querySelectorAll('.rc').forEach(function (s) {
      var r = s.getBoundingClientRect();
      var d = Math.hypot(r.left + r.width / 2 - x, r.top + r.height / 2 - y);
      scramble(s, 5 + ((Math.random() * 3) | 0), d * 1.5);   // farther chars start later
    });
  }

  var mountRedact = function (box) {
    if (!box) return;
    clearInterval(box._idle);
    // shape of a made-up name: sometimes one word, sometimes "The X", "X Inc.", "X Corp.", or several words
    var rnd = function (a, b) { return a + ((Math.random() * (b - a + 1)) | 0); };
    var kind = Math.random(), parts;
    if (kind < 0.22) parts = [rnd(6, 12)];
    else if (kind < 0.42) parts = [3, rnd(5, 10)];                               // "The ..."
    else if (kind < 0.64) parts = [rnd(5, 10), [3, 4, 5][rnd(0, 2)]];            // "... Co." / "Inc." / "Corp."
    else if (kind < 0.84) parts = [rnd(4, 8), rnd(4, 9)];                        // two words
    else parts = [rnd(3, 6), rnd(4, 8), [3, 4, 5][rnd(0, 2)]];                  // several words
    var html = '';
    parts.forEach(function (n, w) {
      if (w) html += '<span class="rg"> </span>';
      for (var i = 0; i < n; i++) html += '<span class="rc" aria-hidden="true">' + REST + '</span>';
    });
    box.innerHTML = html;
    box.classList.add('redact');
    box.setAttribute('role', 'img');
    box.setAttribute('aria-label', 'Client name hidden under NDA');
    box.title = 'nothing to find here';

    if (!box._wired) {
      box._wired = true;
      box.addEventListener('pointerover', function (e) {
        var s = e.target.closest && e.target.closest('.rc');
        if (s) scramble(s, 4);
      });
      box.addEventListener('pointermove', function (e) {
        var s = e.target.closest && e.target.closest('.rc');
        if (s && !s.classList.contains('live')) scramble(s, 4);
      });
      box.addEventListener('pointerdown', function (e) { wave(box, e.clientX, e.clientY); });
    }
    if (!reduced) {                                           // slow idle flicker: "touch me"
      box._idle = setInterval(function () {
        if (!box.isConnected) { clearInterval(box._idle); return; }
        var cs = box.querySelectorAll('.rc');
        if (cs.length && box.getBoundingClientRect().width) scramble(cs[(Math.random() * cs.length) | 0], 3);
      }, 2600);
    }
  };

  try { console.info('%c▓▓▓ nothing to find here. The client name was never in this page. ▓▓▓', 'color:#ff5a2d;font-family:monospace'); } catch (e) {}
  return mountRedact;
})();
export const mountRedact = _redact;
