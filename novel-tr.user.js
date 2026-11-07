// ==UserScript==
// @name         소설 번역 뷰어
// @namespace    https://github.com/00hailey00/novel-tr
// @version      1.9.5
// @description  중국어 웹소설을 Vertex Gemini로 번역해 깔끔한 읽기 화면으로 보여줘요
// @match        *://*/*
// @match        https://00hailey00.github.io/novel-tr/settings.html*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @connect      oauth2.googleapis.com
// @connect      googleapis.com
// @connect      *
// @inject-into  content
// @run-at       document-end
// @noframes
// @downloadURL  https://raw.githubusercontent.com/00hailey00/novel-tr/main/novel-tr.user.js
// @updateURL    https://raw.githubusercontent.com/00hailey00/novel-tr/main/novel-tr.user.js
// ==/UserScript==
(async function () {
  'use strict';
  var READER = 'nvtrReader';
  var SETTINGS_URL = 'https://00hailey00.github.io/novel-tr/settings.html';

  // ---- GM \uc800\uc7a5\uc18c (\uc0ac\uc774\ud2b8\uac00 \uc9c0\uc6b8 \uc218 \uc5c6\ub294 \ud655\uc7a5 \ud504\ub85c\uadf8\ub7a8 \uc804\uc6a9 \uc800\uc7a5\uc18c) ----
  function gget(k, d) { try { var v = GM_getValue(k); return v === undefined || v === null ? d : v; } catch (e) { return d; } }
  function gset(k, v) { try { GM_setValue(k, v); } catch (e) { } }
  function gdel(k) { try { GM_deleteValue(k); } catch (e) { } }
  function gxhr(o) {
    return new Promise(function (res, rej) {
      var x = {};
      for (var k in o) if (k !== '_box' && k !== 'first' && k !== 'idle' && k !== 'onbytes') x[k] = o[k];
      // \ud3f0\uc774 \uc7a0\ub4e4\uac70\ub098 \ud0ed\uc774 \ub4a4\ub85c \uac00\uba74 \uc694\uccad\uc774 \uc18c\ub9ac \uc5c6\uc774 \uc0ac\ub77c\uc838 \uc2dc\uac04 \ucd08\uacfc \uc54c\ub9bc\uc870\ucc28 \uc548 \uc62c \ub54c\uac00 \uc788\uc5b4\uc11c, \ub530\ub85c \uc2dc\uacc4\ub97c \ub460
      // \uc870\uae08\uc529 \ubc1b\ub294 \uc694\uccad(o.idle): \uccab \uae00\uc790\uae4c\uc9c0 o.first, \uadf8 \ub4a4\ub85c\ub294 o.idle \ub3d9\uc548 \uc544\ubb34\uac83\ub3c4 \uc548 \uc624\uba74 \ub04a\uc74c
      var done = false, h = null, wd = null, seen = 0;
      function arm(ms) { clearTimeout(wd); wd = setTimeout(function () { fin(rej, new Error('\uc751\ub2f5\uc774 \ub108\ubb34 \uc624\ub798 \uac78\ub824\uc694 (\uc2dc\uac04 \ucd08\uacfc)')); try { h && h.abort && h.abort(); } catch (e) { } }, ms); }
      arm(o.idle ? (o.first || 90000) : (o.timeout || 60000) + 10000);
      function fin(f, v) { if (done) return; done = true; clearTimeout(wd); f(v); }
      if (o.idle || o.onbytes) x.onprogress = function (r) {
        var t = r && typeof r.responseText === 'string' ? r.responseText : '', n = t.length || (r && r.loaded) || 0;
        if (n > seen) { seen = n; if (o.idle) arm(o.idle); if (o.onbytes) o.onbytes(t); }
      };
      x.onload = function (r) { fin(res, r); };
      x.onerror = function () { fin(rej, new Error('\ub124\ud2b8\uc6cc\ud06c \uc624\ub958')); };
      x.ontimeout = function () { fin(rej, new Error('\uc751\ub2f5\uc774 \ub108\ubb34 \uc624\ub798 \uac78\ub824\uc694 (\uc2dc\uac04 \ucd08\uacfc)')); };
      x.onabort = function () { fin(rej, new Error('\uc694\uccad\uc774 \ucde8\uc18c\ub410\uc5b4\uc694')); };
      try { h = GM_xmlhttpRequest(x); if (o._box) o._box.abort = function () { try { h && h.abort && h.abort(); } catch (e) { } fin(rej, new Error('\uc694\uccad\uc774 \ucde8\uc18c\ub410\uc5b4\uc694')); }; } catch (e) { fin(rej, e); }
    });
  }
  var PW = window.wrappedJSObject || window; // \ud398\uc774\uc9c0 \ucabd window (\uad11\uace0 \ud0c0\uc774\uba38\u00b7\ud31d\uc5c5 \uc815\ub9ac\uc6a9)

  if (location.href.indexOf(SETTINGS_URL) === 0) { renderSettings(); return; }
  var VIA_HASH = location.hash.indexOf('#nvtr') === 0;
  var MODE = (VIA_HASH || window.name === READER) ? 'reader' : 'button';
  if (MODE === 'reader') {
    window.name = READER;
    try { history.replaceState(null, '', location.href.replace(/#nvtr.*$/, '')); } catch (e) { }
  }
  if (window.__nvtrRan) return;
  window.__nvtrRan = 1;

  var SEL = ['#content', '#chaptercontent', '#chapterContent', '#booktxt', '#nr1', '#htmlContent',
    '#txt', '#TextContent', '.read-content', '.readcontent', '.txtnav', '.content', 'article'];
  var NEXT = /\u4e0b\u4e00?[\u7ae0\u9875\u9801\u8282\u7bc0\u8bdd\u8a71\u7bc7\u5f20\u5f35\u56de]|[\u540e\u5f8c]\u4e00[\u7ae0\u9875\u9801\u8282\u7bc0]|^\s*next|next\s*(page|chapter)|\ub2e4\uc74c\s*[\ud654\uc7a5\ud398]/i;
  var PREV = /\u4e0a\u4e00?[\u7ae0\u9875\u9801\u8282\u7bc0\u8bdd\u8a71\u7bc7\u5f20\u5f35\u56de]|\u524d\u4e00[\u7ae0\u9875\u9801\u8282\u7bc0]|^\s*prev|previous|\uc774\uc804\s*[\ud654\uc7a5\ud398]/i;
  var NV = { next: /(?:next_?page|nextpage|next_?url|nexturl|next_?chapter|next_?link|nextlink)\s*[:=]\s*['"]([^'"]+)['"]/i,
    prev: /(?:pre(?:v|vious)?_?page|prevpage|prepage|prev?_?url|preurl|prev?_?chapter|prev?_?link)\s*[:=]\s*['"]([^'"]+)['"]/i };
  var LK = 'nvtrLinks';
  function learned() { return gget(LK, {}) || {}; }
  function hostOf(u) { try { return new URL(u).host.replace(/^www\./, ''); } catch (e) { return location.host.replace(/^www\./, ''); } }
  function learn(kind, t, u) { var L = learned(); L[hostOf(u || location.href) + ':' + kind] = t; gset(LK, L); }

  function own(el) {
    var s = 0;
    for (var i = 0; i < el.childNodes.length; i++) {
      var n = el.childNodes[i];
      if (n.nodeType === 3) s += n.textContent.trim().length;
      else if (n.nodeType === 1 && /^(P|SPAN|FONT|BR)$/.test(n.tagName)) s += n.textContent.trim().length;
    }
    return s;
  }
  // \uc0ac\uc774\ud2b8 \uad11\uace0\u00b7\ud68c\uc6d0 \uc548\ub0b4 \ubb38\uad6c (\ubcf8\ubb38\uc73c\ub85c \ucc29\uac01\ud558\uc9c0 \uc54a\uac8c)
  var AD = /\$\s*\d+(\.\d+)?\s*USD|\bVIP\b|Apple\s*Pay|Google\s*Pay|WebATM|ATM\s*[\u8f49\u8f6c]\u5e33|[\u6708\u5b63\u5e74]\u5361\s*\$|\u4fe1\u7528\u5361|\u514d[\u8cbb\u8d39][\u8a3b\u6ce8][\u518a\u518c]|\u7acb\u5373\u767b[\u5165\u5f55\u9304]|\u767b[\u5165\u5f55\u9304]\s*\/|\u767b[\u5165\u5f55\u9304]\u5f8c|[\u8a3b\u6ce8][\u518a\u518c]\u5f8c|\u7ae0[\u7bc0\u8282][\u5831\u62a5][\u932f\u9519]|[\u66f8\u4e66][\u9801\u9875]\s*\/\s*\u76ee[\u9304\u5f55]|[\u5ee3\u5e7f]\u544a[\u7e3d\u603b\u7acb\u5168]|[\u5ee3\u5e7f]\u544a[\u6e05\u8df3]|\u5168\u7ad9[\u5ee3\u5e7f]\u544a|\u4e00\u676f\u73cd\u5976|\u96f2\u7aef[\u66f8\u4e66]\u67b6|[\u66f8\u4e66]\u67b6\u540c\u6b65|[\u8a55\u8bc4][\u8ad6\u8bba]\u4e92[\u52d5\u52a8]|\u4ed8\u6b3e\u529f\u80fd|oop\.tw/i;
  function adLine(l) { return l.length < 160 && AD.test(l); }
  var SKIP = /^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA|NAV|HEADER|FOOTER|ASIDE|BUTTON|SELECT|OPTION|A|H1|H2|H3)$/;
  function hanLen(t) { var m = t.match(/[\u3400-\u9fff]/g); return m ? m.length : 0; }
  // \ubcf8\ubb38 \ucc3e\uae30: \u2460 \ud754\ud55c \ubcf8\ubb38 id/class \u2461 \uae00\uc790(\ud55c\uc790) \uc218 \uc810\uc218 \u2014 \uae00\uc774 \uc9c1\uc811 \ub2f4\uae34 \uc694\uc18c\uc5d0 \uc804\ubd80, \uadf8 \uc704 \ub2e8\uacc4\uc5d0 \uc808\ubc18\u00b74\ubd84\uc758 1\uc744 \ub354\ud574 \uac00\uc7a5 \ub192\uc740 \uacf3
  function findBody(doc) {
    var selHit = null;
    for (var i = 0; i < SEL.length; i++) {
      var e = doc.querySelector(SEL[i]);
      if (e && hanLen(e.textContent) > 150 && own(e) > 100) return e;
      if (e && !selHit && hanLen(e.textContent) >= 4 && !adLine(e.textContent.replace(/\s+/g, ' ').trim().slice(0, 150))) selHit = e;
    }
    if (!doc.body) return null;
    var score = new Map(), tw = doc.createTreeWalker(doc.body, 4 /* SHOW_TEXT */), n, cnt = 0;
    while ((n = tw.nextNode()) && cnt++ < 60000) {
      var len = hanLen(n.nodeValue); if (len < 4 || adLine(n.nodeValue.trim())) continue;
      var p = n.parentElement, bad = false;
      for (var q = p; q && q !== doc.body; q = q.parentElement) if (SKIP.test(q.tagName)) { bad = true; break; }
      if (bad || !p) continue;
      if (/^(P|SPAN|FONT|B|I|EM|STRONG|BR)$/.test(p.tagName) && p.parentElement && p.parentElement !== doc.body) p = p.parentElement; // \ubb38\ub2e8 \ud558\ub098 \ub300\uc2e0 \ubb38\ub2e8\uc744 \ubaa8\uc740 \uc0c1\uc790\uc5d0 \uc810\uc218
      for (var k = 0, w = 1; p && p !== doc.documentElement && k < 3; k++, w /= 2, p = p.parentElement) score.set(p, (score.get(p) || 0) + len * w);
    }
    var best = null, bs = 0;
    score.forEach(function (v, k) { if (v > bs) { bs = v; best = k; } });
    if (selHit && (!best || bs < 300 || selHit.contains(best) || best.contains(selHit))) return selHit; // \uc9e7\uc740 \ud654: \ud754\ud55c \ubcf8\ubb38 \uc0c1\uc790 \uc6b0\uc120
    if (best && bs > 80) return best;
    var b = 0, all = doc.body.querySelectorAll('div,article,section,td,dd');
    for (var j = 0; j < all.length; j++) { var v = own(all[j]); if (v > b) { b = v; best = all[j]; } }
    return best;
  }
  // \ud654\uba74\uc5d0 \ubcf4\uc774\ub294 \uc21c\uc11c\uc640 HTML \uc21c\uc11c\uac00 \ub2e4\ub978 \uc0ac\uc774\ud2b8(\ubb38\ub2e8\uc744 \uc11e\uc5b4 \ub450\uace0 CSS\ub85c \uc81c\uc790\ub9ac\uc5d0 \ubcf4\uc774\uac8c \ud558\ub294 \ubcf5\uc0ac \ubc29\uc9c0) \ub300\ube44:
  // \uc2e4\uc81c\ub85c \uadf8\ub824\uc9c4 \uc704\uce58(\uc704\u2192\uc544\ub798) \uc21c\uc11c\ub97c data-nvo\ub85c \uc801\uc5b4 \ub450\uba74 lines()\uac00 \uadf8 \uc21c\uc11c\ub85c \uc77d\uc74c
  function visualOrder(el) {
    try {
      if (!el || !el.ownerDocument || !el.ownerDocument.defaultView) return;
      var kids = [].slice.call(el.children).filter(function (k) { return hanLen(k.textContent) > 0; });
      if (kids.length < 4) return;
      var rs = kids.map(function (k) { var r = k.getBoundingClientRect(); return { k: k, t: r.top, l: r.left, h: r.height }; });
      if (!rs.some(function (r) { return r.h > 0; })) return; // \ud654\uba74\uc5d0 \uc548 \uadf8\ub824\uc9d0(\ubc30\uce58 \uc815\ubcf4 \uc5c6\uc74c)
      var inv = 0; for (var i = 1; i < rs.length; i++) if (rs[i].h > 0 && rs[i - 1].h > 0 && rs[i].t < rs[i - 1].t - 2) inv++;
      if (inv < Math.max(2, rs.length * 0.2)) return; // \uac70\uc758 \uc21c\uc11c\ub300\ub85c\uba74 \uadf8\ub300\ub85c
      rs.slice().sort(function (a, b) { return a.t - b.t || a.l - b.l; }).forEach(function (r, n) { r.k.setAttribute('data-nvo', n); });
    } catch (e) { }
  }
  function lines(el) {
    visualOrder(el);
    // \uc2e4\uc81c \ud654\uba74\uc5d0\uc11c \uc228\uaca8\uc9c4 \uc694\uc18c\ub294 \ube7c\uace0 \ubcf5\uc0ac (\uc0ac\uc774\ud2b8\uac00 \ub07c\uc6cc \ub123\uc740 \uac00\uc9dc \uae00\uc790 \ubc29\uc9c0)
    var win = el.ownerDocument && el.ownerDocument.defaultView, hid = [];
    if (win && win.getComputedStyle) {
      [].forEach.call(el.querySelectorAll('*'), function (x) {
        try { var cs = win.getComputedStyle(x); if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.fontSize) === 0) hid.push(x); } catch (e) { }
      });
    }
    hid.forEach(function (x) { x.setAttribute('data-nvhid', '1'); });
    var c = el.cloneNode(true);
    hid.forEach(function (x) { x.removeAttribute('data-nvhid'); });
    c.querySelectorAll('[data-nvhid],[hidden],[style*="display:none"],[style*="display: none"],[style*="visibility:hidden"],[style*="font-size:0"]').forEach(function (x) { x.remove(); });
    var ord = [].filter.call(c.children, function (k) { return k.hasAttribute('data-nvo'); });
    if (ord.length > 3) ord.sort(function (a, b) { return a.getAttribute('data-nvo') - b.getAttribute('data-nvo'); }).forEach(function (k) { c.appendChild(k); });
    c.querySelectorAll('script,style,a,button,ins,iframe,noscript,h1').forEach(function (x) { x.remove(); });
    c.querySelectorAll('br').forEach(function (x) { x.replaceWith('\n'); });
    c.querySelectorAll('p,div').forEach(function (x) { x.append('\n'); });
    return c.textContent.split(/\n+/).map(function (s) {
      return s.replace(/[\u200b-\u200f\u2060\ufeff\u00ad]/g, '').replace(/^[\s\u3000\u00a0]+|[\s\u3000\u00a0]+$/g, '');
    }).filter(function (s) { return /[^\s\p{P}\p{S}]/u.test(s) && !adLine(s); });
  }
  // \uc0ac\uc774\ud2b8\uac00 \uc81c\ubaa9\uc744 \ub2a6\uac8c \ucc44\uc6b0\ub294 \ub3d9\uc548 \ubcf4\uc774\ub294 '\ubd88\ub7ec\uc624\ub294 \uc911' \ubb38\uad6c (\uc81c\ubaa9\uc73c\ub85c \uc4f0\uba74 \uc548 \ub428)
  var LOADT = /^[\s(\uff08\[]*(\u8f09\u5165\u4e2d|\u8f7d\u5165\u4e2d|\u52a0\u8f09\u4e2d|\u52a0\u8f7d\u4e2d|\u8b80\u53d6\u4e2d|\u8bfb\u53d6\u4e2d|\u6b63\u5728\u52a0\u8f09|\u6b63\u5728\u52a0\u8f7d|loading|\ub85c\ub529\s*\uc911|\ubd88\ub7ec\uc624\ub294\s*\uc911|\uc77d\uc5b4\s*\uc624\ub294\s*\uc911)[\s.\u2026\u3002\uff0e\u00b7!\uff01)\uff09\]]*$/i;
  function titleOf(doc) {
    var h = doc.querySelector('h1') || doc.querySelector('.bookname h1, .title, h2');
    var t = (h ? h.textContent : doc.title).replace(/\s+/g, ' ').trim();
    if (LOADT.test(t)) { // h1\uc774 \uc544\uc9c1 '\u8f09\u5165\u4e2d\u2026'\uc774\uba74 \ud398\uc774\uc9c0 \uc81c\ubaa9(<title>)\uc5d0\uc11c
      var dt = (doc.title || '').split(/\s[-_|\uff5c\u2013\u2014]\s|_|\uff5c/)[0].replace(/\s+/g, ' ').trim();
      t = dt && !LOADT.test(dt) ? dt : '';
    }
    // \ud654 \uc81c\ubaa9\uc774 \ubc88\ud638\ubfd0\uc774\uba74(\uc608: "027") \ud398\uc774\uc9c0 \uc81c\ubaa9(<title>)\uc5d0 \uc18c\uc81c\ubaa9\uc774 \ub354 \uc788\ub294\uc9c0 \ud655\uc778
    var bare = t.replace(/[(\uff08]\s*\d+\s*\/\s*\d+\s*[)\uff09]/, '').trim();
    if (/^(\u7b2c\s*)?[\d\u96f6\u3007\u4e00\u4e8c\u4e09\u56db\u4e94\u516d\u4e03\u516b\u4e5d\u5341\u767e\u5343]{1,6}\s*[\u7ae0\u56de\u8282\u7bc0\u8bdd\u8a71]?$/.test(bare) && doc.title) {
      var seg = doc.title.split(/\s[-_|\uff5c\u2013\u2014]\s|_|\uff5c/)[0].replace(/\s+/g, ' ').trim();
      if (seg.indexOf(bare) === 0 && seg.length > bare.length + 1 && seg.length < 60) t = t.replace(bare, seg);
    }
    return t;
  }
  // \uc18c\uc81c\ubaa9\uc744 h1\uc774 \uc544\ub2c8\ub77c \ubcf8\ubb38 \uccab \uc904\uc5d0 \uc801\ub294 \uc0ac\uc774\ud2b8(oop.tw \ub4f1): \uc81c\ubaa9\uc774 \ubc88\ud638\ubfd0\uc774\uace0 \uccab \uc904\uc774 \uc9e7\uace0 \ubb38\uc7a5\ubd80\ud638\ub85c \uc548 \ub05d\ub098\uba74 \uc18c\uc81c\ubaa9\uc73c\ub85c \uc62c\ub9bc
  // \uadf8\ub7f0 \uc0ac\uc774\ud2b8\ub85c \ud55c \ubc88 \ud655\uc778\ub418\uba74(subHost) '\u2026\uac74\uac00?', '\ub4e4\uc744\uac8c\uc694\u2026'\ucc98\ub7fc \ub05d\ub098\ub294 \uc9e7\uc740 \uccab \uc904\ub3c4 \uc18c\uc81c\ubaa9\uc73c\ub85c \ubc1b\uc544\ub4e4\uc784
  function subLine(s, loose) {
    s = String(s || '').trim();
    if (s.length < (/[\u4e00-\u9fff]/.test(s) ? 2 : 4) || /https?:|www\./i.test(s)) return false;
    // \ud655\uc778\ub41c \uc0ac\uc774\ud2b8: \uccab \uc904\uc774 \uc9e7\uc73c\uba74 '\u2026\u2026'\u00b7'?'\u00b7\ub530\uc634\ud45c\ub85c \ub05d\ub098\ub3c4 \uc18c\uc81c\ubaa9 (\ub9c8\uce68\ud45c\u00b7\uc27c\ud45c\ub85c \ub05d\ub098\ub294 \uac74 \ubb38\uc7a5\uc73c\ub85c \ubd04)
    if (loose) return s.length <= 32 && !/[\u3002.\uff0c,\u3001:\uff1a]$/.test(s.replace(/[\u201d\u300d\u300f"'\u2019)\uff09]+$/, ''));
    return s.length <= 40 && !/^[\u201c\u300c\u300e"'\u2018(\uff08\[\u3010\u3014\u2014\-]/.test(s) && !/[\u3002.\uff01!\uff1f?\u2026\u201d\u300d\u300f"'\u2019~\uff5e)\uff09\]\u3011\u3015:\uff1a\uff0c,\u3001]$/.test(s);
  }
  function subHost(u, set) {
    var H = gget('subHost', {}) || {}, h = hostOf(u);
    if (set && !H[h]) { H[h] = 1; gset('subHost', H); }
    return !!H[h];
  }
  function liftSub(t, L, loose) {
    if (stripNum(t) || !L || L.length < 3) return { t: t, L: L };
    var i = 0;
    if (!stripNum(L[0]) || L[0].replace(/\s+/g, '') === String(t).replace(/\s+/g, '')) i = 1; // \ubcf8\ubb38 \uccab \uc904\uc774 '\u7b2c3\u7ae0'\ucc98\ub7fc \uc81c\ubaa9 \ub418\ud480\uc774\uba74 \uac74\ub108\ub700
    if (L.length - i < 3 || !subLine(L[i], loose)) return { t: t, L: L };
    return { t: (t + ' ' + L[i]).trim(), L: L.slice(i + 1), lifted: 1 };
  }
  // \uc5c4\uaca9\ud558\uac8c \uba3c\uc800 \ubcf4\uace0, \uadf8 \uc0ac\uc774\ud2b8\uac00 '\uccab \uc904 \uc18c\uc81c\ubaa9' \uc0ac\uc774\ud2b8\ub85c \ud655\uc778\ub410\uc73c\uba74 \ub290\uc2a8\ud558\uac8c \ud55c \ubc88 \ub354
  function liftFor(u, t, L) {
    var r = liftSub(t, L);
    if (r.lifted) { subHost(u, 1); return r; }
    return subHost(u) ? liftSub(t, L, 1) : r;
  }
  // \uc774\ubbf8 \ubc88\uc5ed\ud574 \ub454 \ud654: \ubc88\uc5ed\ubcf8 \uccab \uc904\uc774 \uc18c\uc81c\ubaa9\uc774\uba74 \uc81c\ubaa9\uc73c\ub85c \uc62e\uae40
  function liftCached(u, v) {
    v = v || cacheGet(u);
    if (!v || !v.lines || stripNum(v.title || '')) return v;
    var r = liftFor(u, v.title || '', v.lines);
    if (!r.lifted) return v;
    var cut = v.lines.length - r.L.length;
    v.title = r.t; v.lines = r.L;
    if (v.parts && v.parts.length) v.parts[0] = Math.max(0, v.parts[0] - cut);
    cachePut(u, v, (cIndex()[ckey(u)] || {}).w);
    return v;
  }
  function linkCands(doc, base) {
    var out = [], seen = {};
    [].forEach.call(doc.querySelectorAll('a,[onclick]'), function (a) {
      var u = null, h = a.getAttribute('href'), oc = a.getAttribute('onclick') || '';
      if (h && !/^\s*(javascript:|#|mailto:|tel:)/i.test(h)) u = h;
      else {
        var m = (oc + ' ' + (h || '')).match(/(?:location(?:\.href)?|window\.open|\.href)\s*(?:=|\()\s*['"]([^'"]+)['"]/);
        if (m) u = m[1];
      }
      if (!u) return;
      try { u = new URL(u, base).href; } catch (e) { return; }
      if (u.split('#')[0] === base.split('#')[0] || !/^https?:/.test(u)) return;
      var t = (a.textContent + ' ' + (a.title || '') + ' ' + (a.getAttribute('aria-label') || '') + ' ' +
        [].map.call(a.querySelectorAll('img[alt]'), function (i) { return i.alt; }).join(' ')).replace(/\s+/g, ' ').trim();
      if (seen[u + '|' + t]) return; seen[u + '|' + t] = 1;
      out.push({ t: t, u: u });
    });
    return out;
  }
  function findLink(doc, base, kind, cands) {
    var i, L = learned()[hostOf(base) + ':' + kind];
    if (L) for (i = 0; i < cands.length; i++) if (cands[i].t === L) return cands[i].u;
    var r = doc.querySelector(kind === 'next' ? 'link[rel~=next][href],a[rel~=next][href]' : 'link[rel~=prev][href],a[rel~=prev][href]');
    if (r) { try { return new URL(r.getAttribute('href'), base).href; } catch (e) { } }
    var RX = kind === 'next' ? NEXT : PREV;
    for (i = 0; i < cands.length; i++) if (cands[i].t.length <= 40 && RX.test(cands[i].t)) return cands[i].u;
    var src = [].map.call(doc.querySelectorAll('script'), function (x) { return x.textContent; }).join('\n');
    var m = src.match(NV[kind]);
    if (m) { try { return new URL(m[1], base).href; } catch (e) { } }
    return null;
  }
  function chapterOf(doc, url) {
    var body = findBody(doc);
    if (!body) throw new Error('\ubcf8\ubb38\uc744 \ucc3e\uc9c0 \ubabb\ud588\uc5b4\uc694');
    var cands = linkCands(doc, url);
    // \ud55c \ud654\uac00 \uc5ec\ub7ec \ucabd\uc73c\ub85c \ub098\ub25c \uc0ac\uc774\ud2b8: "(2 / 2)" \uac19\uc740 \ucabd \ud45c\uc2dc
    var part = null, PR = /^[(\uff08\[]?\s*(\d{1,2})\s*\/\s*(\d{1,2})\s*[)\uff09\]]?$/;
    [].some.call(doc.querySelectorAll('h1,h2,h3,div,span,p,small,em'), function (x) {
      if (x.children.length > 1) return false;
      var m = x.textContent.trim().match(PR) || (/^H[123]$/.test(x.tagName) && x.textContent.match(/[(\uff08]\s*(\d{1,2})\s*\/\s*(\d{1,2})\s*[)\uff09]\s*$/));
      if (m && +m[1] >= 1 && +m[1] <= +m[2] && +m[2] > 1) { part = [+m[1], +m[2]]; return true; } return false;
    });
    var ls = liftFor(url, titleOf(doc).replace(/\s*[(\uff08]\s*\d{1,2}\s*\/\s*\d{1,2}\s*[)\uff09]\s*$/, ''), lines(body));
    return { url: url, part: part, title: ls.t, lines: ls.L, links: cands.filter(function (c) { return c.t; }).slice(0, 120),
      next: findLink(doc, url, 'next', cands), prev: findLink(doc, url, 'prev', cands) };
  }
  async function getDoc(u) {
    var r = await gxhr({ method: 'GET', url: u, responseType: 'arraybuffer', timeout: 30000 });
    if (r.status < 200 || r.status >= 300) throw new Error('\ud398\uc774\uc9c0 \ubd88\ub7ec\uc624\uae30 \uc2e4\ud328 ' + r.status);
    var buf = r.response;
    var m = (r.responseHeaders || '').match(/content-type:[^\n]*charset=([\w-]+)/i), cs = m && m[1];
    if (!cs) {
      var head = new TextDecoder('windows-1252').decode(buf.slice(0, 4096));
      var mm = head.match(/charset=["']?([\w-]+)/i); cs = mm && mm[1];
    }
    var html;
    try { html = new TextDecoder(cs || 'utf-8').decode(buf); } catch (e) { html = new TextDecoder().decode(buf); }
    return new DOMParser().parseFromString(html, 'text/html');
  }

  var fr; // (\ud06c\ub86c\ud310\uc758 \ube0c\ub9ac\uc9c0 iframe \uc790\ub9ac. \uc5ec\uae30\uc11c\ub294 \uc4f0\uc9c0 \uc54a\uc74c)
  function cfg() { return gget('cfg', null); }
  function b64u(s) { return btoa(s).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_'); }
  async function token(force) {
    var C = cfg();
    if (!force) { var t = gget('tok', null); if (t && t.e === C.sa.client_email && t.x > Date.now() + 60000) return t.v; }
    var now = Math.floor(Date.now() / 1000);
    var hc = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' })) + '.' + b64u(JSON.stringify({
      iss: C.sa.client_email, scope: 'https://www.googleapis.com/auth/cloud-platform',
      aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
    var pem = C.sa.private_key.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
    var der = Uint8Array.from(atob(pem), function (c) { return c.charCodeAt(0); });
    var key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
    var sig = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(hc)));
    var bin = ''; for (var i = 0; i < sig.length; i++) bin += String.fromCharCode(sig[i]);
    var r = await gxhr({ method: 'POST', url: 'https://oauth2.googleapis.com/token', anonymous: true, timeout: 30000,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + hc + '.' + b64u(bin) });
    var j; try { j = JSON.parse(r.responseText); } catch (e) { j = {}; }
    if (!j.access_token) throw new Error('\ud1a0\ud070 \ubc1c\uae09 \uc2e4\ud328: ' + (j.error_description || j.error || r.status));
    gset('tok', { v: j.access_token, x: Date.now() + (j.expires_in || 3600) * 1000, e: C.sa.client_email });
    return j.access_token;
  }
  // \uc791\ud488\ubcc4 \uc778\ubb3c \uc774\ub984\ud45c: { \ud55c\uc790: \ud55c\uae00 } \u2014 \ubc88\uc5ed\ud560 \ub54c \uc9c0\uc2dc\ubb38\uc5d0 \ub123\uc5b4 \uac19\uc740 \uc774\ub984\uc744 \ub298 \uac19\uc740 \ud45c\uae30\ub85c
  function namesOf(wid) { var w = wid && libAll()[wid]; return (w && w.names) || {}; }
  function namesText(wid, src) { // src\uac00 \uc788\uc73c\uba74 \uadf8 \uae00\uc5d0 \ub098\uc624\ub294 \uc774\ub984\ub9cc (\uc694\uccad\uc774 \uc9e7\uc544\uc838 \ube68\ub77c\uc9d0)
    var N = namesOf(wid), ks = Object.keys(N);
    if (src) ks = ks.filter(function (k) { return src.indexOf(k) >= 0; }); else ks = ks.slice(-150);
    return ks.map(function (k) { return k + '=' + N[k]; }).join('\n');
  }
  function saveNames(wid, map, force) {
    if (!wid || !map) return 0; var L = libAll(), w = L[wid] || (L[wid] = { id: wid, read: {} }); w.names = w.names || {}; var n = 0;
    Object.keys(map).forEach(function (k) { var v = String(map[k] || '').trim(); k = k.trim(); if (!k || !v || !/[\u3400-\u9fff]/.test(k) || !/[\uac00-\ud7a3]/.test(v) || k.length > 8 || v.length > 12) return; if (force || !w.names[k]) { if (w.names[k] !== v) n++; w.names[k] = v; } });
    if (n) gset('lib', L); return n;
  }
  function sysPrompt(C, wid, src) {
    return '\ub108\ub294 \uc911\uad6d\uc5b4 \uc6f9\uc18c\uc124 \uc804\ubb38 \ubc88\uc5ed\uac00\ub2e4. \uc785\ub825\uc740 \uc911\uad6d\uc5b4(\ubc88\uccb4 \ub610\ub294 \uac04\uccb4) \uc18c\uc124 \ud55c \ud654\uc758 \ubcf8\ubb38\uc774\uba70 \ud55c \uc904\uc774 \ud55c \ubb38\ub2e8\uc774\ub2e4. ' +
      '\uc790\uc5f0\uc2a4\ub7fd\uace0 \uc77d\uae30 \uc88b\uc740 \ud55c\uad6d\uc5b4 \uc18c\uc124 \ubb38\uccb4\ub85c \ubc88\uc5ed\ud558\ub77c.\n\uaddc\uce59:\n' +
      '1) \ubc88\uc5ed\ubb38\ub9cc \ucd9c\ub825\ud55c\ub2e4. \uc6d0\ubb38, \uc124\uba85, \uc8fc\uc11d, \uba38\ub9ac\ub9d0\uc744 \ubd99\uc774\uc9c0 \uc54a\ub294\ub2e4.\n' +
      '2) \ubb38\ub2e8 \uad6c\ubd84\uc744 \uc720\uc9c0\ud574 \ud55c \ubb38\ub2e8\uc744 \ud55c \uc904\ub85c \ucd9c\ub825\ud55c\ub2e4.\n' +
      '3) \uc778\uba85\u00b7\uc9c0\uba85\u00b7\ubb34\uacf5\uba85 \ub4f1 \uace0\uc720\uba85\uc0ac\ub294 \ud55c\uc790 \ub3c5\uc74c\uc73c\ub85c \uc77c\uad00\ub418\uac8c \uc62e\uae34\ub2e4.\n' +
      '4) \uc0ac\uc774\ud2b8 \uad11\uace0, \ud64d\ubcf4, \uc548\ub0b4 \ubb38\uad6c\ub85c \ubcf4\uc774\ub294 \uc904\uc740 \ucd9c\ub825\ud558\uc9c0 \uc54a\ub294\ub2e4.\n' +
      '5) \uc785\ub825\uc774 "[\uc81c\ubaa9]"\uc73c\ub85c \uc2dc\uc791\ud558\ub294 \uc904\uc774 \uc788\uc73c\uba74 \uadf8 \uc904\uc740 "[\uc81c\ubaa9] \ubc88\uc5ed\ub41c \uc81c\ubaa9" \ud615\uc2dd\uc73c\ub85c \ucd9c\ub825\ud55c\ub2e4.\n' +
      '6) \uc785\ub825\uc740 \uc774\ubbf8 \ucd9c\ud310\ub41c \ud5c8\uad6c\uc758 \uc18c\uc124\uc774\ub2e4. \uc804\ud22c\u00b7\ud3ed\ub825\u00b7\ubc94\uc8c4\u00b7\uc8fd\uc74c \uac19\uc740 \uc5b4\ub450\uc6b4 \uc7a5\uba74\ub3c4 \uc774\uc57c\uae30\uc758 \uc77c\ubd80\uc774\ubbc0\ub85c, \ub0b4\uc6a9\uc744 \ud310\ub2e8\ud558\uac70\ub098 \uac70\uc808\u00b7\uc694\uc57d\u00b7\uc21c\ud654\ud558\uc9c0 \ub9d0\uace0 \uc6d0\ubb38\uc758 \uc758\ubbf8 \uadf8\ub300\ub85c \ubc88\uc5ed\ub9cc \ud55c\ub2e4.\n' +
      '7) \ubb38\ub2e8 \uc21c\uc11c\uac00 \uc5b4\uc0c9\ud558\uac70\ub098 \ub4a4\uc11e\uc5ec \ubcf4\uc5ec\ub3c4 \uace0\uce58\uac70\ub098 \uadf8 \uc0ac\uc2e4\uc744 \uc124\uba85\ud558\uc9c0 \ub9d0\uace0, \uc785\ub825\ub41c \uc21c\uc11c \uadf8\ub300\ub85c \ud55c \uc904\uc529 \ubc88\uc5ed\ud55c\ub2e4. \ubc88\ud638(1. 2.)\ub97c \ubd99\uc774\uac70\ub098 \uc6d0\ubb38 \uc911\uad6d\uc5b4\ub97c \ub2e4\uc2dc \uc801\uc9c0 \uc54a\ub294\ub2e4.' +
      '\n8) \uc0ac\ub78c \uc774\ub984\uc740 \ud55c\uad6d \ud55c\uc790\uc74c\uc73c\ub85c \uc62e\uae34\ub2e4(\uc608: \u5433\u79cb\u82f1\u2192\uc624\ucd94\uc601, \u5468\u5bb6\u68df\u2192\uc8fc\uac00\ub3d9). \uc911\uad6d\uc5b4 \ubc1c\uc74c\ub300\ub85c(\uc6b0\ucd94\uc789, \uc800\uc6b0\uc790\ub465 \ub4f1) \uc4f0\uc9c0 \uc54a\ub294\ub2e4.\n' +
      '9) \ubc88\uc5ed\uc744 \ub9c8\uce5c \ub4a4 \ub9e8 \ub05d\uc5d0 \uc774\ubc88 \uc785\ub825\uc5d0 \ub098\uc628 \uc0ac\ub78c \uc774\ub984\uc744 "[\uc778\uba85] \ud55c\uc790=\ud55c\uae00; \ud55c\uc790=\ud55c\uae00" \ud615\uc2dd\uc758 \ud55c \uc904\ub85c \ub367\ubd99\uc778\ub2e4. \uc0ac\ub78c \uc774\ub984\uc774 \uc5c6\uc73c\uba74 \uc774 \uc904\uc740 \uc4f0\uc9c0 \uc54a\ub294\ub2e4.' +
      (C.g ? '\n\n\ub2e4\uc74c \uc6a9\uc5b4\uc9d1\uc744 \ubc18\ub4dc\uc2dc \ub530\ub978\ub2e4:\n' + C.g : '') +
      (wid && namesText(wid, src) ? '\n\n\uc774 \uc791\ud488\uc758 \uc778\ubb3c \uc774\ub984 \ud45c\uae30(\ubc18\ub4dc\uc2dc \uc774\ub300\ub85c \uc4f4\ub2e4):\n' + namesText(wid, src) : '');
  }
  function urlFor(C, loc) {
    var host = loc === 'global' ? 'aiplatform.googleapis.com'
      : /^(us|eu)$/.test(loc) ? 'aiplatform.' + loc + '.rep.googleapis.com'
      : loc + '-aiplatform.googleapis.com';
    return 'https://' + host + '/v1/projects/' + encodeURIComponent(C.sa.project_id) + '/locations/' + encodeURIComponent(loc) +
      '/publishers/google/models/' + encodeURIComponent(C.m) + (C.stream ? ':streamGenerateContent?alt=sse' : ':generateContent');
  }
  function sleep(ms) { return new Promise(function (ok) { setTimeout(ok, ms); }); }
  function whyShort(e) {
    var m = (e && e.message) || '';
    if (/\uc2dc\uac04 \ucd08\uacfc/.test(m)) return '\uc751\ub2f5\uc774 \ub108\ubb34 \ub2a6\uc74c';
    if (/\ub124\ud2b8\uc6cc\ud06c/.test(m)) return '\uc778\ud130\ub137 \uc5f0\uacb0 \ub04a\uae40';
    if (/API 429/.test(m)) return '\uc694\uccad\uc774 \ub108\ubb34 \ub9ce\uc74c';
    if (/API 5\d\d/.test(m)) return '\uad6c\uae00 \uc11c\ubc84 \uc624\ub958 ' + (m.match(/API (5\d\d)/) || [])[1];
    if (/API 401/.test(m)) return '\ub85c\uadf8\uc778 \ub9cc\ub8cc, \ub2e4\uc2dc \uc778\uc99d';
    if (/API \d+/.test(m)) return m.slice(0, 40);
    return m.slice(0, 30) || '\uc54c \uc218 \uc5c6\uc74c';
  }
  // \uad6c\uae00\uc774 \uac00\ub054 \ud55c \uc694\uccad\ub9cc \uc720\ub09c\ud788 \uc624\ub798 \ubd99\uc7a1\uace0 \uc788\uc74c: \uc77c\uc815 \uc2dc\uac04 \ub2f5\uc774 \uc5c6\uc73c\uba74 \ub2e4\ub978 \uc9c0\uc5ed \uc11c\ubc84\uc5d0\ub3c4 \uac19\uc740 \uc694\uccad\uc744 \ubcf4\ub0b4 \uba3c\uc800 \uc628 \ub2f5\uc744 \uc500
  var HEDGE_MS = 25000;
  // \uc544\uc8fc \ub290\ub9b4 \ub54c\ub9cc: 25\ucd08 \ub3d9\uc548 \uae00\uc790\uac00 \ud558\ub098\ub3c4 \uc548 \uc624\uba74 \ub2e4\ub978 \uc9c0\uc5ed \uc11c\ubc84 2\uacf3\uc5d0\ub3c4 \uac19\uc740 \uc694\uccad. \uba3c\uc800 \uae00\uc790\ub97c \ubcf4\ub0b4\uae30 \uc2dc\uc791\ud55c \ucabd\ub9cc \ub0a8\uae30\uace0 \ub098\uba38\uc9c0\ub294 \ucde8\uc18c
  function hedgedSend(mk, alts, onHedge, onBad, onText) {
    return new Promise(function (res, rej) {
      var boxes = [], pend = 0, done = false, hedged = false, out0 = null, ht = null, win = -1;
      function finish(f, v) { done = true; clearTimeout(ht); boxes.forEach(function (b) { if (b.abort) b.abort(); }); f(v); }
      function got(i, r, e) {
        pend--; if (done) return;
        if (r && r.status >= 200 && r.status < 300 && (win < 0 || win === i)) { boxes[i] = {}; return finish(res, r); }
        if (i > 0 && r && onBad) onBad(alts[i - 1], r);
        if (i === 0) out0 = { r: r, e: e }; // \uacb0\uacfc\ub97c \uc815\ud560 \ub54c\ub294 \uc6d0\ub798 \uc11c\ubc84 \ucabd\uc744 \uc6b0\uc120 (\ub2e4\ub978 \uc9c0\uc5ed\uc758 '\ubaa8\ub378 \uc5c6\uc74c' 404\uac00 \ucd5c\uc885 \uc624\ub958\uac00 \ub418\uc9c0 \uc54a\uac8c)
        if (i === win) win = -1;
        if (i === 0 && !hedged) { boxes[0] = {}; return r ? finish(res, r) : finish(rej, e); } // \ub2e4\ub978 \uc11c\ubc84\uc5d0 \ubcf4\ub0b4\uae30 \uc804 \uc624\ub958\ub294 \ud3c9\uc18c\ub300\ub85c \ucc98\ub9ac
        if (!pend) out0 && out0.r ? finish(res, out0.r) : finish(rej, (out0 && out0.e) || new Error('\uc751\ub2f5\uc774 \ub108\ubb34 \uc624\ub798 \uac78\ub824\uc694 (\uc2dc\uac04 \ucd08\uacfc)'));
      }
      function start(i) {
        var o = mk(i); o._box = boxes[i] = {}; pend++;
        o.onbytes = function (t) {
          if (done || !/^\s*data:/m.test(t)) return; // \uc624\ub958 \uc751\ub2f5(404 \ub4f1)\uc774 \uc544\ub2c8\ub77c \uc9c4\uc9dc \ubc88\uc5ed \uae00\uc790\uac00 \uc62c \ub54c\ub9cc
          if (win < 0) { win = i; clearTimeout(ht); if (hedged) boxes.forEach(function (b, k) { if (k !== i && b.abort) { b.abort(); boxes[k] = {}; } }); }
          if (win === i && onText) onText(t);
        };
        gxhr(o).then(function (r) { got(i, r); }, function (e) { got(i, null, e); });
      }
      if (alts.length) ht = setTimeout(function () { if (done || win >= 0) return; hedged = true; if (onHedge) onHedge(); alts.forEach(function (a, k) { start(k + 1); }); }, HEDGE_MS);
      start(0);
    });
  }
  // \uc870\uae08\uc529 \ubc1b\uc740 \uc751\ub2f5(SSE: "data: {...}" \uc904\ub4e4)\uc5d0\uc11c \ubc88\uc5ed \uae00\uc790\ub9cc \ubaa8\uc74c
  function sseParse(t) {
    var out = '', fin = null, block = null, any = false;
    String(t).split(/\r?\n/).forEach(function (l) {
      var m = l.match(/^data:\s*(.*)$/); if (!m) return;
      var j; try { j = JSON.parse(m[1]); } catch (e) { return; } any = true;
      var c = j.candidates && j.candidates[0];
      if (c && c.content && c.content.parts) c.content.parts.forEach(function (p) { if (!p.thought && p.text) out += p.text; });
      if (c && c.finishReason) fin = c.finishReason;
      if (j.promptFeedback && j.promptFeedback.blockReason) block = j.promptFeedback.blockReason;
    });
    return { any: any, text: out, finishReason: fin, block: block };
  }
  async function callApi(text, temp, sys, onStatus, model, onDelta) {
    var SAFE = ['OFF', 'BLOCK_NONE', 'BLOCK_ONLY_HIGH'];
    var say = onStatus || function () { };
    var C = cfg();
    if (!C || !C.sa || !C.sa.private_key) throw new Error('\ubc88\uc5ed \uc124\uc815\uc774 \ud544\uc694\ud574\uc694. \uc544\ub798 "\ubc88\uc5ed \uc124\uc815 \uc5f4\uae30"\ub97c \ub20c\ub7ec \ucc98\uc74c \ud55c \ubc88\ub9cc \uc124\uc815\ud574 \uc8fc\uc138\uc694.');
    var req = {
      systemInstruction: { parts: [{ text: sys || sysPrompt(C) }] },
      contents: [{ role: 'user', parts: [{ text: text }] }],
      generationConfig: { temperature: typeof temp === 'number' ? temp : 0.3, maxOutputTokens: 30000 },
      safetySettings: ['HARM_CATEGORY_HARASSMENT', 'HARM_CATEGORY_HATE_SPEECH',
        'HARM_CATEGORY_SEXUALLY_EXPLICIT', 'HARM_CATEGORY_DANGEROUS_CONTENT']
        .map(function (c) { return { category: c, threshold: SAFE[C.safe || 0] }; })
    };
    var THINK = ['minimal', 'low'];
    if (!C.noThink) req.generationConfig.thinkingConfig = { thinkingLevel: THINK[C.thinkIdx || 0] || 'low' };
    var locs = [C.loc || 'global', 'global', 'us', 'us-central1'].filter(function (v, i, a) { return a.indexOf(v) === i; }), li = 0;
    var last;
    for (var t = 0; t < 4; t++) {
      try {
        var tk = await token(t > 0 && last && /API 401/.test(last.message));
        say(t ? '\ub2e4\uc2dc \uc694\uccad\ud558\ub294 \uc911 (' + whyShort(last) + ')' : '\uc751\ub2f5 \uae30\ub2e4\ub9ac\ub294 \uc911');
        var body = JSON.stringify(req), mm = model || C.m, badL = (C.badLoc || {})[mm] || {};
        var alts = C.noHedge ? [] : ['global', 'us', 'us-central1', 'us-east5', 'europe-west4', 'asia-northeast1']
          .filter(function (l) { return l !== locs[li] && !badL[l]; }).slice(0, 2);
        var C3 = Object.assign({}, C, { stream: 1 }); if (model) C3.m = model;
        var r = await hedgedSend(function (i) {
          return { method: 'POST', url: urlFor(C3, i ? alts[i - 1] : locs[li]), anonymous: true, timeout: 300000, first: t === 0 ? 90000 : 120000, idle: 40000,
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tk }, data: body };
        }, alts, function () { say('\uc751\ub2f5\uc774 \ub108\ubb34 \ub2a6\uc5b4 \ub2e4\ub978 \uad6c\uae00 \uc11c\ubc84 ' + alts.length + '\uacf3\uc5d0\ub3c4 \uac19\uc774 \uc694\uccad\ud558\ub294 \uc911'); },
        function (loc, rr) { // \uc774 \ubaa8\ub378\uc774 \uc5c6\ub294 \uc9c0\uc5ed\uc740 \ub2e4\uc74c\ubd80\ud130 \ube7c\uae30
          if (rr.status === 404) { var C2 = cfg() || C; C2.badLoc = C2.badLoc || {}; (C2.badLoc[mm] = C2.badLoc[mm] || {})[loc] = 1; gset('cfg', C2); C.badLoc = C2.badLoc; }
        }, function (txt) { // \uae00\uc790\uac00 \uc624\ub294 \ub300\ub85c \ud654\uba74\uc5d0
          var pz = sseParse(txt); if (pz.text) { say('\ubc88\uc5ed \ubc1b\ub294 \uc911'); if (onDelta) onDelta(pz.text); }
        });
        var j; try { j = JSON.parse(r.responseText); if (Array.isArray(j)) j = j[0] || {}; } catch (e) { j = {}; }
        if (r.status === 404 && li < locs.length - 1) { li++; t--; continue; }
        if (r.status === 400 && req.generationConfig.thinkingConfig && /think/i.test(r.responseText || '')) {
          if ((C.thinkIdx || 0) < THINK.length - 1) { C.thinkIdx = (C.thinkIdx || 0) + 1; req.generationConfig.thinkingConfig = { thinkingLevel: THINK[C.thinkIdx] }; }
          else { delete req.generationConfig.thinkingConfig; C.noThink = 1; }
          gset('cfg', C); t--; continue;
        }
        if (r.status === 400 && (C.safe || 0) < SAFE.length - 1 && /threshold|safety|harm/i.test(r.responseText || '')) {
          C.safe = (C.safe || 0) + 1; gset('cfg', C);
          req.safetySettings.forEach(function (x) { x.threshold = SAFE[C.safe]; }); t--; continue;
        }
        if (r.status >= 200 && r.status < 300 && locs[li] !== C.loc) { C.loc = locs[li]; gset('cfg', C); }
        if (r.status < 200 || r.status >= 300) throw new Error('API ' + r.status + ': ' + ((j.error && j.error.message) || r.responseText || '').slice(0, 300));
        var sp = sseParse(r.responseText || ''), cand, out, why;
        if (sp.any) { out = sp.text; why = sp.finishReason; if (!out) why = sp.block || why; }
        else { // \ud55c \ubc88\uc5d0 \ubc1b\uc740 \uc751\ub2f5(\uc608\uc804 \ubc29\uc2dd)
          cand = j.candidates && j.candidates[0]; why = cand && cand.finishReason;
          out = cand && cand.content && cand.content.parts ? cand.content.parts.filter(function (p) { return !p.thought; }).map(function (p) { return p.text || ''; }).join('') : '';
          if (!out) why = (j.promptFeedback && j.promptFeedback.blockReason) || why;
        }
        if (why === 'MAX_TOKENS') throw new Error('MAX_TOKENS: \ucd9c\ub825\uc774 \uc798\ub9bc');
        if (out && why && why !== 'STOP' && BLOCKED.test(why)) throw new Error('\ubc88\uc5ed \uacb0\uacfc \uc5c6\uc74c (' + why + ')'); // \uc4f0\ub2e4\uac00 \uc911\uac04\uc5d0 \ub9c9\ud798
        if (!out) throw new Error('\ubc88\uc5ed \uacb0\uacfc \uc5c6\uc74c (' + (why || '\uc54c \uc218 \uc5c6\uc74c') + ')');
        return out;
      } catch (e) {
        last = e;
        if (/MAX_TOKENS|\ubc88\uc5ed \uacb0\uacfc \uc5c6\uc74c|\ud1a0\ud070 \ubc1c\uae09|\uc124\uc815\uc774 \ud544\uc694/.test(e.message)) break;
        if (/API (429|500|502|503|504)/.test(e.message) && t < 3) { say(/429/.test(e.message) ? '\uad6c\uae00\uc5d0 \uc694\uccad\uc774 \ubab0\ub824 \uc7a0\uc2dc \uae30\ub2e4\ub9ac\ub294 \uc911' : whyShort(e) + ', \uc7a0\uc2dc \ub4a4 \ub2e4\uc2dc'); await sleep(5000 * (t + 1)); continue; }
        if (/\uc2dc\uac04 \ucd08\uacfc/.test(e.message)) say('\uc751\ub2f5\uc774 \ub2a6\uc5b4 \ub2e4\uc2dc \uc694\uccad');
        if (/API 4(00|03|04)/.test(e.message) || (/\uc2dc\uac04 \ucd08\uacfc/.test(e.message) && t > 0) || (/API 401/.test(e.message) && t > 0)) break;
        await sleep(1500 * (t + 1));
      }
    }
    throw last;
  }

  // ---- \ubc88\uc5ed \uc800\uc7a5\uc18c: \ud654\ub9c8\ub2e4 \ub530\ub85c \uc800\uc7a5 (\uc791\ud488\uc774 \ub9ce\uc544\ub3c4 \ube60\ub974\uac8c), \uc8fc\uc18c\ub294 www\u00b7#\u2026 \ucc28\uc774\ub97c \ubb34\uc2dc ----
  var CMAX = 3000;
  function ckey(u) { return String(u).replace(/#.*$/, '').replace(/^(https?:\/\/)www\./i, '$1'); }
  // \ucc3d(\ud0ed)\ub9c8\ub2e4 \ubaa9\ub85d\uc744 \uba54\ubaa8\ub9ac\uc5d0 \ub4e4\uace0 \uc788\uc73c\uba74, \uc608\uc804 \ucc3d\uc774 \uc800\uc7a5\ud560 \ub54c \ub2e4\ub978 \ucc3d\uc5d0\uc11c \uace0\uce5c \ub0b4\uc6a9\uc744 \ub36e\uc5b4\uc500 \u2192 \uc800\uc7a5 \ubc88\ud638\uac00 \ubc14\ub00c\uba74 \ub2e4\uc2dc \uc77d\uc74c
  var cidx = null, cidxV = null;
  function cIndex() {
    var v = gget('cidxv', 0);
    if (cidx && v === cidxV) return cidx;
    cidxV = v;
    cidx = gget('cidx', null);
    if (!cidx) { // \uc608\uc804 \ud615\uc2dd(\ud55c \ub369\uc5b4\ub9ac)\uc5d0\uc11c \uc62e\uae30\uae30
      cidx = {}; var old = gget('cache', null);
      if (old) { Object.keys(old).forEach(function (u) { var k = ckey(u); gset('c:' + k, old[u]); cidx[k] = { t: old[u].title, ts: Date.now() }; }); gdel('cache'); }
      cidxSave(cidx);
    }
    return cidx;
  }
  function cidxSave(I) { gset('cidx', I); cidxV = Date.now() + '.' + Math.random().toString(36).slice(2, 7); gset('cidxv', cidxV); cidx = I; }
  // \ubc88\uc5ed \ubcf8\ubb38\uc740 \uc555\ucd95\ud574\uc11c \uc800\uc7a5: Violentmonkey\ub294 \uc774 \uc2a4\ud06c\ub9bd\ud2b8\uc758 \uc800\uc7a5\uac12 \uc804\ubd80\ub97c \uc5f4\ub9ac\ub294 \ud398\uc774\uc9c0\ub9c8\ub2e4 \ubbf8\ub9ac \uc2e4\uc5b4 \ubcf4\ub0b4\uc11c, \uc791\uc744\uc218\ub85d \ubaa8\ub4e0 \uc0ac\uc774\ud2b8\uac00 \uac00\ubcbc\uc6c0
  // (lz-string 1.5.0, MIT License, Copyright (c) 2013 pieroxy)
  var LZS = (function () { return function(){var r=String.fromCharCode,o="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",n="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$",e={};function t(r,o){if(!e[r]){e[r]={};for(var n=0;n<r.length;n++)e[r][r.charAt(n)]=n}return e[r][o]}var i={compressToBase64:function(r){if(null==r)return"";var n=i._compress(r,6,function(r){return o.charAt(r)});switch(n.length%4){default:case 0:return n;case 1:return n+"===";case 2:return n+"==";case 3:return n+"="}},decompressFromBase64:function(r){return null==r?"":""==r?null:i._decompress(r.length,32,function(n){return t(o,r.charAt(n))})},compressToUTF16:function(o){return null==o?"":i._compress(o,15,function(o){return r(o+32)})+" "},decompressFromUTF16:function(r){return null==r?"":""==r?null:i._decompress(r.length,16384,function(o){return r.charCodeAt(o)-32})},compressToUint8Array:function(r){for(var o=i.compress(r),n=new Uint8Array(2*o.length),e=0,t=o.length;e<t;e++){var s=o.charCodeAt(e);n[2*e]=s>>>8,n[2*e+1]=s%256}return n},decompressFromUint8Array:function(o){if(null==o)return i.decompress(o);for(var n=new Array(o.length/2),e=0,t=n.length;e<t;e++)n[e]=256*o[2*e]+o[2*e+1];var s=[];return n.forEach(function(o){s.push(r(o))}),i.decompress(s.join(""))},compressToEncodedURIComponent:function(r){return null==r?"":i._compress(r,6,function(r){return n.charAt(r)})},decompressFromEncodedURIComponent:function(r){return null==r?"":""==r?null:(r=r.replace(/ /g,"+"),i._decompress(r.length,32,function(o){return t(n,r.charAt(o))}))},compress:function(o){return i._compress(o,16,function(o){return r(o)})},_compress:function(r,o,n){if(null==r)return"";var e,t,i,s={},u={},a="",p="",c="",l=2,f=3,h=2,d=[],m=0,v=0;for(i=0;i<r.length;i+=1)if(a=r.charAt(i),Object.prototype.hasOwnProperty.call(s,a)||(s[a]=f++,u[a]=!0),p=c+a,Object.prototype.hasOwnProperty.call(s,p))c=p;else{if(Object.prototype.hasOwnProperty.call(u,c)){if(c.charCodeAt(0)<256){for(e=0;e<h;e++)m<<=1,v==o-1?(v=0,d.push(n(m)),m=0):v++;for(t=c.charCodeAt(0),e=0;e<8;e++)m=m<<1|1&t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}else{for(t=1,e=0;e<h;e++)m=m<<1|t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t=0;for(t=c.charCodeAt(0),e=0;e<16;e++)m=m<<1|1&t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}0==--l&&(l=Math.pow(2,h),h++),delete u[c]}else for(t=s[c],e=0;e<h;e++)m=m<<1|1&t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t>>=1;0==--l&&(l=Math.pow(2,h),h++),s[p]=f++,c=String(a)}if(""!==c){if(Object.prototype.hasOwnProperty.call(u,c)){if(c.charCodeAt(0)<256){for(e=0;e<h;e++)m<<=1,v==o-1?(v=0,d.push(n(m)),m=0):v++;for(t=c.charCodeAt(0),e=0;e<8;e++)m=m<<1|1&t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}else{for(t=1,e=0;e<h;e++)m=m<<1|t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t=0;for(t=c.charCodeAt(0),e=0;e<16;e++)m=m<<1|1&t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}0==--l&&(l=Math.pow(2,h),h++),delete u[c]}else for(t=s[c],e=0;e<h;e++)m=m<<1|1&t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t>>=1;0==--l&&(l=Math.pow(2,h),h++)}for(t=2,e=0;e<h;e++)m=m<<1|1&t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t>>=1;for(;;){if(m<<=1,v==o-1){d.push(n(m));break}v++}return d.join("")},decompress:function(r){return null==r?"":""==r?null:i._decompress(r.length,32768,function(o){return r.charCodeAt(o)})},_decompress:function(o,n,e){var t,i,s,u,a,p,c,l=[],f=4,h=4,d=3,m="",v=[],g={val:e(0),position:n,index:1};for(t=0;t<3;t+=1)l[t]=t;for(s=0,a=Math.pow(2,2),p=1;p!=a;)u=g.val&g.position,g.position>>=1,0==g.position&&(g.position=n,g.val=e(g.index++)),s|=(u>0?1:0)*p,p<<=1;switch(s){case 0:for(s=0,a=Math.pow(2,8),p=1;p!=a;)u=g.val&g.position,g.position>>=1,0==g.position&&(g.position=n,g.val=e(g.index++)),s|=(u>0?1:0)*p,p<<=1;c=r(s);break;case 1:for(s=0,a=Math.pow(2,16),p=1;p!=a;)u=g.val&g.position,g.position>>=1,0==g.position&&(g.position=n,g.val=e(g.index++)),s|=(u>0?1:0)*p,p<<=1;c=r(s);break;case 2:return""}for(l[3]=c,i=c,v.push(c);;){if(g.index>o)return"";for(s=0,a=Math.pow(2,d),p=1;p!=a;)u=g.val&g.position,g.position>>=1,0==g.position&&(g.position=n,g.val=e(g.index++)),s|=(u>0?1:0)*p,p<<=1;switch(c=s){case 0:for(s=0,a=Math.pow(2,8),p=1;p!=a;)u=g.val&g.position,g.position>>=1,0==g.position&&(g.position=n,g.val=e(g.index++)),s|=(u>0?1:0)*p,p<<=1;l[h++]=r(s),c=h-1,f--;break;case 1:for(s=0,a=Math.pow(2,16),p=1;p!=a;)u=g.val&g.position,g.position>>=1,0==g.position&&(g.position=n,g.val=e(g.index++)),s|=(u>0?1:0)*p,p<<=1;l[h++]=r(s),c=h-1,f--;break;case 2:return v.join("")}if(0==f&&(f=Math.pow(2,d),d++),l[c])m=l[c];else{if(c!==h)return null;m=i+i.charAt(0)}v.push(m),l[h++]=i+m.charAt(0),i=m,0==--f&&(f=Math.pow(2,d),d++)}}};return i}();"function"==typeof define&&define.amd?define(function(){return LZString}):"undefined"!=typeof module&&null!=module?module.exports=LZString:"undefined"!=typeof angular&&null!=angular&&angular.module("LZString",[]).factory("LZString",function(){return LZString}); })();
  function cenc(v) { // { title, lines, parts } \u2192 { title, parts, z }
    var o = { title: v.title, z: LZS.compressToUTF16(JSON.stringify(v.lines || [])) };
    if (v.parts) o.parts = v.parts;
    return o;
  }
  function cdec(o) {
    if (!o || o.lines || o.z == null) return o; // \uc608\uc804 \ud615\uc2dd(\uc555\ucd95 \uc548 \ud568)\uc740 \uadf8\ub300\ub85c
    var L = null; try { L = JSON.parse(LZS.decompressFromUTF16(o.z)); } catch (e) { }
    var v = { title: o.title, lines: L || [] }; if (o.parts) v.parts = o.parts;
    return v;
  }
  function cread(k) { return cdec(gget('c:' + k, null)); }
  function cacheGet(u) { var k = ckey(u); return cIndex()[k] ? cread(k) : null; }
  // \uc608\uc804 \ubc84\uc804\uc774 \uad11\uace0 \ubb38\uad6c\ub098 '\ubcf8\ubb38 \uc5c6\uc74c' \uc548\ub0b4\ub97c \ubc88\uc5ed\ud574 \uc800\uc7a5\ud55c \ud654: \uc800\uc7a5\ub41c \ubc88\uc5ed\uc73c\ub85c \uce58\uc9c0 \uc54a\uc74c(\uc5f4\uba74 \ub2e4\uc2dc \ubc88\uc5ed)
  var BADV = /USD|VIP|\uad11\uace0|\ub85c\uadf8\uc778|\uacb0\uc81c|\ud68c\uc6d0\s*\uac00\uc785|\ubcf8\ubb38\uc774 \uc5c6|\u7ae0[\u7bc0\u8282]\u5167\u5bb9\u7f3a\u5931|\u7ae0\u8282\u5185\u5bb9\u7f3a\u5931|\ub0b4\uc6a9\uc774 (\uc5c6|\ub204\ub77d)|\uc874\uc7ac\ud558\uc9c0 \uc54a|\ub85c\ub529\s*\uc911|\ubd88\ub7ec\uc624\ub294\s*\uc911|\u8f09\u5165\u4e2d|\u52a0\u8f7d\u4e2d|\u52a0\u8f09\u4e2d/;
  function isBadV(v) {
    if (!v || !v.lines || !v.lines.length) return true;
    var all = v.lines.join('');
    return all.length < 700 && BADV.test(all);
  }
  function cacheDel(u) { var k = ckey(u), I = cIndex(); delete I[k]; gdel('c:' + k); cidxSave(I); }
  function cachePut(u, v, wid) {
    var k = ckey(u), I = cIndex();
    gset('c:' + k, cenc(v)); I[k] = { t: v.title, ts: Date.now(), w: wid || (I[k] && I[k].w), b: isBadV(v) ? 1 : 0 };
    var ks = Object.keys(I);
    if (ks.length > CMAX) {
      ks.sort(function (a, b) { return I[a].ts - I[b].ts; }).slice(0, ks.length - CMAX).forEach(function (x) { delete I[x]; gdel('c:' + x); });
    }
    cidxSave(I);
  }
  function cacheHas(u) { return cIndex()[ckey(u)]; }
  // \ubaa9\ub85d\uc5d0 '\uc798\ubabb \uc800\uc7a5\ub41c \ubc88\uc5ed' \ud45c\uc2dc\uac00 \uc5c6\ub294 \uc608\uc804 \uae30\ub85d\uc740 \ud55c \ubc88\ub9cc \ubcf8\ubb38\uc744 \uc77d\uc5b4 \ud45c\uc2dc\ub97c \ubd99\uc784 (\ub2e4\uc74c\ubd80\ud130\ub294 \ubaa9\ub85d\ub9cc \ubcf4\uace0 \uc54e)
  var badDirty = false;
  function idxBad(k) { var e = cIndex()[k]; if (!e) return true; if (e.b == null) { e.b = isBadV(cread(k)) ? 1 : 0; badDirty = true; } return !!e.b; }
  function idxFlush() { if (badDirty) { badDirty = false; cidxSave(cIndex()); } }
  // \uc608\uc804 \ud615\uc2dd(\uc555\ucd95 \uc548 \ud55c) \ubc88\uc5ed\uc744 \uc26c\ub294 \ud2c8\uc5d0 \uc870\uae08\uc529 \uc555\ucd95\ud574 \ub2e4\uc2dc \uc800\uc7a5
  function packOld() {
    var I = cIndex(), ks = Object.keys(I), i = 0;
    (function step() {
      var t0 = Date.now(), n = 0;
      while (i < ks.length && Date.now() - t0 < 30) { var k = ks[i++], o = gget('c:' + k, null); if (o && o.lines) { gset('c:' + k, cenc(o)); n++; } }
      if (i < ks.length) setTimeout(step, n ? 400 : 0);
    })();
  }
  // ===================== \ubc88\uc5ed =====================
  // \ub9c9\ud788\uac70\ub098(\uc548\uc804 \ud544\ud130) \uc798\ub9ac\uba74(\uae38\uc774 \ucd08\uacfc) \ubc18\uc73c\ub85c \ub098\ub220 \ub2e4\uc2dc \uc2dc\ub3c4, \ub05d\uae4c\uc9c0 \ub9c9\ud788\ub294 \ud55c \uc904\uc740 \uc6d0\ubb38\uc73c\ub85c \ud45c\uc2dc
  var BLOCKED = /SAFETY|PROHIBITED|BLOCKLIST|SPII|RECITATION|OTHER|MAX_TOKENS|\ubc88\uc5ed \uacb0\uacfc \uc5c6\uc74c/i;
  // \ubaa8\ub378\uc774 \ubc88\uc5ed \ub300\uc2e0 \uac70\uc808 \ubb38\uc7a5\uc744 \ub3cc\ub824\uc900 \uacbd\uc6b0 (\uc18c\uc124 \uc18d \ub300\uc0ac '\uc8c4\uc1a1\ud569\ub2c8\ub2e4'\uc640 \ud5f7\uac08\ub9ac\uc9c0 \uc54a\uac8c \ud45c\ud604\uc744 \uc881\uac8c)
  var REFUSE = /(\ubc88\uc5ed|\uc694\uccad)[^.\n]{0,30}(\uc218\s*\uc5c6|\uc5b4\ub835|\ubd88\uac00|\ub4dc\ub9b4\s*\uc218\s*\uc5c6)|\uc815\ucc45|\uac00\uc774\ub4dc\ub77c\uc778|\uc548\uc804\s*\uae30\uc900|I\s*can(?:not|'t)\s*(help|assist|translate|provide|comply)|I'?m\s*(sorry|unable)|as an ai/i;
  function looksRefusal(out, src) {
    var o = out.join(' '), sl = src.join('').length;
    if (!REFUSE.test(o)) return false;
    if (src.length >= 3 && out.length <= 2) return true; // \uc5ec\ub7ec \uc904\uc744 \ub123\uc5c8\ub294\ub370 \ud55c\ub450 \uc904\ub9cc \ub3cc\uc544\uc634
    return o.length < sl * 1.2 && !/(\ubc88\uc5ed|\u7ffb\u8b6f|\u7ffb\u8bd1)/.test(src.join('')); // \ud55c\uad6d\uc5b4 \ubc88\uc5ed\uc740 \ubcf4\ud1b5 \uc6d0\ubb38\ubcf4\ub2e4 \uae38\ub2e4
  }
  // \uc0ac\uc774\ud2b8\uac00 \ubcf8\ubb38 \ub300\uc2e0 \ub744\uc6b4 \uc548\ub0b4\ubb38 ("\uc774 \ud654 \ub0b4\uc6a9\uc774 \uc5c6\uc74c/\uc218\ub9ac \uc911/\ubaa9\ub85d\uc5d0\uc11c \ub2e4\uc2dc \uace0\ub974\uc138\uc694" \ub4f1)
  var MISSING = /\u7ae0[\u7bc0\u8282]?(\u5167\u5bb9|\u5185\u5bb9)?(\u7f3a\u5931|\u4e0d\u5b58\u5728|\u672a\u627e\u5230|\u627e\u4e0d\u5230)|\u5167\u5bb9\u7f3a\u5931|\u5185\u5bb9\u7f3a\u5931|\u6b63\u5728\u4fee[\u5fa9\u590d]|\u5c1a\u672a\u6536[\u9304\u5f55]|[\u8acb\u8bf7][\u5f9e\u4ece]\u76ee[\u9304\u5f55]\u91cd\u65b0[\u9078\u9009]|\u672c\u7ae0[\u7bc0\u8282]?(\u4e0d\u5b58\u5728|\u5df2[\u522a\u5220]\u9664)|\u7ae0[\u7bc0\u8282]\u5df2[\u522a\u5220]\u9664|[\u5167\u5185]\u5bb9(\u6b63\u5728)?\u66f4\u65b0\u4e2d|\u66ab\u7121\u5167\u5bb9|\u6682\u65e0\u5185\u5bb9/;
  function siteNotice(ls) { var j = ls.join(''); return hanLen(j) < 150 && MISSING.test(j) ? j : ''; }
  // \ubaa8\ub378\uc774 \ubc88\uc5ed \ub300\uc2e0 '\uc0dd\uac01\ud55c \uacfc\uc815'\uc774\ub098 \uc6d0\ubb38\uc744 \uc11e\uc5b4 \ub0b4\ubcf4\ub0b8 \uacbd\uc6b0 \uc54c\uc544\ucc54
  var META = /^\s*(\uc6d0\ubb38|\ucc38\uace0|\uc8fc\uc758|\uc124\uba85|\ud574\uc124|\ubd84\uc11d|note|source)\s*[:\uff1a)\]]|^\s*\u203b|(\uc6d0\ubb38|\ubb38\ub2e8)[^\n]{0,20}(\uc5ed\uc21c|\uac70\uafb8\ub85c|\ubcf5\uc6d0|\uc7ac\ubc30\uc5f4|\ub4a4\uc11e)|\ubc88\uc5ed(\ud55c\ub2e4|\ud558\uaca0\ub2e4|\ud588\ub2e4|\ud558\uc600\ub2e4|\ud569\ub2c8\ub2e4|\ud558\uaca0\uc2b5\ub2c8\ub2e4)\.?\s*$/i;
  function badOutput(out, src) {
    var all = out.join(''), han = hanLen(all), sh = hanLen((src || []).join(''));
    if (han > 30 && sh && han > sh * 0.5) return true; // \uc6d0\ubb38 \uc911\uad6d\uc5b4\ub97c \uc0c1\ub2f9 \ubd80\ubd84 \ub2e4\uc2dc \uc801\uc5b4 \ub0c4
    var meta = out.filter(function (l) { return META.test(l); }).length, num = out.filter(function (l) { return /^\d{1,3}[\.)]\s/.test(l); }).length;
    return meta > 0 || (num >= 3 && num >= out.length * 0.3);
  }
  function cleanOutput(out) { // \uadf8\ub798\ub3c4 \uc11e\uc5ec \ub098\uc624\uba74: \uc124\uba85 \uc904\u00b7\uc911\uad6d\uc5b4 \uc904\u00b7\ubc88\ud638\ub97c \uac77\uc5b4\ub0c4
    return out.filter(function (l) { var h = hanLen(l), g = (l.match(/[\uac00-\ud7a3]/g) || []).length; return !META.test(l) && !(h > 6 && h > g * 2); })
      .map(function (l) { return l.replace(/^\d{1,3}[\.)]\s+/, ''); });
  }
  var NAMES_LINE = /^\[\uc778\uba85\]\s*/;
  function takeNames(out, gl) { // "[\uc778\uba85] \u5433\u79cb\u82f1=\uc624\ucd94\uc601; ..." \uc904\uc744 \ube7c\uace0 \uc774\ub984\ud45c\uc5d0 \ubaa8\uc74c
    return out.filter(function (l) {
      if (!NAMES_LINE.test(l)) return true;
      if (gl && gl.learn) l.replace(NAMES_LINE, '').split(/[;\uff1b,\uff0c\u3001]/).forEach(function (pr) { var m = pr.split(/[=\uff1d]/); if (m.length === 2) gl.learn[m[0].trim()] = m[1].trim(); });
      return false;
    });
  }
  async function callLines(ls, temp, say, model, onDelta, gl) {
    var wid = gl && gl.wid;
    function run(t, sys) { return callApi(ls.join('\n'), t, sys || sysPrompt(cfg() || {}, wid, ls.join('\n')), say, model, onDelta).then(function (o) { return takeNames(o.split(/\n+/).map(function (x) { return x.trim(); }).filter(Boolean), gl); }); }
    var out = await run(temp, null);
    if (looksRefusal(out, ls)) throw new Error('\ubc88\uc5ed \uacb0\uacfc \uc5c6\uc74c (REFUSAL)');
    if (badOutput(out, ls)) {
      say && say('\ubc88\uc5ed\uc774 \uc774\uc0c1\ud558\uac8c \ub098\uc640 \ub2e4\uc2dc \uc694\uccad\ud558\ub294 \uc911');
      var C = cfg() || {};
      try {
        var o2 = await run(0.2, sysPrompt(C, wid, ls.join('\n')) + '\n\n\uc911\uc694: \uc9c0\ub09c \uc751\ub2f5\uc5d0 \uc124\uba85\uc774\ub098 \uc6d0\ubb38\uc774 \uc11e\uc600\ub2e4. \uc774\ubc88\uc5d0\ub294 \ud55c\uad6d\uc5b4 \ubc88\uc5ed\ubb38\ub9cc, \uc785\ub825\uacfc \uac19\uc740 \uc21c\uc11c\ub85c, \ud55c \ubb38\ub2e8\uc5d0 \ud55c \uc904\uc529\ub9cc \ucd9c\ub825\ud558\ub77c.');
        if (!badOutput(o2, ls)) return o2;
        out = o2;
      } catch (e) { }
      out = cleanOutput(out);
      if (!out.length) throw new Error('\ubc88\uc5ed \uacb0\uacfc \uc5c6\uc74c (\uc124\uba85\ub9cc \ub098\uc634)');
    }
    return out;
  }
  async function translateLines(ls, depth, temp, say, onDelta, gl) {
    try {
      return await callLines(ls, temp, say, null, onDelta, gl);
    } catch (e) {
      if (onDelta) onDelta(null); // \ubcf4\uc5ec \uc8fc\ub358 \uc911\uac04 \uacb0\uacfc\ub294 \uc9c0\uc6c0
      if (!BLOCKED.test(e.message) || depth > 4) throw e;
      var alt = (cfg() || {}).alt;
      if (ls.length === 1) { // \ub05d\uae4c\uc9c0 \ub9c9\ud788\ub294 \ud55c \uc904: \ub300\uccb4 \ubaa8\ub378\uc774 \uc788\uc73c\uba74 \ud55c \ubc88 \ub354, \uadf8\ub798\ub3c4 \uc548 \ub418\uba74 \uc6d0\ubb38
        if (alt) { try { say && say('\ub9c9\ud78c \ubb38\uc7a5\uc744 \ub2e4\ub978 \ubaa8\ub378\ub85c \ubc88\uc5ed\ud558\ub294 \uc911'); return await callLines(ls, temp, say, alt, null, gl); } catch (e3) { } }
        return ['\u3014\ubc88\uc5ed \ucc28\ub2e8 \u2014 \uc6d0\ubb38\u3015 ' + ls[0]];
      }
      if (depth === 0 && alt) { // \ub369\uc5b4\ub9ac\uc9f8\ub85c \ub300\uccb4 \ubaa8\ub378 \uba3c\uc800
        try { say && say('\ub9c9\ud78c \ubd80\ubd84\uc744 \ub2e4\ub978 \ubaa8\ub378\ub85c \ubc88\uc5ed\ud558\ub294 \uc911'); return await callLines(ls, temp, say, alt, null, gl); } catch (e2) { }
      }
      say && say('\ucc28\ub2e8\ub41c \ubd80\ubd84\uc744 \ub098\ub220\uc11c \ubc88\uc5ed\ud558\ub294 \uc911');
      var n = Math.min(4, ls.length), size = Math.ceil(ls.length / n), parts = [];
      for (var i = 0; i < ls.length; i += size) parts.push(ls.slice(i, i + size));
      var res = await Promise.all(parts.map(function (p) { return translateLines(p, depth + 1, temp, say, null, gl); }));
      return [].concat.apply([], res);
    }
  }
  // \uc6d0\ubb38\uc744 800\uc790 \uc548\ud30e \ub369\uc5b4\ub9ac\ub85c \ub098\ub214 (\ub124 \ub369\uc5b4\ub9ac\uc529 \ub3d9\uc2dc\uc5d0 \ubc88\uc5ed), \uccab \uc904\uc740 \uc81c\ubaa9
  function makeChunks(ch) {
    var src = ['[\uc81c\ubaa9] ' + ch.title].concat(ch.lines), chunks = [], cur = [], n = 0;
    src.forEach(function (l) {
      if (n + l.length > 800 && cur.length) { chunks.push(cur); cur = []; n = 0; }
      cur.push(l); n += l.length + 1;
    });
    if (cur.length) chunks.push(cur);
    return chunks;
  }
  function splitTitle(res, title) {
    var t = title;
    res = res.filter(function (l) { var m = l.match(/^\[\uc81c\ubaa9\]\s*(.*)$/); if (m) { t = m[1] || t; return false; } return true; });
    return { lines: res, title: t };
  }
  // onPart(\ub369\uc5b4\ub9ac \ubc88\ud638, \ubc88\uc5ed \uc904\ub4e4, \uc81c\ubaa9) \u2014 \uce90\uc2dc\uc5d0\uc11c \uac00\uc838\uc624\uba74 \ub369\uc5b4\ub9ac \ubc88\ud638 -1 \uc774 \uc544\ub2c8\ub77c \ub369\uc5b4\ub9ac\ubcc4\ub85c \ub098\ub220\uc11c \uc54c\ub824\uc90c
  async function translate(ch, onPart, ctl) {
    ctl = ctl || {};
    var chunks = makeChunks(ch);
    var hit = cacheGet(ch.url);
    if (hit && isBadV(hit)) { cacheDel(ch.url); hit = null; }
    if (hit && LOADT.test(stripNum(hit.title || '') || hit.title || '') && ch.title && !LOADT.test(ch.title)) { // \uc608\uc804\uc5d0 '\ub85c\ub529 \uc911'\uc744 \uc81c\ubaa9\uc73c\ub85c \uc800\uc7a5\ud55c \ud654
      hit.title = ch.title; cachePut(ch.url, hit, ch.id);
      (function (h0) { callApi('[\uc81c\ubaa9] ' + ch.title).then(function (o) { var t1 = (splitTitle(o.split(/\n+/), '').title || o.split(/\n+/)[0] || '').trim(); if (t1 && !LOADT.test(t1)) { h0.title = t1; cachePut(ch.url, h0, ch.id); chapters.forEach(function (c) { if (ckey(c.ch.url) === ckey(ch.url)) setTitle(c, t1); }); } }).catch(function () { }); })(hit);
    }
    if (hit) hit = liftCached(ch.url, hit);
    if (hit && hit.lines && hit.lines.length) {
      if (hit.parts && hit.parts.length === chunks.length) {
        var k = 0;
        hit.parts.forEach(function (cnt, i) { onPart && onPart(i, hit.lines.slice(k, k + cnt), hit.title); k += cnt; });
      } else onPart && onPart(-1, hit.lines, hit.title);
      return hit;
    }
    var title = ch.title, outLines = [], parts = [];
    var temp = ch.retrans ? Math.min(1, 0.3 + 0.25 * ch.retrans) : undefined;
    if (ctl.title) title = ctl.title;
    var res = new Array(chunks.length), nextI = 0;
    var say = function (m) { ctl.status = m; ctl.statusTs = Date.now(); ctl.onStatus && ctl.onStatus(m); };
    var failed = false, gl = { wid: ch.id, learn: {} };
    function lim() { return ctl.limit == null ? chunks.length : Math.min(chunks.length, ctl.limit); }
    async function worker() {
      while (nextI < lim() && !failed) {
        var i = nextI++;
        if (ctl.cancel) throw new Error('\ucde8\uc18c\ub428');
        var r;
        try { r = ctl.keep && ctl.keep[i] ? { lines: ctl.keep[i], title: title } : splitTitle(await translateLines(chunks[i], 0, temp, say, (function (ci) { return function (txt) { if (!ctl.cancel && ctl.onPartial) ctl.onPartial(ci, txt); }; })(i), gl), title); }
        catch (e) { failed = true; throw e; }
        if (ctl.cancel) throw new Error('\ucde8\uc18c\ub428');
        if (i === 0) title = r.title;
        res[i] = r.lines;
        onPart && onPart(i, r.lines, title);
      }
    }
    var W = 4, mk = function () { var a = []; for (var w = 0; w < W; w++) a.push(worker()); return a; };
    var workers = mk(); // \ub124 \ub369\uc5b4\ub9ac\uc529 \ub3d9\uc2dc\uc5d0
    for (;;) {
      await Promise.all(workers);
      if (!failed && nextI < lim()) { workers = mk(); continue; } // \ubbf8\ub9ac \ubc88\uc5ed \uc911\uc5d0 \ud654\ub97c \uc5f4\uc5b4 \uc81c\ud55c\uc774 \ud480\ub9b0 \uacbd\uc6b0
      break;
    }
    for (var q = 0; q < chunks.length; q++) if (!res[q]) return { partial: true, title: title }; // \uc55e\ubd80\ubd84\ub9cc \ubbf8\ub9ac \ubc88\uc5ed\ud55c \uc0c1\ud0dc (\uc800\uc7a5 \uc548 \ud568)
    res.forEach(function (ls) { outLines = outLines.concat(ls); parts.push(ls.length); });
    if (!outLines.length) throw new Error('\ubc88\uc5ed \uacb0\uacfc\uac00 \ube44\uc5b4 \uc788\uc5b4\uc694');
    var v = { title: title, lines: outLines, parts: parts };
    cachePut(ch.url, v, ch.id);
    try { saveNames(ch.id, gl.learn); } catch (e) { } // \uc0c8\ub85c \ub098\uc628 \uc778\ubb3c \uc774\ub984\uc740 \uc774\ub984\ud45c\uc5d0 \ucd94\uac00 (\uc774\ubbf8 \uc788\ub294 \uac74 \uadf8\ub300\ub85c)
    return v;
  }

  // ===================== \uc791\ud488 \uc815\ubcf4 (\uc11c\uc7ac\u00b7\ubaa9\ucc28\uc6a9) =====================
  function workId(u) { return String(u).replace(/[?#].*$/, '').replace(/[^\/]*$/, ''); }
  // \uc791\ud488 \uad6c\ubd84: \u2460 \uc791\ud488 \uc774\ub984 \u2461 \uc791\ud488(\ubaa9\ucc28) \ud398\uc774\uc9c0 \uc8fc\uc18c \u2462 \uc8fc\uc18c\uc758 \ud3f4\ub354 \u2014 \uc0ac\uc774\ud2b8\ub9c8\ub2e4 \uc8fc\uc18c \uad6c\uc870\uac00 \ub2ec\ub77c\uc11c \uc774\ub984\uc744 \uba3c\uc800 \uc500
  var SITENAME = /(\u5c0f[\u8aaa\u8aac\u8bf4]|[\u66f8\u4e66]\u57ce|[\u66f8\u4e66]\u5c4b|[\u66f8\u4e66]\u9662|[\u66f8\u4e66]\u5427|\u95b1\u8b80|\u9605\u8bfb|\u6587\u5b78|\u6587\u5b66|\u4e2d\u6587)(\u7db2|\u7f51|\u7ad9|\u57ce)?$|(\u7db2|\u7f51|\u7ad9)$|^(oop|www)\b/i;
  function workKey(url, book, toc) {
    var host = String(url).replace(/^https?:\/\/(www\.)?/i, '').replace(/\/.*$/, '');
    if (book && !SITENAME.test(book)) return host + '|b:' + book.replace(/\s+/g, '');
    if (toc) return host + '|t:' + ckey(toc).replace(/^https?:\/\/[^\/]+/, '');
    return host + '|d:' + workId(url).replace(/^https?:\/\/[^\/]+/, '');
  }
  var TOCRX = /\u76ee[\u9304\u5f55\u6b21]|\u7ae0[\u7bc0\u8282]\u5217\u8868|\u8fd4\u56de[\u66f8\u4e66]?[\u9801\u9875\u76ee]|[\u66f8\u4e66][\u9801\u9875]|\u5168\u90e8\u7ae0[\u7bc0\u8282]|\ubaa9\ucc28|\ubaa9\ub85d/;
  function bookOf(doc, chTitle) {
    var m = doc.querySelector('meta[property="og:novel:book_name"],meta[name="og:novel:book_name"]');
    if (m && m.content) return m.content.trim();
    var b = doc.querySelector('.bookname a,.book-name,.bookName,#bookname,.crumbs a:nth-last-of-type(1)');
    if (b && b.textContent.trim().length > 1 && b.textContent.trim().length < 40) return b.textContent.trim();
    var bk = ((doc.title || '') + ' ' + chTitle).match(/\u300a([^\u300b]{1,40})\u300b/);
    if (bk) return bk[1].trim();
    var parts = (doc.title || '').split(/\s*[_\-|\u2013\u2014,\uff0c]\s*/).map(function (x) { return x.trim(); })
      .filter(function (x) { return x.length > 1 && x.length < 40 && x !== chTitle && chTitle.indexOf(x) < 0 && !/\u7b2c.+[\u7ae0\u56de\u8282\u7bc0]|\u5c0f[\u8aaa\u8aac\u8bf4]|[\u66f8\u4e66]\u57ce|\u7db2|\u7f51|\u5728[\u7dda\u7ebf]|\u95b1\u8b80|\u9605\u8bfb|\u4e2d\u6587|oop/i.test(x); });
    return parts[0] || '';
  }
  function tocOf(doc, url, cands) {
    var L = learned()[hostOf(url) + ':toc'];
    for (var i = 0; i < cands.length; i++) if (L && cands[i].t === L) return cands[i].u;
    for (i = 0; i < cands.length; i++) if (cands[i].t.length <= 20 && TOCRX.test(cands[i].t)) return cands[i].u;
    // \uc791\ud488 \uc18c\uac1c\u00b7\ubaa9\ub85d \ud398\uc774\uc9c0\ucc98\ub7fc \ubcf4\uc774\ub294 \ub9c1\ud06c (\uc608: /book/123, /info/123, \u8fd4\u56de)
    for (i = 0; i < cands.length; i++) if (cands[i].t.length <= 12 && /\/(book|books|info|novel|catalog|mulu|list|index)[\/_\-]?\d*/i.test(cands[i].u) && /\u8fd4\u56de|[\u66f8\u4e66]|\u76ee|\ubaa9|book/i.test(cands[i].t + cands[i].u)) return cands[i].u;
    return null;
  }
  function chapterFull(doc, url) {
    var ch = chapterOf(doc, url);
    var cands = linkCands(doc, url);
    ch.book = bookOf(doc, ch.title);
    var stripped = ch.title.replace(/^\s*\u300a[^\u300b]+\u300b\s*/, '').trim(); if (stripped) ch.title = stripped; // \ud654 \uc81c\ubaa9 \uc55e\uc758 \u300a\uc791\ud488\uba85\u300b \uc81c\uac70
    ch.toc = tocOf(doc, url, cands); ch.id = workKey(url, ch.book, ch.toc);
    return ch;
  }

  // ===================== \ubcf4\uae30 \uc124\uc815 =====================
  // \ud14c\ub9c8: \ub0ae(\ubc1d\uc740) / \ubc24(\uc5b4\ub450\uc6b4). VS Code \ub4f1\uc5d0\uc11c \uc778\uae30 \uc788\ub294 \uc0c9 \uc870\ud569\uc744 \uc18c\uc124 \uc77d\uae30\uc5d0 \ub9de\uac8c \uae00\uc528 \ubc1d\uae30\ub97c \ub0ae\ucdb0 \ub2e4\ub4ec\uc74c
  var THEMES = {
    light: { n: '\ubc1d\uac8c', bg: '#fbfbfa', fg: '#1f2023', mut: '#8b8d93', card: '#ffffff', bd: '#e6e6e3', ac: '#3b6fe0' },
    paper: { n: '\uc885\uc774', bg: '#f5efe2', fg: '#3d342a', mut: '#9a8d78', card: '#fbf7ee', bd: '#e2d8c3', ac: '#a35a2c', hh: 205 },
    green: { n: '\uc5f0\ub450', bg: '#e6eedb', fg: '#26301f', mut: '#7c8a6c', card: '#eff5e7', bd: '#ccd9ba', ac: '#3b7a3a', hh: 265 },
    sepia: { n: '\uc138\ud53c\uc544', bg: '#f1e7d0', fg: '#4a3b2a', mut: '#9c8a6e', card: '#f7efdc', bd: '#e0d2b4', ac: '#8a5a2b', hh: 205 },
    solar: { n: '\uc194\ub77c\ub77c\uc774\uc988\ub4dc', bg: '#fdf6e3', fg: '#586e75', mut: '#93a1a1', card: '#fffbef', bd: '#eee8d5', ac: '#268bd2' },
    github: { n: '\uae43\ud5c8\ube0c', bg: '#ffffff', fg: '#24292f', mut: '#6e7781', card: '#f6f8fa', bd: '#d0d7de', ac: '#0969da' },
    latte: { n: '\ub77c\ud14c', bg: '#eff1f5', fg: '#4c4f69', mut: '#8c8fa1', card: '#e6e9ef', bd: '#ccd0da', ac: '#8839ef' },
    dawn: { n: '\ub85c\uc81c \uc0c8\ubcbd', bg: '#faf4ed', fg: '#575279', mut: '#9893a5', card: '#fffaf3', bd: '#f2e9e1', ac: '#b4637a' },
    dark: { n: '\uc5b4\ub461\uac8c', bg: '#18191b', fg: '#b4b2ac', mut: '#7f7e79', card: '#212225', bd: '#303236', ac: '#86a2d0', dark: 1 }, // \uae00\uc528\ub97c \ub0ae\ucdb0 \ub208\ubd80\uc2ec \uc904\uc784 (\ub300\ube44 \uc57d 8:1)
    gray: { n: '\ud68c\uc0c9', bg: '#2f3237', fg: '#c4c5c8', mut: '#8f939a', card: '#383c42', bd: '#474b53', ac: '#94aede', dark: 1 },
    black: { n: '\ube14\ub799', bg: '#0b0b0b', fg: '#a3a29e', mut: '#6c6b68', card: '#151516', bd: '#242426', ac: '#7591c2', dark: 1 },
    nord: { n: '\ub178\ub4dc', bg: '#2e3440', fg: '#c8ced9', mut: '#7f899b', card: '#3b4252', bd: '#434c5e', ac: '#88c0d0', dark: 1 },
    tokyo: { n: '\ub3c4\ucfc4 \ub098\uc774\ud2b8', bg: '#1a1b26', fg: '#a9b1d6', mut: '#606a96', card: '#24283b', bd: '#2f334d', ac: '#7aa2f7', dark: 1 },
    gruv: { n: '\uadf8\ub8e8\ube0c\ubc15\uc2a4', bg: '#282828', fg: '#d5c4a1', mut: '#928374', card: '#32302f', bd: '#3c3836', ac: '#fabd2f', dark: 1 },
    onedark: { n: '\uc6d0 \ub2e4\ud06c', bg: '#282c34', fg: '#abb2bf', mut: '#6b7280', card: '#2c313a', bd: '#3e4451', ac: '#61afef', dark: 1 },
    mocha: { n: '\ubaa8\uce74', bg: '#1e1e2e', fg: '#bac2de', mut: '#7a7f99', card: '#262637', bd: '#313244', ac: '#cba6f7', dark: 1 },
    rose: { n: '\ub85c\uc81c \ud30c\uc778', bg: '#191724', fg: '#c9c6e0', mut: '#76728f', card: '#1f1d2e', bd: '#26233a', ac: '#ebbcba', dark: 1 },
    dracula: { n: '\ub4dc\ub77c\ud058\ub77c', bg: '#282a36', fg: '#d6d5e0', mut: '#7180b0', card: '#303241', bd: '#3c3f51', ac: '#bd93f9', dark: 1 },
    solard: { n: '\uc194\ub77c\ub77c\uc774\uc988\ub4dc \ub2e4\ud06c', bg: '#002b36', fg: '#93a1a1', mut: '#5f7a80', card: '#073642', bd: '#0d4552', ac: '#2aa198', dark: 1 }
  };
  // \ud14c\ub9c8 \uace0\ub974\uae30: mode d(\ub0ae) / n(\ubc24) / a(\uc790\ub3d9: \ud3f0 \ub2e4\ud06c\ubaa8\ub4dc \ub530\ub77c), \ub0ae\u00b7\ubc24 \ud14c\ub9c8\ub97c \ub530\ub85c \uae30\uc5b5
  function sysDark() { try { return matchMedia('(prefers-color-scheme: dark)').matches; } catch (e) { return false; } }
  function themeKey() {
    if (tmpTheme && THEMES[tmpTheme]) return tmpTheme;
    var m = prefs.mode || 'a', dk = m === 'n' || (m === 'a' && sysDark());
    var k = dk ? prefs.nightT : prefs.dayT;
    return THEMES[k] && !!THEMES[k].dark === dk ? k : dk ? 'dark' : 'light';
  }
  var tmpTheme = null, themeSnap = null;
  // \uae00\uaf34: \uace0\ub515(go) \u00b7 \uba85\uc870(my) \u00b7 \uc190\uae00\uc528(hd) \u00b7 \uac1c\uc131(ds). \uc6f9 \uae00\uaf34\uc740 \uace0\ub978 \uac83\ub9cc \ubd88\ub7ec\uc634
  var FONTS = {
    pretendard: { n: '\ud504\ub9ac\ud150\ub2e4\ub4dc', c: 'go', f: '"Pretendard Variable",Pretendard,sans-serif', css: 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css' },
    notosans: { n: '\ubcf8\uace0\ub515', c: 'go', f: '"Noto Sans KR",sans-serif', g: 'Noto+Sans+KR:wght@400;500;700' },
    nanumgothic: { n: '\ub098\ub214\uace0\ub515', c: 'go', f: '"Nanum Gothic",sans-serif', g: 'Nanum+Gothic:wght@400;700' },
    nanumbarun: { n: '\ub098\ub214\ubc14\ub978\uace0\ub515', c: 'go', f: '"Nanum Barun Gothic",sans-serif', css: 'https://cdn.jsdelivr.net/gh/fonts-archive/NanumBarunGothic/NanumBarunGothic.css' },
    nanumsqneo: { n: '\ub098\ub214\uc2a4\ud018\uc5b4 \ub124\uc624', c: 'go', f: '"Nanum Square Neo",sans-serif', css: 'https://cdn.jsdelivr.net/gh/fonts-archive/NanumSquareNeo/NanumSquareNeo.css' },
    nanumsq: { n: '\ub098\ub214\uc2a4\ud018\uc5b4', c: 'go', f: '"Nanum Square",sans-serif', css: 'https://cdn.jsdelivr.net/gh/fonts-archive/NanumSquare/NanumSquare.css' },
    spoqa: { n: '\uc2a4\ud3ec\uce74 \ud55c \uc0b0\uc2a4', c: 'go', f: '"Spoqa Han Sans Neo",sans-serif', css: 'https://cdn.jsdelivr.net/gh/fonts-archive/SpoqaHanSansNeo/SpoqaHanSansNeo.css' },
    suit: { n: 'SUIT', c: 'go', f: '"SUIT",sans-serif', css: 'https://cdn.jsdelivr.net/gh/fonts-archive/SUIT/SUIT.css' },
    scdream: { n: '\uc5d0\uc2a4\ucf54\uc5b4 \ub4dc\ub9bc', c: 'go', f: '"S-Core Dream",sans-serif', css: 'https://cdn.jsdelivr.net/gh/fonts-archive/S-CoreDream/S-CoreDream.css' },
    ibmplex: { n: 'IBM \ud50c\ub809\uc2a4 \uc0b0\uc2a4', c: 'go', f: '"IBM Plex Sans KR",sans-serif', g: 'IBM+Plex+Sans+KR:wght@400;600' },
    gothica1: { n: '\uace0\ub515 A1', c: 'go', f: '"Gothic A1",sans-serif', g: 'Gothic+A1:wght@400;600' },
    kopubdotum: { n: 'KoPub \ub3cb\uc6c0', c: 'go', f: '"KoPub Dotum",sans-serif', css: 'https://cdn.jsdelivr.net/gh/fonts-archive/KoPubDotum/KoPubDotum.css' },
    seoulnamsan: { n: '\uc11c\uc6b8\ub0a8\uc0b0', c: 'go', f: '"Seoul Namsan",sans-serif', css: 'https://cdn.jsdelivr.net/gh/fonts-archive/SeoulNamsan/SeoulNamsan.css' },
    lineseed: { n: 'LINE Seed', c: 'go', f: '"LINE Seed KR",sans-serif', css: 'https://cdn.jsdelivr.net/gh/fonts-archive/LINESeedKR/LINESeedKR.css' },
    nexon: { n: '\ub125\uc2a8 Lv1 \uace0\ub515', c: 'go', f: '"NEXON Lv1 Gothic",sans-serif', css: 'https://cdn.jsdelivr.net/gh/fonts-archive/NEXONLv1Gothic/NEXONLv1Gothic.css' },
    gmarket: { n: 'G\ub9c8\ucf13 \uc0b0\uc2a4', c: 'go', f: '"Gmarket Sans",sans-serif', css: 'https://cdn.jsdelivr.net/gh/fonts-archive/GmarketSans/GmarketSans.css' },
    freesent: { n: '\ud504\ub9ac\uc820\ud14c\uc774\uc158', c: 'go', f: '"Freesentation",sans-serif', css: 'https://cdn.jsdelivr.net/gh/fonts-archive/Freesentation/Freesentation.css' },
    paperlogy: { n: '\ud398\uc774\ud37c\ub85c\uc9c0', c: 'go', f: '"Paperlogy",sans-serif', css: 'https://cdn.jsdelivr.net/gh/fonts-archive/Paperlogy/Paperlogy.css' },
    bookkgothic: { n: '\ubd80\ud06c\ud06c \uace0\ub515', c: 'go', f: '"Bookk Gothic",sans-serif', css: 'https://cdn.jsdelivr.net/gh/fonts-archive/BookkGothic/BookkGothic.css' },
    elice: { n: '\uc5d8\ub9ac\uc2a4 \ub514\uc9c0\ud138\ubc30\uc6c0', c: 'go', f: '"Elice Digital Baeum",sans-serif', css: 'https://cdn.jsdelivr.net/gh/fonts-archive/EliceDigitalBaeum/EliceDigitalBaeum.css' },
    gowundodum: { n: '\uace0\uc6b4\ub3cb\uc6c0', c: 'go', f: '"Gowun Dodum",sans-serif', g: 'Gowun+Dodum' },
    sys: { n: '\uc2dc\uc2a4\ud15c \uae00\uaf34', c: 'go', f: '-apple-system,system-ui,sans-serif' },
    ridibatang: { n: '\ub9ac\ub514\ubc14\ud0d5', c: 'my', f: '"RIDI Batang",serif', css: 'https://cdn.jsdelivr.net/gh/fonts-archive/RIDIBatang/RIDIBatang.css' },
    maruburi: { n: '\ub9c8\ub8e8\ubd80\ub9ac', c: 'my', f: '"Maru Buri",serif', css: 'https://cdn.jsdelivr.net/gh/fonts-archive/MaruBuri/MaruBuri.css' },
    notoserif: { n: '\ubcf8\uba85\uc870', c: 'my', f: '"Noto Serif KR",serif', g: 'Noto+Serif+KR:wght@400;700' },
    nanummyeongjo: { n: '\ub098\ub214\uba85\uc870', c: 'my', f: '"Nanum Myeongjo",serif', g: 'Nanum+Myeongjo:wght@400;700' },
    gowunbatang: { n: '\uace0\uc6b4\ubc14\ud0d5', c: 'my', f: '"Gowun Batang",serif', g: 'Gowun+Batang:wght@400;700' },
    kopubbatang: { n: 'KoPub \ubc14\ud0d5', c: 'my', f: '"KoPub Batang",serif', css: 'https://cdn.jsdelivr.net/gh/fonts-archive/KoPubBatang/KoPubBatang.css' },
    hahmlet: { n: '\ud568\ub81b', c: 'my', f: '"Hahmlet",serif', g: 'Hahmlet:wght@400;600' },
    songmyung: { n: '\uc1a1\uba85', c: 'my', f: '"Song Myung",serif', g: 'Song+Myung' },
    jejumyeongjo: { n: '\uc81c\uc8fc\uba85\uc870', c: 'my', f: '"Jeju Myeongjo",serif', css: 'https://cdn.jsdelivr.net/gh/fonts-archive/JejuMyeongjo/JejuMyeongjo.css' },
    seoulhangang: { n: '\uc11c\uc6b8\ud55c\uac15', c: 'my', f: '"Seoul Hangang",serif', css: 'https://cdn.jsdelivr.net/gh/fonts-archive/SeoulHangang/SeoulHangang.css' },
    chosun: { n: '\uc870\uc120100\ub144\uccb4', c: 'my', f: '"Chosun Centennial",serif', css: 'https://cdn.jsdelivr.net/gh/fonts-archive/ChosunCentennial/ChosunCentennial.css' },
    bookkmyungjo: { n: '\ubd80\ud06c\ud06c \uba85\uc870', c: 'my', f: '"Bookk Myungjo",serif', css: 'https://cdn.jsdelivr.net/gh/fonts-archive/BookkMyungjo/BookkMyungjo.css' },
    nanumpen: { n: '\ub098\ub214\uc190\uae00\uc528 \ud39c', c: 'hd', f: '"Nanum Pen Script",sans-serif', g: 'Nanum+Pen+Script' },
    nanumbarunpen: { n: '\ub098\ub214\ubc14\ub978\ud39c', c: 'hd', f: '"Nanum Barunpen",sans-serif', css: 'https://cdn.jsdelivr.net/gh/fonts-archive/NanumBarunpen/NanumBarunpen.css' },
    gaegu: { n: '\uac1c\uad6c', c: 'hd', f: '"Gaegu",sans-serif', g: 'Gaegu:wght@400;700' },
    himelody: { n: '\ud558\uc774\uba5c\ub85c\ub514', c: 'hd', f: '"Hi Melody",sans-serif', g: 'Hi+Melody' },
    poorstory: { n: '\ud478\uc5b4 \uc2a4\ud1a0\ub9ac', c: 'hd', f: '"Poor Story",sans-serif', g: 'Poor+Story' },
    gamja: { n: '\uac10\uc790\uaf43', c: 'hd', f: '"Gamja Flower",sans-serif', g: 'Gamja+Flower' },
    kccchassam: { n: 'KCC \ucc28\uc324', c: 'hd', f: '"KCC Chassam",sans-serif', css: 'https://cdn.jsdelivr.net/gh/fonts-archive/KCCChassam/KCCChassam.css' },
    singleday: { n: '\uc2f1\uae00\ub370\uc774', c: 'hd', f: '"Single Day",sans-serif', g: 'Single+Day' },
    jua: { n: '\uc8fc\uc544', c: 'ds', f: '"Jua",sans-serif', g: 'Jua' },
    dohyeon: { n: '\ub3c4\ud604', c: 'ds', f: '"Do Hyeon",sans-serif', g: 'Do+Hyeon' },
    sunflower: { n: '\ud574\ubc14\ub77c\uae30', c: 'ds', f: '"Sunflower",sans-serif', g: 'Sunflower:wght@300;500' },
    dongle: { n: '\ub3d9\uae00', c: 'ds', f: '"Dongle",sans-serif', g: 'Dongle' },
    stylish: { n: '\uc2a4\ud0c0\uc77c\ub9ac\uc2dc', c: 'ds', f: '"Stylish",sans-serif', g: 'Stylish' },
    orbit: { n: '\uc624\ub974\ube57', c: 'ds', f: '"Orbit",sans-serif', g: 'Orbit' },
    yeonsung: { n: '\uc5f0\uc131', c: 'ds', f: '"Yeon Sung",sans-serif', g: 'Yeon+Sung' },
    cafe24: { n: '\uce74\ud39824 \uc368\ub77c\uc6b4\ub4dc', c: 'ds', f: '"Cafe24 Ssurround",sans-serif', css: 'https://cdn.jsdelivr.net/gh/fonts-archive/Cafe24Ssurround/Cafe24Ssurround.css' },
    tmoney: { n: '\ud2f0\uba38\ub2c8 \ub465\uadfc\ubc14\ub78c', c: 'ds', f: '"Tmoney Round Wind",sans-serif', css: 'https://cdn.jsdelivr.net/gh/fonts-archive/TmoneyRoundWind/TmoneyRoundWind.css' }
  };
  var FCAT = [['go', '\uace0\ub515'], ['my', '\uba85\uc870'], ['hd', '\uc190\uae00\uc528'], ['ds', '\uac1c\uc131']];
  var STEPS = [
    ['fs', '\uae00\uc790 \ud06c\uae30', 1, 12, 32, function (v) { return v + 'px'; }],
    ['lh', '\uc904 \uac04\uaca9', 0.05, 1.3, 2.6, function (v) { return v.toFixed(2); }],
    ['ps', '\ubb38\ub2e8 \uac04\uaca9', 0.1, 0, 2.4, function (v) { return v.toFixed(1); }],
    ['pad', '\uc88c\uc6b0 \uc5ec\ubc31', 2, 8, 60, function (v) { return v + 'px'; }],
    ['mw', '\ubcf8\ubb38 \ud3ed', 20, 400, 1000, function (v) { return v + 'px'; }],
    ['hla', '\ud615\uad11\ud39c \uc9c4\ud558\uae30', 10, 20, 100, function (v) { return v + '%'; }]
  ];
  var PK = 'nvtrPrefs';
  var DEF = { theme: 'auto', mode: '', dayT: 'light', nightT: 'dark', pins: [], font: 'pretendard', fontCustom: '', just: 1, dlg: 0, hla: 50, cardD: 'paper', fs: 18, lh: 1.8, ps: 0.9, mw: 680, pad: 24, ind: 0, auto: 1, pre: 1, ts: 0, v: 2 };
  function fill(p) {
    p = p || {}; Object.keys(DEF).forEach(function (k) { if (p[k] == null) p[k] = DEF[k]; });
    if (!p.mode) { // \uc608\uc804 \uc124\uc815(\ud14c\ub9c8 \ud558\ub098)\uc744 \ub0ae/\ubc24 \ubc29\uc2dd\uc73c\ub85c \uc62e\uae40
      var o = p.theme, T = THEMES[o];
      if (!T) p.mode = 'a'; else if (T.dark) { p.mode = 'n'; p.nightT = o; } else { p.mode = 'd'; p.dayT = o; }
    }
    if (!Array.isArray(p.pins)) p.pins = [];
    return p;
  }
  var prefs = gget(PK, {}) || {};
  if (!prefs.v) { if (!prefs.font || prefs.font === 'sys') prefs.font = 'pretendard'; prefs.v = 2; } // \uace0\ub515(\ud504\ub9ac\ud150\ub2e4\ub4dc)\uc744 \uc0c8 \uae30\ubcf8\uc73c\ub85c
  prefs = fill(JSON.parse(JSON.stringify(prefs)));
  function savePrefs() { prefs.ts = Date.now(); gset(PK, JSON.parse(JSON.stringify(prefs))); }
  var loadedFonts = {};
  // \uc9c1\uc811 \uc785\ub825\ud55c \uae00\uaf34: \uc774\ub984(\uad6c\uae00 \ud3f0\ud2b8 \uc774\ub984\uc774\uba74 \ubd88\ub7ec\uc634) \ub610\ub294 \uae00\uaf34 \ud30c\uc77c \uc8fc\uc18c(.woff2 \ub4f1)
  function customFont() {
    var v = String(prefs.fontCustom || '').trim(); if (!v) return null;
    if (/^https?:\/\//i.test(v)) {
      if (/\.css(\?|$)/i.test(v)) return { f: 'NvCustom,sans-serif', css: v, url: 1 };
      return { f: '"NvCustom",sans-serif', face: v };
    }
    return { f: '"' + v.replace(/"/g, '') + '",sans-serif', g: v.replace(/\s+/g, '+') };
  }
  function loadCustom() {
    var C = customFont(); if (!C || loadedFonts['c:' + prefs.fontCustom]) return; loadedFonts['c:' + prefs.fontCustom] = 1;
    if (C.face) { var st = document.createElement('style'); st.textContent = '@font-face{font-family:"NvCustom";src:url("' + C.face.replace(/"/g, '') + '");font-display:swap}'; document.head.appendChild(st); return; }
    var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = C.css || ('https://fonts.googleapis.com/css2?family=' + C.g + '&display=swap'); document.head.appendChild(l);
  }
  function loadFont(key) {
    if (key === 'custom') { loadCustom(); return; }
    var F = FONTS[key]; if (!F || loadedFonts[key] || (!F.g && !F.css)) return; loadedFonts[key] = 1;
    var l = document.createElement('link'); l.rel = 'stylesheet';
    l.href = F.css || ('https://fonts.googleapis.com/css2?family=' + F.g + '&display=swap');
    document.head.appendChild(l);
  }

  if (MODE === 'button') { addLauncher(); return; }

  // ===================== \uccab \ud654 =====================
  var first;
  if (VIA_HASH) { // \uc6d0\ubcf8 \ud398\uc774\uc9c0\ub97c \uc9c1\uc811 \uc5f0 \uacbd\uc6b0: \ubcf8\ubb38\uc744 \uc2a4\ud06c\ub9bd\ud2b8\ub85c \ub2a6\uac8c \uadf8\ub9ac\ub294 \uc0ac\uc774\ud2b8\ub97c \uc704\ud574 \uc7a0\uc2dc \uae30\ub2e4\ub9bc
    var w0 = Date.now(), wH = -1, wT = Date.now();
    while (Date.now() - w0 < 8000) {
      var bh = 0; try { var bb = findBody(document); bh = bb ? hanLen(lines(bb).join('')) : 0; } catch (e) { }
      if (bh !== wH) { wH = bh; wT = Date.now(); } // \uad11\uace0 \ubb38\uad6c\ub294 \ube7c\uace0, \ubcf8\ubb38 \uae00\uc790\uac00 \ub354 \ub298\uc9c0 \uc54a\uc744 \ub54c\uae4c\uc9c0
      if (bh > 150 || (bh > 40 && Date.now() - wT > 1200) || (Date.now() - w0 > 2500 && bh >= 4 && Date.now() - wT > 1500)) break;
      await new Promise(function (ok) { setTimeout(ok, 400); });
    }
  }
  try {
    first = chapterFull(document, location.href);
    if (!VIA_HASH && hanCount(first.lines.join('')) < 200) throw new Error('not novel');
  } catch (e) {
    if (VIA_HASH) { alert(e.message); return; }
    addLauncher(); return; // \ubc88\uc5ed \ud0ed\uc5d0\uc11c \uc18c\uc124\uc774 \uc544\ub2cc \ud398\uc774\uc9c0\ub85c \uc774\ub3d9\ud55c \uacbd\uc6b0: \ud3c9\uc18c\ucc98\ub7fc
  }

  // ---- \uc0ac\uc774\ud2b8 \uc815\ub9ac: \uad11\uace0 \ud0c0\uc774\uba38\u00b7\ud31d\uc5c5\u00b7\uc2a4\ud0c0\uc77c \uc81c\uac70 ----
  try { var mx = PW.setTimeout(function () { }, 0); for (var ti = 0; ti <= mx + 50; ti++) { PW.clearTimeout(ti); PW.clearInterval(ti); } } catch (e) { }
  try { if (typeof exportFunction === 'function') exportFunction(function () { return null; }, PW, { defineAs: 'open' }); } catch (e) { }
  [].slice.call(document.querySelectorAll('link[rel~="stylesheet"],style,iframe')).forEach(function (x) { x.remove(); });
  document.head.insertAdjacentHTML('beforeend', '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">');
  document.body.innerHTML = '';
  document.body.style.cssText = 'margin:0;padding:0;overflow:hidden;background:none';
  document.documentElement.style.cssText = 'overflow:hidden';
  document.title = '\ubc88\uc5ed \uc911\u2026';

  var I = {
    lib: '<svg viewBox="0 0 24 24"><path d="M4 19V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v14M9 19V7h4v12M14 19l2.5-13.5 3.9.7L18 20"/><path d="M3 20h18"/></svg>',
    toc: '<svg viewBox="0 0 24 24"><path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/></svg>',
    prev: '<svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg>',
    next: '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
    aa: '<svg viewBox="0 0 24 24"><path d="M3 18l5-12 5 12M4.7 14h6.6M15 18v-5.5a2.5 2.5 0 0 1 5 0V18M15 15h5"/></svg>',
    x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.6"/><path d="M5 20c.8-3.6 3.6-5.6 7-5.6s6.2 2 7 5.6"/></svg>',
    up: '<svg viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></svg>',
    down: '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    dl: '<svg viewBox="0 0 24 24"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
    back: '<svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg>',
    redo: '<svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/></svg>',
    undo: '<svg viewBox="0 0 24 24"><path d="M4 11a8 8 0 1 1 2.3 5.7M4 4v7h7"/></svg>',
    copy: '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>',
    pen: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/></svg>',
    img: '<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M20.5 16l-5-5-8.5 8"/></svg>'
  };

  var css = [
    '.app{position:fixed;inset:0;font-family:var(--font);background:var(--bg);color:var(--fg);-webkit-tap-highlight-color:transparent;-webkit-text-size-adjust:100%;transition:background .3s,color .3s}',
    '*{box-sizing:border-box;margin:0;padding:0;font:inherit;color:inherit}',
    'button{background:none;border:0;cursor:pointer;-webkit-user-select:none;user-select:none;touch-action:manipulation;font-family:var(--ui)}',
    'svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;flex:none}',
    '.sc{position:absolute;inset:0;overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}',
    '.wrap{position:relative;max-width:var(--mw);margin:0 auto;overflow-wrap:anywhere;padding:calc(56px + env(safe-area-inset-top)) var(--pad) 0}',
    // \uc81c\ubaa9 \uc704\uacc4: \uc791\uc740 \ud654 \ubc88\ud638 + \ud070 \uc81c\ubaa9
    'section{padding-top:8px}',
    '.chl{font-family:var(--ui);font-size:13px;font-weight:600;color:var(--ac);letter-spacing:.04em;margin-bottom:10px}',
    '.cht{font-size:calc(var(--fs) * 1.4);font-weight:700;line-height:1.35;letter-spacing:-.03em;margin-bottom:34px;word-break:keep-all}',
    '.meta{font-family:var(--ui);font-size:12.5px;color:var(--mut);margin:-20px 0 30px;display:flex;align-items:center;gap:8px;min-height:20px}',
    '.meta .dot{width:7px;height:7px;border-radius:50%;background:var(--ac);animation:pl 1.2s ease-in-out infinite}',
    '@keyframes pl{50%{opacity:.25}}',
    // \ubcf8\ubb38
    '.grp p{font-size:var(--fs);line-height:var(--lh);margin-bottom:var(--ps);text-indent:var(--ind);text-align:var(--ta);text-justify:inter-character;word-break:var(--wb);overflow-wrap:anywhere;line-break:strict;letter-spacing:-.012em;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;border-radius:6px;transition:background .2s}',
    '.grp p.src{color:var(--mut);opacity:.55}',
    '.grp p.tr{animation:fi .5s cubic-bezier(.2,.8,.2,1) both}',
    '.grp p.tr.live{animation:none}',
    '.app.dlg1 .dq{color:color-mix(in srgb,var(--ac) 72%,var(--fg))}',
    '.app.dlg1 .dq.th{color:color-mix(in srgb,var(--ac) 45%,var(--fg));font-style:italic}',
    '.app.dlg2 .dq{background:var(--hl);color:var(--hlfg);border-radius:3px;padding:.14em 2px;margin:0 -2px;-webkit-box-decoration-break:clone;box-decoration-break:clone}',
    '.app.dlg2 .dq.th{background:var(--hl2)}',
    '.app.dk .wrap{font-weight:370;-webkit-font-smoothing:antialiased}',
    '.app.dk .cht{font-weight:600}',
    '.grp p.hold{background:color-mix(in srgb,var(--ac) 12%,transparent)}',
    '.grp p.busy{animation:pl 1.2s ease-in-out infinite}',
    '@keyframes fi{from{opacity:0;transform:translateY(5px)}}',
    '.er{font-family:var(--ui);font-size:14px;color:#e5534b;white-space:pre-wrap;padding:14px 0}',
    'section.cpart .chl{margin-bottom:22px;opacity:.85}',
    '.sep{display:flex;align-items:center;justify-content:center;gap:12px;margin:72px 0 48px;color:var(--mut);font-family:var(--ui);font-size:12px}',
    '.sep:before,.sep:after{content:"";flex:1;max-width:80px;height:1px;background:var(--bd)}',
    '.endrow{display:flex;flex-wrap:wrap;gap:8px;margin-top:26px;font-family:var(--ui)}',
    '.mini{display:inline-flex;align-items:center;gap:6px;min-height:40px;padding:0 14px;border-radius:12px;border:1px solid var(--bd);font-size:13px;color:var(--mut)}',
    '.mini svg{width:16px;height:16px}',
    '.tail{max-width:var(--mw);margin:0 auto;padding:36px var(--pad) calc(170px + env(safe-area-inset-bottom));text-align:center;color:var(--mut);font-family:var(--ui);font-size:14px}',
    '.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:52px;padding:0 24px;border-radius:16px;border:1px solid var(--bd);background:var(--card);font-size:15px;font-weight:600;margin-top:14px;font-family:var(--ui)}',
    '.btn.pri{background:var(--ac);border-color:var(--ac);color:#fff}',
    // \ubab0\uc785 \ubaa8\ub4dc: \uc704\u00b7\uc544\ub798 \uba54\ub274\ub294 \ud0ed\ud560 \ub54c\ub9cc
    '.top,.bot{position:fixed;left:0;right:0;z-index:3;font-family:var(--ui);background:color-mix(in srgb,var(--card) 97%,var(--bg));will-change:transform;backface-visibility:hidden;transition:transform .32s cubic-bezier(.2,.8,.2,1)}', // \ud750\ub9bc \ud6a8\uacfc(backdrop-filter)\ub294 \ud30c\uc774\uc5b4\ud3ed\uc2a4 \ubaa8\ubc14\uc77c\uc5d0\uc11c \ubc84\ud2bc \uae00\uc790\uac00 \uc548 \uadf8\ub824\uc9c0\ub294 \ubb38\uc81c\uac00 \uc788\uc5b4 \ube8c
    '.top{top:0;display:flex;align-items:center;gap:4px;padding:calc(6px + env(safe-area-inset-top)) 6px 6px;border-bottom:1px solid color-mix(in srgb,var(--bd) 70%,transparent);transform:translate3d(0,-105%,0)}',
    '.top .tt{flex:1;min-width:0;text-align:center;line-height:1.3}',
    '.top .tt b{display:block;font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.top .tt span{display:block;font-size:12px;color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.ib{width:48px;height:48px;border-radius:14px;display:flex;align-items:center;justify-content:center}',
    '.ib:active,.nb:active,.btn:active,.pn button:active,.tile:active,.row:active{transform:scale(.95)}',
    '.bot{bottom:0;padding:10px 12px calc(10px + env(safe-area-inset-bottom));border-top:1px solid color-mix(in srgb,var(--bd) 70%,transparent);transform:translate3d(0,105%,0)}',
    '.app.ui .top,.app.ui .bot{transform:translate3d(0,0,0)}',
    '.btns{display:grid;grid-template-columns:repeat(4,1fr);gap:4px}',
    '.nb{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;min-height:58px;border-radius:16px;font-size:11.5px;color:var(--mut);transition:transform .12s}',
    '.nb svg{width:24px;height:24px;color:var(--fg)}',
    '.nb.nx{background:var(--ac);color:#fff}.nb.nx svg{color:#fff}',
    // \uc2dc\ud2b8
    '.scrim{position:fixed;inset:0;z-index:5;background:rgba(0,0,0,.4);opacity:0;pointer-events:none;transition:opacity .25s}',
    '.app.sheet .scrim{opacity:1;pointer-events:auto}',
    '.pn{position:fixed;left:0;right:0;bottom:0;z-index:6;max-height:86vh;max-height:86dvh;overflow-y:auto;overscroll-behavior:contain;background:var(--card);border-radius:24px 24px 0 0;padding:8px 22px calc(26px + env(safe-area-inset-bottom));box-shadow:0 -12px 40px rgba(0,0,0,.25);transform:translateY(105%);transition:transform .34s cubic-bezier(.2,.8,.2,1),bottom .2s ease;font-family:var(--ui);font-size:15px}',
    '.app.sheet .pn{transform:none}',
    '.pn .grab{position:relative;width:42px;height:5px;border-radius:3px;background:var(--bd);margin:6px auto 14px;touch-action:none}',
    '.pn .grab::before{content:"";position:absolute;left:-60px;right:-60px;top:-16px;bottom:-14px}', // \uc190\uac00\ub77d\uc73c\ub85c \uc7a1\uae30 \uc27d\uac8c \ub113\uc740 \uc601\uc5ed
    '.pn .hd,.pn .grab{touch-action:none;-webkit-user-select:none;user-select:none}',
    '.pn.full{max-height:calc(100vh - 12px);max-height:calc(100dvh - 12px - env(safe-area-inset-top))}', // dvh: \uc8fc\uc18c\ucc3d\uc774 \ubcf4\uc77c \ub54c\uc758 \uc2e4\uc81c \ud654\uba74 \ub192\uc774
    '.pn.drag{transition:none}',
    '.pn .hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px}',
    '.pn h3{font-size:19px;font-weight:700}',
    '.pn .x{width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--mut)}',
    '.pn .lb{font-size:13px;color:var(--mut);margin:20px 0 10px;font-weight:600}',
    '.pn .chips{display:flex;flex-wrap:wrap;gap:10px}',
    '.thd{display:flex;align-items:center;gap:8px;margin:20px 0 10px}',
    '.thd .lb{margin:0;flex:1}',
    '.thd .undo{font-size:12.5px;color:var(--ac);min-height:32px;padding:0 6px;visibility:hidden}',
    '.seg{display:flex;border:1px solid var(--bd);border-radius:999px;overflow:hidden}',
    '.seg button{min-height:34px;padding:0 13px;font-size:13px;color:var(--mut)}',
    '.seg button.on{background:color-mix(in srgb, var(--ac) 16%, var(--card));color:var(--fg);font-weight:600}',
    '.swrow{display:flex;align-items:center;gap:12px;overflow-x:auto;margin:0 -22px;padding:6px 22px 8px;scrollbar-width:none}',
    '.swrow::-webkit-scrollbar{display:none}',
    '.tsw{flex:none;position:relative;width:44px;height:44px;border-radius:50%;border:1px solid;font-size:15px;font-weight:600;display:flex;align-items:center;justify-content:center}',
    '.tsw.sel{box-shadow:0 0 0 3px var(--card),0 0 0 5px var(--ac)}',
    '.tsw.pin::after{content:"";position:absolute;top:-1px;right:-1px;width:9px;height:9px;border-radius:50%;background:var(--ac);border:2px solid var(--card)}',
    '.swrow .sep2{flex:none;width:1px;height:28px;background:var(--bd)}',
    '.swnm{font-size:12px;color:var(--mut);margin-top:2px}',
    '.grpbox{border:1px solid var(--bd);border-radius:16px;padding:0 14px;margin-bottom:6px;background:color-mix(in srgb,var(--bg) 40%,var(--card))}',
    '.grpbox.lnk{margin-top:22px}',
    '.rowx{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;min-height:54px;text-align:left;font-size:15px;border-bottom:1px solid color-mix(in srgb,var(--bd) 55%,transparent)}',
    '.grpbox>.rowx:last-child{border-bottom:0}',
    '.rowx>svg{width:18px;height:18px;color:var(--mut)}',
    '.rowx .rv{display:flex;align-items:center;gap:4px;color:var(--mut);font-size:15px;min-width:0}',
    '.rowx .rv svg{width:18px;height:18px;flex:none}',
    '.rowx .mutd{color:var(--mut)}',
    '.tg{flex:none;position:relative;width:46px;height:28px;border-radius:14px;background:var(--bd);transition:background .2s}',
    '.tg::after{content:"";position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.25);transition:transform .2s cubic-bezier(.2,.8,.2,1)}',
    '.tg.on{background:var(--ac)}',
    '.tg.on::after{transform:translateX(18px)}',
    '.seg.full{display:flex;width:100%;margin:8px 0 6px}',
    '.seg.full button{flex:1}',
    '.pn .hd .bk{width:40px;height:40px;margin-left:-10px;display:flex;align-items:center;justify-content:center}',
    '.pn .hd .bk+h3{flex:1}',
    '.flist{margin:4px 0 0}',
    '.frow{display:flex;flex-direction:column;align-items:flex-start;gap:2px;position:relative;width:100%;text-align:left;padding:12px 40px 12px 4px;border-bottom:1px solid color-mix(in srgb,var(--bd) 55%,transparent)}',
    '.frow b{font-size:16px;font-weight:600}',
    '.frow span{font-size:14px;color:var(--mut)}',
    '.frow svg{position:absolute;right:6px;top:50%;margin-top:-11px;color:var(--ac);display:none}',
    '.frow.sel svg{display:block}',
    '.frow.sel b{color:var(--ac)}',
    '.pn .ch{min-height:46px;padding:0 16px;border-radius:14px;border:1px solid var(--bd);font-size:15px}',
    '.pn .ch.sel{border-color:var(--ac);background:color-mix(in srgb,var(--ac) 14%,transparent);color:var(--ac);font-weight:700}',
    '.pn .stp{display:flex;align-items:center;justify-content:space-between;min-height:58px;border-bottom:1px solid color-mix(in srgb,var(--bd) 55%,transparent)}',
    '.pn .ctl{display:flex;align-items:center;gap:6px}',
    '.pn .ctl button{width:40px;height:36px;border-radius:12px;border:1px solid var(--bd);font-size:19px;line-height:1}',
    '.pn .ctl b{min-width:58px;text-align:center;font-weight:600;font-variant-numeric:tabular-nums}',
    '.pn .wide{display:flex;width:100%;min-height:54px;align-items:center;justify-content:center;gap:8px;border-radius:16px;border:1px solid var(--bd);font-size:15px;margin-top:12px}',
    '.pn .wide.pri{background:var(--ac);border-color:var(--ac);color:#fff;font-weight:600}',
    '.pn .hint{font-size:13px;color:var(--mut);margin:6px 0 10px;line-height:1.55}',
    '.pn .quote{font-family:var(--font);font-size:15px;line-height:1.7;padding:14px 16px;border-radius:14px;background:var(--bg);margin:10px 0 4px;max-height:30vh;overflow:auto}',
    '.pn .urlrow{display:flex;gap:8px;margin:4px 0 8px}',
    '.pn .url{flex:1;min-width:0;height:48px;padding:0 14px;border-radius:14px;border:1px solid var(--bd);background:var(--bg);color:var(--fg);font-size:14px;-webkit-user-select:text;user-select:text}',
    '.pn .go{flex:none;height:48px;padding:0 18px;border-radius:14px;background:var(--ac);color:#fff;font-weight:600}',
    '.pn .li{display:block;width:100%;text-align:left;padding:12px 4px;min-height:54px;border-bottom:1px solid color-mix(in srgb,var(--bd) 55%,transparent)}',
    '.pn .li b{display:block;font-size:15px;font-weight:600;line-height:1.4}',
    '.pn .li small{display:block;font-size:12px;color:var(--mut);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:2px}',
    // \uc804\uccb4 \ud654\uba74 \ud398\uc774\uc9c0 (\uc11c\uc7ac \u00b7 \ubaa9\ucc28)
    '.pg{position:fixed;inset:0;z-index:4;background:var(--bg);font-family:var(--ui);display:flex;flex-direction:column;transform:translateX(102%);transition:transform .34s cubic-bezier(.2,.8,.2,1)}',
    '.app.page .pg{transform:none}',
    '.pg .ph{display:flex;align-items:center;gap:4px;padding:calc(6px + env(safe-area-inset-top)) 6px 6px;border-bottom:1px solid var(--bd)}',
    '.pg .ph h3{flex:1;font-size:17px;font-weight:700;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.pg .ph .ed{font-size:14px;color:var(--ac);padding:0 12px;height:44px}',
    '.pg .pb{flex:1;overflow-y:auto;overscroll-behavior:contain;padding:16px 18px calc(30px + env(safe-area-inset-bottom))}',
    '.cont{display:flex;gap:14px;align-items:center;padding:14px;border-radius:18px;background:var(--card);border:1px solid var(--bd);width:100%;text-align:left;margin-bottom:22px}',
    '.cover{flex:none;width:58px;aspect-ratio:3/4;border-radius:10px;display:flex;align-items:center;justify-content:center;border:1px solid color-mix(in srgb, var(--bd) 70%, transparent)}',
    '.cover svg{width:52%;height:auto;display:block}',
    '.cont .ci{flex:1;min-width:0}',
    '.cont small{font-size:12px;color:var(--ac);font-weight:600}',
    '.cont b{display:block;font-size:16px;font-weight:700;margin:2px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.cont span{display:block;font-size:13px;color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:18px 14px;align-items:start}',
    '.tile{position:relative;text-align:left;display:block;width:100%}',
    '.tile .cover{width:100%;border-radius:12px}',
    '.tile .cover svg{width:44%}',
    '.tile b{display:block;font-size:13.5px;font-weight:600;margin-top:8px;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}',
    '.tile span{display:block;font-size:11.5px;color:var(--mut);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.tile,.cont{transition:transform .25s cubic-bezier(.2,.8,.2,1)}',
    '.tile.press,.cont.press{transform:scale(.96)}',
    '.tags{display:flex;flex-wrap:wrap;gap:4px;margin:5px 0 2px;max-height:44px;overflow:hidden}',
    '.tag{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;line-height:1;padding:5px 9px;border-radius:999px;white-space:nowrap}',
    '.tag b{font-weight:500;opacity:.7;font-size:13px}',
    '.tagbox{display:flex;flex-wrap:wrap;gap:8px;margin:4px 0 12px}',
    '.tagbox .tag{font-size:13.5px;padding:8px 12px;min-height:34px}',
    '.hd.wk{display:flex;align-items:center;gap:12px}',
    '.hd.wk h3{flex:1;min-width:0;font-size:17px;line-height:1.35}',
    '.hd.wk h3 .pen{display:inline-flex;vertical-align:-3px;margin-left:4px;width:30px;height:30px;align-items:center;justify-content:center;border-radius:8px;color:var(--mut)}',
    '.hd.wk h3 .pen svg{width:17px;height:17px}',
    '.hd.wk .namein{width:100%;box-sizing:border-box;font:inherit;font-weight:700;color:var(--fg);background:transparent;border:0;border-bottom:2px solid var(--ac);padding:2px 0 4px;outline:none;border-radius:0}',
    '.wide.danger{color:var(--mut)}',
    '.wide.danger.sure{background:var(--fg);color:var(--bg);border-color:var(--fg)}',
    '.tagbar{display:flex;gap:8px;overflow-x:auto;margin:0 -18px 14px;padding:2px 18px;scrollbar-width:none}',
    '.tagbar::-webkit-scrollbar{display:none}',
    '.chip{flex:none;display:inline-flex;align-items:center;gap:6px;min-height:36px;padding:0 14px;border-radius:999px;border:1px solid var(--bd);font-size:13.5px;color:var(--mut);background:transparent}',
    '.chip small{font-size:11.5px;opacity:.7}',
    '.chip.on{color:var(--fg);font-weight:600;border-color:color-mix(in srgb, var(--tc, var(--fg)) 60%, var(--bd));background:color-mix(in srgb, var(--tc, var(--fg)) 22%, var(--card))}',
    '.namesin{width:100%;min-height:220px;border:1px solid var(--bd);border-radius:14px;background:var(--bg);padding:12px 14px;font:15px/1.7 var(--ui);color:var(--fg);resize:vertical}',
    '.mini.busy{opacity:.55}',
    '.lphint{font-size:12.5px;color:var(--mut);margin:0 2px 12px;text-align:center}',
    '.empty{text-align:center;color:var(--mut);padding:60px 20px;font-size:14px;line-height:1.7}',
    '.row{display:flex;align-items:center;gap:12px;width:100%;text-align:left;min-height:54px;padding:10px 4px;border-bottom:1px solid color-mix(in srgb,var(--bd) 60%,transparent)}',
    '.row .rt{flex:1;min-width:0;font-size:15px;line-height:1.4}',
    '.row .rn{font-style:normal;font-weight:600;margin-right:8px;font-variant-numeric:tabular-nums}',
    '.row:not(.cur) .rn{color:color-mix(in srgb,var(--fg) 70%,var(--mut))}',
    '.srch{position:sticky;top:-16px;z-index:1;margin:-16px -18px 0;padding:12px 18px 10px;background:var(--bg);border-bottom:1px solid color-mix(in srgb,var(--bd) 60%,transparent)}',
    '.srch input{width:100%;box-sizing:border-box;min-height:46px;padding:0 14px;border-radius:12px;border:1px solid var(--bd);background:var(--card);color:var(--fg);font:16px var(--ui);outline:none}',
    '.srch input:focus{border-color:var(--ac)}',
    '.scnt{font-size:12.5px;color:var(--mut);margin:12px 2px 4px}',
    '.sch{font-size:13px;font-weight:700;color:var(--fg);margin:18px 2px 6px}',
    '.shit{display:block;width:100%;text-align:left;font-size:14.5px;line-height:1.6;color:var(--fg);padding:10px 2px;border-bottom:1px solid color-mix(in srgb,var(--bd) 60%,transparent)}',
    '.shit mark{background:color-mix(in srgb,var(--ac) 22%,transparent);color:inherit;border-radius:3px;padding:0 1px}',
    'p.hit{background:color-mix(in srgb,var(--ac) 14%,transparent);border-radius:6px;transition:background 1.2s}',
    '.pn[data-mode=card]{padding-bottom:0}',
    '.cdv{position:relative;margin:2px auto 14px;width:100%;max-width:46vh;max-width:46dvh;border-radius:10px;overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,.08),0 6px 22px rgba(0,0,0,.12)}',
    '.cdv canvas{display:block;width:100%;height:auto}',
    '.cdv.busy:after{content:"";position:absolute;inset:0;background:color-mix(in srgb,var(--card) 35%,transparent)}',
    '.cds{display:flex;gap:12px;overflow-x:auto;margin:0 -22px;padding:2px 22px 6px;scrollbar-width:none;-webkit-overflow-scrolling:touch}',
    '.cds::-webkit-scrollbar{display:none}',
    '.cds button{flex:none;display:flex;flex-direction:column;align-items:center;gap:6px;font-size:12px;color:var(--mut);padding:0}',
    '.cds img{width:58px;height:58px;border-radius:12px;display:block;box-shadow:inset 0 0 0 1px rgba(0,0,0,.06);outline:2px solid transparent;outline-offset:2px;transition:outline-color .15s}',
    '.cds button.on{color:var(--fg);font-weight:600}', '.cds button.on img{outline-color:var(--ac)}',
    '.cdr{display:flex;align-items:center;gap:8px;margin:12px 0 4px;font-size:13px;color:var(--mut)}',
    '.cdr span{flex:1}',
    '.cdr button{min-height:34px;padding:0 12px;border-radius:999px;border:1px solid var(--bd);font-size:13px;color:var(--fg)}',
    '.cdr button:disabled{opacity:.35}',
    '.cdbar{position:sticky;bottom:0;display:flex;gap:8px;margin:10px -22px 0;padding:12px 22px calc(14px + env(safe-area-inset-bottom));background:var(--card);border-top:1px solid color-mix(in srgb,var(--bd) 60%,transparent)}',
    '.cdbar button{flex:1;display:flex;align-items:center;justify-content:center;gap:6px;min-height:50px;border-radius:14px;border:1px solid var(--bd);font-size:15px}',
    '.cdbar button svg{width:18px;height:18px}',
    '.cdbar .pri{flex:2;background:var(--ac);border-color:var(--ac);color:#fff;font-weight:600}',
    '.tsub{display:block;width:100%;text-align:left;font-size:13px;color:var(--ac);padding:10px 2px;border-bottom:1px solid color-mix(in srgb,var(--bd) 60%,transparent)}',
    '.row .rt small{display:block;font-size:12px;color:var(--mut)}',
    '.row.read .rt{color:var(--mut)}',
    '.row.cur{background:color-mix(in srgb,var(--ac) 10%,transparent);border-radius:10px;padding-left:10px}',
    '.row.cur .rt{color:var(--ac);font-weight:600}',
    '.bdg{flex:none;font-size:11px;padding:3px 8px;border-radius:999px;background:color-mix(in srgb,var(--ac) 14%,transparent);color:var(--ac);font-weight:600}',
    '.tochd{position:sticky;top:-16px;z-index:1;display:flex;flex-wrap:wrap;align-items:center;gap:8px 10px;margin:-16px -18px 4px;padding:12px 18px 10px;background:var(--bg);border-bottom:1px solid color-mix(in srgb,var(--bd) 60%,transparent)}',
    '.tst{flex:1 1 100%;min-width:0;display:flex;align-items:center;gap:8px;font-size:13px;color:var(--mut);white-space:nowrap}',
    '.tst .trf{display:flex;align-items:center;gap:4px;min-height:32px;padding:0 4px 0 8px;font-size:13px;color:var(--ac)}',
    '.tst .trf svg{width:16px;height:16px}',
    '.tst .trf.ml{margin-left:auto}',
    '.seg.tj{flex:1 1 100%}',
    '.tst b{font-size:15px;color:var(--fg);font-weight:700}',
    '.seg.tj button{flex:1;padding:0 8px;display:flex;align-items:center;justify-content:center}',
    '.seg.tj svg{width:18px;height:18px}',
    '.tgap{font-size:12.5px;color:var(--mut);margin:8px 2px 2px}',
    '.tbar button{flex:1;min-height:44px;border-radius:12px;border:1px solid var(--bd);font-size:13px}',
    '.spin{display:flex;align-items:center;justify-content:center;gap:10px;color:var(--mut);padding:50px 0;font-size:14px}',
    '.spin:before{content:"";width:18px;height:18px;border-radius:50%;border:2px solid var(--bd);border-top-color:var(--ac);animation:sp .9s linear infinite}',
    '@keyframes sp{to{transform:rotate(360deg)}}',
    '.toast{position:fixed;left:50%;bottom:calc(120px + env(safe-area-inset-bottom));transform:translate(-50%,16px);z-index:8;background:rgba(28,28,30,.94);color:#fff;padding:12px 18px;border-radius:14px;font-family:var(--ui);font-size:14px;opacity:0;pointer-events:none;transition:opacity .25s,transform .25s;max-width:86vw;text-align:center}',
    '.toast.on{opacity:1;transform:translate(-50%,0)}',
    '@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}'
  ].join('\n');

  var host = document.createElement('div');
  host.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:2147483646;display:block';
  document.body.appendChild(host);
  var root = host.attachShadow({ mode: 'open' });
  root.innerHTML = '<style>' + css + '</style>' +
    '<div class="app"><div class="sc"><main class="wrap"></main><div class="tail"></div></div>' +
    '<header class="top"><button class="ib" data-act="lib" aria-label="\uc11c\uc7ac">' + I.lib + '</button><div class="tt"><b></b><span></span></div>' +
    '<button class="ib" data-act="toc" aria-label="\ubaa9\ucc28">' + I.toc + '</button></header>' +
    '<div class="bot">' +
    '<nav class="btns"><button class="nb" data-act="prev">' + I.prev + '\uc774\uc804 \ud654</button><button class="nb" data-act="aa">' + I.aa + '\ubcf4\uae30</button>' +
    '<button class="nb" data-act="toc">' + I.toc + '\ubaa9\ucc28</button><button class="nb nx" data-act="next">' + I.next + '\ub2e4\uc74c \ud654</button></nav></div>' +
    '<div class="pg"><div class="ph"><button class="ib" data-act="pgClose" aria-label="\ub2eb\uae30">' + I.back + '</button><h3></h3><button class="ed" data-act="libEdit">\ud3b8\uc9d1</button></div><div class="pb"></div></div>' +
    '<div class="scrim" data-act="close"></div><div class="pn"></div><div class="toast"></div></div>';
  var $ = function (q) { return root.querySelector(q); };
  var app = $('.app'), sc = $('.sc'), wrap = $('.wrap'), tail = $('.tail'), topB = $('.top b'), topS = $('.top span'),
    pn = $('.pn'), toastEl = $('.toast'), pg = $('.pg'), pgT = $('.pg h3'), pgB = $('.pg .pb'), edBtn = $('.pg .ed');

  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  // \ub300\uc0ac \ud45c\uc2dc: \ub530\uc634\ud45c\ub85c \ub458\ub7ec\uc2fc \ubd80\ubd84\uc744 <span class="dq">\ub85c \uac10\uc308 (\ubcf4\uc774\ub294 \ubaa8\uc591\uc740 \uc124\uc815\uc758 '\ub300\uc0ac \uac15\uc870'\uac00 \uc815\ud568)
  var DQ = /(["\u201c][^"\u201c\u201d]{1,600}?["\u201d]|\u300c[^\u300c\u300d]{1,600}?\u300d|\u300e[^\u300e\u300f]{1,600}?\u300f|\u2018[^\u2018\u2019]{1,400}?\u2019)/g;
  function setTr(p, text) {
    text = String(text);
    if (!/["\u201c\u300c\u300e\u2018]/.test(text)) { p.textContent = text; return p; }
    var h = text.replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; })
      .replace(DQ, function (m) { return '<span class="dq' + (m.charAt(0) === '\u2018' ? ' th' : '') + '">' + m + '</span>'; });
    if (h.indexOf('<span') < 0 && /^\s*["\u201c\u300c\u300e]/.test(text)) h = '<span class="dq">' + h + '</span>'; // \ub2eb\ub294 \ub530\uc634\ud45c \uc5c6\uc774 \ubb38\ub2e8 \ub05d\uae4c\uc9c0 \uc774\uc5b4\uc9c0\ub294 \ub300\uc0ac
    p.innerHTML = h;
    return p;
  }
  function trP(cls, text) { return setTr(el('p', cls), text); }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var toastT;
  function toast(t) { toastEl.textContent = t; toastEl.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('on'); }, 2200); }
  function buzz() { try { navigator.vibrate && navigator.vibrate(8); } catch (e) { } }
  // ---- \ub4a4\ub85c \uac00\uae30: \uc5f4\ub9b0 \ucc3d\uc744 \uc704\uc5d0\uc11c\ubd80\ud130 \ud558\ub098\uc529 \ub2eb\uc74c ----
  // layers: \uc9c0\uae08 \uc5f4\ub9b0 \uce35(\uc544\ub798\u2192\uc704). \uce35\uc774 \ud558\ub098\ub77c\ub3c4 \uc788\uc73c\uba74 \uae30\ub85d(history)\uc5d0 '\uce35' \uce78\uc744 \ud558\ub098 \ub460
  var layers = [], hasEntry = false, skipPop = 0, lastBack = 0;
  var RAW = {
    ui: function () { app.classList.remove('ui'); },
    page: function () { app.classList.remove('page'); },
    sheet: function () { app.classList.remove('sheet'); if (holdP) holdP.classList.remove('hold'); }
  };
  function pushLayer(n) {
    if (layers.indexOf(n) < 0) layers.push(n);
    if (!hasEntry) { try { history.pushState({ nvL: 1 }, '', location.href); hasEntry = true; } catch (e) { } }
  }
  function dropLayer(n) {
    var i = layers.indexOf(n);
    if (i < 0) { RAW[n](); return; }
    layers.splice(i).reverse().forEach(function (x) { RAW[x](); });
    if (!layers.length && hasEntry) setTimeout(function () {
      if (!layers.length && hasEntry) { hasEntry = false; skipPop++; history.back(); }
    }, 60);
  }
  function syncUrl() { try { var it = chapters[curIndex()]; if (it) history.replaceState(history.state, '', it.ch.url); } catch (e) { } }
  window.addEventListener('popstate', function () {
    setTimeout(syncUrl, 0); // \uae30\ub85d\uc744 \uc62e\uae30\uba74 \uc8fc\uc18c\uac00 \uc608\uc804 \ud654\ub85c \ub3cc\uc544\uac00\ubbc0\ub85c \uc9c0\uae08 \ud654\ub85c \ub9de\ucda4
    if (skipPop > 0) { skipPop--; return; }
    if (hasEntry) {
      hasEntry = false;
      if (layers.length) RAW[layers.pop()]();
      if (layers.length) { try { history.pushState({ nvL: 1 }, '', location.href); hasEntry = true; } catch (e) { } }
      return;
    }
    // \uc544\ubb34 \ucc3d\ub3c4 \uc5c6\uc744 \ub54c: \uc2e4\uc218\ub85c \ubc88\uc5ed \ud654\uba74\uc744 \ub098\uac00\uc9c0 \uc54a\uac8c \ud55c \ubc88 \ub354 \ud655\uc778
    if (Date.now() - lastBack < 2000) { try { window.close(); } catch (e) { } setTimeout(function () { history.back(); }, 150); return; }
    lastBack = Date.now(); toast('\ud55c \ubc88 \ub354 \ub204\ub974\uba74 \ub2eb\ud799\ub2c8\ub2e4');
    try { history.pushState({ nvB: 1 }, '', location.href); } catch (e) { }
  });
  try { history.pushState({ nvB: 1 }, '', location.href); } catch (e) { }
  function setUI(on) { if (on) { app.classList.add('ui'); pushLayer('ui'); } else dropLayer('ui'); }
  function showSheet() { pn.classList.remove('full'); pn.style.transform = ''; app.classList.add('sheet'); pushLayer('sheet'); }

  // \ub300\uc0ac \ud615\uad11\ud39c \uc0c9: \ud14c\ub9c8 \uac15\uc870\uc0c9\uc758 \uc0c9\uc0c1\uc73c\ub85c, \ubc1d\uc740 \ud14c\ub9c8\ub294 \uc5f0\ud558\uace0 \uc120\uba85\ud558\uac8c, \uc5b4\ub450\uc6b4 \ud14c\ub9c8\ub294 \uc740\uc740\ud558\uac8c.
  // \ud615\uad11\ud39c \uc704 \uae00\uc790\uac00 \ubc14\ud0d5 \uc704 \uae00\uc790\ub9cc\ud07c(80% \uc774\uc0c1) \ub610\ub837\ud558\ub3c4\ub85d \uc9c4\ud558\uae30\ub97c \ud14c\ub9c8\ub9c8\ub2e4 \uacc4\uc0b0
  function hx(h) { h = h.replace('#', ''); return [0, 2, 4].map(function (i) { return parseInt(h.substr(i, 2), 16) / 255; }); }
  function lumi(c) { return c.map(function (v) { return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }).reduce(function (s, v, i) { return s + v * [0.2126, 0.7152, 0.0722][i]; }, 0); }
  function ctr(a, b) { var x = lumi(a), y = lumi(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  function toHsl(c) {
    var r = c[0], g = c[1], b = c[2], mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, h = 0, s = 0, d = mx - mn;
    if (d) { s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; }
    return [h, s, l];
  }
  function fromHsl(h, s, l) {
    function f(n) { var k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l); return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); }
    return [f(0), f(8), f(4)];
  }
  // \ud615\uad11\ud39c: \ud14c\ub9c8 \uac15\uc870\uc0c9 \uacc4\uc5f4\uc758 \ubc1d\uc740 \uc0c9\uc744 '\ud615\uad11\ud39c \uc9c4\ud558\uae30'\ub9cc\ud07c \ube44\uce58\uac8c \uae54\uace0, \uadf8 \uc704 \uae00\uc790\ub294 \ub610\ub837\ud55c \ucabd(\ud14c\ub9c8 \uae00\uc790\uc0c9 \ub610\ub294 \uc5b4\ub450\uc6b4 \uc0c9)\uc73c\ub85c
  function rgbs(c, a) { return 'rgba(' + c.map(function (v) { return Math.round(v * 255); }).join(',') + ',' + (a == null ? 1 : a) + ')'; }
  // hh: \ubc14\ud0d5\uacfc \uac15\uc870\uc0c9\uc774 \uac19\uc740 \uacc4\uc5f4\uc774\ub77c \ud615\uad11\ud39c\uc774 \ubb3b\ud788\ub294 \ud14c\ub9c8(\uc5f0\ub450, \uc885\uc774, \uc138\ud53c\uc544)\ub294 \ud615\uad11\ud39c \uc0c9\uc0c1\uc744 \ub530\ub85c \uc815\ud568
  function hlSet(t, pct) {
    var a = Math.max(0.1, Math.min(1, (pct == null ? 50 : pct) / 100)), hue = t.hh != null ? t.hh / 360 : toHsl(hx(t.ac))[0], bg = hx(t.bg), fg = hx(t.fg);
    var green = hue > 0.17 && hue < 0.47 ? 0.65 : 1; // \ucd08\ub85d \uacc4\uc5f4\uc740 \ub208\uc5d0 \ub354 \uc138\uac8c \ubcf4\uc5ec\uc11c \ucc44\ub3c4\ub97c \ub0ae\ucda4
    var hl = t.dark ? fromHsl(hue, 0.42 * green, 0.62) : fromHsl(hue, 0.62 * green, 0.8), hl2 = t.dark ? fromHsl(hue, 0.2, 0.6) : fromHsl(hue, 0.3, 0.84);
    function blend(c) { return c.map(function (v, i) { return v * a + bg[i] * (1 - a); }); }
    var b1 = blend(hl), b2 = blend(hl2), dark0 = t.dark ? bg : fg;
    var ink = Math.min(ctr(fg, b1), ctr(fg, b2)) >= Math.min(ctr(dark0, b1), ctr(dark0, b2)) ? fg : dark0;
    var up = lumi(ink) > lumi(b1);
    for (var k = 0; k < 10 && (ctr(ink, b1) < 7 || ctr(ink, b2) < 7); k++) ink = ink.map(function (v) { return up ? v + (1 - v) * 0.2 : v * 0.8; });
    return { '--hl': rgbs(hl, a), '--hl2': rgbs(hl2, a), '--hlfg': rgbs(ink) };
  }
  function applyPrefs() {
    var t = THEMES[themeKey()];
    var F = (prefs.font === 'custom' && customFont()) || FONTS[prefs.font] || FONTS.pretendard; loadFont(prefs.font); loadFont('pretendard');
    var v = { '--bg': t.bg, '--fg': t.fg, '--mut': t.mut, '--card': t.card, '--bd': t.bd, '--ac': t.ac, '--font': F.f,
      '--ui': FONTS.pretendard.f, '--fs': prefs.fs + 'px', '--lh': prefs.lh, '--ps': prefs.ps + 'em', '--mw': prefs.mw + 'px',
      '--pad': prefs.pad + 'px', '--ind': prefs.ind ? '1em' : '0', '--ta': prefs.just ? 'justify' : 'left', '--wb': prefs.just ? 'normal' : 'keep-all' }; // \uc591\ucabd \uc815\ub82c\uc740 \uae00\uc790 \ub2e8\uc704 \uc904\ubc14\uafc8\uc774\ub77c\uc57c \ub744\uc5b4\uc4f0\uae30\uac00 \ubc8c\uc5b4\uc9c0\uc9c0 \uc54a\uc74c
    var hs = hlSet(t, prefs.hla); Object.keys(hs).forEach(function (k) { v[k] = hs[k]; });
    Object.keys(v).forEach(function (k) { app.style.setProperty(k, v[k]); });
    app.classList.toggle('dlg1', +prefs.dlg === 1); app.classList.toggle('dlg2', +prefs.dlg === 2);
    app.classList.toggle('dk', !!t.dark); // \uc5b4\ub450\uc6b4 \ud14c\ub9c8: \uae00\uc790\ub97c \uc0b4\uc9dd \uac00\ub298\uac8c (\ubc1d\uc740 \uae00\uc528\uac00 \ubc88\uc838 \ubcf4\uc774\ub294 \uac83 \uc904\uc784)
    document.documentElement.style.background = t.bg;
    var mc = document.querySelector('meta[name=theme-color]');
    if (!mc) { mc = document.createElement('meta'); mc.name = 'theme-color'; document.head.appendChild(mc); }
    mc.content = t.bg;
    if (pn.dataset.mode === 'set') syncPanel();
  }

  // ===================== \uc2dc\ud2b8: \ubcf4\uae30 \uc124\uc815 =====================
  function buildPanel() {
    var h = '<div class="grab"></div><div class="hd"><h3>\ubcf4\uae30 \uc124\uc815</h3><button class="x" data-act="close" aria-label="\ub2eb\uae30">' + I.x + '</button></div>';
    h += '<div class="thd"><span class="lb">\ud14c\ub9c8</span><button class="undo" data-act="themeUndo">\ub418\ub3cc\ub9ac\uae30</button><div class="seg">' +
      '<button data-act="tmode" data-v="d">\ub0ae</button><button data-act="tmode" data-v="n">\ubc24</button><button data-act="tmode" data-v="a">\uc790\ub3d9</button></div></div>' +
      '<div class="swrow"></div><div class="swnm"></div>';
    var F = prefs.font === 'custom' ? { n: prefs.fontCustom || '\uc9c1\uc811 \uc785\ub825', f: (customFont() || {}).f } : (FONTS[prefs.font] || FONTS.pretendard);
    h += '<div class="lb">\uae00\uc790</div><div class="grpbox">' +
      '<button class="rowx" data-act="fontOpen"><span>\uae00\uaf34</span><span class="rv" style="font-family:' + esc(F.f || '') + '">' + esc(F.n) + I.next + '</span></button>';
    function stepRow(s) {
      return '<div class="rowx"' + (s[0] === 'hla' ? ' data-only="dlg2"' : '') + '><span>' + s[1] + '</span><div class="ctl"><button data-act="step" data-v="' + s[0] + '" data-d="-1" aria-label="' + s[1] + ' \uc904\uc774\uae30">\u2212</button><b data-k="' + s[0] + '"></b><button data-act="step" data-v="' + s[0] + '" data-d="1" aria-label="' + s[1] + ' \ub298\ub9ac\uae30">+</button></div></div>';
    }
    STEPS.forEach(function (s) { if (s[0] !== 'hla') h += stepRow(s); });
    h += '<div class="rowx"><span>\uc815\ub82c</span><div class="seg"><button data-act="just" data-v="1">\uc591\ucabd</button><button data-act="just" data-v="0">\uc67c\ucabd</button></div></div>' +
      '<button class="rowx" data-act="ind"><span>\ub4e4\uc5ec\uc4f0\uae30</span><i class="tg" data-k="ind"></i></button>' +
      '<div class="rowx"><span>\ub300\uc0ac \uac15\uc870</span><div class="seg"><button data-act="dlg" data-v="0">\ub054</button><button data-act="dlg" data-v="1">\uc0c9</button><button data-act="dlg" data-v="2">\ud615\uad11\ud39c</button></div></div>' + stepRow(STEPS[STEPS.length - 1]) + '</div>';
    h += '<div class="lb">\uc77d\uae30</div><div class="grpbox">' +
      '<button class="rowx" data-act="autoNext"><span>\uc774\uc5b4 \ubcf4\uae30</span><i class="tg" data-k="auto"></i></button>' +
      '<div class="rowx"><span>\ubbf8\ub9ac \ubc88\uc5ed</span><div class="seg"><button data-act="pre" data-v="0">\ub054</button><button data-act="pre" data-v="1">\uc55e\ubd80\ubd84</button><button data-act="pre" data-v="2">\uc804\uccb4</button></div></div></div>';
    h += '<div class="grpbox lnk"><button class="rowx" data-act="retrans"><span>\uc774 \ud654 \ub2e4\uc2dc \ubc88\uc5ed</span>' + I.next + '</button>' +
      '<button class="rowx" data-act="api"><span>\ubc88\uc5ed \uc124\uc815</span>' + I.next + '</button>' +
      '<button class="rowx" data-act="reset"><span class="mutd">\ubcf4\uae30 \uc124\uc815 \ucd08\uae30\ud654</span></button></div>';
    pn.innerHTML = h;
  }
  function themeList(dk) {
    var ks = Object.keys(THEMES).filter(function (k) { return !!THEMES[k].dark === dk; });
    var pins = prefs.pins || [];
    return ks.filter(function (k) { return pins.indexOf(k) >= 0; }).concat(ks.filter(function (k) { return pins.indexOf(k) < 0; }));
  }
  function swHtml(k, sel) {
    var T = THEMES[k];
    return '<button class="tsw' + (sel ? ' sel' : '') + ((prefs.pins || []).indexOf(k) >= 0 ? ' pin' : '') + '" data-act="theme" data-v="' + k + '" aria-label="' + T.n + '" style="background:' + T.bg + ';color:' + T.fg + ';border-color:' + T.bd + '">\uac00</button>';
  }
  function syncThemeRow() {
    var row = pn.querySelector('.swrow'); if (!row) return;
    var m = prefs.mode || 'a', cur = themeKey(), h = '';
    if (m === 'a') h = themeList(false).map(function (k) { return swHtml(k, k === prefs.dayT || k === cur); }).join('') + '<i class="sep2"></i>' + themeList(true).map(function (k) { return swHtml(k, k === prefs.nightT || k === cur); }).join('');
    else h = themeList(m === 'n').map(function (k) { return swHtml(k, k === cur); }).join('');
    var sl = row.scrollLeft; row.innerHTML = h; row.scrollLeft = sl;
    [].forEach.call(pn.querySelectorAll('[data-act=tmode]'), function (b) { b.classList.toggle('on', b.dataset.v === m); });
    var nm = pn.querySelector('.swnm'), D = THEMES[prefs.dayT] || THEMES.light, N = THEMES[prefs.nightT] || THEMES.dark;
    nm.textContent = (m === 'a' ? '\ub0ae ' + D.n + ', \ubc24 ' + N.n : THEMES[cur].n) + ' (\uae38\uac8c \ub204\ub974\uba74 \uace0\uc815)';
    var ub = pn.querySelector('.undo'); if (ub) ub.style.visibility = themeSnap && JSON.stringify(themeSnap) !== JSON.stringify([prefs.mode, prefs.dayT, prefs.nightT]) ? 'visible' : 'hidden';
  }
  function syncPanel() {
    syncThemeRow();
    [].forEach.call(pn.querySelectorAll('[data-act=pre]'), function (b) { b.classList.toggle('on', +b.dataset.v === +prefs.pre); });
    [].forEach.call(pn.querySelectorAll('[data-act=just]'), function (b) { b.classList.toggle('on', +b.dataset.v === +prefs.just); });
    [].forEach.call(pn.querySelectorAll('[data-act=dlg]'), function (b) { b.classList.toggle('on', +b.dataset.v === +prefs.dlg); });
    [].forEach.call(pn.querySelectorAll('[data-only=dlg2]'), function (r) { r.style.display = +prefs.dlg === 2 ? '' : 'none'; });
    [].forEach.call(pn.querySelectorAll('.tg'), function (g) { g.classList.toggle('on', !!prefs[g.dataset.k]); });
    STEPS.forEach(function (s) { var e = pn.querySelector('b[data-k=' + s[0] + ']'); if (e) e.textContent = s[5](prefs[s[0]]); });
  }
  // \uae00\uaf34 \uace0\ub974\uae30: \uc885\ub958\ubcc4 \ud0ed, \uc774\ub984\uc744 \uadf8 \uae00\uaf34\ub85c \ubcf4\uc5ec \uc90c(\ubcf4\uc774\ub294 \uac83\ub9cc \ubd88\ub7ec\uc634), \ub204\ub974\uba74 \ubc14\ub85c \uc801\uc6a9
  var fontTab = null, fontIO = null;
  function openFonts() {
    pn.dataset.mode = 'font';
    if (!fontTab) fontTab = (FONTS[prefs.font] || {}).c || 'go';
    var h = '<div class="grab"></div><div class="hd"><button class="bk" data-act="fontBack" aria-label="\ub4a4\ub85c">' + I.back + '</button><h3>\uae00\uaf34</h3><button class="x" data-act="close" aria-label="\ub2eb\uae30">' + I.x + '</button></div>' +
      '<div class="seg full">' + FCAT.map(function (c) { return '<button data-act="fontTab" data-v="' + c[0] + '" class="' + (c[0] === fontTab ? 'on' : '') + '">' + c[1] + '</button>'; }).join('') + '</div><div class="flist">';
    Object.keys(FONTS).filter(function (k) { return FONTS[k].c === fontTab; }).forEach(function (k) {
      var F = FONTS[k];
      h += '<button class="frow' + (prefs.font === k ? ' sel' : '') + '" data-act="font" data-v="' + k + '" style="font-family:' + esc(F.f) + '"><b>' + esc(F.n) + '</b><span>\uadf8\ub294 \ucc9c\ucc9c\ud788 \uace0\uac1c\ub97c \ub4e4\uc5c8\ub2e4.</span>' + I.check + '</button>';
    });
    h += '</div><div class="lb">\uc9c1\uc811 \uc785\ub825</div><div class="urlrow"><input class="url fontin" type="text" value="' + esc(prefs.fontCustom || '') + '" placeholder="\uae00\uaf34 \uc774\ub984 \ub610\ub294 \ud30c\uc77c \uc8fc\uc18c"><button class="go" data-act="fontCustom">\uc801\uc6a9</button></div>';
    pn.innerHTML = h; pn.scrollTop = 0;
    try { fontIO && fontIO.disconnect(); } catch (e) { }
    if (window.IntersectionObserver) {
      fontIO = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { loadFont(e.target.dataset.v); fontIO.unobserve(e.target); } }); }, { root: pn, rootMargin: '120px' });
      [].forEach.call(pn.querySelectorAll('.frow'), function (r) { fontIO.observe(r); });
    } else Object.keys(FONTS).forEach(function (k) { if (FONTS[k].c === fontTab) loadFont(k); });
  }
  function openSheet() { buildPanel(); pn.dataset.mode = 'set'; themeSnap = [prefs.mode, prefs.dayT, prefs.nightT]; syncPanel(); pn.scrollTop = 0; showSheet(); }
  function closeSheet() { dropLayer('sheet'); if (tmpTheme) { tmpTheme = null; applyPrefs(); } }

  // ===================== \uc2dc\ud2b8: \ub9c1\ud06c \uace0\ub974\uae30 =====================
  var pickItem = null;
  function openPicker(kind, item) {
    pickItem = item; pn.dataset.mode = 'pick';
    var nm = { next: '\ub2e4\uc74c \ud654', prev: '\uc774\uc804 \ud654', toc: '\ubaa9\ucc28' }[kind];
    var h = '<div class="grab"></div><div class="hd"><h3>' + nm + ' \ub9c1\ud06c \uace0\ub974\uae30</h3><button class="x" data-act="close" aria-label="\ub2eb\uae30">' + I.x + '</button></div>' +
      '<p class="hint">' + nm + ' \ub9c1\ud06c\ub97c \uc790\ub3d9\uc73c\ub85c \ubabb \ucc3e\uc558\uc5b4\uc694. \uc6d0\ubcf8 \ud398\uc774\uc9c0\uc5d0 \uc788\ub358 \ub9c1\ud06c \uc911\uc5d0\uc11c ' + nm + '\ub85c \uac00\ub294 \uac78 \uace8\ub77c \uc8fc\uc138\uc694. \ud55c \ubc88 \uace0\ub974\uba74 \uc774 \uc0ac\uc774\ud2b8\uc5d0\uc11c\ub294 \uae30\uc5b5\ud574\uc694.</p>';
    h += '<div class="urlrow"><input class="url" type="url" inputmode="url" placeholder="' + nm + ' \uc8fc\uc18c\ub97c \ubd99\uc5ec\ub123\uc5b4\ub3c4 \ub3fc\uc694"><button class="go" data-act="pickUrl" data-k="' + kind + '">\uc5f4\uae30</button></div>';
    var ls = item.ch.links || [];
    if (!ls.length) h += '<p class="hint">\uc6d0\ubcf8 \ud398\uc774\uc9c0\uc5d0\uc11c \ub9c1\ud06c\ub97c \ud558\ub098\ub3c4 \ucc3e\uc9c0 \ubabb\ud588\uc5b4\uc694.</p>';
    ls.forEach(function (c, i) {
      h += '<button class="li" data-act="pickLink" data-k="' + kind + '" data-i="' + i + '"><b>' + esc(c.t.slice(0, 60)) + '</b><small>' + esc(c.u.replace(/^https?:\/\/[^\/]+/, '')) + '</small></button>';
    });
    pn.innerHTML = h; pn.scrollTop = 0; showSheet();
  }

  // ===================== \uc2dc\ud2b8: \ubb38\ub2e8 =====================
  var holdP = null;
  function openPara(p) {
    holdP = p; p.classList.add('hold'); pn.dataset.mode = 'para';
    var it = itemOf(p), hist = p._hist && p._hist.length;
    var h = '<div class="grab"></div><div class="hd"><h3>\uc774 \ubb38\ub2e8</h3><button class="x" data-act="close" aria-label="\ub2eb\uae30">' + I.x + '</button></div>' +
      '<div class="quote">' + esc(p.textContent) + '</div>';
    // \ud654 \uc804\uccb4\uac00 \ub05d\ub098\uae30 \uc804\uc774\ub77c\ub3c4, \uc774 \ubb38\ub2e8\uc758 \ubc88\uc5ed\uc774 \ub2e4 \ub4e4\uc5b4\uc654\uc73c\uba74 \ub2e4\uc2dc \ubc88\uc5ed\ud560 \uc218 \uc788\uac8c
    if (it && !p.classList.contains('src') && !p.classList.contains('live')) h += '<button class="wide pri" data-act="paraRetr">' + I.redo + '\uc774 \ubb38\ub2e8\ub9cc \ub2e4\uc2dc \ubc88\uc5ed</button>';
    if (hist) h += '<button class="wide" data-act="paraUndo">' + I.undo + '\uc774\uc804 \ubc88\uc5ed\uc73c\ub85c \ub418\ub3cc\ub9ac\uae30</button>';
    h += '<button class="wide" data-act="paraCopy">' + I.copy + '\ubcf5\uc0ac</button>';
    if (it) h += '<button class="wide" data-act="card">' + I.img + '\uc0ac\uc9c4\uc73c\ub85c \uc800\uc7a5</button>';
    if (it && it.v && p._idx != null) h += '<button class="wide" data-act="paraDelAsk">' + I.x + '\uc774 \ubb38\ub2e8 \uc9c0\uc6b0\uae30</button>';
    pn.innerHTML = h; pn.scrollTop = 0; showSheet();
  }
  function itemOf(node) { for (var i = 0; i < chapters.length; i++) if (chapters[i].sec.contains(node)) return chapters[i]; return null; }
  function setPara(it, p, text) {
    setTr(p, text); p.classList.remove('tr'); void p.offsetWidth; p.classList.add('tr');
    if (it.v && p._idx != null) { it.v.lines[p._idx] = text; cachePut(it.ch.url, it.v, it.ch.id); }
    else (it.pendEd || (it.pendEd = [])).push({ p: p, text: text }); // \uc544\uc9c1 \ubc88\uc5ed \uc911\uc778 \ud654: \ub05d\ub098\uace0 \uc800\uc7a5\ud560 \ub54c \ubc18\uc601
  }
  // \ubc88\uc5ed\uc5d0 \uc11e\uc5ec \ub098\uc628 \uc124\uba85\u00b7\ucd94\ub860 \uac19\uc740 \ubb38\ub2e8\uc744 \uc9c0\uc6c0 (\uc800\uc7a5\ub41c \ubc88\uc5ed\uc5d0\uc11c\ub3c4 \ube60\uc9d0)
  function delParagraph(p) {
    var it = itemOf(p); if (!it || !it.v || p._idx == null) return false;
    var i = p._idx, v = it.v;
    v.lines.splice(i, 1);
    if (v.parts && v.parts.length) { var acc = 0; for (var g = 0; g < v.parts.length; g++) { acc += v.parts[g]; if (i < acc) { v.parts[g]--; break; } } }
    [].forEach.call(it.sec.querySelectorAll('p'), function (x) { if (x._idx != null && x._idx > i) x._idx--; });
    p.remove(); cachePut(it.ch.url, v, it.ch.id);
    return true;
  }
  async function retrParagraph(p) {
    var it = itemOf(p); if (!it) return;
    var srcLines = (p._grp >= 0 && it.chunks && it.chunks[p._grp]) || it.ch.lines;
    var C = cfg() || {};
    var sys = '\ub108\ub294 \uc911\uad6d\uc5b4 \uc6f9\uc18c\uc124 \ubc88\uc5ed \uad50\uc815\uac00\ub2e4. \uc8fc\uc5b4\uc9c4 \uc6d0\ubb38 \uc77c\ubd80\uc640 \ud55c\uad6d\uc5b4 \ubc88\uc5ed \ubb38\ub2e8 \ud558\ub098\ub97c \ubcf4\uace0, \uadf8 \ubb38\ub2e8\uc5d0 \ud574\ub2f9\ud558\ub294 \uc6d0\ubb38 \ubd80\ubd84\uc744 \ucc3e\uc544 \ub354 \uc815\ud655\ud558\uace0 \uc790\uc5f0\uc2a4\ub7ec\uc6b4 \ud55c\uad6d\uc5b4 \uc18c\uc124 \ubb38\uccb4\ub85c \ub2e4\uc2dc \ubc88\uc5ed\ud55c\ub2e4. \ub2e4\uc2dc \ubc88\uc5ed\ud55c \ubb38\ub2e8 \ud558\ub098\ub9cc \ucd9c\ub825\ud558\uace0 \uc124\uba85\uc740 \ubd99\uc774\uc9c0 \uc54a\ub294\ub2e4.' +
      (C.g ? '\n\n\ub2e4\uc74c \uc6a9\uc5b4\uc9d1\uc744 \ubc18\ub4dc\uc2dc \ub530\ub978\ub2e4:\n' + C.g : '') + (namesText(it.ch.id) ? '\n\n\uc778\ubb3c \uc774\ub984 \ud45c\uae30(\ubc18\ub4dc\uc2dc \uc774\ub300\ub85c):\n' + namesText(it.ch.id) : '');
    var prompt = '[\uc6d0\ubb38]\n' + srcLines.join('\n') + '\n\n[\ud604\uc7ac \ubc88\uc5ed \ubb38\ub2e8]\n' + p.textContent;
    p.classList.add('busy');
    try {
      var out = (await callApi(prompt, 0.7, sys)).split(/\n+/).map(function (x) { return x.trim(); }).filter(Boolean).join(' ');
      if (!out) throw new Error('\uacb0\uacfc\uac00 \ube44\uc5b4 \uc788\uc5b4\uc694');
      (p._hist = p._hist || []).push(p.textContent);
      setPara(it, p, out); toast('\ub2e4\uc2dc \ubc88\uc5ed\ud588\uc5b4\uc694');
    } catch (e) { toast('\ub2e4\uc2dc \ubc88\uc5ed\ud558\uc9c0 \ubabb\ud588\uc5b4\uc694: ' + e.message.slice(0, 60)); }
    p.classList.remove('busy');
  }

  // \uc778\ubb3c \uc774\ub984 \uad50\uc815: \uc6d0\ubb38\uc758 \uc778\uba85 \ud55c\uc790 \u2192 \ud55c\uad6d \ud55c\uc790\uc74c, \ubc88\uc5ed\ubb38\uc5d0\uc11c \uc798\ubabb \uc4f4 \ud45c\uae30(\uc911\uad6d\uc5b4 \ubc1c\uc74c \ub4f1)\ub97c \ucc3e\uc544 \ubc14\uafc8 (\ub2e4\uc2dc \ubc88\uc5ed\ud558\uc9c0 \uc54a\uace0 \uae00\uc790\ub9cc \uad50\uccb4)
  function replAll(t, map) { var n = 0; Object.keys(map).forEach(function (w) { var parts = t.split(w); if (parts.length > 1) { n += parts.length - 1; t = parts.join(map[w]); } }); return { t: t, n: n }; }
  async function fixNames(it, btn) {
    if (!it || !it.v) return;
    btn && (btn.disabled = true, btn.classList.add('busy')); toast('\uc778\ubb3c \uc774\ub984\uc744 \ud655\uc778\ud558\ub294 \uc911');
    var known = namesText(it.ch.id);
    var sys = '\ub108\ub294 \uc911\uad6d\uc5b4 \uc18c\uc124\uc758 \ud55c\uad6d\uc5b4 \ubc88\uc5ed \uad50\uc815\uac00\ub2e4. [\uc6d0\ubb38]\uc5d0 \ub098\uc624\ub294 \uc0ac\ub78c \uc774\ub984(\uc131+\uc774\ub984, \uc774\ub984, \ud638\uce6d\ucc98\ub7fc \uc4f0\uc778 \uc774\ub984)\uc744 \ubaa8\ub450 \ucc3e\uc544 \ud55c\uad6d \ud55c\uc790\uc74c \ud45c\uae30\ub97c \uc815\ud55c\ub2e4(\uc608: \u5433\u79cb\u82f1\u2192\uc624\ucd94\uc601, \u5468\u5bb6\u68df\u2192\uc8fc\uac00\ub3d9). ' +
      '\uadf8\ub9ac\uace0 [\ubc88\uc5ed]\uc5d0\uc11c \uadf8 \uc0ac\ub78c\uc774 \ub2e4\ub978 \ud45c\uae30(\uc911\uad6d\uc5b4 \ubc1c\uc74c \uc74c\ucc28, \uc798\ubabb \uc77d\uc740 \ud55c\uc790\uc74c, \uc624\ud0c0 \ub4f1)\ub85c \uc4f0\uc778 \uacf3\uc744 \ucc3e\ub294\ub2e4. \ubc88\uc5ed\ubb38\uc5d0 \uc2e4\uc81c\ub85c \uc788\ub294 \uc798\ubabb\ub41c \ud45c\uae30\ub9cc wrong\uc5d0 \ub123\ub294\ub2e4. ' +
      '\uc124\uba85 \uc5c6\uc774 JSON \ud55c \uc904\ub9cc \ucd9c\ub825\ud55c\ub2e4: {"names":[{"zh":"\u5433\u79cb\u82f1","ko":"\uc624\ucd94\uc601","wrong":["\uc6b0\ucd94\uc789"]}]}' + (known ? '\n\n\uc774\ubbf8 \uc815\ud574 \ub454 \ud45c\uae30(\uadf8\ub300\ub85c \ub530\ub978\ub2e4):\n' + known : '');
    var prompt = '[\uc6d0\ubb38]\n' + it.ch.lines.join('\n').slice(0, 14000) + '\n\n[\ubc88\uc5ed]\n' + it.v.lines.join('\n').slice(0, 16000);
    try {
      var raw = await callApi(prompt, 0.1, sys), j;
      try { j = JSON.parse(raw.replace(/^[\s\S]*?(\{[\s\S]*\})[\s\S]*$/, '$1')); } catch (e) { throw new Error('\ub2f5\uc744 \uc77d\uc9c0 \ubabb\ud588\uc5b4\uc694'); }
      var map = {}, learn = {}, pairs = [];
      (j.names || []).forEach(function (x) {
        if (!x || !x.zh || !x.ko) return; learn[x.zh] = x.ko;
        (x.wrong || []).forEach(function (w) { w = String(w).trim(); if (w.length >= 2 && w !== x.ko && !/\s/.test(w) && x.ko.indexOf(w) < 0) { map[w] = x.ko; pairs.push(w + '\u2192' + x.ko); } });
      });
      saveNames(it.ch.id, learn, true);
      if (!pairs.length) { toast('\uace0\uce60 \uc774\ub984\uc774 \uc5c6\uc5b4\uc694. \uc774\ub984\ud45c\ub294 \uc800\uc7a5\ud588\uc5b4\uc694'); return; }
      // \uc9c0\uae08 \ud654 + \uc774 \uc791\ud488\uc758 \ub2e4\ub978 \ubc88\uc5ed\ub41c \ud654\uc5d0\ub3c4 \uac19\uc740 \uad50\uccb4\ub97c \uc801\uc6a9 (\ub2e4\uc2dc \ubc88\uc5ed \uc5c6\uc774)
      var total = 0, I = cIndex();
      Object.keys(I).forEach(function (k) {
        if (I[k].w !== it.ch.id) return; var v = cacheGet(k); if (!v || !v.lines) return;
        var ch = 0; v.lines = v.lines.map(function (l) { var r = replAll(l, map); ch += r.n; return r.t; }); var tr = replAll(v.title || '', map); v.title = tr.t;
        if (ch || tr.n) { cachePut(k, v, it.ch.id); total += ch; }
      });
      chapters.forEach(function (c) {
        if (c.ch.id !== it.ch.id || !c.v) return;
        var fresh = cacheGet(c.ch.url); if (fresh && fresh.lines) c.v = fresh;
        [].forEach.call(c.sec.querySelectorAll('p.tr'), function (p) { var r = replAll(p.textContent, map); if (r.n) setTr(p, r.t); });
        if (c.v.title) setTitle(c, c.v.title);
      });
      toast('\uc774\ub984 ' + pairs.length + '\uac1c \uace0\ucce4\uc5b4\uc694 (' + total + '\uacf3): ' + pairs.slice(0, 3).join(', ') + (pairs.length > 3 ? ' \u2026' : ''));
    } catch (e) { toast('\uc778\ubb3c \uc774\ub984\uc744 \uace0\uce58\uc9c0 \ubabb\ud588\uc5b4\uc694: ' + String(e.message).slice(0, 50)); }
    finally { btn && (btn.disabled = false, btn.classList.remove('busy')); }
  }
  // \uc791\ud488\ubcc4 \uc778\ubb3c \uc774\ub984\ud45c \ud3b8\uc9d1
  function openNames(id) {
    var N = namesOf(id); workId0 = id; pn.dataset.mode = 'names';
    var h = '<div class="grab"></div><div class="hd"><button class="bk" data-act="namesBack" data-id="' + esc(id) + '" aria-label="\ub4a4\ub85c">' + I.back + '</button><h3>\uc778\ubb3c \uc774\ub984</h3><button class="x" data-act="close" aria-label="\ub2eb\uae30">' + I.x + '</button></div>' +
      '<p class="hint">\ud55c \uc904\uc5d0 \ud558\ub098\uc529 "\ud55c\uc790=\ud55c\uae00"\ub85c \uc801\uc5b4\uc694. \ubc88\uc5ed\ud560 \ub54c \uc774 \ud45c\uae30\ub97c \uadf8\ub300\ub85c \uc368\uc694.</p>' +
      '<textarea class="namesin" rows="10" spellcheck="false" placeholder="\u5433\u79cb\u82f1=\uc624\ucd94\uc601">' + esc(Object.keys(N).map(function (k) { return k + '=' + N[k]; }).join('\n')) + '</textarea>' +
      '<button class="wide pri" data-act="namesSave" data-id="' + esc(id) + '">\uc800\uc7a5</button>';
    pn.innerHTML = h; pn.scrollTop = 0; showSheet();
  }

  // ===================== \ud654 \ud45c\uc2dc =====================
  var pending = {}, chapters = [], appending = false;
  function startTranslate(ch, keep, title, limit) {
    if (!pending[ch.url]) pending[ch.url] = { ch: ch, parts: {}, title: null, done: null, subs: [], psubs: [], ctl: { keep: keep, title: title, limit: limit }, t0: Date.now() };
    var P = pending[ch.url];
    P.ctl.onPartial = function (ci, txt) { P.lastProg = Date.now(); P.psubs.forEach(function (f) { f(ci, txt); }); };
    if (!P.done) {
      P.done = translate(ch, function (ci, ls, t) { P.title = t; P.parts[ci] = ls; P.lastProg = Date.now(); P.subs.forEach(function (f) { f(ci, ls, t); }); }, P.ctl);
      P.done.then(function () { P.finished = true; }, function () { P.finished = true; });
    }
    return P;
  }
  // \ubbf8\ub9ac \ubc88\uc5ed: 0 \ub054 \u00b7 1 \uc55e\ubd80\ubd84\ub9cc \u00b7 2 \uc804\uccb4
  function preLimit() { return prefs.pre === 2 ? null : prefs.pre === 0 ? 0 : 1; }
  // \ubc88\uc5ed \uc911\uc5d0 \uba48\ucdc4\uc744 \ub54c: \ub05d\ub09c \ubd80\ubd84\uc740 \uc0b4\ub9ac\uace0 \ub098\uba38\uc9c0\ub9cc \uc0c8\ub85c \uc2dc\uc791
  function restartTranslate(item) {
    var old = pending[item.ch.url], keep = {}, title = null;
    if (old) { old.ctl.cancel = true; keep = old.parts || {}; title = old.title; }
    delete pending[item.ch.url];
    return show(item.ch, item, keep, title);
  }
  // \ud398\uc774\uc9c0\ub97c '\uc9c4\uc9dc\ub85c' \uc5f4\uc5b4\uc11c(\uc228\uae34 \ucc3d) \uc790\ubc14\uc2a4\ud06c\ub9bd\ud2b8\uac00 \uadf8\ub9b0 \ub4a4\uc758 \ubaa8\uc2b5\uc744 \uac00\uc838\uc634
  // \uc6d0\ubcf8 HTML\uc5d0 \ubcf8\ubb38\uc774\ub098 \ub2e4\uc74c \ud654 \ubc84\ud2bc\uc774 \uc5c6\ub294 \uc0ac\uc774\ud2b8(\uc2a4\ud06c\ub9bd\ud2b8\ub85c \uadf8\ub9ac\ub294 \uc0ac\uc774\ud2b8)\uc6a9
  function getDocLive(url) {
    return new Promise(function (res, rej) {
      var f = document.createElement('iframe'), t0 = Date.now(), fin = false, lastHl = -1, lastCh = Date.now();
      f.__nvKeep = 1;
      f.setAttribute('sandbox', 'allow-scripts allow-same-origin');
      f.style.cssText = 'position:fixed;left:-10000px;top:0;width:420px;height:900px;border:0;visibility:hidden';
      function snap() {
        try { var d = f.contentDocument; try { visualOrder(findBody(d)); } catch (x) { } return d && d.documentElement ? new DOMParser().parseFromString(d.documentElement.outerHTML, 'text/html') : null; } catch (e) { return null; }
      }
      function end(d) { if (fin) return; fin = true; clearInterval(iv); setTimeout(function () { f.remove(); }, 50); d ? res(d) : rej(new Error('\ud398\uc774\uc9c0\ub97c \uc5f4\uc9c0 \ubabb\ud588\uc5b4\uc694')); }
      var iv = setInterval(function () {
        var d; try { d = f.contentDocument; } catch (e) { d = null; }
        var ready = d && d.readyState !== 'loading' && d.location && d.location.href !== 'about:blank';
        if (ready) {
          var ok = false;
          try {
            var b = findBody(d), hl = b ? hanLen(lines(b).join('')) : 0, el2 = Date.now() - t0, nx = hl ? findLink(d, url, 'next', linkCands(d, url)) : null;
            // \uc9e7\uc740 \ud654(\ud55c\ub450 \ubb38\uc7a5)\ub3c4 \ub108\ubb34 \uc624\ub798 \uae30\ub2e4\ub9ac\uc9c0 \uc54a\uac8c: \ub2e4 \ubd88\ub7ec\uc628 \ub4a4 \uc7a0\uae50\ub9cc \ub354 \ubcf4\uace0 \ub118\uc5b4\uac10
            if (hl !== lastHl) { lastHl = hl; lastCh = Date.now(); }
            var calm = Date.now() - lastCh; // \uae00\uc790 \uc218\uac00 \ud55c\ub3d9\uc548 \uadf8\ub300\ub85c\uba74 \ub2e4 \uadf8\ub824\uc9c4 \uac83
            ok = hl > 150 ? (nx || el2 > 3000) : hl >= 4 && d.readyState === 'complete' && calm > 2500 && (nx ? el2 > 5000 : el2 > 8000);
          } catch (e) { }
          if (ok) return end(snap());
        }
        if (Date.now() - t0 > 15000) end(ready ? snap() : null);
      }, 400);
      f.src = url;
      document.documentElement.appendChild(f);
    });
  }
  // \uc8fc\uc18c \uaddc\uce59\uc73c\ub85c \uc774\uc6c3 \ud654 \ucd94\uce21: 1\ud654\u21922\ud654 \uc8fc\uc18c\uc758 \uc22b\uc790 \ucc28\uc774\ub97c \uae30\uc5b5\ud574 \ub450\uc5c8\ub2e4\uac00 \ub2e4\uc74c\uc5d0 \uc801\uc6a9
  function urlTokens(u) { return String(u).split(/(\d+)/); }
  function recordPattern(a, b) {
    var A = urlTokens(a), B = urlTokens(b);
    if (A.length !== B.length) return;
    var diff = [];
    for (var i = 1; i < A.length; i += 2) if (A[i] !== B[i]) diff.push(i);
    for (i = 0; i < A.length; i += 2) if (A[i] !== B[i]) return; // \uc22b\uc790 \ub9d0\uace0 \ub2e4\ub978 \ubd80\ubd84\uc774 \ub2e4\ub974\uba74 \uaddc\uce59 \uc5c6\uc74c
    if (diff.length !== 1) return;
    var d = +B[diff[0]] - +A[diff[0]];
    if (d === 0 || Math.abs(d) > 1000) return;
    var P = gget('pat', {}) || {}; P[hostOf(a)] = { n: A.length, pos: A.length - diff[0], d: d }; gset('pat', P);
  }
  function guessUrl(u, kind) {
    var p = (gget('pat', {}) || {})[hostOf(u)]; if (!p) return null;
    var T = urlTokens(u); if (T.length !== p.n) return null;
    var i = T.length - p.pos, v = +T[i] + (kind === 'next' ? p.d : -p.d);
    if (!(i % 2) || v < 0) return null;
    var str = String(v); if (T[i].length > str.length && T[i][0] === '0') str = (Array(T[i].length + 1).join('0') + str).slice(-T[i].length);
    T[i] = str; return T.join('');
  }
  // \uac19\uc740 \ud654\uac00 \ub2e4\uc2dc \ub098\uc624\ub294\uc9c0 \ud655\uc778\uc6a9 \uc9c0\ubb38 (\uc8fc\uc18c\uac00 \ub2ec\ub77c\ub3c4 \ub0b4\uc6a9\uc774 \uac19\uc73c\uba74 \uac19\uc740 \ud654)
  function fpOf(lines) { return lines.length + ':' + lines.slice(0, 3).join('').slice(0, 120) + '|' + lines.slice(-2).join('').slice(-60); }
  function looksLikeList(lines) { // \ubaa9\ucc28\u00b7\uc791\ud488 \uc18c\uac1c \ud398\uc774\uc9c0\ub97c \ud654\ub85c \ucc29\uac01\ud558\uc9c0 \uc54a\uac8c
    if (lines.length < 8) return false;
    var n = lines.filter(function (l) { return l.length < 30 && /^\s*(\u7b2c\s*[\d\u4e00\u4e8c\u4e09\u56db\u4e94\u516d\u4e03\u516b\u4e5d\u5341\u767e\u5343\u96f6\u3007\u4e24]+\s*[\u7ae0\u56de\u8282\u7bc0\u8bdd\u8a71]|\d{1,4}([\.\u3001\s]|$))/.test(l); }).length;
    return n / lines.length > 0.5;
  }
  async function prefetch(url, limit, asNext) {
    if (asNext && chapters.some(function (c) { return ckey(c.ch.url) === ckey(url) || (c.ch.toc && ckey(c.ch.toc) === ckey(url)); }))
      return { err: new Error('\ub9c8\uc9c0\ub9c9 \ud654\uc778 \uac83 \uac19\uc544\uc694'), last: true }; // \ub2e4\uc74c \ud654 \ub9c1\ud06c\uac00 \uc9c0\uae08 \ud654\ub098 \ubaa9\ucc28\ub97c \uac00\ub9ac\ud0b4
    try {
      var ch = null, err = null;
      try { ch = chapterFull(await getDoc(url), url); } catch (e) { err = e; }
      // \uc6d0\ubcf8\uc5d0 \ubcf8\ubb38\uc774 \uc5c6\uac70\ub098 \ub2e4\uc74c \ud654 \ub9c1\ud06c\uac00 \uc5c6\uc73c\uba74, \uc9c4\uc9dc\ub85c \uc5f4\uc5b4\uc11c \ub2e4\uc2dc \ud655\uc778
      if (!ch || !ch.next || hanLen(ch.lines.join('')) < 200) {
        try {
          var ch2 = chapterFull(await getDocLive(url), url);
          if (!ch || hanLen(ch2.lines.join('')) >= hanLen(ch.lines.join(''))) ch = ch2;
          else { ch.next = ch.next || ch2.next; ch.prev = ch.prev || ch2.prev; ch.links = ch2.links.length > ch.links.length ? ch2.links : ch.links; ch.toc = ch.toc || ch2.toc; }
        } catch (e2) { if (!ch) throw err || e2; }
      }
      // \ud55c\ub450 \ubb38\uc7a5\ubfd0\uc778 \uc9e7\uc740 \ud654(\ub098\ub220\uc9c4 \ud398\uc774\uc9c0\uc758 \ub05d \ub4f1)\ub294 \uc815\uc0c1. \uc774\uc804/\ub2e4\uc74c \ud654 \ub9c1\ud06c\ub3c4 \uc5c6\uc774 \uae00\uc774 \uac70\uc758 \uc5c6\uc744 \ub54c\ub9cc \ub9c9\ud78c \ud398\uc774\uc9c0\ub85c \ubd04
      var hl = hanLen(ch.lines.join(''));
      if (hl < 4 || (hl < 30 && ch.lines.join('').length < 60 && !ch.next && !ch.prev)) {
        var ee = new Error('\ubcf8\ubb38\uc744 \ubd88\ub7ec\uc624\uc9c0 \ubabb\ud588\uc5b4\uc694. \uc0ac\uc774\ud2b8\uac00 \uc7a0\uc2dc \ub9c9\uc558\uac70\ub098 \uc778\uc99d \ud654\uba74\uc774 \ub5b4\uc744 \uc218 \uc788\uc5b4\uc694'); ee.empty = true; throw ee;
      }
      if (!ch.title) { // \uc81c\ubaa9\uc744 \ubabb \uc77d\uc5c8\uc73c\uba74: \ub2e4\uc74c \ud654\ub85c \ubd88\ub7ec\uc628 \uacbd\uc6b0 \uc55e \ud654 \ubc88\ud638 + 1
        var pv = asNext && chapters[chapters.length - 1], pn0 = pv ? chNum(pv.title || '') : null;
        ch.title = pn0 != null && pn0 >= 1 && pn0 % 1 === 0 ? '\u7b2c' + (pn0 + 1) + '\u7ae0' : '';
      }
      if (!ch.next) { var g = guessUrl(url, 'next'); if (g) { ch.next = g; ch.guessed = 1; } }
      if (!ch.prev) { var gp = guessUrl(url, 'prev'); if (gp) ch.prev = gp; }
      ch.fp = fpOf(ch.lines);
      if (asNext) { // \ub2e4\uc74c \ud654\ub85c \ubd88\ub7ec\uc628 \uacbd\uc6b0: \uc774\ubbf8 \ubcf8 \ud654\uc774\uac70\ub098 \ubaa9\ucc28 \ud398\uc774\uc9c0\uba74 '\ub9c8\uc9c0\ub9c9 \ud654'
        var dup = chapters.some(function (c) { return c.fp === ch.fp || ckey(c.ch.url) === ckey(ch.url) || (c.ch.toc && ckey(c.ch.toc) === ckey(ch.url)); });
        if (!siteNotice(ch.lines) && (dup || looksLikeList(ch.lines))) return { err: new Error('\ub9c8\uc9c0\ub9c9 \ud654\uc778 \uac83 \uac19\uc544\uc694'), last: true };
      }
      if (limit !== 0) startTranslate(ch, null, null, limit); return ch;
    }
    catch (e) { return { err: e }; }
  }
  // \uc81c\ubaa9 \uc55e\uc758 \ud654 \ubc88\ud638 \ubd80\ubd84(027 / \uc81c27\ud654 / \u7b2c\u4e8c\u5341\u4e03\u7ae0 / (2/2) \ub4f1)\uc744 \ub5bc\uace0 \uc18c\uc81c\ubaa9\ub9cc
  function stripNum(t) {
    return String(t || '').replace(/^\s*(\uc81c\s*)?\d+\s*(\ud654|\uc7a5|\ud68c|\ud3b8)?\s*/, '').replace(/^\s*\u7b2c\s*[\d\u96f6\u3007\u4e00\u4e8c\u4e09\u56db\u4e94\u516d\u4e03\u516b\u4e5d\u5341\u767e\u5343\u4e24]+\s*[\u7ae0\u56de\u8282\u7bc0\u8bdd\u8a71\u5377\u96c6\u7bc7]\s*/, '')
      .replace(/[(\uff08]\s*\d+\s*\/\s*\d+\s*[)\uff09]/, '').replace(/^\s*[:\uff1a.\-\u2014\u00b7\u3001]\s*/, '').replace(/^(\u958b\u59cb\u95b1\u8b80|\u5f00\u59cb\u9605\u8bfb)$/, '').trim();
  }
  function titleParts(t) {
    var m = String(t).match(/^\s*((?:\uc81c\s*)?[\d,]+\s*[\ud654\uc7a5\ud68c\ud3b8]|\u7b2c\s*[\d\u4e00\u4e8c\u4e09\u56db\u4e94\u516d\u4e03\u516b\u4e5d\u5341\u767e\u5343\u96f6\u3007\u4e24]+\s*[\u7ae0\u56de\u8282\u7bc0\u8bdd\u8a71])\s*[:\uff1a.\-\u2014]?\s*(.*)$/);
    return m && m[2] ? { label: m[1].replace(/\s+/g, ''), name: m[2] } : { label: '', name: t };
  }
  function setTitle(item, t) {
    item.title = t; var tp = titleParts(t);
    if (item.cont) { // \uac19\uc740 \ud654\uc758 \ub2e4\uc74c \ucabd: \ud070 \uc81c\ubaa9 \ub300\uc2e0 '\uc774\uc5b4\uc11c' \ud45c\uc2dc
      item.chl.textContent = (tp.label || tp.name) + ' \uc774\uc5b4\uc11c' + (item.ch.part ? ' (' + item.ch.part[0] + '/' + item.ch.part[1] + '\ucabd)' : '');
      item.chl.style.display = ''; item.cht.textContent = tp.name; item.cht.style.display = 'none'; return;
    }
    item.chl.textContent = tp.label; item.chl.style.display = tp.label ? '' : 'none'; item.cht.textContent = tp.name;
  }
  function show(ch, old, keep, keepTitle) {
    var sec = el('section'), chl = el('div', 'chl'), cht = el('h2', 'cht'), meta = el('div', 'meta');
    sec.appendChild(chl); sec.appendChild(cht); sec.appendChild(meta);
    var item = { ch: ch, sec: sec, chl: chl, cht: cht, meta: meta, title: ch.title, done: false, failed: false, nextP: null, chunks: makeChunks(ch), v: null, fp: ch.fp || fpOf(ch.lines) };
    var prevIt = old ? chapters[chapters.indexOf(old) - 1] : chapters[chapters.length - 1];
    item.cont = !!((ch.part && ch.part[0] > 1) || (prevIt && prevIt.ch.title && prevIt.ch.title === ch.title));
    if (item.cont) sec.classList.add('cpart');
    setTitle(item, ch.title);
    // \uc6d0\ubb38\uc744 \ub369\uc5b4\ub9ac\ubcc4\ub85c \ubbf8\ub9ac \uae54\uc544\ub460 (\uccab \ub369\uc5b4\ub9ac\uc758 \uccab \uc904\uc740 \uc81c\ubaa9\uc774\ub77c \uc81c\uc678)
    var grps = item.chunks.map(function (lines, ci) {
      var g = el('div', 'grp');
      (ci === 0 ? lines.slice(1) : lines).forEach(function (l) { g.appendChild(el('p', 'src', l)); });
      sec.appendChild(g); return g;
    });
    var oi = old ? chapters.indexOf(old) : -1;
    if (oi >= 0) { old.sec.replaceWith(sec); chapters[oi] = item; } else { wrap.appendChild(sec); chapters.push(item); }
    var notice = ch.lines.length ? siteNotice(ch.lines) : '';
    if (!ch.lines.length || notice) { // \ubcf8\ubb38 \uc5c6\uc74c / \uc0ac\uc774\ud2b8 \uc548\ub0b4\ubb38\ubfd0: \ubc88\uc5ed \ub300\uc2e0 \uc548\ub0b4
      meta.remove(); item.failed = true; item.empty = true;
      var er0 = el('div', 'er', notice ? '\uc0ac\uc774\ud2b8\uc5d0 \uc774 \ud654 \ubcf8\ubb38\uc774 \uc5c6\uc5b4\uc694. \uc0ac\uc774\ud2b8\uac00 \ub744\uc6b4 \uc548\ub0b4\ubb38: "' + notice.slice(0, 60) + '" (\uc774 \ud654 \ub0b4\uc6a9\uc774 \ube60\uc84c\uac70\ub098 \uc544\uc9c1 \ub4f1\ub85d\ub418\uc9c0 \uc54a\uc558\ub2e4\ub294 \ub73b\uc774\uc5d0\uc694. \uc0ac\uc774\ud2b8\uac00 \uace0\uce58\ub294 \uc911\uc77c \uc218 \uc788\uc5b4\uc694.)'
        : '\ubcf8\ubb38\uc744 \ubd88\ub7ec\uc624\uc9c0 \ubabb\ud588\uc5b4\uc694. \uc0ac\uc774\ud2b8\uac00 \uc7a0\uc2dc \ub9c9\uc558\uac70\ub098 \uc778\uc99d \ud654\uba74\uc774 \ub5b4\uc744 \uc218 \uc788\uc5b4\uc694.'); sec.appendChild(er0);
      var r0 = el('div', 'endrow');
      var b1 = el('button', 'btn pri', '\ub2e4\uc2dc \ubd88\ub7ec\uc624\uae30'); b1.dataset.act = 'refetch'; b1._item = item; r0.appendChild(b1);
      if (notice && ch.next) { var b3 = el('button', 'btn', '\uc774 \ud654 \uac74\ub108\ub6f0\uace0 \ub2e4\uc74c \ud654'); b3.dataset.act = 'skipNext'; b3._item = item; r0.appendChild(b3); }
      var b2 = el('button', 'btn', '\uc6d0\ubcf8 \ud398\uc774\uc9c0\ub85c \uc5f4\uae30'); b2.dataset.act = 'openReal'; b2.dataset.u = ch.url; r0.appendChild(b2);
      sec.appendChild(r0); updateTail();
      return Promise.resolve(item);
    }
    var P0 = pending[ch.url];
    if (P0 && P0.ctl.limit != null) { // \uc55e\ubd80\ubd84\ub9cc \ubbf8\ub9ac \ubc88\uc5ed\ud574 \ub454 \ud654: \ub098\uba38\uc9c0\ub3c4 \ubc88\uc5ed
      P0.ctl.limit = null;
      if (P0.finished) { delete pending[ch.url]; keep = keep || P0.parts; keepTitle = keepTitle || P0.title; }
    }
    var P = startTranslate(ch, keep, keepTitle), t0 = Date.now(), doneN = 0, total = grps.length, stuckShown = false;
    P.ctl.onStatus = function () { };
    item.P = P;
    meta.innerHTML = '<span class="dot"></span><span>\ubc88\uc5ed \uc911</span>';
    var tm = setInterval(function () {
      if (!meta.isConnected) { clearInterval(tm); return; }
      meta.children[1].textContent = '\ubc88\uc5ed \uc911 ' + doneN + '/' + total + ', ' + Math.round((Date.now() - t0) / 1000) + '\ucd08' + (P.ctl.status === '\uc751\ub2f5 \uae30\ub2e4\ub9ac\ub294 \uc911' ? (Date.now() - P.ctl.statusTs > 15000 ? ', \uad6c\uae00 \uc751\ub2f5 \uae30\ub2e4\ub9ac\ub294 \uc911 (' + Math.round((Date.now() - P.ctl.statusTs) / 1000) + '\ucd08\uc9f8)' : '') : P.ctl.status ? ', ' + P.ctl.status : '');
      // 45\ucd08 \ub118\uac8c \uc9c4\ud589\uc774 \uc5c6\uc73c\uba74 '\uc774\uc5b4\uc11c \ub2e4\uc2dc \uc2dc\ub3c4' \ubc84\ud2bc
      if (!stuckShown && Date.now() - Math.max(P.lastProg || 0, t0) > 45000) {
        stuckShown = true;
        var b = el('button', 'mini', '\uba48\ucd98 \uac83 \uac19\uc544\uc694. \uc774\uc5b4\uc11c \ub2e4\uc2dc \uc2dc\ub3c4'); b.dataset.act = 'resume'; b._item = item; b.style.marginLeft = '6px'; meta.appendChild(b);
      }
      // 3\ubd84 \ub118\uac8c \uc544\ubb34 \uc9c4\ud589\uc774 \uc5c6\uc73c\uba74 \uc54c\uc544\uc11c \uc774\uc5b4\uc11c \ub2e4\uc2dc \uc2dc\ub3c4 (\ud654\uba74\uc744 \ubcf4\uace0 \uc788\uc744 \ub54c, \ucd5c\ub300 2\ubc88)
      if (Date.now() - Math.max(P.lastProg || 0, t0) > 180000 && document.visibilityState === 'visible' && (item.autoR || 0) < 2) {
        clearInterval(tm); var n = (item.autoR || 0) + 1; toast('\ubc88\uc5ed\uc774 \uba48\ucdb0\uc11c \uc774\uc5b4\uc11c \ub2e4\uc2dc \uc2dc\ub3c4\ud560\uac8c\uc694');
        restartTranslate(item).then(null, function () { }); var ni = chapters.find(function (c) { return c.ch.url === item.ch.url; }); if (ni) ni.autoR = n;
      }
    }, 1000);
    var gi = {};
    function fillGroup(ci, ls, t) {
      setTitle(item, t);
      var whole = ci === -1;
      if (whole) { grps.forEach(function (g, k) { if (k) g.remove(); }); grps = [grps[0]]; ci = 0; }
      var g = grps[ci]; if (!g || gi[ci]) return; gi[ci] = 1; doneN = whole ? total : doneN + 1;
      g.innerHTML = '';
      ls.forEach(function (l, k) { var p = trP('tr', l); p.style.animationDelay = Math.min(k, 12) * 25 + 'ms'; p._grp = whole ? -1 : ci; g.appendChild(p); });
    }
    // \uae00\uc790\uac00 \uc624\ub294 \ub300\ub85c: \ubc88\uc5ed\ub41c \uc904\uc740 \ubc88\uc5ed\uc73c\ub85c, \uc544\uc9c1 \uc548 \uc628 \uc904\uc740 \uc6d0\ubb38 \uadf8\ub300\ub85c
    var pend0 = {}, praf = null;
    function partialGroup(ci, txt) {
      if (gi[ci] || !grps[ci]) return;
      pend0[ci] = txt;
      if (praf) return;
      praf = setTimeout(function () {
        praf = null;
        Object.keys(pend0).forEach(function (k) {
          var c = +k, tx = pend0[k], g = grps[c]; delete pend0[k];
          if (gi[c] || !g) return;
          var src = c === 0 ? item.chunks[0].slice(1) : item.chunks[c];
          if (tx == null) { g.innerHTML = ''; src.forEach(function (l) { g.appendChild(el('p', 'src', l)); }); return; }
          var ls = tx.split(/\n+/).map(function (x) { return x.trim(); }).filter(Boolean);
          ls = ls.filter(function (l) { return !NAMES_LINE.test(l); });
          ls = ls.filter(function (l) { var m = l.match(/^\[\uc81c\ubaa9\]\s*(.*)$/); if (m && c === 0 && m[1]) setTitle(item, m[1]); return !m; });
          g.innerHTML = '';
          ls.forEach(function (l) { g.appendChild(trP('tr live', l)); });
          src.slice(ls.length).forEach(function (l) { g.appendChild(el('p', 'src', l)); });
        });
      }, 250);
    }
    Object.keys(P.parts).forEach(function (ci) { fillGroup(+ci, P.parts[ci], P.title); });
    P.subs.push(fillGroup); P.psubs.push(partialGroup);
    updateTail();
    return P.done.then(function (v) {
      if (v && v.partial) { clearInterval(tm); return restartTranslate(item); } // \uc81c\ud55c\uc774 \ud480\ub9ac\uae30 \uc9c1\uc804\uc5d0 \ub05d\ub09c \uacbd\uc6b0
      clearInterval(tm); item.v = v; item.done = true; setTitle(item, v.title);
      var k = 0; [].forEach.call(sec.querySelectorAll('p.tr'), function (p) { p._idx = k++; });
      if (item.pendEd && v && v.lines) { // \ubc88\uc5ed \uc911\uc5d0 \uace0\uce5c \ubb38\ub2e8\uc744 \uc800\uc7a5\ubcf8\uc5d0\ub3c4
        var ch0 = false; item.pendEd.forEach(function (e) { if (e.p.isConnected && e.p._idx != null && v.lines[e.p._idx] != null) { v.lines[e.p._idx] = e.text; ch0 = true; } });
        item.pendEd = null; if (ch0) cachePut(ch.url, v, ch.id);
      }
      meta.remove();
      var row = el('div', 'endrow'), rt = el('button', 'mini'); rt.innerHTML = I.redo + '\uc774 \ud654 \ub2e4\uc2dc \ubc88\uc5ed'; rt.dataset.act = 'retrans'; rt._item = item;
      var fn = el('button', 'mini'); fn.innerHTML = I.user + '\uc778\ubb3c \uc774\ub984 \uad50\uc815'; fn.dataset.act = 'fixNames'; fn._item = item;
      row.appendChild(rt); row.appendChild(fn); sec.appendChild(row);
      if (ch.next && !ch.guessed) recordPattern(ch.url, ch.next);
      if (!ch.next) { var gn = guessUrl(ch.url, 'next'); if (gn) { ch.next = gn; ch.guessed = 1; } }
      if (ch.next) item.nextP = prefetch(ch.next, preLimit(), true);
      updateTail(); onScroll();
      return item;
    }, function (e) {
      clearInterval(tm);
      if (/\ucde8\uc18c\ub428/.test(e.message)) return item; // \uc0c8 \ubc88\uc5ed\uc73c\ub85c \ubc14\ub01c
      // \uc7a0\uae50\uc758 \ubb38\uc81c(\uc2dc\uac04 \ucd08\uacfc\u00b7\ub124\ud2b8\uc6cc\ud06c\u00b7\uad6c\uae00 \uc11c\ubc84 \uc624\ub958)\ub294 \ub05d\ub09c \ubd80\ubd84\uc744 \uc0b4\ub824 \ub450\uace0 \uc54c\uc544\uc11c \ub450 \ubc88\uae4c\uc9c0 \uc774\uc5b4\uc11c \ub2e4\uc2dc
      if (/\uc2dc\uac04 \ucd08\uacfc|\ub124\ud2b8\uc6cc\ud06c|\ucde8\uc18c\ub410\uc5b4\uc694|API (429|5\d\d)/.test(e.message) && (item.autoR || 0) < 2 && chapters.indexOf(item) >= 0) {
        var n2 = (item.autoR || 0) + 1; toast('\uc7a0\uae50 \ubb38\uc81c\uac00 \uc788\uc5b4 \uc774\uc5b4\uc11c \ub2e4\uc2dc \ubc88\uc5ed\ud560\uac8c\uc694');
        var pr = restartTranslate(item); var ni2 = chapters.find(function (c) { return c.ch.url === item.ch.url; }); if (ni2) ni2.autoR = n2;
        return pr;
      }
      item.failed = true; meta.textContent = '';
      var diag = /\ube44\uc5b4 \uc788\uc5b4\uc694/.test(e.message) ? ' (\ucc3e\uc740 \uc6d0\ubb38 ' + ch.lines.length + '\uc904: "' + ch.lines.join(' ').slice(0, 40) + '\u2026")' : '';
      var er = el('div', 'er', '\ubc88\uc5ed \uc2e4\ud328: ' + e.message + diag); sec.insertBefore(er, sec.querySelector('.grp'));
      var row = el('div', 'endrow');
      var rb = el('button', 'btn pri', '\ub2e4\uc2dc \uc2dc\ub3c4'); rb.dataset.act = 'retry'; rb._item = item; row.appendChild(rb);
      if (/\uc124\uc815|\ud1a0\ud070|API 40[134]/.test(e.message)) { var sb = el('button', 'btn', '\ubc88\uc5ed \uc124\uc815 \uc5f4\uae30'); sb.dataset.act = 'api'; row.appendChild(sb); }
      else if (/\ube44\uc5b4 \uc788\uc5b4\uc694/.test(e.message)) { var ob = el('button', 'btn', '\uc6d0\ubcf8 \ud398\uc774\uc9c0\ub85c \uc5f4\uae30'); ob.dataset.act = 'openReal'; ob.dataset.u = ch.url; row.appendChild(ob); }
      sec.insertBefore(row, er.nextSibling);
      updateTail();
      return item;
    });
  }
  function lastItem() { return chapters[chapters.length - 1]; }
  function updateTail() {
    var L = lastItem(); tail.innerHTML = '';
    if (!L || !L.done) return;
    if (!L.ch.next) {
      tail.appendChild(el('div', null, '\ub2e4\uc74c \ud654 \ub9c1\ud06c\ub97c \uc790\ub3d9\uc73c\ub85c \ucc3e\uc9c0 \ubabb\ud588\uc5b4\uc694.'));
      var pb = el('button', 'btn pri', '\ub2e4\uc74c \ud654 \ub9c1\ud06c \uace0\ub974\uae30'); pb.dataset.act = 'pick'; pb.dataset.k = 'next'; tail.appendChild(pb); return;
    }
    if (appending) { tail.appendChild(el('div', 'spin', '\ub2e4\uc74c \ud654 \ubd88\ub7ec\uc624\ub294 \uc911')); return; }
    if (L.isLast) {
      tail.appendChild(el('div', null, '\ub9c8\uc9c0\ub9c9 \ud654\uae4c\uc9c0 \uc77d\uc5c8\uc5b4\uc694.'));
      var rc = el('button', 'btn', '\uc0c8 \ud654\uac00 \uc788\ub294\uc9c0 \ub2e4\uc2dc \ud655\uc778'); rc.dataset.act = 'nextRetry'; tail.appendChild(rc); return;
    }
    if (L.nextErr) {
      tail.appendChild(el('div', 'er', '\ub2e4\uc74c \ud654\ub97c \ubd88\ub7ec\uc624\uc9c0 \ubabb\ud588\uc5b4\uc694: ' + L.nextErr));
      var b = el('button', 'btn pri', '\ub2e4\uc2dc \uc2dc\ub3c4'); b.dataset.act = 'nextRetry'; tail.appendChild(b);
      var bo = el('button', 'btn', '\uc6d0\ubcf8 \ud398\uc774\uc9c0\ub85c \uc5f4\uae30'); bo.dataset.act = 'openReal'; bo.dataset.u = L.ch.next; bo.style.marginLeft = '8px'; tail.appendChild(bo); return;
    }
    var nb = el('button', 'btn pri'); nb.innerHTML = '\ub2e4\uc74c \ud654 \uc774\uc5b4\uc11c \uc77d\uae30' + I.next; nb.dataset.act = 'next'; tail.appendChild(nb);
  }
  async function appendNext() {
    var L = lastItem();
    if (!L || !(L.done || L.skipped) || appending || !L.ch.next) return null;
    appending = true; L.nextErr = null; updateTail();
    if (!L.nextP) L.nextP = prefetch(L.ch.next, null, true);
    var g0 = viewGen, nch = await L.nextP;
    if (g0 !== viewGen) return null; // \uadf8\uc0ac\uc774 \ub2e4\ub978 \ud654(\uc11c\uc7ac\u00b7\ubaa9\ucc28)\ub85c \ubc14\ub01c
    appending = false;
    if (nch.err) {
      if (nch.last) { L.isLast = true; L.nextP = null; updateTail(); toast('\ub9c8\uc9c0\ub9c9 \ud654\uae4c\uc9c0 \uc77d\uc5c8\uc5b4\uc694'); return null; }
      if (L.ch.guessed) { L.ch.next = null; L.ch.guessed = 0; L.nextP = null; updateTail(); return null; }
      L.nextErr = nch.err.message; L.nextP = null; updateTail(); return null;
    }
    if (chapters.some(function (c) { return c.ch.url === nch.url; })) { L.ch.next = null; updateTail(); toast('\ub2e4\uc74c \ud654 \ub9c1\ud06c\uac00 \uc774\ubbf8 \uc77d\uc740 \ud654\ub97c \uac00\ub9ac\ucf1c\uc694'); return null; }
    wrap.appendChild(el('div', 'sep', '\uff0a\u3000\uff0a\u3000\uff0a'));
    show(nch);
    return lastItem();
  }
  var progScroll = 0;
  function scrollToItem(it) { progScroll = Date.now(); sc.scrollTo({ top: Math.max(0, it.sec.offsetTop - 30), behavior: 'smooth' }); }
  function curIndex() {
    var y = sc.scrollTop + sc.clientHeight * 0.3, idx = 0;
    for (var i = 0; i < chapters.length; i++) { if (chapters[i].sec.offsetTop <= y) idx = i; }
    return idx;
  }
  // \ud654 \ud558\ub098\ub9cc \uc0c8\ub85c \uc5f4\uae30 (\uc11c\uc7ac \u00b7 \ubaa9\ucc28 \u00b7 \uc774\uc804 \ud654\uc5d0\uc11c)
  var viewGen = 0;
  async function openChapter(url, from, para) {
    var g0 = ++viewGen; appending = false;
    closePage(); closeSheet(); setUI(false);
    wrap.innerHTML = ''; chapters = []; tail.innerHTML = '<div class="spin">\ubd88\ub7ec\uc624\ub294 \uc911</div>'; sc.scrollTop = 0; curShown = -1;
    var ch = await prefetch(url);
    if (g0 !== viewGen) return; // \ub354 \ub098\uc911\uc5d0 \uc5f0 \ud654\uac00 \uc788\uc74c
    if (ch.err) { tail.innerHTML = ''; tail.appendChild(el('div', 'er', '\ubd88\ub7ec\uc624\uc9c0 \ubabb\ud588\uc5b4\uc694: ' + ch.err.message)); var b = el('button', 'btn pri', '\ub2e4\uc2dc \uc2dc\ub3c4'); b.dataset.act = 'open'; b.dataset.u = url; tail.appendChild(b); return; }
    show(ch).then(function (it) { if (it && it.done && from === 'lib') restorePos(it); if (it && para != null) goPara(it, para); });
  }

  // ===================== \uc11c\uc7ac =====================
  function libAll() {
    var L = gget('lib', {}) || {};
    if (!L.__v2) { // \uc608\uc804 \uc11c\uc7ac: \uc8fc\uc18c \ud3f4\ub354\ub85c\ub9cc \uad6c\ubd84\ud574\uc11c \ub2e4\ub978 \uc791\ud488\uc774 \ud55c\ub370 \uc11e\uc600\uc74c \u2192 \uc791\ud488 \uc774\ub984 \uae30\uc900\uc73c\ub85c \ub2e4\uc2dc \uc815\ub9ac
      var N = { __v2: 1 };
      Object.keys(L).forEach(function (k) {
        var w = L[k]; if (!w || !w.last) return;
        if (!w.book || SITENAME.test(w.book)) { gset('libRestore', 1); return; } // \uc0ac\uc774\ud2b8 \uc774\ub984\uc73c\ub85c \uc798\ubabb \ubb36\uc778 \ud56d\ubaa9\uc740 \ubc84\ub9ac\uace0, \ubc88\uc5ed \uae30\ub85d\uc5d0\uc11c \ub2e4\uc2dc \ub9cc\ub4e6
        var id = workKey(w.last.url, w.book, w.toc); w.id = id;
        if (!N[id] || N[id].ts < w.ts) N[id] = w;
      });
      gset('lib', N); L = N;
    }
    return L;
  }
  // \ud45c\uc9c0: \uc791\ud488\ub9c8\ub2e4 \ub3c4\ud615 \ud558\ub098 + \ucc28\ubd84\ud55c \ub124 \uac00\uc9c0 \uc0c9 (\ubc30\uacbd\uc740 \ubaa8\ub450 \uac19\uc740 \uacc4\uc5f4, \ub3c4\ud615 \uc0c9\ub9cc \uc0b4\uc9dd \ube44\uce68)
  var COV_C = ['#8fc1da', '#9fc39a', '#b9acd9', '#e3c87f']; // \ud558\ub298 \u00b7 \uc5f0\ub450 \u00b7 \uc5f0\ubcf4\ub77c \u00b7 \uc5f0\ub178\ub791
  var COV_S = [
    'M22 82V48a28 28 0 0 1 56 0v34H62V48a12 12 0 0 0-24 0v34z', // \uc544\uce58
    'M50 8C53 38 62 47 92 50C62 53 53 62 50 92C47 62 38 53 8 50C38 47 47 38 50 8z', // \uac00\ub294 \ubc18\uc9dd\uc774
    'M50 10Q56 44 90 50Q56 56 50 90Q44 56 10 50Q44 44 50 10z', // \ubcc4
    'M50 16L88 82H12z', // \uc138\ubaa8
    'M50 10C50 10 22 44 22 62a28 28 0 0 0 56 0C78 44 50 10 50 10z', // \ubb3c\ubc29\uc6b8
    'M50 84C14 60 10 40 18 28c9-13 26-12 32 2c6-14 23-15 32-2c8 12 4 32-32 56z', // \ud558\ud2b8
    'M50.0 12.0L58.2 34.9L81.3 27.1L68.5 47.8L89.0 60.9L64.9 63.8L67.4 88.0L50.0 71.0L32.6 88.0L35.1 63.8L11.0 60.9L31.5 47.8L18.7 27.1L41.8 34.9Z', // \uc77c\uacf1 \uac08\ub798 \ubcc4
    'M14 50a36 16 0 1 0 72 0a36 16 0 1 0-72 0z', // \ub0a9\uc791\ud55c \ud0c0\uc6d0
    'M24 50a26 34 0 1 0 52 0a26 34 0 1 0-52 0z' // \ub2ec\uac40
  ];
  function coverHash(s) { var h = 2166136261; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } h ^= h >>> 15; h = Math.imul(h, 2246822507) >>> 0; h ^= h >>> 13; return h >>> 0; }
  function coverColor(s) { var c = COV_C[Math.floor(coverHash(s) / 9) % COV_C.length]; return 'color-mix(in srgb, ' + c + ' 13%, var(--card))'; }
  // \uc791\ud488\ub9c8\ub2e4 \ucc28\ub840 \ubc88\ud638\ub97c \ud55c \ubc88 \uc815\ud574 \uc800\uc7a5: \uc774\uc6c3\ud55c \uc791\ud488\ub07c\ub9ac \ub3c4\ud615\u00b7\uc0c9\uc774 \uacb9\uce58\uc9c0 \uc54a\uac8c (\ub3c4\ud615 9\uac00\uc9c0, \uc0c9 4\uac00\uc9c0\ub97c \ubc88\uac08\uc544)
  function coverNo(id) {
    var L = libAll(), w = L[id];
    if (!w) return coverHash(id);
    if (typeof w.cov === 'number') return w.cov;
    var n = gget('covN', 0) || 0;
    if (!n) { // \ucc98\uc74c: \uc774\ubbf8 \uc788\ub294 \uc791\ud488\ub4e4\uc5d0 \uc624\ub798\ub41c \uc21c\uc11c\ub300\ub85c \ubc88\ud638\ub97c \ub9e4\uae40
      Object.keys(L).filter(function (k) { return k !== '__v2' && L[k] && typeof L[k].cov !== 'number'; })
        .sort(function (a, b) { return (L[a].ts || 0) - (L[b].ts || 0); }).forEach(function (k) { L[k].cov = n++; });
    } else w.cov = n++;
    gset('lib', L); gset('covN', n);
    return L[id].cov;
  }
  function coverHtml(id, style) {
    var n = coverNo(id), c = COV_C[(n + Math.floor(n / 9)) % COV_C.length], d = COV_S[(n * 4) % COV_S.length];
    return '<div class="cover" style="background:color-mix(in srgb, ' + c + ' 13%, var(--card))' + (style ? ';' + style : '') + '"><svg viewBox="0 0 100 100" aria-hidden="true"><path d="' + d + '" fill="' + c + '" stroke="' + c + '" stroke-width="4" stroke-linejoin="round"/></svg></div>';
  }
  function bookName(w) { return w.bookKo || w.book || '\uc774\ub984 \uc5c6\ub294 \uc791\ud488'; }
  var libTitleBusy = {};
  function libTouch(it) {
    var ch = it.ch, L = libAll(), w = L[ch.id] || { id: ch.id, read: {} };
    if (ch.book && !SITENAME.test(ch.book)) w.book = ch.book; else w.book = w.book || ''; w.toc = ch.toc || w.toc; w.ts = Date.now();
    w.last = { url: ch.url, title: it.title }; w.read = w.read || {}; w.read[ckey(ch.url)] = 1;
    L[ch.id] = w; gset('lib', L);
    topB.textContent = bookName(w); topS.textContent = it.title;
    if (!w.bookKo && w.book && !libTitleBusy[ch.id] && cfg()) { // \uc791\ud488 \uc81c\ubaa9\uc744 \ud55c \ubc88\ub9cc \ubc88\uc5ed\ud574 \ub460
      libTitleBusy[ch.id] = 1;
      callApi('[\uc81c\ubaa9] ' + w.book).then(function (o) {
        var t = splitTitle(o.split(/\n+/), '').title || o.split(/\n+/)[0];
        var L2 = libAll(); if (L2[ch.id]) { L2[ch.id].bookKo = t.trim(); gset('lib', L2); topB.textContent = t.trim(); }
      }).catch(function () { });
    }
  }
  function relTime(ts) {
    var d = (Date.now() - ts) / 1000;
    if (d < 60) return '\ubc29\uae08'; if (d < 3600) return Math.floor(d / 60) + '\ubd84 \uc804'; if (d < 86400) return Math.floor(d / 3600) + '\uc2dc\uac04 \uc804';
    if (d < 86400 * 30) return Math.floor(d / 86400) + '\uc77c \uc804'; return new Date(ts).toLocaleDateString();
  }
  // \ubc88\uc5ed \uae30\ub85d(\uc800\uc7a5\ub41c \ud654 \ubaa9\ub85d)\uc5d0\uc11c \ud654\ub9c8\ub2e4 \uc6d0\ubcf8 \ud398\uc774\uc9c0\ub97c \ub2e4\uc2dc \uc77d\uc5b4 \uc791\ud488\ubcc4\ub85c \uc11c\uc7ac\ub97c \ub2e4\uc2dc \ub9cc\ub4e6
  var restoring = false;
  async function restoreLib(manual) {
    if (restoring) return; restoring = true;
    var I = cIndex(), urls = Object.keys(I).sort(function (a, b) { return I[b].ts - I[a].ts; }).slice(0, 120), done = 0, added = 0;
    if (manual) toast('\ubc88\uc5ed \uae30\ub85d\uc5d0\uc11c \uc11c\uc7ac\ub97c \ub2e4\uc2dc \ub9cc\ub4dc\ub294 \uc911');
    var q = urls.slice();
    async function worker() {
      while (q.length) {
        var u = q.shift();
        try {
          var ch = chapterFull(await getDoc(u), u), L = libAll(), w = L[ch.id];
          if (!w) { w = L[ch.id] = { id: ch.id, read: {}, ts: 0 }; added++; }
          if (ch.book && !SITENAME.test(ch.book)) w.book = w.book || ch.book;
          w.toc = w.toc || ch.toc; w.read = w.read || {}; w.read[ckey(u)] = 1;
          if (!w.last || I[u].ts > w.ts) { w.last = { url: u, title: I[u].t || ch.title }; w.ts = I[u].ts; }
          gset('lib', L);
        } catch (e) { }
        done++;
        if (pageMode === 'lib' && app.classList.contains('page') && done % 10 === 0) renderLibBody();
      }
    }
    await Promise.all([worker(), worker(), worker()]);
    // \uc791\ud488 \uc774\ub984\uc744 \ud55c\uad6d\uc5b4\ub85c (\uc544\uc9c1 \uc5c6\ub294 \uac83\ub9cc)
    var LL = libAll();
    for (var k in LL) {
      var w = LL[k]; if (k === '__v2' || !w || w.bookKo || !w.book || !cfg()) continue;
      try { var o = await callApi('[\uc81c\ubaa9] ' + w.book); var L2 = libAll(); if (L2[k]) { L2[k].bookKo = (splitTitle(o.split(/\n+/), '').title || o.split(/\n+/)[0]).trim(); gset('lib', L2); } } catch (e) { }
    }
    gdel('libRestore'); restoring = false;
    if (pageMode === 'lib' && app.classList.contains('page')) renderLibBody();
    if (manual || added) toast('\uc11c\uc7ac\ub97c \ub2e4\uc2dc \ub9cc\ub4e4\uc5c8\uc5b4\uc694 (\uc791\ud488 ' + (Object.keys(libAll()).length - 1) + '\uac1c)');
  }
  // ===================== \uc791\ud488\ubcc4 TXT \uc800\uc7a5 =====================
  function saveFile(name, text) {
    var blob = new Blob(['\ufeff' + text], { type: 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; a.style.display = 'none';
    a.__nvKeep = 1; document.documentElement.appendChild(a); a.click();
    setTimeout(function () { a.remove(); URL.revokeObjectURL(url); }, 10000);
  }
  async function exportWork(wid) {
    var w = libAll()[wid] || {}, I = cIndex(), keys = [], seen = {};
    toast('\ubc88\uc5ed\ub41c \ud654\ub97c \ubaa8\uc73c\ub294 \uc911');
    // \u2460 \ubaa9\ucc28 \uc21c\uc11c\ub300\ub85c \u2461 \ubaa9\ucc28\uc5d0 \uc5c6\ub294(\ub610\ub294 \ubaa9\ucc28\ub97c \ubabb \ucc3e\uc740) \ud654\ub294 \ud654 \ubc88\ud638 \uc21c\uc73c\ub85c \ub4a4\uc5d0
    if (w.toc) {
      var list = tocMem[w.toc];
      if (!list) { try { list = await loadToc(w.toc, (w.last && w.last.url) || w.toc); tocMem[w.toc] = list; } catch (e) { list = []; } }
      list.forEach(function (c) { var k = ckey(c.u); if (I[k] && !seen[k]) { keys.push(k); seen[k] = 1; } });
    }
    var read = w.read || {};
    var extra = Object.keys(I).filter(function (k) { return !seen[k] && (I[k].w === wid || read[k]); })
      .sort(function (a, b) { return ((chNum(I[a].t) || 0) - (chNum(I[b].t) || 0)) || (I[a].ts - I[b].ts); });
    keys = keys.concat(extra);
    if (!keys.length) { toast('\uc774 \uc791\ud488\uc740 \uc800\uc7a5\ub41c \ubc88\uc5ed\uc774 \uc5c6\uc5b4\uc694'); return; }
    var name = bookName(w), out = [name];
    if (w.book && w.book !== name) out.push(w.book);
    out.push('\ubc88\uc5ed\ub41c ' + keys.length + '\ud654 (' + new Date().toLocaleDateString() + ')', '');
    keys.forEach(function (k) {
      var v = cread(k); if (!v || !v.lines) return;
      out.push('', '\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501', v.title, '', v.lines.join('\n\n'), '');
    });
    saveFile(name.replace(/[\\\/:*?"<>|]+/g, '_').slice(0, 60) + '.txt', out.join('\n'));
    toast(keys.length + '\ud654\ub97c TXT\ub85c \uc800\uc7a5\ud588\uc5b4\uc694');
  }
  var pageMode = '';
  function openPage(mode, title) { pageMode = mode; pgT.textContent = title; pg.classList.remove('edit'); edBtn.style.display = mode === 'lib' ? 'none' : ''; edBtn.textContent = 'TXT \uc800\uc7a5'; edBtn.dataset.act = 'exportCur'; dropLayer('ui'); dropLayer('sheet'); app.classList.add('page'); pushLayer('page'); }
  function closePage() { dropLayer('page'); }
  function renderLib() { openPage('lib', '\ub0b4 \uc11c\uc7ac'); renderLibBody(); }
  // \ud0dc\uadf8: \uc791\ud488 \uc81c\ubaa9 \uc544\ub798 \uc791\uc740 \ud0c0\uc6d0. \uc0c9\uc740 \ud45c\uc9c0\uc640 \uac19\uc740 \ub124 \uac00\uc9c0 \uc911 \ud0dc\uadf8 \uae00\uc790\ub85c \uc815\ud574\uc9d0
  function tagHtml(t, del, id) {
    var c = COV_C[coverHash('tag:' + t) % COV_C.length];
    return '<span class="tag" style="background:color-mix(in srgb, ' + c + ' 22%, var(--card));color:color-mix(in srgb, ' + c + ' 40%, var(--fg))"' +
      (del ? ' data-act="tagDel" data-id="' + esc(id) + '" data-tag="' + esc(t) + '"' : '') + '>' + esc(t) + (del ? '<b>\u00d7</b>' : '') + '</span>';
  }
  var libTag = null;
  function tileHtml(w) {
    return '<button class="tile" data-act="open" data-id="' + esc(w.id) + '" data-u="' + esc(w.last.url) + '">' + coverHtml(w.id) +
      '<b>' + esc(bookName(w)) + '</b>' + tagsHtml(w) + '<span>' + esc(w.last.title) + '</span><span>' + relTime(w.ts) + '</span></button>';
  }
  function tagsHtml(w) { return w.tags && w.tags.length ? '<div class="tags">' + w.tags.map(function (t) { return tagHtml(t); }).join('') + '</div>' : ''; }
  // \ud45c\uc9c0\ub97c \uae38\uac8c \ub204\ub974\uba74: TXT \uc800\uc7a5 \u00b7 \ud0dc\uadf8 \u00b7 \uc11c\uc7ac\uc5d0\uc11c \uc9c0\uc6b0\uae30
  var workId0 = null;
  function openWork(id) {
    var w = libAll()[id]; if (!w) return;
    workId0 = id; pn.dataset.mode = 'work'; gset('lpSeen', 1);
    var h = '<div class="grab"></div><div class="hd wk">' + coverHtml(id, 'width:44px') + '<h3 class="wt"><span>' + esc(bookName(w)) + '</span><button class="pen" data-act="workRenameEdit" aria-label="\uc774\ub984 \uace0\uce58\uae30">' + I.pen + '</button></h3><button class="x" data-act="close" aria-label="\ub2eb\uae30">' + I.x + '</button></div>' +
      '<div class="tagbox">' + ((w.tags || []).map(function (t) { return tagHtml(t, true, id); }).join('') || '<span class="hint" style="margin:0">\ud0dc\uadf8\uac00 \uc5c6\uc5b4\uc694</span>') + '</div>' +
      '<div class="urlrow"><input class="url tagin" type="text" maxlength="12" placeholder="\ud0dc\uadf8 \uc774\ub984 (\uc608: \uc644\uacb0, \ud68c\uadc0, \uc7ac\ubc0c\uc74c)"><button class="go" data-act="tagAdd" data-id="' + esc(id) + '">\ucd94\uac00</button></div>' +
      '<button class="wide" data-act="namesOpen" data-id="' + esc(id) + '">' + I.user + '\uc778\ubb3c \uc774\ub984 ' + Object.keys(w.names || {}).length + '\uac1c</button>' +
      '<button class="wide" data-act="export" data-id="' + esc(id) + '">' + I.dl + '\ubc88\uc5ed\ub41c \ud654 TXT\ub85c \uc800\uc7a5</button>' +
      '<button class="wide danger" data-act="libDelAsk" data-id="' + esc(id) + '">' + I.x + '\uc11c\uc7ac\uc5d0\uc11c \uc9c0\uc6b0\uae30 (\ubc88\uc5ed\ub3c4 \ud568\uaed8)</button>';
    pn.innerHTML = h; pn.scrollTop = 0; showSheet();
  }
  // \uc791\ud488 \uc774\ub984 \ubc14\uafb8\uae30: \ube44\uc6b0\uace0 \ubc14\uafb8\uba74 \uc6d0\ub798 \uc81c\ubaa9\uc744 \ub2e4\uc2dc \ubc88\uc5ed\ud574\uc11c \uc500
  function renameWork(id, inp) {
    var v = (inp && inp.value || '').replace(/\s+/g, ' ').trim().slice(0, 60);
    var L = libAll(), w = L[id]; if (!w) return;
    if (v) w.bookKo = v; else delete w.bookKo;
    gset('lib', L); renderLibBody(); openWork(id);
    var cur = chapters[curIndex()] || lastItem(); if (cur && cur.ch.id === id && v) topB.textContent = v;
    toast(v ? '\uc774\ub984\uc744 \ubc14\uafe8\uc5b4\uc694' : '\uc6d0\ub798 \uc81c\ubaa9\uc744 \ub2e4\uc2dc \ubc88\uc5ed\ud574\uc11c \uc4f8\uac8c\uc694');
  }
  function addTag(id, inp) {
    var v = (inp && inp.value || '').replace(/\s+/g, ' ').trim().slice(0, 12); if (!v) { inp && inp.focus(); return; }
    var L = libAll(), w = L[id]; if (!w) return;
    w.tags = w.tags || []; if (w.tags.indexOf(v) < 0) w.tags.push(v);
    gset('lib', L); renderLibBody(); openWork(id);
  }
  function renderLibBody() {
    var LA = libAll(), ws = Object.keys(LA).filter(function (k) { return k !== '__v2' && LA[k] && LA[k].last; }).map(function (k) { return LA[k]; }).sort(function (a, b) { return b.ts - a.ts; });
    if (!ws.length) { pgB.innerHTML = '<div class="empty">\uc544\uc9c1 \uc77d\uc740 \uc791\ud488\uc774 \uc5c6\uc5b4\uc694.<br>\uc18c\uc124 \ud398\uc774\uc9c0\uc5d0\uc11c \ubc88\uc5ed \ubc84\ud2bc\uc744 \ub204\ub974\uba74 \uc5ec\uae30\uc5d0 \uc313\uc5ec\uc694.</div><button class="btn" style="display:flex;margin:0 auto" data-act="libRestore">\ubc88\uc5ed \uae30\ub85d\uc5d0\uc11c \uc11c\uc7ac \ub2e4\uc2dc \ub9cc\ub4e4\uae30</button>'; return; }
    // \ud0dc\uadf8\ub85c \uace8\ub77c \ubcf4\uae30: \uc11c\uc7ac \uc704 \uce69 (\ud0dc\uadf8\uac00 \ud558\ub098\ub77c\ub3c4 \uc788\uc744 \ub54c\ub9cc)
    var cnt = {}; ws.forEach(function (w) { (w.tags || []).forEach(function (t) { cnt[t] = (cnt[t] || 0) + 1; }); });
    var tl = Object.keys(cnt).sort(function (a, b) { return cnt[b] - cnt[a] || a.localeCompare(b); });
    if (libTag && !cnt[libTag]) libTag = null;
    var h = '';
    if (tl.length) h += '<div class="tagbar"><button class="chip' + (libTag ? '' : ' on') + '" data-act="libTag" data-tag="">\uc804\uccb4</button>' +
      tl.map(function (t) { var c = COV_C[coverHash('tag:' + t) % COV_C.length]; return '<button class="chip' + (libTag === t ? ' on' : '') + '" style="--tc:' + c + '" data-act="libTag" data-tag="' + esc(t) + '">' + esc(t) + '<small>' + cnt[t] + '</small></button>'; }).join('') + '</div>';
    if (libTag) {
      h += '<div class="grid">' + ws.filter(function (w) { return (w.tags || []).indexOf(libTag) >= 0; }).map(tileHtml).join('') + '</div>';
      pgB.innerHTML = h; return;
    }
    var w0 = ws[0];
    if (!gget('lpSeen', 0)) h += '<p class="lphint">\ud45c\uc9c0\ub97c \uae38\uac8c \ub204\ub974\uba74 TXT \uc800\uc7a5, \ud0dc\uadf8, \uc9c0\uc6b0\uae30\ub97c \ud560 \uc218 \uc788\uc5b4\uc694</p>';
    h += '<button class="cont" data-act="open" data-id="' + esc(w0.id) + '" data-u="' + esc(w0.last.url) + '">' + coverHtml(w0.id) +
      '<div class="ci"><small>\uc774\uc5b4 \uc77d\uae30</small><b>' + esc(bookName(w0)) + '</b><span>' + esc(w0.last.title) + ' (' + relTime(w0.ts) + ')' + '</span>' + tagsHtml(w0) + '</div>' + I.next + '</button>';
    if (ws.length > 1) {
      h += '<div class="grid">';
      ws.slice(1).forEach(function (w) { h += tileHtml(w); });
      h += '</div>';
    }
    h += '<button class="btn" style="display:flex;margin:34px auto 0;font-size:13px;min-height:44px;color:var(--mut)" data-act="libRestore">\ubc88\uc5ed \uae30\ub85d\uc5d0\uc11c \uc11c\uc7ac \ub2e4\uc2dc \ub9cc\ub4e4\uae30</button>';
    pgB.innerHTML = h; pgB.scrollTop = 0;
  }

  // ===================== \ubaa9\ucc28 =====================
  var tocMem = {}, tocNoSub = [];
  // \uc608\uc804\uc5d0 \ubc88\ud638\ub9cc\uc73c\ub85c \uc800\uc7a5\ub41c \ud654 \uc81c\ubaa9: \uc6d0\ubcf8 \ud398\uc774\uc9c0\ub97c \ub2e4\uc2dc \uc77d\uc5b4 \uc18c\uc81c\ubaa9\uc744 \ucc3e\uace0, \ucc3e\uc740 \uac83\ub9cc \ud55c \ubc88\uc5d0 \ubc88\uc5ed\ud574 \ucc44\uc6c0
  async function findSubtitles() {
    var list = tocNoSub.slice(0, 80), found = [], done = 0;
    if (!list.length) return;
    toast('\uc6d0\ubcf8 \ud398\uc774\uc9c0\uc5d0\uc11c \uc18c\uc81c\ubaa9\uc744 \ucc3e\ub294 \uc911 (0/' + list.length + ')');
    async function one(u) {
      try {
        var d = await getDoc(u), t = titleOf(d), bd = findBody(d);
        var t0 = t; if (bd) t = liftFor(u, t, lines(bd)).t;
        var sub = stripNum(t);
        if (sub && hanLen(sub) > 0) found.push({ u: u, t: t.replace(/\s+/g, ' ').trim(), body: t !== t0 });
      } catch (e) { }
      done++; if (done % 5 === 0) toast('\uc6d0\ubcf8 \ud398\uc774\uc9c0\uc5d0\uc11c \uc18c\uc81c\ubaa9\uc744 \ucc3e\ub294 \uc911 (' + done + '/' + list.length + ')');
    }
    for (var i = 0; i < list.length; i += 4) await Promise.all(list.slice(i, i + 4).map(one));
    // \uc5ec\ub7ec \ud654\uc5d0 \ub611\uac19\uc774 \ubd99\uc740 \uae00\uc740 \uc18c\uc81c\ubaa9\uc774 \uc544\ub2c8\ub77c \uc0ac\uc774\ud2b8 \ubb38\uad6c(\uc791\ud488\uba85\u00b7\uba54\ub274 \ub4f1)\ub77c \ubc84\ub9bc
    var cnt = {}; found.forEach(function (f) { var k = stripNum(f.t); cnt[k] = (cnt[k] || 0) + 1; });
    found = found.filter(function (f) { return cnt[stripNum(f.t)] === 1 || found.length === 1; });
    if (!found.length) { toast('\uc6d0\ubcf8 \ud398\uc774\uc9c0\uc5d0\ub3c4 \uc18c\uc81c\ubaa9\uc774 \uc5c6\uc5b4\uc694 (' + list.length + '\uac1c \ud655\uc778)'); return; }
    toast('\uc18c\uc81c\ubaa9 ' + found.length + '\uac1c\ub97c \ubc88\uc5ed\ud558\ub294 \uc911');
    try {
      var it = chapters[curIndex()] || lastItem(), C = cfg() || {};
      var sys = '\ub108\ub294 \uc911\uad6d\uc5b4 \uc6f9\uc18c\uc124 \uc81c\ubaa9 \ubc88\uc5ed\uac00\ub2e4. \uac01 \uc904\uc740 \ud55c \ud654\uc758 \uc81c\ubaa9\uc774\ub2e4. \uc904\ub9c8\ub2e4 \ud55c\uad6d\uc5b4\ub85c \ubc88\uc5ed\ud574 \uac19\uc740 \uc904 \uc218\ub85c\ub9cc \ucd9c\ub825\ud55c\ub2e4. \ubc88\ud638\ub294 \uc22b\uc790 \uadf8\ub300\ub85c \ub450\uace0, \uc0ac\ub78c \uc774\ub984\uc740 \ud55c\uad6d \ud55c\uc790\uc74c\uc73c\ub85c \uc4f4\ub2e4. \uc124\uba85\uc740 \ubd99\uc774\uc9c0 \uc54a\ub294\ub2e4.' +
        (it && namesText(it.ch.id) ? '\n\n\uc778\ubb3c \uc774\ub984 \ud45c\uae30:\n' + namesText(it.ch.id) : '');
      var out = (await callApi(found.map(function (f) { return f.t; }).join('\n'), 0.2, sys)).split(/\n+/).map(function (x) { return x.trim(); }).filter(Boolean);
      var n = 0;
      found.forEach(function (f, k) {
        var ko = out[k]; if (!ko || hanLen(ko) > ko.length / 2) return;
        var v = cacheGet(f.u); if (!v) return; v.title = ko;
        // \ubcf8\ubb38 \uccab \uc904\uc5d0\uc11c \ucc3e\uc740 \uc18c\uc81c\ubaa9\uc774\uba74 \ubc88\uc5ed\ubcf8 \uccab \uc904(\uac19\uc740 \uc18c\uc81c\ubaa9)\uc740 \ubcf8\ubb38\uc5d0\uc11c \ube8c
        if (f.body && v.lines && v.lines.length > 3 && v.lines[0].length <= 60 && !/^[\u201c\u300c\u300e"']/.test(v.lines[0])) { v.lines = v.lines.slice(1); if (v.parts && v.parts[0]) v.parts[0]--; }
        cachePut(f.u, v, (cIndex()[ckey(f.u)] || {}).w); n++;
        chapters.forEach(function (c) { if (ckey(c.ch.url) === ckey(f.u)) { if (c.v) c.v.title = ko; setTitle(c, ko); } });
      });
      toast('\uc18c\uc81c\ubaa9 ' + n + '\uac1c\ub97c \ucc44\uc6e0\uc5b4\uc694');
      renderToc();
    } catch (e) { toast('\uc18c\uc81c\ubaa9\uc744 \ubc88\uc5ed\ud558\uc9c0 \ubabb\ud588\uc5b4\uc694: ' + String(e.message).slice(0, 40)); }
  }
  // \ubaa9\ucc28 \ub9c1\ud06c \uae00\uc790\uc5d0 \ubd99\uc740 \uc0ac\uc774\ud2b8 \ud45c\uc2dc(\u514d\u8d39\u00b7\u6700\u65b0\u00b7VIP \uac19\uc740 \ub531\uc9c0, \uc55e\uc758 \uc21c\ubc88)\ub97c \uac77\uc5b4\ub0c4: '09 \u6700\u65b0 \u7b2c8\u7ae0' \u2192 '\u7b2c8\u7ae0', '\u7b2c2\u7ae0 \u514d\u8d39' \u2192 '\u7b2c2\u7ae0'
  var TOCTAG = /(^|\s)(\u514d\u8d39|\u514d\u8cbb|\u6700\u65b0|\u6700\u65b0\u7ae0[\u8282\u7bc0]|VIP|vip|\u6536\u8d39|\u6536\u8cbb|\u4ed8\u8d39|\u4ed8\u8cbb|new|NEW|hot|HOT|\u70ed|\u71b1|\u8350|\u85a6|\u63a8\u8350|\u63a8\u85a6|\u66f4\u65b0|\u8a66\u8b80|\u8bd5\u8bfb|\u9650\u514d)(?=\s|$)/g;
  function tocText(raw) {
    var t0 = String(raw || '').replace(/\s+/g, ' ').trim(), t = t0;
    for (var i = 0; i < 3; i++) t = t.replace(TOCTAG, ' ').replace(/\s+/g, ' ').trim();
    t = t.replace(/(\u514d\u8d39|\u514d\u8cbb|\u6536\u8d39|\u6536\u8cbb|\u4ed8\u8d39|\u4ed8\u8cbb|VIP)$/, '').trim();
    t = t.replace(/^\d{1,4}[.\u3001]?\s+(?=\u7b2c\s*[\d\u96f6\u3007\u4e00\u4e8c\u4e09\u56db\u4e94\u516d\u4e03\u516b\u4e5d\u5341\u767e\u5343\u4e24]+\s*[\u7ae0\u56de\u8282\u7bc0\u8bdd\u8a71])/, ''); // \uc21c\ubc88 + \u7b2cN\u7ae0
    return t || t0;
  }
  function parseToc(doc, tocUrl, chUrl, raw) {
    var dir = workId(chUrl), seen = {}, out = [];
    var CHRX = /\u7b2c\s*[\d\u4e00\u4e8c\u4e09\u56db\u4e94\u516d\u4e03\u516b\u4e5d\u5341\u767e\u5343\u96f6\u3007\u4e24]+\s*[\u7ae0\u56de\u8282\u7bc0\u8bdd\u8a71]|^\s*\d+[\.\u3001\s]/;
    var as = [].slice.call(doc.querySelectorAll('a[href]'));
    function take(test) {
      out = []; seen = {};
      as.forEach(function (a) {
        var u; try { u = new URL(a.getAttribute('href'), tocUrl).href.replace(/#.*$/, ''); } catch (e) { return; }
        var t = tocText(a.textContent);
        if (!t || seen[u] || u === tocUrl || isPageLink(u, t, tocUrl) || !test(u, t)) return; seen[u] = 1; out.push({ u: u, t: t });
      });
    }
    take(function (u) { return u.indexOf(dir) === 0 && /\.(s?html?|php)$|\/\d+\/?$/.test(u); });
    if (out.length < 5) take(function (u, t) { return CHRX.test(t); });
    return raw ? out : sortToc(out);
  }
  // \ubaa9\ucc28\uac00 \uc5ec\ub7ec \ucabd\uc73c\ub85c \ub098\ub25c \uc0ac\uc774\ud2b8: \ucabd \ub9c1\ud06c(1 2 3 / \u4e0b\u4e00\u9801 / 1-100\u7ae0 / \uc120\ud0dd \uc0c1\uc790)\ub97c \ub530\ub77c\uac00 \uc804\ubd80 \ubaa8\uc74c
  var PAGE_T = /^\s*(\d{1,3}|\u4e0b\u4e00?[\u9801\u9875]|[\u5c3e\u672b][\u9801\u9875]|\u6700[\u5f8c\u540e]\u4e00?[\u9801\u9875]|next|\u203a|\u00bb|>>?|\u7b2c\s*\d+\s*[\u9801\u9875]|\d+\s*[-~\uff5e\u2014\u2013]\s*\d+\s*[\u7ae0\u56de\u8282\u7bc0\u8bdd\u8a71]?)\s*$/i;
  var FULL_T = /(\u5b8c\u6574|\u5168\u90e8|\u6240\u6709|\u5168\u672c)\s*(\u76ee[\u9304\u5f55]|\u7ae0[\u7bc0\u8282]|\u5217\u8868)|\u67e5\u770b(\u5168\u90e8|\u66f4\u591a|\u5b8c\u6574)|\u66f4\u591a\u7ae0[\u7bc0\u8282]|\u7ae0[\u7bc0\u8282]\u76ee[\u9304\u5f55]|\u9ede\u64ca\u67e5\u770b|\u70b9\u51fb\u67e5\u770b/;
  var PAGE_W = /^\s*(\u4e0b\u4e00?[\u9801\u9875]|[\u4e0a\u524d\u9996\u5c3e\u672b]\u4e00?[\u9801\u9875]|\u6700[\u5f8c\u540e]\u4e00?[\u9801\u9875]|next|prev|\u203a|\u00bb|\u2039|\u00ab|<<?|>>?)\s*$/i;
  function pgShape(u) { return String(u).replace(/#.*$/, '').replace(/[_\-]?\d+/g, '').replace(/\/(index)?(\.\w+)?$/, ''); }
  // \ubaa9\ucc28\uc758 \ucabd \ub118\uae40 \ub9c1\ud06c\uc778\uc9c0 (\uc22b\uc790\ub9cc \uc788\ub294 \ub9c1\ud06c\ub294 \uc8fc\uc18c \ubaa8\uc591\uc774 \ubaa9\ucc28\uc640 \uac19\uc744 \ub54c\ub9cc \u2014 \ud654 \uc81c\ubaa9\uc774 '011'\ucc98\ub7fc \uc22b\uc790\ubfd0\uc778 \uc0ac\uc774\ud2b8\ub3c4 \uc788\uc5b4\uc11c)
  function isPageLink(u, t, tocUrl) {
    if (PAGE_W.test(t)) return true;
    if (!PAGE_T.test(t)) return false;
    return pgShape(u) === pgShape(tocUrl) || /[?&](page|p|pn|pageno|pageindex)=\d+/i.test(u);
  }
  function tocPages(doc, base, chSet) {
    var out = [], h = hostOf(base);
    function add(u) {
      try { u = new URL(u, base).href.replace(/#.*$/, ''); } catch (e) { return; }
      if (hostOf(u) !== h || chSet[u] || out.indexOf(u) >= 0 || u === base) return;
      out.push(u);
    }
    [].forEach.call(doc.querySelectorAll('select option[value]'), function (o) {
      var v = o.getAttribute('value'); if (v && /[\/.?=]/.test(v) && /\d/.test(o.textContent + v)) add(v);
    });
    [].forEach.call(doc.querySelectorAll('a[href]'), function (a) {
      var t = a.textContent.replace(/\s+/g, ' ').trim(), hr = a.getAttribute('href');
      if (!hr || /^\s*(javascript:|#)/i.test(hr)) return;
      var au; try { au = new URL(hr, base).href; } catch (e) { return; }
      if (isPageLink(au, t, base) && !/^\s*([\u4e0a\u524d\u9996]|prev|\u2039|\u00ab|<)/i.test(t)) add(hr);
    });
    return out;
  }
  // \ud654 \ubaa9\ub85d\uc744 \uc2a4\ud06c\ub9bd\ud2b8\ub85c \ub2a6\uac8c \uadf8\ub9ac\ub294 \ubaa9\ucc28 \ud398\uc774\uc9c0: \uc228\uc740 \ucc3d\uc5d0\uc11c \uc5f4\uc5b4 \ubaa9\ub85d\uc774 \ub354 \ub298\uc9c0 \uc54a\uc744 \ub54c\uae4c\uc9c0 \uae30\ub2e4\ub9bc
  function getTocLive(url, chUrl) {
    return new Promise(function (res) {
      var f = document.createElement('iframe'), t0 = Date.now(), last = -1, lastCh = Date.now(), fin = false;
      f.__nvKeep = 1; f.setAttribute('sandbox', 'allow-scripts allow-same-origin');
      f.style.cssText = 'position:fixed;left:-10000px;top:0;width:420px;height:900px;border:0;visibility:hidden';
      function end(d) { if (fin) return; fin = true; clearInterval(iv); setTimeout(function () { f.remove(); }, 50); res(d); }
      var iv = setInterval(function () {
        var d = null; try { d = f.contentDocument; } catch (e) { }
        if (d && d.readyState !== 'loading' && d.location && d.location.href !== 'about:blank') {
          var n = 0; try { n = parseToc(d, url, chUrl, true).length; } catch (e) { }
          if (n !== last) { last = n; lastCh = Date.now(); }
          if ((n >= 3 && Date.now() - lastCh > 1500) || Date.now() - t0 > 12000) { var c = null; try { c = new DOMParser().parseFromString(d.documentElement.outerHTML, 'text/html'); } catch (e) { } return end(c); }
        } else if (Date.now() - t0 > 12000) end(null);
      }, 400);
      f.src = url; document.documentElement.appendChild(f);
    });
  }
  async function loadToc(tocUrl, chUrl, onProg) {
    var doc = await getDoc(tocUrl), base = tocUrl;
    if (parseToc(doc, tocUrl, chUrl, true).length < 3) { var ld = await getTocLive(tocUrl, chUrl); if (ld) doc = ld; }
    var fl = [].filter.call(doc.querySelectorAll('a[href]'), function (a) { return FULL_T.test(a.textContent) && a.textContent.length < 20; })[0];
    if (fl) { try { var fu = new URL(fl.getAttribute('href'), tocUrl).href; if (fu.split('#')[0] !== tocUrl.split('#')[0]) { doc = await getDoc(fu); base = fu; } } catch (e) { } }
    var all = [], seen = {};
    function addList(d, u) { parseToc(d, u, chUrl, true).forEach(function (c) { if (!seen[c.u]) { seen[c.u] = 1; all.push(c); } }); }
    addList(doc, base);
    var wd = workId(chUrl), inDir = all.filter(function (c) { return c.u.indexOf(wd) === 0; }).length > all.length * 0.6;
    var addList0 = addList; addList = function (d, u) { var n0 = all.length; addList0(d, u); if (inDir) all = all.slice(0, n0).concat(all.slice(n0).filter(function (c) { return c.u.indexOf(wd) === 0; })); };
    var done = {}, queue = tocPages(doc, base, seen), t0 = Date.now(); done[base] = 1;
    while (queue.length && Object.keys(done).length < 80 && Date.now() - t0 < 60000) {
      var batch = queue.splice(0, 4).filter(function (u) { return !done[u]; });
      batch.forEach(function (u) { done[u] = 1; });
      var docs = await Promise.all(batch.map(function (u) { return getDoc(u).then(function (d) { return { d: d, u: u }; }, function () { return null; }); }));
      docs.forEach(function (x) {
        if (!x) return; var n0 = all.length; addList(x.d, x.u);
        if (all.length > n0) tocPages(x.d, x.u, seen).forEach(function (u) { if (!done[u] && queue.indexOf(u) < 0) queue.push(u); });
      });
      if (onProg) onProg(Object.keys(done).length, all.length);
    }
    return sortToc(all);
  }
  // \ubaa9\ucc28 \uc815\ub82c: \uc0ac\uc774\ud2b8\uac00 '\ucd5c\uc2e0 \ud654\ubd80\ud130' \ubcf4\uc5ec\uc8fc\uac70\ub098 '\ucc98\uc74c\ubd80\ud130 \uc77d\uae30' \ub9c1\ud06c\ub97c \uc11e\uc5b4 \ub46c\ub3c4 1\ud654\ubd80\ud130 \ucc28\ub840\ub300\ub85c
  var CN = { '\u96f6': 0, '\u3007': 0, '\u4e00': 1, '\u4e8c': 2, '\u4e24': 2, '\u5169': 2, '\u4e09': 3, '\u56db': 4, '\u4e94': 5, '\u516d': 6, '\u4e03': 7, '\u516b': 8, '\u4e5d': 9 };
  function cnNum(t) {
    var n = 0, cur = 0;
    for (var i = 0; i < t.length; i++) {
      var c = t[i];
      if (c in CN) cur = CN[c];
      else if (c === '\u5341') { n += (cur || 1) * 10; cur = 0; }
      else if (c === '\u767e') { n += (cur || 1) * 100; cur = 0; }
      else if (c === '\u5343') { n += (cur || 1) * 1000; cur = 0; }
      else if (c === '\u842c' || c === '\u4e07') { n = (n + cur) * 10000; cur = 0; }
    }
    return n + cur;
  }
  function chNum(t) {
    var m = t.match(/\u7b2c\s*(\d+)\s*[\u7ae0\u56de\u8282\u7bc0\u8bdd\u8a71\u5377\u96c6\u7bc7]/) || t.match(/^\s*(\d+)(?!\d)/) || t.match(/(?:^|\D)(\d{1,5})(?:\D|$)/);
    if (m) return +m[1];
    m = t.match(/\u7b2c\s*([\u96f6\u3007\u4e00\u4e8c\u4e24\u5169\u4e09\u56db\u4e94\u516d\u4e03\u516b\u4e5d\u5341\u767e\u5343\u842c\u4e07]+)\s*[\u7ae0\u56de\u8282\u7bc0\u8bdd\u8a71\u5377\u96c6\u7bc7]/);
    if (m) return cnNum(m[1]);
    if (/[\u958b\u5f00]\u59cb[\u95b1\u9605][\u8b80\u8bfb]|\u5f9e\u982d|\u4ece\u5934|\u7b2c\u4e00[\u7ae0\u56de]|\u5e8f\u7ae0|\u6954\u5b50/.test(t)) return 0.5; // '\ucc98\uc74c\ubd80\ud130 \uc77d\uae30' \uac19\uc740 \ub9c1\ud06c = 1\ud654 \uc55e
    return null;
  }
  function sortToc(list) {
    var nums = list.map(function (c) { return chNum(c.t); }), have = nums.filter(function (x) { return x != null; }).length;
    if (have < list.length * 0.6) { // \ubc88\ud638\uac00 \ubcc4\ub85c \uc5c6\uc73c\uba74 \uc21c\uc11c\ub9cc \ubcf4\uace0, \uac70\uafb8\ub85c(\ucd5c\uc2e0 \ud654\ubd80\ud130)\uba74 \ub4a4\uc9d1\uc74c
      return list;
    }
    return list.map(function (c, i) { return { c: c, n: nums[i], i: i }; })
      .sort(function (a, b) {
        if (a.n == null && b.n == null) return a.i - b.i;
        if (a.n == null) return 1; if (b.n == null) return -1;
        return a.n - b.n || a.i - b.i;
      }).map(function (x) { return x.c; });
  }
  async function renderToc() {
    var it = chapters[curIndex()] || lastItem(); if (!it) return;
    var w = libAll()[it.ch.id] || {};
    openPage('toc', bookName(w) === '\uc774\ub984 \uc5c6\ub294 \uc791\ud488' ? '\ubaa9\ucc28' : bookName(w));
    var tocUrl = it.ch.toc || w.toc;
    if (!tocUrl) {
      pgB.innerHTML = '<div class="empty">\ubaa9\ucc28 \ub9c1\ud06c\ub97c \ucc3e\uc9c0 \ubabb\ud588\uc5b4\uc694.</div><button class="btn pri" style="display:flex;margin:0 auto" data-act="pick" data-k="toc">\ubaa9\ucc28 \ub9c1\ud06c \uace0\ub974\uae30</button>'; return;
    }
    pgB.innerHTML = '<div class="spin">\ubaa9\ucc28 \ubd88\ub7ec\uc624\ub294 \uc911</div>';
    var list = tocMem[tocUrl];
    if (!list) {
      try { list = await loadToc(tocUrl, it.ch.url, function (pn, cn) { var sp = pgB.querySelector('.spin'); if (sp) sp.textContent = '\ubaa9\ucc28 \ubd88\ub7ec\uc624\ub294 \uc911 (' + pn + '\ucabd, ' + cn + '\ud654)'; }); }
      catch (e) { pgB.innerHTML = '<div class="empty">\ubaa9\ucc28\ub97c \ubd88\ub7ec\uc624\uc9c0 \ubabb\ud588\uc5b4\uc694.<br>' + esc(e.message) + '</div>'; return; }
      tocMem[tocUrl] = list;
    }
    if (pageMode !== 'toc') return;
    var noSite = !list.length; // \uc0ac\uc774\ud2b8 \ubaa9\ucc28\ub97c \ubabb \uc77d\uc73c\uba74 \uc77d\uace0 \ubc88\uc5ed\ud574 \ub454 \ud654\ub85c\ub9cc \ubaa9\ucc28\ub97c \ub9cc\ub4e6 (\uc544\ub798 '\ub07c\uc6cc \ub123\uae30'\uac00 \ucc44\uc6c0)
    // \ubaa9\ucc28\uc5d0 \uc548 \ubcf4\uc774\ub294 \ud654\ub77c\ub3c4 \uc774 \uc791\ud488\uc73c\ub85c \ubc88\uc5ed\ud574 \ub454 \ud654\ub294 \ub07c\uc6cc \ub123\uc74c (\uc0ac\uc774\ud2b8 \ubaa9\ucc28\uac00 \uc77c\ubd80\ub9cc \ubcf4\uc5ec \uc918\ub3c4 \uc77d\ub358 \uacf3\uc744 \ucc3e\uc744 \uc218 \uc788\uac8c)
    var have = {}; list.forEach(function (c) { have[ckey(c.u)] = 1; });
    // '\ucc98\uc74c\ubd80\ud130 \uc77d\uae30' \uac19\uc740 \ub9c1\ud06c\ub294 1\ud654\uc640 \uacb9\uce58\ub2c8 \ube8c
    if (list.length > 3) list = list.filter(function (c) { return !/^(\u958b\u59cb|\u5f00\u59cb|\u5f9e\u982d|\u4ece\u5934|\u7acb\u5373)\s*(\u95b1\u8b80|\u9605\u8bfb)$|^(\u5f00\u59cb\u9605\u8bfb|\u958b\u59cb\u95b1\u8b80)/.test(c.t.trim()); });
    // \ubaa9\ucc28\uc5d0 \uc774\ubbf8 \uc788\ub294 \ud654(\uc81c\ubaa9 \ub610\ub294 \ud654 \ubc88\ud638\uac00 \uac19\uc740 \uac83)\ub294 \ubc88\uc5ed \uae30\ub85d\uc5d0\uc11c \ub610 \ub07c\uc6cc \ub123\uc9c0 \uc54a\uc74c \u2014 \ub098\ub25c \ud654\uc758 2\ucabd, '009'\uc640 '\uc81c9\ud654' \uac19\uc740 \uacbd\uc6b0
    var trT = {}, nums = {};
    list.forEach(function (c) { var tr0 = cacheHas(c.u), n0 = chNum(c.t); if (n0 != null && n0 >= 1) nums[n0] = 1; if (tr0 && tr0.t) { trT[tr0.t] = 1; var n1 = chNum(tr0.t); if (n1 != null && n1 >= 1) nums[n1] = 1; } });
    var I0 = cIndex(), extra = Object.keys(I0).filter(function (k) {
      if (I0[k].w !== it.ch.id || have[k] || trT[I0[k].t]) return false;
      if (idxBad(k)) return false; // \uad11\uace0\u00b7'\ub85c\ub529 \uc911' \uac19\uc740 \uc798\ubabb \uc800\uc7a5\ub41c \ubc88\uc5ed\uc740 \ubaa9\ucc28\uc5d0 \ub07c\uc6cc \ub123\uc9c0 \uc54a\uc74c
      var t2 = String(I0[k].t || '').trim(); if (!t2 || LOADT.test(t2) || LOADT.test(stripNum(t2))) return false; // \uc81c\ubaa9\uc744 \ubabb \uc77d\uc740 \ud654(\ub300\uac1c \ub098\ub25c \ud654\uc758 \ub4a4\ucabd \ucabd)\ub294 \uc5b4\ub514\uc5d0 \ub458\uc9c0 \ubab0\ub77c \ube7c \ub460
      var n2 = chNum(I0[k].t || ''); return !(n2 != null && nums[n2]);
    });
    var curHit = 0, curN = chNum(it.title || ''), curAlias = !have[ckey(it.ch.url)] && curN != null && nums[curN]; // \uc9c0\uae08 \ud654\uac00 \ubaa9\ucc28\uc5d0 \uc5c6\ub294 2\ucabd\uc774\uba74 \uac19\uc740 \ubc88\ud638 \uc904\uc744 '\uc77d\ub294 \uc911'\uc73c\ub85c
    if (!have[ckey(it.ch.url)] && !curAlias && extra.indexOf(ckey(it.ch.url)) < 0) extra.push(ckey(it.ch.url));
    if (extra.length) list = sortToc(list.concat(extra.map(function (k) { return { u: k, t: (I0[k] && I0[k].t) || it.title || k, extra: 1 }; })));
    // \ud654 \ubc88\ud638\uac00 \ud06c\uac8c \uac74\ub108\ub6f0\ub294 \uacf3: \uc0ac\uc774\ud2b8 \ubaa9\ucc28\uac00 \uc77c\ubd80\ub9cc \ubcf4\uc5ec \uc8fc\ub294 \uacbd\uc6b0 \uc54c\ub824 \uc90c
    var gap = null, prevN = null;
    list.forEach(function (c) { var n = chNum(c.t); if (n != null && n >= 1) { if (prevN != null && n - prevN > 5 && !gap) gap = [prevN + 1, n - 1]; prevN = n; } });
    if (noSite) gap = null;
    var read = (libAll()[it.ch.id] || {}).read || {}, cur = it.ch.url.replace(/#.*$/, ''), readN = 0, trN = 0;
    var noSub = [];
    // \uc5ec\ub7ec \ud654\uc5d0 \ub611\uac19\uc740 \uc18c\uc81c\ubaa9\uc774 \ubd99\uc5b4 \uc788\uc73c\uba74(\uc608\uc804 \ubc84\uc804\uc774 \uc0ac\uc774\ud2b8 \ubb38\uad6c\ub97c \uc18c\uc81c\ubaa9\uc73c\ub85c \uc798\ubabb \ub123\uc740 \uacbd\uc6b0) \uc9c0\uc6b0\uace0 \ubc88\ud638\ub9cc \ub0a8\uae40
    var subCnt = {};
    list.forEach(function (c) { var tr0 = cacheHas(c.u), st = tr0 ? stripNum(tr0.t) : ''; if (st) subCnt[st] = (subCnt[st] || 0) + 1; });
    // \uc0ac\uc774\ud2b8 \ubaa9\ucc28\ub294 \ubc88\ud638\ubfd0\uc778\ub370 \ubc88\uc5ed\ubcf8\uc5d4 \uc11c\ub85c \ub2e4\ub978 \uc18c\uc81c\ubaa9\uc774 \uc5ec\ub7ff \u2192 \ubcf8\ubb38 \uccab \uc904\uc5d0 \uc18c\uc81c\ubaa9\uc744 \uc801\ub294 \uc0ac\uc774\ud2b8
    var liftN = 0; list.forEach(function (c) { var tr0 = cacheHas(c.u), st = tr0 ? stripNum(tr0.t) : ''; if (st && subCnt[st] < 3 && !stripNum(c.t)) liftN++; });
    if (liftN >= 2) subHost(it.ch.url, 1);
    list.forEach(function (c) {
      var tr0 = cacheHas(c.u), st = tr0 ? stripNum(tr0.t) : '';
      if (st && subCnt[st] >= 3) { var v0 = cacheGet(c.u); if (v0) { var nn = chNum(c.t); v0.title = nn != null && nn >= 1 ? '\uc81c' + (nn | 0) + '\ud654' : c.t; cachePut(c.u, v0, (cIndex()[ckey(c.u)] || {}).w); st = ''; } }
      if (tr0 && !st && !stripNum(c.t)) liftCached(c.u);
    });
    var rows = list.map(function (c, i) {
      var tr = cacheHas(c.u); if (tr && idxBad(ckey(c.u))) tr = null;
      var isRead = read[ckey(c.u)] || read[c.u], isCur = ckey(c.u) === ckey(cur) || (curAlias && !curHit && (chNum(c.t) === curN || chNum((cacheHas(c.u) || {}).t || '') === curN) && (curHit = 1));
      if (isRead) readN++; if (tr) trN++;
      // \uc0ac\uc774\ud2b8\ub9c8\ub2e4(\uac19\uc740 \uc791\ud488 \uc548\uc5d0\uc11c\ub3c4) '027', '\uc81c027\ud654', '\u7b2c27\u7ae0 \u2026'\ucc98\ub7fc \uc81c\ubaa9 \ubaa8\uc591\uc774 \uc81c\uac01\uac01\uc774\ub77c: \ubc88\ud638 \uce78 + \uc18c\uc81c\ubaa9\uc73c\ub85c \ud1b5\uc77c
      var num = chNum(c.t); if (num == null || num < 1) num = tr ? chNum(tr.t) : null;
      var subO = stripNum(c.t), subT = tr ? stripNum(tr.t) : '';
      if (LOADT.test(subO)) subO = ''; if (LOADT.test(subT)) subT = '';
      if (subT && subCnt[subT] >= 3) subT = ''; // \uc800\uc7a5\uc774 \ub2e4\ub978 \ucc3d\uc5d0 \ub36e\uc5ec\ub3c4 \ud654\uba74\uc5d0\ub294 \uc548 \ubcf4\uc774\uac8c
      var main = subT || subO || (num != null && num >= 1 ? (num | 0) + '\ud654' : c.t), small = subT && subO && subO !== subT ? subO : '';
      if (tr && !subT && !subO) noSub.push(c.u);
      var lab = num != null && num >= 1 && num % 1 === 0 ? num + '\ud654' : '';
      return '<button class="row' + (isRead ? ' read' : '') + (isCur ? ' cur' : '') + (tr ? ' tr' : '') + '" data-act="open" data-u="' + esc(c.u) + '"><span class="rt">' +
        (lab ? '<i class="rn">' + lab + '</i>' : '') + esc(subT || subO || (lab ? '' : LOADT.test(c.t) ? '\uc81c\ubaa9 \uc5c6\ub294 \ud654' : c.t)) + (small ? '<small>' + esc(small) + '</small>' : '') + '</span>' +
        (isCur ? '<span class="bdg">\uc77d\ub294 \uc911</span>' : tr ? '<span class="bdg">\ubc88\uc5ed\ub428</span>' : '') + '</button>';
    });
    if (noSite && !list.length) { pgB.innerHTML = '<div class="empty">\ubaa9\ucc28\uc5d0\uc11c \ud654 \ubaa9\ub85d\uc744 \ucc3e\uc9c0 \ubabb\ud588\uc5b4\uc694.</div><button class="btn pri" style="display:flex;margin:0 auto" data-act="pick" data-k="toc">\ub2e4\ub978 \ubaa9\ucc28 \ub9c1\ud06c \uace0\ub974\uae30</button>'; return; }
    pgB.innerHTML = '<div class="tochd"><div class="tst"><b>' + list.length + '\ud654</b><span>\uc77d\uc74c ' + readN + '</span><span>\ubc88\uc5ed ' + trN + '</span><button class="trf ml" data-act="search">' + I.search + '\uac80\uc0c9</button><button class="trf" data-act="tocRefresh">' + I.redo + '\uc0c8\ub85c\uace0\uce68</button></div>' +
      '<div class="seg tj"><button data-act="tocTop" aria-label="\ucc98\uc74c\uc73c\ub85c">' + I.up + '</button><button data-act="tocCur">\uc77d\ub358 \uacf3</button><button data-act="tocLastTr">\ubc88\uc5ed \ub05d</button><button data-act="tocEnd" aria-label="\ucd5c\uc2e0 \ud654\ub85c">' + I.down + '</button></div></div>' +
      (noSite ? '<p class="tgap">\uc0ac\uc774\ud2b8 \ubaa9\ucc28\ub97c \uc77d\uc9c0 \ubabb\ud574\uc11c \ubc88\uc5ed\ud574 \ub454 \ud654\ub9cc \ubcf4\uc5ec\uc694. <button class="tsub" style="display:inline;width:auto;border:0;padding:0" data-act="pick" data-k="toc">\ubaa9\ucc28 \ub9c1\ud06c \uace0\ub974\uae30</button></p>' : '') +
      (gap ? '<p class="tgap">' + gap[0] + (gap[1] > gap[0] ? '~' + gap[1] : '') + '\ud654\ub294 \uc0ac\uc774\ud2b8 \ubaa9\ucc28\uc5d0 \uc5c6\uc5b4\uc694</p>' : '') +
      (noSub.length > 2 ? '<button class="tsub" data-act="subFind">\uc6d0\ubcf8\uc5d0\uc11c \uc18c\uc81c\ubaa9 \ucc3e\uae30 (' + noSub.length + '\ud654)</button>' : '') + rows.join('');
    tocNoSub = noSub; idxFlush();
    var c = pgB.querySelector('.row.cur'); if (c) pgB.scrollTop = c.offsetTop - pgB.clientHeight / 2;
  }

  // ===================== \uac80\uc0c9: \uc774 \uc791\ud488\uc5d0\uc11c \ubc88\uc5ed\ud574 \ub454 \ud654 \uc548\uc5d0\uc11c =====================
  var sQ = '', sData = null;
  function openSearch() {
    var it = chapters[curIndex()] || lastItem(); if (!it) return;
    var wid = it.ch.id, I0 = cIndex();
    openPage('search', '\uac80\uc0c9'); edBtn.style.display = 'none';
    sData = Object.keys(I0).filter(function (k) { return I0[k].w === wid; }).map(function (k) { return { u: k, t: I0[k].t || '', n: chNum(I0[k].t || ''), ts: I0[k].ts, L: null }; })
      .sort(function (a, b) { return (a.n == null ? 1e9 : a.n) - (b.n == null ? 1e9 : b.n) || a.ts - b.ts; });
    pgB.innerHTML = '<div class="srch"><input type="search" enterkeyhint="search" placeholder="\ubc88\uc5ed\ud574 \ub454 ' + sData.length + '\ud654\uc5d0\uc11c \ucc3e\uae30" autocomplete="off"></div><div class="sres"></div>';
    var inp = pgB.querySelector('input'), tm = 0;
    inp.value = sQ;
    inp.addEventListener('input', function () { clearTimeout(tm); tm = setTimeout(function () { runSearch(inp.value); }, 220); });
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { clearTimeout(tm); runSearch(inp.value); inp.blur(); } });
    if (sQ) runSearch(sQ); else setTimeout(function () { try { inp.focus(); } catch (e) { } }, 250);
  }
  function runSearch(q) {
    var box = pgB.querySelector('.sres'); if (!box || pageMode !== 'search') return;
    q = String(q || '').trim(); sQ = q;
    if (!q) { box.innerHTML = ''; return; }
    var ql = q.toLowerCase(), out = [], hits = 0, chs = 0, MAX = 300;
    sData.forEach(function (c) {
      if (hits >= MAX) return;
      if (!c.L) { var v = cacheGet(c.u); c.L = v && v.lines && !isBadV(v) ? v.lines : []; }
      var rows = [];
      c.L.forEach(function (l, i) {
        if (hits >= MAX) return;
        var low = l.toLowerCase(), at = low.indexOf(ql);
        if (at < 0) return;
        var a = Math.max(0, at - 30), b = Math.min(l.length, at + q.length + 50);
        var snip = (a > 0 ? '\u2026' : '') + esc(l.slice(a, at)) + '<mark>' + esc(l.slice(at, at + q.length)) + '</mark>' + esc(l.slice(at + q.length, b)) + (b < l.length ? '\u2026' : '');
        rows.push('<button class="shit" data-act="sres" data-u="' + esc(c.u) + '" data-i="' + i + '">' + snip + '</button>'); hits++;
      });
      if (rows.length) { chs++; var st = stripNum(c.t); out.push('<div class="sch">' + (c.n != null && c.n >= 1 ? (c.n | 0) + '\ud654' : esc(c.t)) + (st ? ' ' + esc(st) : '') + '</div>' + rows.join('')); }
    });
    box.innerHTML = hits ? '<p class="scnt">' + chs + '\ud654\uc5d0\uc11c ' + hits + '\uacf3' + (hits >= MAX ? ' (\uc55e\ucabd ' + MAX + '\uacf3\ub9cc \ubcf4\uc5ec\uc694)' : '') + '</p>' + out.join('') : '<p class="scnt">\ucc3e\uc9c0 \ubabb\ud588\uc5b4\uc694</p>';
  }
  function goPara(it, i) {
    var p = null; [].forEach.call(it.sec.querySelectorAll('p.tr'), function (x) { if (x._idx === +i) p = x; });
    if (!p) return;
    progScroll = Date.now();
    sc.scrollTop = Math.max(0, sc.scrollTop + p.getBoundingClientRect().top - sc.getBoundingClientRect().top - sc.clientHeight / 3);
    p.classList.add('hit'); setTimeout(function () { p.classList.remove('hit'); }, 2200);
  }

  // ===================== \ubb38\ub2e8\uc744 \uc0ac\uc9c4\uc73c\ub85c (\uc778\uc6a9 \uce74\ub4dc) =====================
  // ---- \ud48d\uacbd \ubc30\uacbd: \uc0ac\uc9c4 \ub300\uc2e0 \uadf8\ub54c\uadf8\ub54c \uadf8\ub9bc (\ud504\ub799\ud0c8 \ub178\uc774\uc988 + \ud544\ub984 \ub290\ub08c: \ud750\ub9b0 \ub300\ube44, \ub4e4\ub72c \uc5b4\ub460, \uc785\uc790) ----
  // \uae00\ub9c8\ub2e4 \uc870\uae08\uc529 \ub2e4\ub978 \ubaa8\uc591, \uac19\uc740 \uae00\uc774\uba74 \uac19\uc740 \ubaa8\uc591. \ud06c\uae30\uc640 \uc0c1\uad00\uc5c6\uc774 \uac19\uc740 \uadf8\ub9bc (\ubbf8\ub9ac\ubcf4\uae30 \uc791\uc740 \uadf8\ub9bc\uc5d0\ub3c4 \uc500)
  function rngOf(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function hashStr(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function noiseOf(r) {
    var P = new Float32Array(4096); for (var i = 0; i < 4096; i++) P[i] = r();
    function v(x, y) { return P[((x & 63) << 6) | (y & 63)]; }
    function n(x, y) { var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), w = yf * yf * (3 - 2 * yf); var a = v(xi, yi), b = v(xi + 1, yi), c = v(xi, yi + 1), d = v(xi + 1, yi + 1); return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w; }
    return function (x, y, oct) { var s = 0, amp = 0.5, f = 1, t = 0; for (var o = 0; o < (oct || 5); o++) { s += n(x * f + o * 17.3, y * f + o * 9.1) * amp; t += amp; amp *= 0.5; f *= 2.03; } return s / t; };
  }
  function sstep(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  function hexRgb(h) { h = h.replace('#', ''); return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; }
  function lerpC(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function ramp(stops, t) { // stops: [[\uc704\uce58, '#\uc0c9'], \u2026]
    for (var i = 1; i < stops.length; i++) if (t <= stops[i][0]) { var a = stops[i - 1], b = stops[i]; return lerpC(hexRgb(a[1]), hexRgb(b[1]), (t - a[0]) / (b[0] - a[0] || 1)); }
    return hexRgb(stops[stops.length - 1][1]);
  }
  // \uc791\uc740 \uadf8\ub9bc\uc5d0 \ud53d\uc140\ub9c8\ub2e4 \uc0c9\uc744 \uc815\ud55c \ub4a4 \ud06c\uac8c \ub298\ub824 \ubd80\ub4dc\ub7fd\uac8c (fn(x,y) \u2192 [r,g,b], x\u00b7y\ub294 0~1)
  function paintField(ctx, W, H, res, fn, blur) {
    var w = Math.max(16, Math.round(res)), h = Math.max(16, Math.round(res * H / W)), c = document.createElement('canvas'); c.width = w; c.height = h;
    var x = c.getContext('2d'), d = x.createImageData(w, h), p = d.data;
    for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) { var col = fn(i / (w - 1), j / (h - 1)), k = (j * w + i) * 4; p[k] = col[0]; p[k + 1] = col[1]; p[k + 2] = col[2]; p[k + 3] = 255; }
    x.putImageData(d, 0, 0);
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    var b = (blur || 0) * W / 1080; if (b) ctx.filter = 'blur(' + b + 'px)';
    ctx.drawImage(c, -b * 2, -b * 2, W + b * 4, H + b * 4); ctx.restore();
  }
  function glow(ctx, x, y, rad, col, a) { var g = ctx.createRadialGradient(x, y, 0, x, y, rad); g.addColorStop(0, 'rgba(' + col + ',' + a + ')'); g.addColorStop(1, 'rgba(' + col + ',0)'); ctx.fillStyle = g; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
  // \ud544\ub984 \ub290\ub08c: \ub300\ube44\ub97c \ub0ae\ucd94\uace0 \uc5b4\ub450\uc6b4 \uacf3\uc744 \ub744\uc6b0\uace0, \uc785\uc790\ub97c \ubfcc\ub9bc
  function film(ctx, W, H, r, o) {
    var d = ctx.getImageData(0, 0, W, H), p = d.data, lift = o.lift || 0, fade = 1 - lift / 255, g = o.grain * Math.min(1, W / 700) + 2, sat = o.sat == null ? 1 : o.sat;
    for (var i = 0; i < p.length; i += 4) {
      var R = p[i], G = p[i + 1], B = p[i + 2], L = R * 0.3 + G * 0.59 + B * 0.11, n = (r() + r() - 1) * g;
      p[i] = lift + (L + (R - L) * sat) * fade + n; p[i + 1] = lift + (L + (G - L) * sat) * fade + n; p[i + 2] = lift + (L + (B - L) * sat) * fade + n;
    }
    ctx.putImageData(d, 0, 0);
    if (o.vig) { var v = ctx.createRadialGradient(W / 2, H / 2, W * 0.35, W / 2, H / 2, W * 0.78); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(40,40,50,' + o.vig + ')'); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H); }
  }
  var SCENES = {
    // \ud587\ube5b\uc774 \ubd80\uc11c\uc9c0\ub294 \ubb3c\uacb0 (\ud750\ub9b0 \ucd08\ub85d\ube5b \ubb3c, \uc606\uc73c\ub85c \uae38\uac8c \uc77c\ub801\uc774\ub294 \uacb0, \ubc18\uc9dd\uc784)
    water: function (ctx, W, H, r) {
      var N = noiseOf(r), sx = 0.3 + r() * 0.3, sy = 0.55 + r() * 0.12;
      paintField(ctx, W, H, 240, function (x, y) {
        var n = N(x * 2.2, y * 11, 5), m = N(x * 1.2 + 5, y * 2.5 + 3, 3);
        var base = ramp([[0, '#a9b5aa'], [0.45, '#c3cdc2'], [1, '#dfe5dc']], y * 0.75 + m * 0.25);
        var sun = Math.max(0, 1 - Math.hypot((x - sx) / 0.55, (y - sy) / 0.35));
        base = lerpC(base, [128, 144, 134], (1 - sstep(0.3, 0.52, n)) * 0.4); // \ubb3c\uacb0 \uace8\uc740 \uc5b4\ub461\uac8c
        var c = lerpC(base, [246, 248, 240], Math.min(1, sun * 0.6 + sstep(0.55, 0.8, n) * (0.3 + sun * 0.6)));
        return lerpC(c, ramp([[0, '#b7a58e'], [0.5, '#9fb7b0'], [1, '#c2a9b4']], m), 0.12 * sstep(0.4, 0.7, m)); // \ubb3c\uc18d \ub3cc\u00b7\uc78e \uac19\uc740 \ud750\ub9b0 \uc0c9 \uc5bc\ub8e9
      }, 6);
      var u = W / 1080;
      for (var k = 0; k < 2200; k++) { // \ubc18\uc9dd\uc784: \ud574\uac00 \ube44\uce58\ub294 \uacb0\uc758 \ubc1d\uc740 \uacf3\uc5d0\ub9cc
        var x = r(), y = r(), sun = Math.max(0, 1 - Math.hypot((x - sx) / 0.5, (y - sy) / 0.3)), n = N(x * 2.2, y * 11, 5);
        if (sun <= 0 || n < 0.52 || r() > sun * 1.6) continue;
        ctx.save(); ctx.translate(x * W, y * H); ctx.scale(2.5 + r() * 5, 1); glow(ctx, 0, 0, (2 + r() * r() * 9) * u, '255,255,250', 0.5 + sun * 0.5); ctx.restore();
      }
      glow(ctx, sx * W, sy * H, W * 0.5, '255,255,248', 0.35);
      film(ctx, W, H, r, { lift: 18, sat: 0.8, grain: 10 });
    },
    // \ud574 \uc9c8 \ub158 \ud750\ub9b0 \uad6c\ub984 (\ud68c\uccad\uc0c9 \uad6c\ub984, \uc544\ub798\ucabd\uc740 \ub530\ub73b\ud55c \ube5b, \ud544\ub984 \uc785\uc790)
    cloud: function (ctx, W, H, r) {
      var N = noiseOf(r), ox = r() * 9;
      paintField(ctx, W, H, 220, function (x, y) {
        var sky = ramp([[0, '#9da2b1'], [0.5, '#bbbcc5'], [0.78, '#e1d6c9'], [1, '#ebe0d0']], y);
        var d = N(x * 1.8 + ox, y * 3.6, 6);
        var wgt = 1.05 - 0.85 * sstep(0.5, 0.75, y) + 0.85 * sstep(0.8, 0.97, y) * sstep(0.45, 0.8, x); // \uc704\ucabd\uc740 \uad6c\ub984 \ub760, \uac00\uc6b4\ub370\ub294 \ub9d1\uac8c, \uc624\ub978\ucabd \uc544\ub798\ub294 \ubb49\uac8c\uad6c\ub984
        var m = sstep(0.6 - wgt * 0.22, 0.78 - wgt * 0.16, d) * Math.min(1, wgt + 0.1);
        var lit = sstep(0.55, 0.9, N(x * 3 + 2, y * 6 - 1, 4));
        return lerpC(sky, lerpC([118, 122, 138], [214, 208, 204], lit * 0.6), m * 0.75);
      }, 7);
      film(ctx, W, H, r, { lift: 12, sat: 0.75, grain: 30, vig: 0.08 });
    },
    // \ubd84\ud64d\ube5b \ub178\uc744 \uad6c\ub984 (\uc5f0\ubcf4\ub77c\uc5d0\uc11c \ubd84\ud64d, \uc0b4\uad6c\uc0c9\uc73c\ub85c, \uc19c \uac19\uc740 \uad6c\ub984\uacfc \ucd08\uc2b9\ub2ec)
    dusk: function (ctx, W, H, r) {
      var N = noiseOf(r), ox = r() * 9, mx = 0.8 + r() * 0.08, my = 0.07 + r() * 0.025;
      paintField(ctx, W, H, 220, function (x, y) {
        var sky = ramp([[0, '#aeb0d2'], [0.45, '#d9bfd2'], [0.8, '#f0d3cb'], [1, '#f5dfcc']], y);
        var d = N(x * 2.6 + ox, y * 3.2 + 1, 6), m = sstep(0.44, 0.66, d) * sstep(0.12, 0.35, y) * (1 - sstep(0.78, 0.98, y) * 0.5);
        var sh = sstep(0.45, 0.75, N(x * 2.6 + ox, y * 3.2 + 1.08, 6));
        return lerpC(sky, lerpC([250, 236, 238], [196, 168, 190], (1 - sh) * 0.5), m * 0.85);
      }, 7);
      var u = W / 1080, R = 26 * u; // \ucd08\uc2b9\ub2ec
      glow(ctx, mx * W, my * H, R * 4, '255,250,240', 0.25);
      var mc = document.createElement('canvas'); mc.width = mc.height = Math.ceil(R * 2 + 4); var mk = mc.getContext('2d');
      mk.fillStyle = 'rgba(255,252,245,0.92)'; mk.beginPath(); mk.arc(R + 2, R + 2, R, 0, 7); mk.fill();
      mk.globalCompositeOperation = 'destination-out'; mk.beginPath(); mk.arc(R + 2 + R * 0.42, R + 2 - R * 0.22, R * 0.9, 0, 7); mk.fill();
      ctx.drawImage(mc, mx * W - R - 2, my * H - R - 2);
      film(ctx, W, H, r, { lift: 14, sat: 0.85, grain: 14 });
    },
    // \ud750\ub9b0 \ubc14\ub2e4 (\uc218\ud3c9\uc120, \uc606\uc73c\ub85c \ud750\ub974\ub294 \ubb3c\uacb0, \ubc14\ub2e4\uc5d0 \ube44\uce5c \ube5b)
    sea: function (ctx, W, H, r) {
      var N = noiseOf(r), hz = 0.56 + r() * 0.06, sx = 0.35 + r() * 0.3;
      paintField(ctx, W, H, 260, function (x, y) {
        if (y < hz) return lerpC(ramp([[0, '#c6d2de'], [0.7, '#e6e1dc'], [1, '#f1e4d8']], y / hz), [255, 255, 255], 0.1 * N(x * 2, y * 4, 3));
        var t = (y - hz) / (1 - hz), n = N(x * 0.9, y * 55, 4);
        var sea = ramp([[0, '#d9dcdc'], [0.25, '#b9c6cf'], [1, '#9fb1bf']], t);
        var glint = Math.max(0, 1 - Math.abs(x - sx) / (0.12 + t * 0.25)) * (1 - t * 0.6);
        return lerpC(sea, [246, 240, 232], Math.min(1, sstep(0.5, 0.75, n) * 0.35 + glint * sstep(0.45, 0.7, n) * 0.8));
      }, 4);
      glow(ctx, sx * W, hz * H, W * 0.4, '255,246,236', 0.3);
      film(ctx, W, H, r, { lift: 16, sat: 0.8, grain: 16 });
    }
  };
  var CARDS = {
    paper: { n: '\uc885\uc774', bg: '#f3eee3', fg: '#3a3027', mut: '#9a8b76', ac: '#c9b99a', f: 'ridibatang' },
    white: { n: '\ud770\uc0c9', bg: '#ffffff', fg: '#222326', mut: '#8d8f95', ac: '#d6d8dc', f: 'pretendard' },
    ink: { n: '\uba39\uc0c9', bg: '#1f2023', fg: '#e2dfd8', mut: '#8a877f', ac: '#4a4b50', f: 'maruburi' },
    sky: { n: '\ud558\ub298', bg: '#e4ecf3', fg: '#243241', mut: '#7a8999', ac: '#b9c9d9', f: 'pretendard' },
    water: { n: '\ubb3c\uacb0', scene: 'water', fg: '#25302b', mut: '#4f5c56', ac: '#7d8c84', f: 'maruburi' },
    cloud: { n: '\uad6c\ub984', scene: 'cloud', fg: '#262a33', mut: '#4b505d', ac: '#7a7f8d', f: 'ridibatang' },
    dusk: { n: '\ub178\uc744', scene: 'dusk', fg: '#3a3040', mut: '#6a5c6c', ac: '#a893a8', f: 'ridibatang' },
    sea: { n: '\ubc14\ub2e4', scene: 'sea', fg: '#25303a', mut: '#54616d', ac: '#8a9aa8', f: 'pretendard' }
  };
  var card = null;
  var thumbs = {};
  function cardThumb(k) { // \uace0\ub974\uae30 \uce78\uc758 \uc791\uc740 \uadf8\ub9bc: \ubc30\uacbd\uacfc \uae00\uc904 \ubaa8\uc591\ub9cc
    if (thumbs[k]) return thumbs[k];
    var D = CARDS[k], S = 116, c = document.createElement('canvas'); c.width = c.height = S; var x = c.getContext('2d');
    if (D.scene) SCENES[D.scene](x, S, S, rngOf(7 + k.length)); else { x.fillStyle = D.bg; x.fillRect(0, 0, S, S); }
    x.fillStyle = D.fg; x.globalAlpha = 0.55;
    [[0.3, 0.62], [0.42, 0.7], [0.54, 0.5]].forEach(function (l) { var w = S * l[1]; x.fillRect(D.scene ? (S - w) / 2 : S * 0.16, S * l[0], w, S * 0.035); });
    return (thumbs[k] = c.toDataURL('image/png'));
  }
  function openCard(p) {
    var it = itemOf(p); if (!it) return;
    var ps = [].slice.call(it.sec.querySelectorAll('p.tr,p.src')), i = ps.indexOf(p);
    card = { it: it, ps: ps, a: i, b: i };
    if (!CARDS[prefs.cardD]) prefs.cardD = 'paper';
    pn.dataset.mode = 'card';
    var h = '<div class="grab"></div><div class="hd"><h3>\uc0ac\uc9c4\uc73c\ub85c \uc800\uc7a5</h3><button class="x" data-act="close" aria-label="\ub2eb\uae30">' + I.x + '</button></div>' +
      '<div class="cdv"><canvas></canvas></div><div class="cds">' +
      Object.keys(CARDS).map(function (k) { return '<button data-act="cardD" data-v="' + k + '"><img alt="" src="' + cardThumb(k) + '">' + CARDS[k].n + '</button>'; }).join('') + '</div>' +
      '<div class="cdr"><span></span><button data-act="cardAdd" data-d="-1">\uff0b \uc55e \ubb38\ub2e8</button><button data-act="cardAdd" data-d="1">\uff0b \ub4a4 \ubb38\ub2e8</button><button data-act="cardOne">\ub418\ub3cc\ub9ac\uae30</button></div>' +
      '<div class="cdbar">' + (navigator.canShare ? '<button data-act="cardShare">\uacf5\uc720</button>' : '') + '<button class="pri" data-act="cardSave">' + I.dl + '\uc0ac\uc9c4 \uc800\uc7a5</button></div>';
    pn.innerHTML = h; pn.scrollTop = 0; showSheet();
    var on = pn.querySelector('.cds .on, .cds [data-v="' + prefs.cardD + '"]'); if (on) on.scrollIntoView({ inline: 'center', block: 'nearest' });
    drawCard();
  }
  function cardText() { return card.ps.slice(card.a, card.b + 1).map(function (x) { return x.textContent.trim(); }).filter(Boolean); }
  function wrapText(ctx, text, w) {
    var out = [], line = '';
    text.split(/(\s+)/).forEach(function (tok) {
      if (!tok) return;
      if (ctx.measureText(line + tok).width <= w) { line += tok; return; }
      if (/^\s+$/.test(tok)) { out.push(line); line = ''; return; }
      if (line.trim()) { out.push(line); line = ''; }
      if (ctx.measureText(tok).width <= w) { line = tok; return; }
      for (var j = 0; j < tok.length; j++) { if (ctx.measureText(line + tok[j]).width > w) { out.push(line); line = ''; } line += tok[j]; }
    });
    if (line.trim()) out.push(line);
    return out.map(function (l) { return l.trim(); });
  }
  var cardTok = 0;
  async function drawCard() {
    if (!card) return;
    var tok = ++cardTok, box = pn.querySelector('.cdv'); if (box) box.classList.add('busy');
    var lab = pn.querySelector('.cdr span'); if (lab) lab.textContent = '\ubb38\ub2e8 ' + (card.b - card.a + 1) + '\uac1c';
    var bo0 = pn.querySelector('[data-act=cardOne]'); if (bo0) bo0.style.display = card.a === card.b ? 'none' : '';
    var D = CARDS[prefs.cardD] || CARDS.paper, F = FONTS[D.f] || FONTS.pretendard, cv = pn.querySelector('.cdv canvas'); if (!cv) return;
    [].forEach.call(pn.querySelectorAll('[data-act=cardD]'), function (b) { b.classList.toggle('on', b.dataset.v === prefs.cardD); });
    var bp = pn.querySelector('[data-act=cardAdd][data-d="-1"]'), bn = pn.querySelector('[data-act=cardAdd][data-d="1"]'), bo = pn.querySelector('[data-act=cardOne]');
    var len = cardText().join('').length;
    if (bp) bp.disabled = card.a <= 0 || len > 900; if (bn) bn.disabled = card.b >= card.ps.length - 1 || len > 900;
    loadFont(D.f); loadFont('pretendard');
    try { await Promise.race([Promise.all([document.fonts.load('400 40px ' + F.f), document.fonts.load('700 30px ' + FONTS.pretendard.f)]), new Promise(function (ok) { setTimeout(ok, 2500); })]); } catch (e) { }
    if (!card || tok !== cardTok) return;
    await new Promise(function (ok) { requestAnimationFrame(function () { setTimeout(ok, 0); }); }); // '\uadf8\ub9ac\ub294 \uc911' \ud45c\uc2dc\uac00 \uba3c\uc800 \ubcf4\uc774\uac8c
    if (!card || tok !== cardTok) return;
    var W = 1080, P = 116, TW = W - P * 2, ctx = cv.getContext('2d'), paras = cardText();
    var w0 = libAll()[card.it.ch.id] || {}, book = bookName(w0), tp = titleParts(card.it.title || ''), chap = (tp.label ? tp.label + ' ' : '') + (tp.name || '');
    if (D.scene) { drawScene(cv, D, F, paras, book, chap); if (box) box.classList.remove('busy'); return; }
    var fs = 46, lines, lh, gap, H;
    for (; fs >= 30; fs -= 2) {
      ctx.font = '400 ' + fs + 'px ' + F.f; lh = Math.round(fs * 1.75); gap = Math.round(fs * 0.9);
      lines = paras.map(function (t) { return wrapText(ctx, t, TW); });
      var th = lines.reduce(function (s, l) { return s + l.length * lh; }, 0) + gap * (paras.length - 1);
      H = P + 120 + th + 110 + 96 + P;
      if (H <= 1920) break;
    }
    H = Math.max(1080, Math.min(H, 2400));
    cv.width = W; cv.height = H;
    ctx.fillStyle = D.bg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = D.ac; ctx.font = '700 150px ' + (FONTS.ridibatang || F).f; ctx.textBaseline = 'alphabetic'; ctx.fillText('\u201c', P - 10, P + 110);
    var body = lines.reduce(function (s, l) { return s + l.length * lh; }, 0) + gap * (paras.length - 1);
    var top = P + 150, bot = H - P - 96 - 70, y = Math.max(top, Math.round(top + (bot - top - body) / 2)); // \uc9e7\uc740 \uae00\uc740 \ub530\uc634\ud45c\uc640 \uc544\ub798 \uc791\ud488\uba85 \uc0ac\uc774 \uac00\uc6b4\ub370\uc5d0
    ctx.fillStyle = D.fg; ctx.font = '400 ' + fs + 'px ' + F.f; ctx.textBaseline = 'top';
    lines.forEach(function (ls, k) { ls.forEach(function (l) { ctx.fillText(l, P, y + (lh - fs) / 2); y += lh; }); if (k < lines.length - 1) y += gap; });
    var fy = H - P - 96;
    ctx.fillStyle = D.ac; ctx.fillRect(P, fy, 56, 3);
    ctx.fillStyle = D.fg; ctx.font = '700 30px ' + FONTS.pretendard.f; ctx.fillText(fitW(ctx, book, TW), P, fy + 28);
    ctx.fillStyle = D.mut; ctx.font = '400 26px ' + FONTS.pretendard.f; ctx.fillText(fitW(ctx, chap, TW), P, fy + 72);
    if (box) box.classList.remove('busy');
  }
  // \ud48d\uacbd \uce74\ub4dc: \uc815\uc0ac\uac01\ud615, \uae00\uc740 \uac00\uc6b4\ub370 \uc815\ub82c, \uae00\uc790\uac00 \ubb3b\ud788\uc9c0 \uc54a\uac8c \uac00\uc6b4\ub370\ub97c \uc0b4\uc9dd \ubc1d\ud798
  function drawScene(cv, D, F, paras, book, chap) {
    var W = 1080, H = 1080, P = 140, TW = W - P * 2, ctx = cv.getContext('2d');
    cv.width = W; cv.height = H;
    SCENES[D.scene](ctx, W, H, rngOf(hashStr(paras.join('\n') + D.scene)));
    var g = ctx.createRadialGradient(W / 2, H * 0.47, 0, W / 2, H * 0.47, W * 0.62);
    g.addColorStop(0, 'rgba(255,255,255,0.24)'); g.addColorStop(0.7, 'rgba(255,255,255,0.08)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    var avail = H - P * 2 - 150, fs, lines, lh, gap, body, over = false;
    for (fs = 40; fs >= 26; fs -= 2) {
      ctx.font = '400 ' + fs + 'px ' + F.f; lh = Math.round(fs * 1.75); gap = Math.round(fs * 0.8);
      lines = paras.map(function (t) { return wrapText(ctx, t, TW); });
      body = lines.reduce(function (s0, l) { return s0 + l.length * lh; }, 0) + gap * (paras.length - 1);
      if (body <= avail) break;
    }
    if (body > avail) { // \uac00\uc7a5 \uc791\uc740 \uae00\uc790\ub85c\ub3c4 \ub118\uce58\uba74 \ub118\uce58\ub294 \uc904\uc740 '\u2026'\ub85c \ub04a\uc74c
      over = true; var flat = [], used = 0;
      lines.forEach(function (ls, k) { ls.forEach(function (l) { if (used + lh <= avail) { flat.push(l); used += lh; } }); if (k < lines.length - 1) used += gap; });
      if (flat.length) flat[flat.length - 1] = flat[flat.length - 1].replace(/.?$/, '\u2026');
      lines = [flat]; body = used;
    }
    card.over = over;
    var y = Math.round(P + (avail - body) / 2) + 10;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.shadowColor = 'rgba(255,255,255,0.7)'; ctx.shadowBlur = 18;
    ctx.fillStyle = D.fg; ctx.font = '400 ' + fs + 'px ' + F.f;
    lines.forEach(function (ls, k) { ls.forEach(function (l) { ctx.fillText(l, W / 2, y + (lh - fs) / 2); y += lh; }); if (k < lines.length - 1) y += gap; });
    var fy = H - P - 78;
    ctx.shadowBlur = 0; ctx.fillStyle = D.ac; ctx.fillRect(W / 2 - 24, fy, 48, 2);
    ctx.shadowBlur = 10; ctx.fillStyle = D.fg; ctx.font = '700 28px ' + FONTS.pretendard.f; ctx.fillText(fitW(ctx, book, TW), W / 2, fy + 24);
    ctx.fillStyle = D.mut; ctx.font = '400 24px ' + FONTS.pretendard.f; ctx.fillText(fitW(ctx, chap, TW), W / 2, fy + 64);
    ctx.shadowBlur = 0; ctx.textAlign = 'left';
    var bp = pn.querySelector('[data-act=cardAdd][data-d="-1"]'), bn = pn.querySelector('[data-act=cardAdd][data-d="1"]');
    if (over) { if (bp) bp.disabled = true; if (bn) bn.disabled = true; }
  }
  function fitW(ctx, t, w) { t = String(t || ''); if (ctx.measureText(t).width <= w) return t; while (t.length > 1 && ctx.measureText(t + '\u2026').width > w) t = t.slice(0, -1); return t + '\u2026'; }
  function cardBlob() { var cv = pn.querySelector('.cdv canvas'); return new Promise(function (ok) { cv.toBlob(function (b) { ok(b); }, 'image/png'); }); }
  function cardName() { var w0 = libAll()[card.it.ch.id] || {}; return (bookName(w0) + ' ' + (card.it.title || '')).replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60) + '.png'; }
  async function saveCard(share) {
    var b = await cardBlob(); if (!b) { toast('\uc0ac\uc9c4\uc744 \ub9cc\ub4e4\uc9c0 \ubabb\ud588\uc5b4\uc694'); return; }
    var name = cardName();
    if (share) {
      try { var f = new File([b], name, { type: 'image/png' }); if (navigator.canShare({ files: [f] })) { await navigator.share({ files: [f] }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
      toast('\uc774 \ube0c\ub77c\uc6b0\uc800\ub294 \uc0ac\uc9c4 \uacf5\uc720\uac00 \uc548 \ub3fc\uc11c \uc800\uc7a5\ud560\uac8c\uc694');
    }
    var u = URL.createObjectURL(b), a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(u); }, 30000);
    toast('\uc0ac\uc9c4\uc744 \uc800\uc7a5\ud588\uc5b4\uc694 (\ub2e4\uc6b4\ub85c\ub4dc \ud3f4\ub354)');
  }

  // ===================== \uc2a4\ud06c\ub864: \uc9c4\ud589 \u00b7 \ud604\uc7ac \ud654 \u00b7 \uba54\ub274 \uc228\uae40 \u00b7 \uc790\ub3d9 \uc774\uc5b4 \uc77d\uae30 =====================
  var lastTop = 0, ticking = false, curShown = -1;
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var st = sc.scrollTop, vh = sc.clientHeight, i = curIndex(), it = chapters[i];
      if (it) {
        if (i !== curShown || topS.textContent !== it.title) {
          curShown = i; document.title = it.title;
          try { history.replaceState(null, '', it.ch.url); } catch (e) { }
          libTouch(it);
        }
        savePos(it, st);
      }
      var d = st - lastTop;
      if (Math.abs(d) > 6 && Date.now() - progScroll > 900 && !app.classList.contains('sheet')) setUI(false);
      lastTop = st;
      if (prefs.auto && st + vh > sc.scrollHeight - vh * 1.5) appendNext();
    });
  }
  sc.addEventListener('scroll', onScroll, { passive: true });

  // ---- \uc77d\ub358 \uc704\uce58 \uae30\uc5b5 ----
  var POS = 'nvtrPos', posT = 0, posReady = false;
  function savePos(it, st) {
    if (!posReady || Date.now() - posT < 800) return; posT = Date.now();
    var P = gget(POS, {}) || {}; if (P.u) P = {}; // \uc608\uc804 \ud615\uc2dd \uc815\ub9ac
    P[it.ch.url] = st - it.sec.offsetTop;
    var k = Object.keys(P); while (k.length > 200) delete P[k.shift()];
    gset(POS, P);
  }
  function restorePos(item) {
    try {
      var P = gget(POS, {}) || {}, y = P.u ? (P.u === item.ch.url ? P.y : 0) : P[item.ch.url];
      if (y > 200) { progScroll = Date.now(); sc.scrollTop = item.sec.offsetTop + y; toast('\uc77d\ub358 \uc704\uce58\ub85c \ub3cc\uc544\uc654\uc5b4\uc694'); }
    } catch (e) { }
    posReady = true;
  }

  // ===================== \ub3d9\uc791 =====================
  async function act(name, t) {
    buzz();
    if (name === 'aa') { app.classList.contains('sheet') ? closeSheet() : openSheet(); return; }
    if (name === 'close') { closeSheet(); return; }
    if (name === 'lib') { renderLib(); return; }
    if (name === 'toc') { renderToc(); return; }
    if (name === 'pgClose') { closePage(); return; }
    if (name === 'libRestore') { restoreLib(true); return; }
    if (name === 'libEdit') { var on = !pg.classList.contains('edit'); pg.classList.toggle('edit', on); edBtn.textContent = on ? '\uc644\ub8cc' : '\ud3b8\uc9d1'; renderLibBody(); return; }
    if (name === 'export') { exportWork(t.dataset.id); return; }
    if (name === 'exportCur') { var ci2 = chapters[curIndex()] || lastItem(); if (ci2) exportWork(ci2.ch.id); return; }
    if (name === 'libDel') { // \uc11c\uc7ac\uc5d0\uc11c \uc9c0\uc6b0\uba74 \uadf8 \uc791\ud488\uc758 \uc800\uc7a5\ub41c \ubc88\uc5ed\ub3c4 \ud568\uaed8 \uc9c0\uc6cc\uc11c \uc800\uc7a5 \uacf5\uac04\uc744 \ube44\uc6c0
      var L = libAll(), did = t.dataset.id; delete L[did]; gset('lib', L);
      var IX = cIndex(), nDel = 0; Object.keys(IX).forEach(function (k) { if (IX[k].w === did) { delete IX[k]; gdel('c:' + k); nDel++; } }); if (nDel) cidxSave(IX);
      tocMem = {}; closeSheet(); renderLibBody(); toast(nDel ? '\uc11c\uc7ac\uc5d0\uc11c \uc9c0\uc6e0\uc5b4\uc694 (\ubc88\uc5ed ' + nDel + '\ud654\ub3c4 \uc9c0\uc6e0\uc5b4\uc694)' : '\uc11c\uc7ac\uc5d0\uc11c \uc9c0\uc6e0\uc5b4\uc694'); return;
    }
    if (name === 'libDelAsk') { // \uc2e4\uc218 \ubc29\uc9c0: \ud55c \ubc88 \ub354 \ub20c\ub7ec\uc57c \uc9c0\uc6c0
      if (t.classList.contains('sure')) { act('libDel', t); return; }
      t.classList.add('sure'); t.innerHTML = I.x + '\ud55c \ubc88 \ub354 \ub204\ub974\uba74 \uc9c0\uc6cc\uc694'; buzz(); return;
    }
    if (name === 'libTag') { libTag = t.dataset.tag || null; renderLibBody(); pgB.scrollTop = 0; return; }
    if (name === 'workRenameEdit') { // \uc81c\ubaa9 \uc606 \uc5f0\ud544: \uc81c\ubaa9 \uc790\ub9ac\uac00 \uadf8\ub300\ub85c \uc785\ub825\uce78\uc774 \ub428 (\uc5d4\ud130\ub098 \ub2e4\ub978 \uacf3 \ub204\ub974\uba74 \uc800\uc7a5)
      var h3 = pn.querySelector('.hd.wk h3'), w5 = libAll()[workId0]; if (!h3 || !w5) return;
      h3.innerHTML = '<input class="namein" type="text" maxlength="60" enterkeyhint="done" placeholder="\ube44\uc6b0\uba74 \uc6d0\ub798 \uc81c\ubaa9">';
      var ni = h3.querySelector('input'), orig = bookName(w5); ni.value = orig; ni.focus(); try { ni.setSelectionRange(0, ni.value.length); } catch (e) { }
      ni.addEventListener('blur', function () { if (ni.isConnected && !ni._done) { ni._done = 1; if (ni.value.trim() !== orig) renameWork(workId0, ni); else openWork(workId0); } });
      return;
    }
    if (name === 'tagAdd') { addTag(t.dataset.id, pn.querySelector('.tagin')); return; }
    if (name === 'tagDel') { var L3 = libAll(), w3 = L3[t.dataset.id]; if (w3 && w3.tags) { w3.tags = w3.tags.filter(function (x) { return x !== t.dataset.tag; }); gset('lib', L3); renderLibBody(); openWork(t.dataset.id); } return; }
    if (name === 'open') { openChapter(t.dataset.u, pageMode === 'lib' ? 'lib' : 'toc'); return; }
    if (name === 'tocRefresh') { tocMem = {}; renderToc(); return; }
    if (name === 'tocCur' || name === 'tocTop' || name === 'tocEnd' || name === 'tocLastTr') {
      var trs = pgB.querySelectorAll('.row.tr');
      var r = name === 'tocTop' ? pgB.querySelector('.row') : name === 'tocEnd' ? pgB.querySelector('.row:last-of-type') : name === 'tocLastTr' ? trs[trs.length - 1] : (pgB.querySelector('.row.cur') || trs[trs.length - 1]);
      if (!r && name === 'tocLastTr') { toast('\uc774 \uc791\ud488\uc740 \ubc88\uc5ed\ud574 \ub454 \ud654\uac00 \uc5c6\uc5b4\uc694'); return; }
      if (r) pgB.scrollTo({ top: r.offsetTop - pgB.clientHeight / 2, behavior: 'smooth' }); return;
    }
    if (name === 'theme') {
      var tk = t.dataset.v, TT = THEMES[tk]; if (!TT) return;
      if (TT.dark) prefs.nightT = tk; else prefs.dayT = tk;
      var mm = prefs.mode || 'a';
      // \uc790\ub3d9\uc5d0\uc11c \uc9c0\uae08 \uc2dc\uac04\ub300\uac00 \uc544\ub2cc \ucabd\uc744 \uace0\ub974\uba74: \ucc3d\uc774 \uc5f4\ub9b0 \ub3d9\uc548\ub9cc \ubbf8\ub9ac \ubcf4\uc5ec \uc90c
      tmpTheme = mm === 'a' && !!TT.dark !== sysDark() ? tk : null;
      savePrefs(); applyPrefs(); syncThemeRow(); return;
    }
    if (name === 'tmode') { prefs.mode = t.dataset.v; tmpTheme = null; savePrefs(); applyPrefs(); syncThemeRow(); return; }
    if (name === 'themeUndo') { if (themeSnap) { prefs.mode = themeSnap[0]; prefs.dayT = themeSnap[1]; prefs.nightT = themeSnap[2]; tmpTheme = null; savePrefs(); applyPrefs(); syncThemeRow(); toast('\ucc98\uc74c \ud14c\ub9c8\ub85c \ub418\ub3cc\ub838\uc5b4\uc694'); } return; }
    if (name === 'font') { prefs.font = t.dataset.v; savePrefs(); applyPrefs(); [].forEach.call(pn.querySelectorAll('.frow'), function (r) { r.classList.toggle('sel', r.dataset.v === prefs.font); }); return; }
    if (name === 'fontOpen') { fontTab = null; openFonts(); return; }
    if (name === 'fontTab') { fontTab = t.dataset.v; openFonts(); return; }
    if (name === 'fontBack') { buildPanel(); pn.dataset.mode = 'set'; syncPanel(); return; }
    if (name === 'fontCustom') {
      var fv = (pn.querySelector('.fontin') || {}).value || ''; fv = fv.trim();
      if (!fv) { toast('\uae00\uaf34 \uc774\ub984\uc774\ub098 \uc8fc\uc18c\ub97c \uc368 \uc8fc\uc138\uc694'); return; }
      prefs.fontCustom = fv; prefs.font = 'custom'; savePrefs(); applyPrefs(); openFonts(); toast('\uc801\uc6a9\ud588\uc5b4\uc694. \uae00\uaf34\uc774 \uc548 \ubc14\ub00c\uba74 \uc774\ub984\uc774\ub098 \uc8fc\uc18c\ub97c \ud655\uc778\ud574 \uc8fc\uc138\uc694'); return;
    }
    if (name === 'dlg') { prefs.dlg = +t.dataset.v; savePrefs(); applyPrefs(); syncPanel(); return; }
    if (name === 'just') { prefs.just = +t.dataset.v; savePrefs(); applyPrefs(); syncPanel(); return; }
    if (name === 'pre') { prefs.pre = +t.dataset.v; savePrefs(); applyPrefs(); syncPanel(); return; }
    if (name === 'ind') { prefs.ind = prefs.ind ? 0 : 1; savePrefs(); applyPrefs(); syncPanel(); return; }
    if (name === 'autoNext') { prefs.auto = prefs.auto ? 0 : 1; savePrefs(); applyPrefs(); syncPanel(); return; }
    if (name === 'step') {
      var S = STEPS.filter(function (s) { return s[0] === t.dataset.v; })[0];
      var x = Math.round((prefs[S[0]] + S[2] * +t.dataset.d) * 100) / 100;
      prefs[S[0]] = Math.min(S[4], Math.max(S[3], x)); savePrefs(); applyPrefs(); syncPanel(); return;
    }
    if (name === 'reset') { prefs = fill({ v: 2 }); savePrefs(); applyPrefs(); toast('\ubcf4\uae30 \uc124\uc815\uc744 \ucd08\uae30\ud654\ud588\uc5b4\uc694'); return; }
    if (name === 'api') { closeSheet(); window.open(SETTINGS_URL, 'nvtrSettings'); return; }
    if (name === 'paraRetr') { var hp = holdP; closeSheet(); retrParagraph(hp); return; }
    if (name === 'paraDelAsk') { // \uc2e4\uc218 \ubc29\uc9c0: \ud55c \ubc88 \ub354 \ub20c\ub7ec\uc57c \uc9c0\uc6c0
      if (t.classList.contains('sure')) { var dp = holdP; holdP = null; closeSheet(); if (dp && delParagraph(dp)) toast('\ubb38\ub2e8\uc744 \uc9c0\uc6e0\uc5b4\uc694'); return; }
      t.classList.add('sure'); t.innerHTML = I.x + '\ud55c \ubc88 \ub354 \ub204\ub974\uba74 \uc9c0\uc6cc\uc694'; buzz(); return;
    }
    if (name === 'paraUndo') { var up = holdP, uit = itemOf(up); closeSheet(); if (up && up._hist && up._hist.length) { setPara(uit, up, up._hist.pop()); toast('\ub418\ub3cc\ub838\uc5b4\uc694'); } return; }
    if (name === 'paraCopy') {
      var txt = holdP ? holdP.textContent : ''; closeSheet();
      try { await navigator.clipboard.writeText(txt); toast('\ubcf5\uc0ac\ud588\uc5b4\uc694'); } catch (e) { toast('\ubcf5\uc0ac\ud558\uc9c0 \ubabb\ud588\uc5b4\uc694'); } return;
    }
    if (name === 'resume') { restartTranslate(t._item); toast('\uba48\ucd98 \ubd80\ubd84\ubd80\ud130 \ub2e4\uc2dc \ubc88\uc5ed\ud560\uac8c\uc694'); return; }
    if (name === 'retry') {
      var ri = t._item;
      if (ri.empty || /\ube44\uc5b4 \uc788\uc5b4\uc694/.test(ri.sec.textContent)) { act('refetch', t); return; }
      toast('\ub2e4\uc2dc \ubc88\uc5ed\ud560\uac8c\uc694'); restartTranslate(ri); return;
    }
    if (name === 'refetch') {
      var fi = t._item; toast('\ud398\uc774\uc9c0\ub97c \ub2e4\uc2dc \ubd88\ub7ec\uc624\ub294 \uc911');
      delete pending[fi.ch.url];
      var nf = await prefetch(fi.ch.url, null);
      if (nf.err) { toast(nf.err.message.slice(0, 50)); return; }
      show(nf, chapters.indexOf(fi) >= 0 ? fi : null); return;
    }
    if (name === 'skipNext') { // \ubcf8\ubb38 \uc5c6\ub294 \ud654\ub97c \uac74\ub108\ub6f0\uace0 \ub2e4\uc74c \ud654\ub85c
      var si = t._item; si.skipped = true; t.disabled = true;
      var sn = await appendNext(); if (sn) scrollToItem(sn); return;
    }
    if (name === 'openReal') { // \uc774 \ud0ed\uc5d0\uc11c \uc6d0\ubcf8 \ud398\uc774\uc9c0\ub97c \uc9c1\uc811 \uc5f4\uace0(\uc0ac\uc774\ud2b8 \uc2a4\ud06c\ub9bd\ud2b8\u00b7\uc778\uc99d \ud1b5\uacfc) \uac70\uae30\uc11c \ub2e4\uc2dc \ubc88\uc5ed
      location.href = String(t.dataset.u).split('#')[0] + '#nvtr' + Date.now(); return;
    }
    if (name === 'search') { openSearch(); return; }
    if (name === 'sres') { openChapter(t.dataset.u, 'search', +t.dataset.i); return; }
    if (name === 'card') { var cp = holdP; if (cp) openCard(cp); return; }
    if (name === 'cardD') { prefs.cardD = t.dataset.v; savePrefs(); drawCard(); return; }
    if (name === 'cardAdd') { if (card) { if (+t.dataset.d < 0) card.a = Math.max(0, card.a - 1); else card.b = Math.min(card.ps.length - 1, card.b + 1); drawCard(); } return; }
    if (name === 'cardOne') { if (card) { var ci0 = card.ps.indexOf(holdP); card.a = card.b = ci0 < 0 ? card.a : ci0; drawCard(); } return; }
    if (name === 'cardSave' || name === 'cardShare') { if (card) saveCard(name === 'cardShare'); return; }
    if (name === 'subFind') { t.disabled = true; findSubtitles(); return; }
    if (name === 'fixNames') { fixNames(t._item, t); return; }
    if (name === 'namesOpen') { openNames(t.dataset.id); return; }
    if (name === 'namesBack') { openWork(t.dataset.id); return; }
    if (name === 'namesSave') {
      var ta = pn.querySelector('.namesin'), L5 = libAll(), w5 = L5[t.dataset.id]; if (!w5) return;
      var nm = {}; String(ta.value).split(/\n/).forEach(function (l) { var m = l.split(/[=\uff1d]/); if (m.length === 2 && m[0].trim() && m[1].trim()) nm[m[0].trim()] = m[1].trim(); });
      w5.names = nm; gset('lib', L5); toast('\uc778\ubb3c \uc774\ub984 ' + Object.keys(nm).length + '\uac1c\ub97c \uc800\uc7a5\ud588\uc5b4\uc694'); openWork(t.dataset.id); return;
    }
    if (name === 'retrans') {
      var rit = t._item || chapters[curIndex()];
      if (!rit) return;
      if (!rit.done && !rit.failed) { closeSheet(); restartTranslate(rit); toast('\uba48\ucd98 \ubd80\ubd84\ubd80\ud130 \ub2e4\uc2dc \ubc88\uc5ed\ud560\uac8c\uc694'); return; }
      closeSheet(); cacheDel(rit.ch.url); delete pending[rit.ch.url];
      var ridx = chapters.indexOf(rit);
      rit.ch.retrans = (rit.ch.retrans || 0) + 1;
      show(rit.ch, rit);
      if (chapters[ridx]) scrollToItem(chapters[ridx]);
      toast('\uc774 \ud654\ub97c \ub2e4\uc2dc \ubc88\uc5ed\ud558\uace0 \uc788\uc5b4\uc694');
      return;
    }
    if (name === 'pick') { openPicker(t.dataset.k, chapters[curIndex()] || lastItem()); return; }
    if (name === 'pickLink') {
      var k = t.dataset.k, c = pickItem.ch.links[+t.dataset.i];
      learn(k, c.t, pickItem.ch.url); pickItem.ch[k] = c.u; closeSheet();
      if (k === 'next') { pickItem.nextP = null; pickItem.nextErr = null; toast('\uae30\uc5b5\ud588\uc5b4\uc694. \ub2e4\uc74c \ud654\ub97c \ubd88\ub7ec\uc62c\uac8c\uc694'); var nn = await appendNext(); if (nn) scrollToItem(nn); }
      else if (k === 'toc') { var L3 = libAll(); if (L3[pickItem.ch.id]) { L3[pickItem.ch.id].toc = c.u; gset('lib', L3); } toast('\uae30\uc5b5\ud588\uc5b4\uc694'); renderToc(); }
      else { toast('\uae30\uc5b5\ud588\uc5b4\uc694. \uc774\uc804 \ud654\ub97c \ubd88\ub7ec\uc62c\uac8c\uc694'); act('prev', t); }
      return;
    }
    if (name === 'pickUrl') {
      var inp = pn.querySelector('.url'), uu = (inp && inp.value || '').trim(), kk = t.dataset.k;
      try { uu = new URL(uu, pickItem.ch.url).href; } catch (e) { uu = ''; }
      if (!/^https?:/.test(uu)) { toast('\uc8fc\uc18c\ub97c \ud655\uc778\ud574 \uc8fc\uc138\uc694'); return; }
      pickItem.ch[kk] = uu; pickItem.ch.guessed = 0; closeSheet();
      if (kk === 'next') { recordPattern(pickItem.ch.url, uu); pickItem.nextP = null; pickItem.nextErr = null; var n2 = await appendNext(); if (n2) scrollToItem(n2); }
      else if (kk === 'toc') { var L4 = libAll(); if (L4[pickItem.ch.id]) { L4[pickItem.ch.id].toc = uu; gset('lib', L4); } renderToc(); }
      else act('prev', t);
      return;
    }
    if (name === 'nextRetry') {
      var LR = lastItem(); LR.nextP = null;
      if (LR.isLast) { // \uc9c0\uae08 \ud654 \ud398\uc774\uc9c0\ub97c \ub2e4\uc2dc \uc77d\uc5b4 \uc0c8\ub85c \uc0dd\uae34 \ub2e4\uc74c \ud654 \ub9c1\ud06c\uac00 \uc788\ub294\uc9c0 \ud655\uc778
        LR.isLast = false; toast('\uc0c8 \ud654\uac00 \uc788\ub294\uc9c0 \ud655\uc778\ud558\ub294 \uc911');
        try { var c2 = chapterFull(await getDoc(LR.ch.url), LR.ch.url); if (c2.next) LR.ch.next = c2.next; } catch (e) { }
      }
      appendNext(); return;
    }
    if (name === 'next') {
      setUI(false);
      var i = curIndex();
      if (chapters[i + 1]) { scrollToItem(chapters[i + 1]); return; }
      var Lt = lastItem();
      if (!Lt.done && !Lt.skipped) { toast(Lt.failed ? '\uc774\ubc88 \ud654 \ubc88\uc5ed\uc774 \uc2e4\ud328\ud588\uc5b4\uc694. \ub2e4\uc2dc \uc2dc\ub3c4\ub97c \ub20c\ub7ec \uc8fc\uc138\uc694' : '\uc774\ubc88 \ud654\ub97c \uc544\uc9c1 \ubc88\uc5ed\ud558\uace0 \uc788\uc5b4\uc694'); return; }
      if (Lt.isLast) { toast('\ub9c8\uc9c0\ub9c9 \ud654\uae4c\uc9c0 \uc77d\uc5c8\uc5b4\uc694'); return; }
      if (!Lt.ch.next) { openPicker('next', Lt); return; }
      var n = await appendNext();
      if (n) scrollToItem(n);
      return;
    }
    if (name === 'prev') {
      setUI(false);
      var j = curIndex();
      if (chapters[j - 1]) { scrollToItem(chapters[j - 1]); return; }
      var C0 = chapters[j];
      if (!C0) return;
      if (!C0.ch.prev) { openPicker('prev', C0); return; }
      openChapter(C0.ch.prev, 'prev'); return;
    }
  }

  // ===================== \ud0ed \u00b7 \uae38\uac8c \ub204\ub974\uae30 \ucc98\ub9ac =====================
  // \uc0ac\uc774\ud2b8 \uc2a4\ud06c\ub9bd\ud2b8\uac00 \ud074\ub9ad\uc744 \uac00\ub85c\ucc44\ub3c4 \ub3d9\uc791\ud558\ub3c4\ub85d window \ub2e8\uacc4\uc5d0\uc11c \uc9c1\uc811 \ubc1b\uc74c
  function inUI(e) { var p = e.composedPath ? e.composedPath() : []; return p.indexOf(host) >= 0; }
  function pathOf(e) { var p = e.composedPath(), out = []; for (var i = 0; i < p.length; i++) { if (p[i] === host) break; out.push(p[i]); } return out; }
  function actTarget(e) { var p = pathOf(e); for (var i = 0; i < p.length; i++) if (p[i].dataset && p[i].dataset.act) return p[i]; return null; }
  function paraOf(e) {
    var p = pathOf(e);
    for (var i = 0; i < p.length; i++) {
      if (p[i].tagName === 'P' && p[i].parentNode && p[i].parentNode.classList && p[i].parentNode.classList.contains('grp')) return p[i];
      if (p[i].classList && p[i].classList.contains('grp')) { // \ubb38\ub2e8 \uc0ac\uc774 \uc5ec\ubc31\uc744 \ub20c\ub800\uc744 \ub54c: \uac00\uc7a5 \uac00\uae4c\uc6b4 \ubb38\ub2e8
        var best = null, bd = 1e9;
        [].forEach.call(p[i].children, function (c) { var r = c.getBoundingClientRect(), d = e.clientY < r.top ? r.top - e.clientY : e.clientY > r.bottom ? e.clientY - r.bottom : 0; if (d < bd) { bd = d; best = c; } });
        return bd < 40 ? best : null;
      }
    }
    return null;
  }
  function onInput(e) { return pathOf(e).some(function (n) { return n.tagName === 'INPUT' || n.tagName === 'TEXTAREA'; }); }
  var down = null, lastPtr = 0, lpT = null, lpFired = false;
  // \uc790\ud310\uc774 \uc62c\ub77c\uc624\uba74 \uc544\ub798 \uc2dc\ud2b8\ub97c \uc790\ud310 \uc704\ub85c \uc62c\ub9bc (\ud30c\uc774\uc5b4\ud3ed\uc2a4\ub294 \uc790\ud310\uc774 \ud654\uba74\uc744 \ub36e\uae30\ub9cc \ud558\uace0 \ud654\uba74 \ud06c\uae30\ub97c \uc548 \uc904\uc5ec\uc11c)
  function fitKb() {
    var vv = window.visualViewport; if (!vv || !pn) return;
    var kb = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
    if (kb > 60) { pn.style.bottom = kb + 'px'; pn.style.maxHeight = Math.max(200, vv.height - 16) + 'px'; pn.style.paddingBottom = '16px'; }
    else { pn.style.bottom = ''; pn.style.maxHeight = ''; pn.style.paddingBottom = ''; }
  }
  if (window.visualViewport) { window.visualViewport.addEventListener('resize', fitKb); window.visualViewport.addEventListener('scroll', fitKb); }
  root.addEventListener('focusin', function (e) {
    var tg = e.composedPath && e.composedPath()[0];
    if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA') && pn.contains(tg)) [150, 400, 800].forEach(function (ms) { setTimeout(function () { fitKb(); try { tg.scrollIntoView({ block: 'nearest' }); } catch (x) { } }, ms); });
  }, true);
  root.addEventListener('focusout', function () { setTimeout(fitKb, 300); }, true);
  root.addEventListener('keydown', function (e) { // \ud0dc\uadf8 \uc785\ub825: \uc5d4\ud130\ub85c \ucd94\uac00
    var tg = e.composedPath && e.composedPath()[0];
    if (e.key === 'Enter' && tg && tg.classList && tg.classList.contains('tagin') && workId0) { e.preventDefault(); addTag(workId0, tg); }
    if (e.key === 'Enter' && tg && tg.classList && tg.classList.contains('namein') && workId0) { e.preventDefault(); tg._done = 1; renameWork(workId0, tg); }
    if (e.key === 'Escape' && tg && tg.classList && tg.classList.contains('namein') && workId0) { e.preventDefault(); tg._done = 1; openWork(workId0); }
  }, true);
  function unpress() { [].forEach.call(root.querySelectorAll('.press'), function (n) { n.classList.remove('press'); }); }
  function fire(e) {
    var t = actTarget(e);
    if (t) { act(t.dataset.act, t); return; }
    if (onInput(e) || app.classList.contains('sheet') || app.classList.contains('page')) return;
    var sel = String(window.getSelection ? getSelection() : '');
    if (!sel) setUI(!app.classList.contains('ui'));
  }
  // \uc544\ub798 \ucc3d \uc190\uc7a1\uc774(\ub610\ub294 \uc81c\ubaa9 \uc904)\ub97c \ub04c\uc5b4\uc11c: \uc544\ub798\ub85c \ub0b4\ub9ac\uba74 \ub2eb\uae30, \uc704\ub85c \uc62c\ub9ac\uba74 \ud06c\uac8c
  var sdrag = null;
  function sheetGrab(e) {
    if (!app.classList.contains('sheet')) return false;
    var ps = pathOf(e), hit = false;
    for (var i = 0; i < ps.length; i++) {
      var n = ps[i]; if (n === pn) break;
      if (n.tagName === 'BUTTON' || n.tagName === 'INPUT' || n.tagName === 'TEXTAREA') return false;
      if (n.classList && (n.classList.contains('grab') || n.classList.contains('hd'))) hit = n.classList.contains('grab') ? 'grab' : hit || 'hd';
    }
    return ps.indexOf(pn) >= 0 ? hit : false;
  }
  window.addEventListener('pointerdown', function (e) {
    if (!inUI(e)) return;
    if (sheetGrab(e)) { e.stopImmediatePropagation(); sdrag = { y: e.clientY, t: Date.now(), h: pn.offsetHeight, dy: 0, grab: sheetGrab(e) === 'grab' }; if (e.cancelable) e.preventDefault(); pn.classList.add('drag'); try { e.target.setPointerCapture && e.target.setPointerCapture(e.pointerId); } catch (x) { } return; }
    e.stopImmediatePropagation();
    down = { x: e.clientX, y: e.clientY, t: Date.now() }; lpFired = false; clearTimeout(lpT);
    var p = paraOf(e), wk = pageMode === 'lib' && app.classList.contains('page') && !app.classList.contains('sheet') ? pathOf(e).filter(function (n) { return n.classList && (n.classList.contains('tile') || n.classList.contains('cont')) && n.dataset.id; })[0] : null;
    var swb = app.classList.contains('sheet') ? pathOf(e).filter(function (n) { return n.classList && n.classList.contains('tsw'); })[0] : null;
    if (swb) { lpT = setTimeout(function () { lpFired = true; buzz(); var k = swb.dataset.v, P = prefs.pins || (prefs.pins = []), at = P.indexOf(k); if (at >= 0) P.splice(at, 1); else P.unshift(k); savePrefs(); syncThemeRow(); toast(at >= 0 ? THEMES[k].n + ' \uace0\uc815\uc744 \ud480\uc5c8\uc5b4\uc694' : THEMES[k].n + '\uc744(\ub97c) \ub9e8 \uc55e\uc5d0 \uace0\uc815\ud588\uc5b4\uc694'); }, 480); }
    else if (wk) { wk.classList.add('press'); lpT = setTimeout(function () { lpFired = true; wk.classList.remove('press'); buzz(); openWork(wk.dataset.id); }, 480); }
    else if (p && !app.classList.contains('sheet')) lpT = setTimeout(function () { lpFired = true; buzz(); openPara(p); }, 480);
  }, true);
  window.addEventListener('pointermove', function (e) {
    if (sdrag) {
      e.stopImmediatePropagation(); var dy = e.clientY - sdrag.y; sdrag.dy = dy;
      if (dy >= 0) { pn.style.transform = 'translateY(' + dy + 'px)'; pn.style.maxHeight = ''; }
      else { pn.style.transform = ''; pn.style.maxHeight = Math.min(viewH() - 12, sdrag.h - dy) + 'px'; }
      return;
    }
    if (!down || !inUI(e)) return;
    if (Math.abs(e.clientX - down.x) > 10 || Math.abs(e.clientY - down.y) > 10) { clearTimeout(lpT); unpress(); }
  }, true);
  function viewH() { var vv = window.visualViewport; return Math.round(vv ? vv.height : window.innerHeight); } // \uc8fc\uc18c\ucc3d\u00b7\uc790\ud310\uc744 \ube80 \uc2e4\uc81c\ub85c \ubcf4\uc774\ub294 \ub192\uc774
  function endDrag(cancel) {
    var d = sdrag; sdrag = null; if (!d) return;
    pn.classList.remove('drag'); pn.style.transform = ''; pn.style.maxHeight = '';
    var v = d.dy / Math.max(1, Date.now() - d.t); lastPtr = Date.now();
    if (cancel) return;
    if (d.dy > 110 || (d.dy > 30 && v > 0.5)) { if (pn.classList.contains('full') && d.dy < 260 && v < 0.9) pn.classList.remove('full'); else closeSheet(); }
    else if (d.dy < -40) pn.classList.add('full');
    else if (Math.abs(d.dy) < 6 && d.grab) pn.classList.toggle('full'); // \uc190\uc7a1\uc774\ub97c \ud1a1 \uce58\uba74 \ud06c\uac8c/\uc6d0\ub798\ub300\ub85c
  }
  window.addEventListener('pointerup', function (e) {
    if (sdrag) { e.stopImmediatePropagation(); endDrag(); return; }
    if (!inUI(e)) return;
    e.stopImmediatePropagation(); clearTimeout(lpT); unpress();
    if (lpFired) { lpFired = false; down = null; lastPtr = Date.now(); return; }
    if (!down || Math.abs(e.clientX - down.x) > 12 || Math.abs(e.clientY - down.y) > 12 || Date.now() - down.t > 800) { down = null; return; }
    down = null; lastPtr = Date.now(); fire(e);
  }, true);
  window.addEventListener('pointercancel', function (e) { if (sdrag) { endDrag(); return; } if (inUI(e)) { clearTimeout(lpT); down = null; e.stopImmediatePropagation(); } }, true);
  ['click', 'touchend'].forEach(function (type) {
    window.addEventListener(type, function (e) {
      if (!inUI(e)) return;
      e.stopImmediatePropagation();
      var t0 = e.composedPath && e.composedPath()[0]; if (type === 'click' && t0 && t0.download) return; // \ud30c\uc77c \uc800\uc7a5 \ub9c1\ud06c
      if (type === 'click') { if (!onInput(e)) e.preventDefault(); if (Date.now() - lastPtr > 700) fire(e); }
    }, true);
  });
  ['touchstart', 'mousedown', 'mouseup'].forEach(function (type) {
    window.addEventListener(type, function (e) { if (inUI(e)) e.stopImmediatePropagation(); }, true);
  });
  window.addEventListener('contextmenu', function (e) { if (inUI(e)) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);

  // \uad11\uace0 \uc2a4\ud06c\ub9bd\ud2b8\uac00 \uc0c8\ub85c \ub07c\uc6cc \ub123\ub294 \uc694\uc18c \uc81c\uac70
  function sweep(n) {
    if (n.nodeType === 1 && n !== host && !n.__nvKeep && !/^(HEAD|BODY|META|TITLE|LINK)$/.test(n.tagName)) n.remove();
  }
  [].slice.call(document.body.children).forEach(sweep);
  [].slice.call(document.documentElement.children).forEach(sweep);
  var mo = new MutationObserver(function (ms) { ms.forEach(function (m) { [].slice.call(m.addedNodes).forEach(sweep); }); });
  mo.observe(document.body, { childList: true });
  mo.observe(document.documentElement, { childList: true });

  // \uc124\uc815 \ud398\uc774\uc9c0\uc5d0\uc11c \ub3cc\uc544\uc624\uba74 \ubc14\ub85c \ubc18\uc601
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'visible') return;
    var p = gget(PK, null); if (p && (p.ts || 0) > (prefs.ts || 0)) { prefs = fill(p); applyPrefs(); }
    chapters.forEach(function (it) {
      if (it.failed && /\uc124\uc815|\ud1a0\ud070/.test(it.sec.textContent) && cfg()) { delete pending[it.ch.url]; show(it.ch, it); }
      // \ud654\uba74\uc774 \uaebc\uc84c\ub2e4 \ucf1c\uc9c4 \uacbd\uc6b0: 2\ubd84 \ub118\uac8c \uc9c4\ud589\uc774 \uc5c6\ub358 \ubc88\uc5ed\uc740 \ubc14\ub85c \uc774\uc5b4\uc11c \ub2e4\uc2dc \uc2dc\ub3c4
      else if (!it.done && !it.failed && it.P && Date.now() - Math.max(it.P.lastProg || 0, it.P.t0 || 0) > 120000) restartTranslate(it);
    });
  });
  applyPrefs();
  try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { if ((prefs.mode || 'a') === 'a') applyPrefs(); }); } catch (e) { }
  show(first).then(function (it) { if (it && it.done) setTimeout(function () { restorePos(it); }, 50); else posReady = true; });
  setTimeout(function () { try { packOld(); } catch (e) { } }, 8000);
  libAll(); if (gget('libRestore', 0)) setTimeout(function () { restoreLib(false); }, 3000);
  if (!gget('hintUI', 0)) { gset('hintUI', 1); setTimeout(function () { toast('\ud654\uba74\uc744 \ud0ed\ud558\uba74 \uba54\ub274\uac00, \ubb38\ub2e8\uc744 \uae38\uac8c \ub204\ub974\uba74 \ub2e4\uc2dc \ubc88\uc5ed\uc774 \ub098\uc640\uc694'); }, 1200); }

  // ===== \uc6d0\ubcf8 \ud398\uc774\uc9c0: \ub5a0 \uc788\ub294 '\ubc88\uc5ed' \ubc84\ud2bc =====
  // \uc0ac\uc774\ud2b8\ubcc4 \ubc84\ud2bc \ud45c\uc2dc: 'on'(\ud56d\uc0c1) \u00b7 'off'(\uc228\uae40) \u00b7 \uc5c6\uc74c(\uc790\ub3d9 \uac10\uc9c0)
  function siteKey() { return location.hostname.replace(/^www\./, ''); }
  function siteMode() { return (gget('sites', {}) || {})[siteKey()]; }
  function setSiteMode(m) { var S = gget('sites', {}) || {}; if (m) S[siteKey()] = m; else delete S[siteKey()]; gset('sites', S); }
  function hanCount(t) { var m = t.match(/[\u3400-\u9fff]/g); return m ? m.length : 0; }
  function looksLikeNovel() {
    var all = (document.body && document.body.textContent || '').slice(0, 300000);
    if (hanCount(all) < 400) return null; // \uc911\uad6d\uc5b4\uac00 \uac70\uc758 \uc5c6\ub294 \ud398\uc774\uc9c0\ub294 \ubc14\ub85c \uc81c\uc678 (\uac00\ubccd\uac8c)
    var body = null; try { body = findBody(document); } catch (e) { }
    if (!body) return null;
    var t = body.textContent, hn = hanCount(t);
    return hn >= 250 && hn / Math.max(1, t.replace(/\s/g, '').length) > 0.3 ? body : null;
  }
  function openReader() { window.open(location.href.split('#')[0] + '#nvtr' + Date.now(), READER); }
  function addMenus(shown, show) {
    if (typeof GM_registerMenuCommand !== 'function') return;
    try {
      GM_registerMenuCommand('\uc774 \ud398\uc774\uc9c0 \ubc88\uc5ed\ud558\uae30', openReader);
      var m = siteMode();
      if (m !== 'on') GM_registerMenuCommand('\uc774 \uc0ac\uc774\ud2b8\uc5d0\uc11c \ubc88\uc5ed \ubc84\ud2bc \ud56d\uc0c1 \ubcf4\uc774\uae30', function () { setSiteMode('on'); show(true); });
      if (m !== 'off') GM_registerMenuCommand('\uc774 \uc0ac\uc774\ud2b8\uc5d0\uc11c \ubc88\uc5ed \ubc84\ud2bc \uc228\uae30\uae30', function () { setSiteMode('off'); show(false); });
      if (m) GM_registerMenuCommand('\uc774 \uc0ac\uc774\ud2b8 \ubc84\ud2bc \ud45c\uc2dc\ub97c \uc790\ub3d9 \uac10\uc9c0\ub85c', function () { setSiteMode(null); location.reload(); });
    } catch (e) { }
  }
  function addLauncher() {
    var mode = siteMode(), h = null;
    function show(on) {
      if (!on) { if (h) h.remove(); h = null; return; }
      if (!h) h = makeLauncher();
    }
    addMenus(false, show);
    if (mode === 'off') return;
    if (mode === 'on') { show(true); return; }
    // \uc790\ub3d9 \uac10\uc9c0: \ub2a6\uac8c \uadf8\ub824\uc9c0\ub294 \uc0ac\uc774\ud2b8\ub3c4 \uc788\uc5b4\uc11c \uba87 \ubc88 \ub2e4\uc2dc \ud655\uc778
    var done = false, t0 = Date.now(), pend = null;
    function hanNow() { var b = document.body; return b ? hanCount((document.title || '') + (b.innerText || b.textContent || '').slice(0, 4000)) : 0; }
    function check() { pend = null; if (done) return; if (looksLikeNovel()) { done = true; mo3.disconnect(); show(true); } }
    var mo3 = new MutationObserver(function () {
      if (done || pend) return;
      if (Date.now() - t0 > 15000) { mo3.disconnect(); return; }
      pend = setTimeout(check, 600);
    });
    if (document.body) mo3.observe(document.body, { childList: true, subtree: true, characterData: true });
    check(); setTimeout(check, 2000); setTimeout(check, 6000); setTimeout(function () { mo3.disconnect(); }, 15500);
    // \uae00\uc740 \ub2e4 \ub5b4\ub294\ub370 \ud55c\uc790\uac00 \uac70\uc758 \uc5c6\ub294 \ud398\uc774\uc9c0(\ud55c\uad6d\uc5b4\u00b7\uc601\uc5b4 \uc0ac\uc774\ud2b8 \ub4f1)\ub294 3\ucd08 \ub4a4 \uac10\uc2dc\ub97c \uba48\ucda4
    setTimeout(function () { var b = document.body; if (!done && b && (b.innerText || '').length > 500 && hanNow() < 20) { done = true; mo3.disconnect(); } }, 3000);
  }
  function makeLauncher() {
    // '\ubc88\uc5ed' \uc54c\uc57d \ubc84\ud2bc: \uc5b4\ub290 \uc0ac\uc774\ud2b8 \uc0c9\uc5d0\ub3c4 \ubb3b\ud788\uc9c0 \uc54a\uac8c \uc9d9\uc740 \uc720\ub9ac\uc0c9, \ub04c\uc5b4\uc11c \uc62e\uae30\uba74 \uac00\uae4c\uc6b4 \ucabd \uac00\uc7a5\uc790\ub9ac\uc5d0 \ubd99\uace0 \uc704\uce58\ub97c \uae30\uc5b5
    var h = document.createElement('div'), pos = gget('lpos', null) || { s: 'r', y: 0.72 };
    function place() {
      var vh = window.innerHeight, y = Math.max(70, Math.min(vh - 120, pos.y * vh));
      h.style.cssText = 'position:fixed;top:' + y + 'px;' + (pos.s === 'l' ? 'left' : 'right') + ':12px;z-index:2147483646;transition:opacity .25s,transform .25s';
    }
    place();
    var r = h.attachShadow({ mode: 'closed' });
    r.innerHTML = '<style>button{all:initial;box-sizing:border-box;display:flex;align-items:center;gap:7px;height:44px;padding:0 17px 0 14px;border-radius:999px;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:none;' +
      'background:rgba(30,31,36,.92);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.1);' +
      'box-shadow:0 6px 18px rgba(0,0,0,.22),0 1px 3px rgba(0,0,0,.18),inset 0 1px 0 rgba(255,255,255,.06);transition:transform .15s;' +
      'font:600 14.5px/1 -apple-system,"Pretendard Variable",Pretendard,"Noto Sans KR",sans-serif;letter-spacing:-.01em;color:#f4f4f5}' +
      'button:active{transform:scale(.94)}svg{width:18px;height:18px;fill:none;stroke:#a9c4ff;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;flex:none}</style>' +
      '<button aria-label="\ubc88\uc5ed"><svg viewBox="0 0 24 24"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>\ubc88\uc5ed</button>';
    var b = r.querySelector('button'), down = null, drag = false;
    function go() { openReader(); }
    b.addEventListener('pointerdown', function (e) { down = { x: e.clientX, y: e.clientY, t: h.getBoundingClientRect().top }; drag = false; try { b.setPointerCapture(e.pointerId); } catch (x) { } e.stopPropagation(); }, true);
    b.addEventListener('pointermove', function (e) {
      if (!down) return;
      if (!drag && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 12) drag = true;
      if (drag) { h.style.transition = 'none'; h.style.top = Math.max(10, Math.min(window.innerHeight - 54, down.t + e.clientY - down.y)) + 'px'; h.style.left = (e.clientX - h.offsetWidth / 2) + 'px'; h.style.right = 'auto'; }
    }, true);
    b.addEventListener('pointerup', function (e) {
      e.stopPropagation(); e.preventDefault();
      if (down && drag) { pos = { s: e.clientX < window.innerWidth / 2 ? 'l' : 'r', y: h.getBoundingClientRect().top / window.innerHeight }; gset('lpos', pos); place(); }
      else if (down) go();
      down = null; drag = false;
    }, true);
    b.addEventListener('pointercancel', function () { if (drag) place(); down = null; drag = false; }, true);
    b.addEventListener('click', function (e) { e.stopPropagation(); e.preventDefault(); }, true);
    // \uc77d\ub290\ub77c \uc544\ub798\ub85c \uc2a4\ud06c\ub864\ud558\ub294 \ub3d9\uc548\uc740 \uc605\uac8c, \uba48\ucd94\uac70\ub098 \uc704\ub85c \uc62c\ub9ac\uba74 \ub2e4\uc2dc \ub610\ub837\ud558\uac8c
    var lastY = window.scrollY, idle = 0;
    window.addEventListener('scroll', function () {
      var y = window.scrollY;
      if (y > lastY + 4) { h.style.opacity = '.35'; h.style.transform = 'scale(.9)'; } else if (y < lastY - 4) { h.style.opacity = ''; h.style.transform = ''; }
      lastY = y; clearTimeout(idle); idle = setTimeout(function () { h.style.opacity = ''; h.style.transform = ''; }, 1200);
    }, { passive: true });
    window.addEventListener('resize', function () { if (!drag) place(); });
    (document.body || document.documentElement).appendChild(h);
    // \uad11\uace0 \uc2a4\ud06c\ub9bd\ud2b8\uac00 \ubc84\ud2bc\uc744 \uc9c0\uc6b0\uba74 \ub2e4\uc2dc \ubd99\uc784
    // (\ud398\uc774\uc9c0 \uc804\uccb4\uac00 \uc544\ub2c8\ub77c html\uacfc body\uc758 \ubc14\ub85c \uc544\ub798\ub9cc \uc9c0\ucf1c\ubd04: \uad11\uace0\uac00 \ub9ce\uc740 \uc0ac\uc774\ud2b8\uc5d0\uc11c\ub3c4 \uac00\ubccd\uac8c)
    var mo2 = new MutationObserver(function () {
      if (document.body && ob !== document.body) { ob = document.body; mo2.observe(ob, { childList: true }); }
      if (!h.isConnected && h.__keep) (document.body || document.documentElement).appendChild(h);
    }), ob = document.body;
    h.__keep = 1; mo2.observe(document.documentElement, { childList: true }); if (ob) mo2.observe(ob, { childList: true });
    var rm = h.remove.bind(h); h.remove = function () { h.__keep = 0; mo2.disconnect(); rm(); };
    return h;
  }

  // ===== \uc124\uc815 \ud398\uc774\uc9c0 (github.io) =====
  function renderSettings() {
    var C = gget('cfg', {}) || {};
    var app = document.getElementById('app') || document.body;
    var css = 'body{margin:0;background:#fbfaf7;color:#222;font:16px/1.6 -apple-system,"Noto Sans KR",sans-serif}' +
      '@media(prefers-color-scheme:dark){body{background:#16171a;color:#ddd}input,textarea{background:#232529!important;color:#ddd!important;border-color:#3a3c42!important}.state{background:#232529!important;border-color:#3a3c42!important}}' +
      'main{max-width:560px;margin:0 auto;padding:22px 18px 60px}h1{font-size:22px;margin:0 0 6px}.s{color:#888;font-size:14px;margin:0 0 14px}' +
      'label{display:block;font-size:14px;font-weight:600;margin:18px 0 6px}input,textarea{width:100%;box-sizing:border-box;font:inherit;font-size:15px;padding:12px;border:1px solid #ddd;border-radius:12px;background:#fff;color:#222}' +
      'textarea{min-height:90px}#sa{min-height:120px;font:12px/1.4 ui-monospace,monospace}.h{font-size:13px;color:#888;margin-top:5px}' +
      'button{width:100%;min-height:52px;margin-top:16px;font:inherit;font-weight:600;border:0;border-radius:14px;background:#2f6fdb;color:#fff}' +
      'button.sec{background:transparent;color:inherit;border:1px solid #bbb}.state{font-size:14px;font-weight:600;padding:12px;border-radius:12px;border:1px solid #ddd;background:#fff}#msg{min-height:22px;margin-top:12px;font-size:14px;white-space:pre-wrap}';
    document.title = '\ubc88\uc5ed \uc124\uc815';
    app.innerHTML = '<style>' + css + '</style><main><h1>\ubc88\uc5ed \uc124\uc815</h1>' +
      '<p class="s">\uc5ec\uae30 \ub123\uc740 \ub0b4\uc6a9\uc740 Violentmonkey \ud655\uc7a5 \ud504\ub85c\uadf8\ub7a8 \uc548\uc5d0\ub9cc \uc800\uc7a5\ub3fc\uc694. \uc18c\uc124 \uc0ac\uc774\ud2b8\ub294 \ubcfc \uc218 \uc5c6\uc5b4\uc694.</p>' +
      '<div class="state" id="state"></div>' +
      '<label for="sa">\uc11c\ube44\uc2a4 \uacc4\uc815 JSON</label><textarea id="sa" autocomplete="off" spellcheck="false"></textarea>' +
      '<div class="h">\ucf5c\ub85c\ubaa8\uc5d0 \ub123\ub358 JSON \ud14d\uc2a4\ud2b8\ub97c \uadf8\ub300\ub85c \ubd99\uc5ec\ub123\uc73c\uc138\uc694. \uc774\ubbf8 \uc800\uc7a5\ud588\ub2e4\uba74 \ube44\uc6cc\ub450\uba74 \ub3fc\uc694.</div>' +
      '<label for="m">\ubaa8\ub378 \uc774\ub984</label><input id="m" autocomplete="off">' +
      '<label for="loc">\ub9ac\uc804</label><input id="loc" autocomplete="off"><div class="h">\ubcf4\ud1b5 global. \ubaa8\ub378\uc744 \ubabb \ucc3e\uc73c\uba74 \ub2e4\ub978 \ub9ac\uc804\uc744 \uc790\ub3d9\uc73c\ub85c \uc2dc\ub3c4\ud574\uc694.</div>' +
      '<label for="alt">\ub9c9\ud614\uc744 \ub54c \uc4f8 \ubaa8\ub378 (\uc120\ud0dd)</label><input id="alt" autocomplete="off" placeholder="\ube44\uc6cc\ub450\uba74 \uc0ac\uc6a9 \uc548 \ud568"><div class="h">\uc548\uc804 \ud544\ud130 \ub54c\ubb38\uc5d0 \ubc88\uc5ed\uc774 \ub9c9\ud78c \ubd80\ubd84\ub9cc \uc774 \ubaa8\ub378\ub85c \ub2e4\uc2dc \uc2dc\ub3c4\ud574\uc694. \uac19\uc740 \uad6c\uae00 \uacc4\uc815\uc5d0\uc11c \uc4f8 \uc218 \uc788\ub294 \ub2e4\ub978 Gemini \ubaa8\ub378 \uc774\ub984\uc744 \uc801\uc73c\uc138\uc694.</div>' +
      '<label for="g">\uc6a9\uc5b4\uc9d1 (\uc120\ud0dd)</label><textarea id="g" placeholder="\u6797\u51e1=\uc784\ubc94&#10;\u5929\u5143\u5b97=\ucc9c\uc6d0\uc885"></textarea><div class="h">\ud55c \uc904\uc5d0 \ud558\ub098\uc529.</div>' +
      '<button id="save">\uc800\uc7a5</button><button id="test" class="sec">\uc5f0\uacb0 \ud14c\uc2a4\ud2b8</button><button id="del" class="sec">\uc800\uc7a5\ub41c \ud0a4 \uc0ad\uc81c</button><div id="msg"></div></main>';
    var $ = function (id) { return document.getElementById(id); };
    function refresh() {
      C = gget('cfg', {}) || {};
      $('m').value = C.m || 'gemini-3.8-flash'; $('loc').value = C.loc || 'global'; $('g').value = C.g || ''; $('alt').value = C.alt || ''; $('sa').value = '';
      $('state').textContent = C.sa ? '\u2713 \ud0a4 \uc800\uc7a5\ub428: ' + C.sa.client_email : '\uc544\uc9c1 \ud0a4\uac00 \uc5c6\uc5b4\uc694. JSON\uc744 \ubd99\uc5ec\ub123\uace0 \uc800\uc7a5\ud574 \uc8fc\uc138\uc694.';
      $('state').style.color = C.sa ? '#2e8b57' : '';
    }
    function msg(t, ok) { $('msg').textContent = t; $('msg').style.color = ok ? '#2e8b57' : '#d9534f'; }
    $('save').onclick = function () {
      var n = { sa: C.sa, m: $('m').value.trim() || 'gemini-3.8-flash', loc: $('loc').value.trim() || 'global', g: $('g').value.trim(), alt: $('alt').value.trim(), safe: C.safe, noThink: (C.m === ($('m').value.trim() || 'gemini-3.8-flash')) ? C.noThink : 0 };
      var raw = $('sa').value.trim();
      if (raw) {
        var j; try { j = JSON.parse(raw); } catch (e) { return msg('JSON \ud615\uc2dd\uc774 \uc62c\ubc14\ub974\uc9c0 \uc54a\uc544\uc694. \ucc98\uc74c\ubd80\ud130 \ub05d\uae4c\uc9c0 \ube60\uc9d0\uc5c6\uc774 \ubd99\uc5ec\ub123\uc5c8\ub294\uc9c0 \ud655\uc778\ud558\uc138\uc694.'); }
        if (!j.private_key || !j.client_email || !j.project_id) return msg('JSON\uc5d0 private_key, client_email, project_id\uac00 \uc788\uc5b4\uc57c \ud574\uc694.');
        n.sa = { project_id: j.project_id, client_email: j.client_email, private_key: j.private_key };
        gdel('tok');
      }
      if (!n.sa) return msg('\uc11c\ube44\uc2a4 \uacc4\uc815 JSON\uc744 \ubd99\uc5ec\ub123\uc5b4 \uc8fc\uc138\uc694.');
      gset('cfg', n); refresh(); msg('\uc800\uc7a5\ud588\uc5b4\uc694. \uc18c\uc124 \ud0ed\uc73c\ub85c \ub3cc\uc544\uac00\uba74 \ubc14\ub85c \ubc88\uc5ed\uc744 \uc2dc\uc791\ud574\uc694.', true);
    };
    $('test').onclick = async function () {
      msg('\ud14c\uc2a4\ud2b8 \uc911\u2026', true);
      try { var o = await callApi('[\uc81c\ubaa9] \u6d4b\u8bd5\n\u4f60\u597d\uff0c\u4e16\u754c\u3002'); msg('\uc5f0\uacb0 \uc131\uacf5! \uc608\uc2dc \ubc88\uc5ed:\n' + o, true); }
      catch (e) { msg('\uc2e4\ud328: ' + e.message); }
    };
    $('del').onclick = function () { gdel('cfg'); gdel('tok'); refresh(); msg('\uc0ad\uc81c\ud588\uc5b4\uc694.', true); };
    refresh();
  }
})();
