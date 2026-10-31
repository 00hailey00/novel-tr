(function () {
  var BASE = ((document.currentScript && document.currentScript.src) || '').replace(/[?#].*$/, '').replace(/[^\/]*$/, '');
  if (!BASE) { alert('\uc2a4\ud06c\ub9bd\ud2b8 \uc8fc\uc18c\ub97c \uc54c \uc218 \uc5c6\uc5b4\uc694'); return; }
  var READER = 'nvtrReader';

  // ---- \uc6d0\ubcf8 \ud0ed: \ubc88\uc5ed \uc804\uc6a9 \ud0ed\uc744 \uc5f4\uac70\ub098(\uc788\uc73c\uba74 \uc7ac\uc0ac\uc6a9) \uadf8 \ud0ed\uc5d0\uc11c \ubc88\uc5ed \uc2dc\uc791 ----
  if (window.name !== READER) {
    var url = location.href, w = null, oldDoc = null;
    try { w = window.open('', READER); } catch (e) { }
    if (!w) {
      if (confirm('\uc0c8 \ud0ed\uc774 \ucc28\ub2e8\ub410\uc5b4\uc694. \uc774 \ud0ed\uc5d0\uc11c \ubc14\ub85c \ubc88\uc5ed\ud560\uae4c\uc694?')) { window.name = READER; }
      else return;
    } else {
      try { oldDoc = w.document; } catch (e) { }
      try { w.location.href = url; } catch (e) { w = window.open(url, READER); }
      try { w.focus(); } catch (e) { }
      var t0 = Date.now();
      (function poll() {
        var d = null;
        try { d = w.document; if (d === oldDoc || w.location.href === 'about:blank' || d.readyState === 'loading' || w.__oopTr) d = null; } catch (e) { d = null; }
        if (d) {
          var sc = d.createElement('script'); sc.src = BASE + 'tr.js?' + Date.now();
          (d.body || d.documentElement).appendChild(sc);
          return;
        }
        if (Date.now() - t0 < 40000) setTimeout(poll, 150);
      })();
      return;
    }
  }
  if (window.__oopTr) return;
  window.__oopTr = 1;

  var SEL = ['#content', '#chaptercontent', '#chapterContent', '#booktxt', '#nr1', '#htmlContent',
    '#txt', '#TextContent', '.read-content', '.readcontent', '.txtnav', '.content', 'article'];
  var NEXT = /\u4e0b\u4e00?[\u7ae0\u9875\u9801\u8282\u7bc0\u8bdd\u8a71\u7bc7\u5f20\u5f35\u56de]|[\u540e\u5f8c]\u4e00[\u7ae0\u9875\u9801\u8282\u7bc0]|^\s*next|next\s*(page|chapter)|\ub2e4\uc74c\s*[\ud654\uc7a5\ud398]/i;
  var PREV = /\u4e0a\u4e00?[\u7ae0\u9875\u9801\u8282\u7bc0\u8bdd\u8a71\u7bc7\u5f20\u5f35\u56de]|\u524d\u4e00[\u7ae0\u9875\u9801\u8282\u7bc0]|^\s*prev|previous|\uc774\uc804\s*[\ud654\uc7a5\ud398]/i;
  var NV = { next: /(?:next_?page|nextpage|next_?url|nexturl|next_?chapter|next_?link|nextlink)\s*[:=]\s*['"]([^'"]+)['"]/i,
    prev: /(?:pre(?:v|vious)?_?page|prevpage|prepage|prev?_?url|preurl|prev?_?chapter|prev?_?link)\s*[:=]\s*['"]([^'"]+)['"]/i };
  var LK = 'nvtrLinks';
  function learned() { try { return JSON.parse(localStorage.getItem(LK) || '{}'); } catch (e) { return {}; } }
  function learn(kind, t) { var L = learned(); L[location.host + ':' + kind] = t; try { localStorage.setItem(LK, JSON.stringify(L)); } catch (e) { } }

  function own(el) {
    var s = 0;
    for (var i = 0; i < el.childNodes.length; i++) {
      var n = el.childNodes[i];
      if (n.nodeType === 3) s += n.textContent.trim().length;
      else if (n.nodeType === 1 && /^(P|SPAN|FONT|BR)$/.test(n.tagName)) s += n.textContent.trim().length;
    }
    return s;
  }
  function findBody(doc) {
    for (var i = 0; i < SEL.length; i++) {
      var e = doc.querySelector(SEL[i]);
      if (e && own(e) > 200) return e;
    }
    var best = null, b = 0, all = doc.body.querySelectorAll('div,article,section,td,dd');
    for (var j = 0; j < all.length; j++) { var v = own(all[j]); if (v > b) { b = v; best = all[j]; } }
    return best;
  }
  function lines(el) {
    var c = el.cloneNode(true);
    c.querySelectorAll('script,style,a,button,ins,iframe,noscript,h1').forEach(function (x) { x.remove(); });
    c.querySelectorAll('br').forEach(function (x) { x.replaceWith('\n'); });
    c.querySelectorAll('p,div').forEach(function (x) { x.append('\n'); });
    return c.textContent.split(/\n+/).map(function (s) {
      return s.replace(/^[\s\u3000\u00a0]+|[\s\u3000\u00a0]+$/g, '');
    }).filter(Boolean);
  }
  function titleOf(doc) {
    var h = doc.querySelector('h1') || doc.querySelector('.bookname h1, .title, h2');
    return (h ? h.textContent : doc.title).trim();
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
    var i, L = learned()[location.host + ':' + kind];
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
    return { url: url, title: titleOf(doc), lines: lines(body), links: cands.filter(function (c) { return c.t; }).slice(0, 120),
      next: findLink(doc, url, 'next', cands), prev: findLink(doc, url, 'prev', cands) };
  }
  async function getDoc(u) {
    var r = await fetch(u, { credentials: 'include' });
    if (!r.ok) throw new Error('\ud398\uc774\uc9c0 \ubd88\ub7ec\uc624\uae30 \uc2e4\ud328 ' + r.status);
    var buf = await r.arrayBuffer();
    var m = (r.headers.get('content-type') || '').match(/charset=([\w-]+)/i), cs = m && m[1];
    if (!cs) {
      var head = new TextDecoder('windows-1252').decode(buf.slice(0, 4096));
      var mm = head.match(/charset=["']?([\w-]+)/i); cs = mm && mm[1];
    }
    var html;
    try { html = new TextDecoder(cs || 'utf-8').decode(buf); } catch (e) { html = new TextDecoder().decode(buf); }
    return new DOMParser().parseFromString(html, 'text/html');
  }

  var fr, frOrigin = new URL(BASE).origin, reqs = {}, seq = 0, readyRes, ready = new Promise(function (r) { readyRes = r; });
  function bridge() {
    fr = document.createElement('iframe');
    fr.src = BASE + 'bridge.html';
    fr.setAttribute('referrerpolicy', 'no-referrer');
    fr.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;border:0;z-index:2147483647;background:#fbfaf7;display:none';
    window.addEventListener('message', function (e) {
      if (e.source !== fr.contentWindow || e.origin !== frOrigin || !e.data || !e.data.nvtr) return;
      var d = e.data;
      if (d.type === 'needSetup') fr.style.display = 'block';
      else if (d.type === 'ready') {
        fr.style.display = 'none'; readyRes();
        if (d.prefs && (d.prefs.ts || 0) > (prefs.ts || 0) && typeof applyPrefs === 'function') {
          prefs = fill(d.prefs); try { localStorage.setItem(PK, JSON.stringify(prefs)); } catch (e) { } applyPrefs();
        } else if ((prefs.ts || 0) > ((d.prefs && d.prefs.ts) || 0)) {
          fr.contentWindow.postMessage({ nvtr: 1, type: 'setPrefs', prefs: prefs }, frOrigin);
        }
      }
      else if (d.type === 'closeSettings') fr.style.display = 'none';
      else if (d.type === 'result') {
        var q = reqs[d.id]; if (!q) return; delete reqs[d.id];
        d.error ? q.rej(new Error(d.error)) : q.res(d.out);
      }
    });
    document.body.appendChild(fr);
  }
  async function callApi(text, temp) {
    await ready;
    return new Promise(function (res, rej) {
      var id = ++seq; reqs[id] = { res: res, rej: rej };
      fr.contentWindow.postMessage({ nvtr: 1, type: 'translate', id: id, text: text, temp: temp }, frOrigin);
    });
  }

  var CK = '__oopTrCache';
  function cacheGet(u) { try { return JSON.parse(localStorage.getItem(CK) || '{}')[u]; } catch (e) { return null; } }
  function cacheDel(u) { try { var c = JSON.parse(localStorage.getItem(CK) || '{}'); delete c[u]; localStorage.setItem(CK, JSON.stringify(c)); } catch (e) { } }
  function cachePut(u, v) {
    var c; try { c = JSON.parse(localStorage.getItem(CK) || '{}'); } catch (e) { c = {}; }
    c[u] = v;
    var k = Object.keys(c); while (k.length > 60) delete c[k.shift()];
    for (var tries = 0; tries < 6; tries++) {
      try { localStorage.setItem(CK, JSON.stringify(c)); return; }
      catch (e) { k = Object.keys(c); if (k.length <= 1) return; k.slice(0, Math.ceil(k.length / 2)).forEach(function (x) { if (x !== u) delete c[x]; }); }
    }
  }
  // \ub9c9\ud788\uac70\ub098(\uc548\uc804 \ud544\ud130) \uc798\ub9ac\uba74(\uae38\uc774 \ucd08\uacfc) \ubc18\uc73c\ub85c \ub098\ub220 \ub2e4\uc2dc \uc2dc\ub3c4, \ub05d\uae4c\uc9c0 \ub9c9\ud788\ub294 \ud55c \uc904\uc740 \uc6d0\ubb38\uc73c\ub85c \ud45c\uc2dc
  var BLOCKED = /SAFETY|PROHIBITED|BLOCKLIST|SPII|RECITATION|OTHER|MAX_TOKENS|\ubc88\uc5ed \uacb0\uacfc \uc5c6\uc74c/i;
  async function translateLines(ls, depth, temp) {
    try {
      var out = (await callApi(ls.join('\n'), temp)).split(/\n+/).map(function (x) { return x.trim(); }).filter(Boolean);
      return out;
    } catch (e) {
      if (!BLOCKED.test(e.message) || depth > 6) throw e;
      if (ls.length === 1) return ['\u3014\ubc88\uc5ed \ucc28\ub2e8 \u2014 \uc6d0\ubb38\u3015 ' + ls[0]];
      var h = Math.ceil(ls.length / 2);
      var a1 = await translateLines(ls.slice(0, h), depth + 1, temp);
      var a2 = await translateLines(ls.slice(h), depth + 1, temp);
      return a1.concat(a2);
    }
  }
  async function translate(ch, onPart) {
    var hit = cacheGet(ch.url);
    if (hit && hit.lines && hit.lines.length) { onPart && onPart(hit.lines, hit.title); return hit; }
    var src = ['[\uc81c\ubaa9] ' + ch.title].concat(ch.lines), chunks = [], cur = [], n = 0;
    src.forEach(function (l) {
      if (n + l.length > (chunks.length ? 3000 : 1200) && cur.length) { chunks.push(cur); cur = []; n = 0; }
      cur.push(l); n += l.length + 1;
    });
    if (cur.length) chunks.push(cur);
    var title = ch.title, outLines = [];
    for (var i = 0; i < chunks.length; i++) {
      var res = await translateLines(chunks[i], 0, ch.retrans ? Math.min(1, 0.3 + 0.25 * ch.retrans) : undefined);
      res = res.filter(function (l) {
        var m = l.match(/^\[\uc81c\ubaa9\]\s*(.*)$/);
        if (m) { title = m[1] || title; return false; }
        return true;
      });
      outLines = outLines.concat(res);
      onPart && onPart(res, title);
    }
    if (!outLines.length) throw new Error('\ubc88\uc5ed \uacb0\uacfc\uac00 \ube44\uc5b4 \uc788\uc5b4\uc694');
    var v = { title: title, lines: outLines };
    cachePut(ch.url, v);
    return v;
  }

  var THEMES = {
    auto: null,
    light: { n: '\ubc1d\uac8c', bg: '#fbfaf7', fg: '#222222', mut: '#8a8a8a', card: '#ffffff', bd: '#e0ddd6', ac: '#2f6fdb' },
    paper: { n: '\uc885\uc774', bg: '#f4ecd8', fg: '#4a3b2a', mut: '#9a8a73', card: '#fbf5e6', bd: '#dccfb0', ac: '#a0522d' },
    green: { n: '\uc5f0\ub450', bg: '#e4edd3', fg: '#28331f', mut: '#7d8a6c', card: '#eef4e2', bd: '#c8d6b0', ac: '#3d7a3a' },
    gray: { n: '\ud68c\uc0c9', bg: '#3a3d42', fg: '#e2e2e2', mut: '#a0a3a8', card: '#45494f', bd: '#5a5e65', ac: '#8fb2ff' },
    dark: { n: '\uc5b4\ub461\uac8c', bg: '#16171a', fg: '#d6d6d6', mut: '#888888', card: '#232529', bd: '#383a40', ac: '#6ea0ff' },
    black: { n: '\ube14\ub799', bg: '#000000', fg: '#b8b8b8', mut: '#6d6d6d', card: '#141414', bd: '#2a2a2a', ac: '#5b8def' }
  };
  var FONTS = {
    sys: { n: '\uae30\ubcf8', f: '-apple-system,"Noto Sans KR",sans-serif' },
    notoserif: { n: '\ubcf8\uba85\uc870', f: '"Noto Serif KR",serif', g: 'Noto+Serif+KR:wght@400;700' },
    gowunbatang: { n: '\uace0\uc6b4\ubc14\ud0d5', f: '"Gowun Batang",serif', g: 'Gowun+Batang:wght@400;700' },
    nanummj: { n: '\ub098\ub214\uba85\uc870', f: '"Nanum Myeongjo",serif', g: 'Nanum+Myeongjo:wght@400;700' },
    notosans: { n: '\ubcf8\uace0\ub515', f: '"Noto Sans KR",sans-serif', g: 'Noto+Sans+KR:wght@400;700' },
    nanumgothic: { n: '\ub098\ub214\uace0\ub515', f: '"Nanum Gothic",sans-serif', g: 'Nanum+Gothic:wght@400;700' },
    gowundodum: { n: '\uace0\uc6b4\ub3cb\uc6c0', f: '"Gowun Dodum",sans-serif', g: 'Gowun+Dodum' }
  };
  var STEPS = [
    ['fs', '\uae00\uc790 \ud06c\uae30', 1, 12, 32, function (v) { return v + 'px'; }],
    ['lh', '\uc904 \uac04\uaca9', 0.1, 1.3, 2.6, function (v) { return v.toFixed(1); }],
    ['ps', '\ubb38\ub2e8 \uac04\uaca9', 0.2, 0, 2.4, function (v) { return v.toFixed(1); }],
    ['pad', '\uc88c\uc6b0 \uc5ec\ubc31', 4, 8, 60, function (v) { return v + 'px'; }],
    ['mw', '\ubcf8\ubb38 \ud3ed', 40, 400, 1000, function (v) { return v + 'px'; }]
  ];
  var PK = 'nvtrPrefs';
  var DEF = { theme: 'auto', font: 'sys', fs: 18, lh: 1.85, ps: 0.9, mw: 680, pad: 22, ind: 0, auto: 1, ts: 0 };
  // \uc124\uc815\uc744 \uc138 \uad70\ub370(\uc0ac\uc774\ud2b8 \uc800\uc7a5\uc18c \u00b7 \ucfe0\ud0a4(www \uc720\ubb34 \uacf5\ud1b5) \u00b7 \uc124\uc815 \ud398\uc774\uc9c0 \uc800\uc7a5\uc18c)\uc5d0 \uac19\uc774 \uc800\uc7a5\ud558\uace0, \uac00\uc7a5 \ucd5c\uadfc \uac83\uc744 \uc500
  var CDOM = location.hostname.replace(/^www\./, '');
  function readCookie() {
    var m = document.cookie.match(/(?:^|;\s*)nvtrPrefs=([^;]*)/);
    try { return m ? JSON.parse(decodeURIComponent(m[1])) : null; } catch (e) { return null; }
  }
  function readLocal() { try { return JSON.parse(localStorage.getItem(PK) || 'null'); } catch (e) { return null; } }
  function pickNewest() {
    var best = null;
    [].slice.call(arguments).forEach(function (p) { if (p && typeof p === 'object' && (!best || (p.ts || 0) > (best.ts || 0))) best = p; });
    return best;
  }
  function fill(p) { p = p || {}; Object.keys(DEF).forEach(function (k) { if (p[k] == null) p[k] = DEF[k]; }); return p; }
  var prefs = fill(JSON.parse(JSON.stringify(pickNewest(readLocal(), readCookie()) || {})));
  function savePrefs() {
    prefs.ts = Date.now();
    var j = JSON.stringify(prefs);
    try { localStorage.setItem(PK, j); } catch (e) { }
    try {
      var c = 'nvtrPrefs=' + encodeURIComponent(j) + ';path=/;max-age=31536000;SameSite=Lax';
      document.cookie = c + ';domain=' + CDOM;
      if (!readCookie()) document.cookie = c;
    } catch (e) { }
    try { fr && fr.contentWindow && fr.contentWindow.postMessage({ nvtr: 1, type: 'setPrefs', prefs: prefs }, frOrigin); } catch (e) { }
  }
  var loadedFonts = {};
  function loadFont(key) {
    var F = FONTS[key]; if (!F || !F.g || loadedFonts[key]) return; loadedFonts[key] = 1;
    var l = document.createElement('link'); l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=' + F.g + '&display=swap';
    document.head.appendChild(l);
  }

  // ---- \uccab \ud654 \uc77d\uae30 ----
  var first;
  try { first = chapterOf(document, location.href); } catch (e) { alert(e.message); window.__oopTr = 0; return; }

  // ---- \uc0ac\uc774\ud2b8 \uc815\ub9ac: \uad11\uace0 \ud0c0\uc774\uba38\u00b7\ud31d\uc5c5\u00b7\uc2a4\ud0c0\uc77c \uc81c\uac70 ----
  try { var mx = setTimeout(function () { }, 0); for (var ti = 0; ti <= mx + 50; ti++) { clearTimeout(ti); clearInterval(ti); } } catch (e) { }
  try { window.open = function () { return null; }; } catch (e) { }
  [].slice.call(document.querySelectorAll('link[rel~="stylesheet"],style,iframe')).forEach(function (x) { x.remove(); });
  document.head.insertAdjacentHTML('beforeend', '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">');
  document.body.innerHTML = '';
  document.body.style.cssText = 'margin:0;padding:0;overflow:hidden;background:none';
  document.documentElement.style.cssText = 'overflow:hidden';
  document.title = '\ubc88\uc5ed \uc911\u2026';

  var css = [
    '.app{position:fixed;inset:0;font-family:var(--font);background:var(--bg);color:var(--fg);-webkit-tap-highlight-color:transparent;-webkit-text-size-adjust:100%;transition:background .25s,color .25s}',
    '*{box-sizing:border-box;margin:0;padding:0;font:inherit;color:inherit}',
    'button{background:none;border:0;cursor:pointer;-webkit-user-select:none;user-select:none;touch-action:manipulation}',
    '.sc{position:absolute;inset:0;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}',
    '.wrap{position:relative;max-width:var(--mw);margin:0 auto;padding:calc(62px + env(safe-area-inset-top)) var(--pad) 0}',
    'section h2{font-size:calc(var(--fs) * 1.25);font-weight:700;line-height:1.4;margin:10px 0 30px;letter-spacing:-.02em}',
    'section p{font-size:var(--fs);line-height:var(--lh);margin-bottom:var(--ps);text-indent:var(--ind);word-break:keep-all;overflow-wrap:anywhere;letter-spacing:-.01em}',
    '.st{font-size:14px;color:var(--mut);padding:18px 0;display:flex;align-items:center;gap:10px}',
    '.st:before{content:"";width:16px;height:16px;border-radius:50%;border:2px solid var(--bd);border-top-color:var(--ac);animation:sp 0.9s linear infinite;flex:none}',
    '@keyframes sp{to{transform:rotate(360deg)}}',
    '.er{font-size:14px;color:#e5534b;white-space:pre-wrap;padding:14px 0}',
    '.sep{display:flex;align-items:center;gap:12px;margin:64px 0 40px;color:var(--mut);font-size:12px}',
    '.sep:before,.sep:after{content:"";flex:1;height:1px;background:var(--bd)}',
    '.tail{max-width:var(--mw);margin:0 auto;padding:28px var(--pad) calc(150px + env(safe-area-inset-bottom));text-align:center;color:var(--mut);font-size:14px}',
    '.btn{display:inline-flex;align-items:center;justify-content:center;min-height:50px;padding:0 24px;border-radius:16px;border:1px solid var(--bd);background:var(--card);font-size:15px;font-weight:600;margin-top:14px}',
    '.mini{display:inline-flex;align-items:center;min-height:44px;padding:0 14px;margin-top:22px;border-radius:12px;border:1px solid var(--bd);font-size:13px;color:var(--mut)}',
    '.btn.pri{background:var(--ac);border-color:var(--ac);color:#fff}',
    '.top{position:fixed;top:0;left:0;right:0;z-index:3;padding:calc(13px + env(safe-area-inset-top)) 20px 12px;text-align:center;font-size:14px;font-weight:600;color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;',
    'background:color-mix(in srgb,var(--bg) 84%,transparent);-webkit-backdrop-filter:saturate(1.8) blur(16px);backdrop-filter:saturate(1.8) blur(16px);border-bottom:1px solid color-mix(in srgb,var(--bd) 55%,transparent);transition:transform .3s cubic-bezier(.2,.8,.2,1)}',
    '.bar{position:fixed;left:50%;bottom:calc(14px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:3;display:flex;gap:4px;padding:5px;border-radius:999px;',
    'background:color-mix(in srgb,var(--card) 82%,transparent);-webkit-backdrop-filter:saturate(1.8) blur(18px);backdrop-filter:saturate(1.8) blur(18px);border:1px solid color-mix(in srgb,var(--bd) 70%,transparent);box-shadow:0 10px 30px rgba(0,0,0,.18);transition:transform .3s cubic-bezier(.2,.8,.2,1),opacity .25s}',
    '.bar button{min-height:54px;min-width:56px;padding:0 20px;border-radius:999px;font-size:16px;font-weight:600;white-space:nowrap;transition:transform .12s,background .2s}',
    '.bar button:active,.btn:active,.pn button:active{transform:scale(.95)}',
    '.bar .nx{background:var(--ac);color:#fff}',
    '.bar .aa{font-size:19px;font-weight:700;letter-spacing:-.03em}',
    '.bar .off{opacity:.35}',
    '.app.hide .bar{transform:translate(-50%,calc(100% + 40px));opacity:0}',
    '.app.hide .top{transform:translateY(-110%)}',
    '.scrim{position:fixed;inset:0;z-index:5;background:rgba(0,0,0,.38);opacity:0;pointer-events:none;transition:opacity .25s}',
    '.app.sheet .scrim{opacity:1;pointer-events:auto}',
    '.pn{position:fixed;left:0;right:0;bottom:0;z-index:6;max-height:84vh;overflow-y:auto;overscroll-behavior:contain;background:var(--card);border-radius:24px 24px 0 0;padding:8px 22px calc(26px + env(safe-area-inset-bottom));',
    'box-shadow:0 -12px 40px rgba(0,0,0,.25);transform:translateY(105%);transition:transform .32s cubic-bezier(.2,.8,.2,1);font-family:-apple-system,"Noto Sans KR",sans-serif;font-size:15px}',
    '.app.sheet .pn{transform:none}',
    '.pn .grab{width:42px;height:5px;border-radius:3px;background:var(--bd);margin:6px auto 16px}',
    '.pn .hd{display:flex;align-items:center;justify-content:space-between}',
    '.pn h3{font-size:19px;font-weight:700}',
    '.pn .x{width:44px;height:44px;border-radius:50%;font-size:22px;color:var(--mut)}',
    '.pn .lb{font-size:13px;color:var(--mut);margin:20px 0 10px;font-weight:600}',
    '.pn .row{display:flex;flex-wrap:wrap;gap:10px}',
    '.pn .sw{width:46px;height:46px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600}',
    '.pn .sw.sel{box-shadow:0 0 0 3px var(--card),0 0 0 5px var(--ac)}',
    '.pn .ch{min-height:46px;padding:0 16px;border-radius:14px;border:1px solid var(--bd);font-size:15px}',
    '.pn .ch.sel{border-color:var(--ac);background:color-mix(in srgb,var(--ac) 14%,transparent);color:var(--ac);font-weight:700}',
    '.pn .stp{display:flex;align-items:center;justify-content:space-between;min-height:58px;border-bottom:1px solid color-mix(in srgb,var(--bd) 55%,transparent)}',
    '.pn .ctl{display:flex;align-items:center;gap:6px}',
    '.pn .ctl button{width:50px;height:44px;border-radius:14px;border:1px solid var(--bd);font-size:22px;line-height:1}',
    '.pn .ctl b{min-width:66px;text-align:center;font-weight:600;font-variant-numeric:tabular-nums}',
    '.pn .wide{display:flex;width:100%;min-height:52px;align-items:center;justify-content:center;border-radius:16px;border:1px solid var(--bd);font-size:15px;margin-top:12px}',
    '.pn .hint{font-size:13px;color:var(--mut);margin:6px 0 10px;line-height:1.55}',
    '.pn .li{display:block;width:100%;text-align:left;padding:12px 4px;min-height:54px;border-bottom:1px solid color-mix(in srgb,var(--bd) 55%,transparent)}',
    '.pn .li b{display:block;font-size:15px;font-weight:600;line-height:1.4}',
    '.pn .li small{display:block;font-size:12px;color:var(--mut);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:2px}',
    '.toast{position:fixed;left:50%;bottom:calc(100px + env(safe-area-inset-bottom));transform:translate(-50%,16px);z-index:8;background:rgba(28,28,30,.94);color:#fff;padding:12px 18px;border-radius:14px;font-size:14px;opacity:0;pointer-events:none;transition:opacity .25s,transform .25s;max-width:86vw;text-align:center}',
    '.toast.on{opacity:1;transform:translate(-50%,0)}',
    '@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}'
  ].join('\n');

  var host = document.createElement('div');
  host.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:2147483646;display:block';
  document.body.appendChild(host);
  var root = host.attachShadow({ mode: 'open' });
  root.innerHTML = '<style>' + css + '</style>' +
    '<div class="app"><div class="sc"><main class="wrap"></main><div class="tail"></div></div>' +
    '<header class="top"></header>' +
    '<nav class="bar"><button data-act="prev">\u2039 \uc774\uc804</button><button class="aa" data-act="aa">Aa</button><button class="nx" data-act="next">\ub2e4\uc74c \ud654 \u203a</button></nav>' +
    '<div class="scrim" data-act="close"></div><div class="pn"></div><div class="toast"></div></div>';
  var $ = function (q) { return root.querySelector(q); };
  var app = $('.app'), sc = $('.sc'), wrap = $('.wrap'), tail = $('.tail'), top = $('.top'),
    pn = $('.pn'), toastEl = $('.toast'), prevBtn = $('[data-act=prev]');

  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  var toastT;
  function toast(t) { toastEl.textContent = t; toastEl.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('on'); }, 2200); }
  function buzz() { try { navigator.vibrate && navigator.vibrate(8); } catch (e) { } }

  function applyPrefs() {
    var t = THEMES[prefs.theme] || (matchMedia('(prefers-color-scheme: dark)').matches ? THEMES.dark : THEMES.light);
    var F = FONTS[prefs.font] || FONTS.sys; loadFont(prefs.font);
    var v = { '--bg': t.bg, '--fg': t.fg, '--mut': t.mut, '--card': t.card, '--bd': t.bd, '--ac': t.ac, '--font': F.f,
      '--fs': prefs.fs + 'px', '--lh': prefs.lh, '--ps': prefs.ps + 'em', '--mw': prefs.mw + 'px', '--pad': prefs.pad + 'px',
      '--ind': prefs.ind ? '1em' : '0' };
    Object.keys(v).forEach(function (k) { app.style.setProperty(k, v[k]); });
    document.documentElement.style.background = t.bg;
    var mc = document.querySelector('meta[name=theme-color]');
    if (!mc) { mc = document.createElement('meta'); mc.name = 'theme-color'; document.head.appendChild(mc); }
    mc.content = t.bg;
    if (pn.dataset.mode === 'set') syncPanel();
  }

  // ---- \uc124\uc815 \uc2dc\ud2b8 ----
  function buildPanel() {
    var h = '<div class="grab"></div><div class="hd"><h3>\ubcf4\uae30 \uc124\uc815</h3><button class="x" data-act="close">\u2715</button></div>';
    h += '<div class="lb">\ud14c\ub9c8</div><div class="row">';
    Object.keys(THEMES).forEach(function (k) {
      var T = THEMES[k];
      var st = T ? 'background:' + T.bg + ';color:' + T.fg + ';border:1px solid ' + T.bd
        : 'background:linear-gradient(135deg,#fbfaf7 50%,#16171a 50%);color:#888;border:1px solid #999';
      h += '<button class="sw" data-act="theme" data-v="' + k + '" style="' + st + '" aria-label="' + (T ? T.n : '\uc790\ub3d9') + '">' + (T ? T.n : '\uc790\ub3d9') + '</button>';
    });
    h += '</div><div class="lb">\uae00\uaf34</div><div class="row">';
    Object.keys(FONTS).forEach(function (k) {
      h += '<button class="ch" data-act="font" data-v="' + k + '" style="font-family:' + FONTS[k].f.replace(/"/g, '&quot;') + '">' + FONTS[k].n + '</button>';
    });
    h += '</div><div class="lb">\uac04\uaca9</div>';
    STEPS.forEach(function (s) {
      h += '<div class="stp"><span>' + s[1] + '</span><div class="ctl"><button data-act="step" data-v="' + s[0] + '" data-d="-1" aria-label="\uc904\uc774\uae30">\u2212</button><b data-k="' + s[0] + '"></b><button data-act="step" data-v="' + s[0] + '" data-d="1" aria-label="\ub298\ub9ac\uae30">+</button></div></div>';
    });
    h += '<div class="lb">\ub4e4\uc5ec\uc4f0\uae30 \u00b7 \uc790\ub3d9 \uc774\uc5b4 \uc77d\uae30</div><div class="row">' +
      '<button class="ch" data-act="ind" data-v="0">\ub4e4\uc5ec\uc4f0\uae30 \ub054</button><button class="ch" data-act="ind" data-v="1">\ub4e4\uc5ec\uc4f0\uae30 \ucf2c</button>' +
      '<button class="ch" data-act="autoNext" data-v="1">\ub2e4\uc74c \ud654 \uc790\ub3d9 \uc774\uc5b4\ubd99\uc774\uae30</button></div>';
    h += '<button class="wide" data-act="retrans">\u21bb \uc9c0\uae08 \ubcf4\ub294 \ud654 \ub2e4\uc2dc \ubc88\uc5ed</button>' +
      '<button class="wide" data-act="reset">\ubcf4\uae30 \uc124\uc815 \ucd08\uae30\ud654</button>' +
      '<button class="wide" data-act="api">\u2699 \ubc88\uc5ed \uc124\uc815 (\ud0a4 \u00b7 \ubaa8\ub378 \u00b7 \uc6a9\uc5b4\uc9d1)</button>';
    pn.innerHTML = h;
  }
  function syncPanel() {
    [].forEach.call(pn.querySelectorAll('[data-act=theme]'), function (b) { b.classList.toggle('sel', b.dataset.v === prefs.theme); });
    [].forEach.call(pn.querySelectorAll('[data-act=font]'), function (b) { b.classList.toggle('sel', b.dataset.v === prefs.font); });
    [].forEach.call(pn.querySelectorAll('[data-act=ind]'), function (b) { b.classList.toggle('sel', +b.dataset.v === +prefs.ind); });
    pn.querySelector('[data-act=autoNext]').classList.toggle('sel', !!prefs.auto);
    STEPS.forEach(function (s) { pn.querySelector('b[data-k=' + s[0] + ']').textContent = s[5](prefs[s[0]]); });
  }
  function openSheet() { if (pn.dataset.mode !== 'set') { buildPanel(); pn.dataset.mode = 'set'; } syncPanel(); app.classList.add('sheet'); }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var pickItem = null;
  function openPicker(kind, item) {
    pickItem = item; pn.dataset.mode = 'pick';
    var nm = kind === 'next' ? '\ub2e4\uc74c \ud654' : '\uc774\uc804 \ud654';
    var h = '<div class="grab"></div><div class="hd"><h3>' + nm + ' \ub9c1\ud06c \uace0\ub974\uae30</h3><button class="x" data-act="close">\u2715</button></div>' +
      '<p class="hint">' + nm + ' \ub9c1\ud06c\ub97c \uc790\ub3d9\uc73c\ub85c \ubabb \ucc3e\uc558\uc5b4\uc694. \uc6d0\ubcf8 \ud398\uc774\uc9c0\uc5d0 \uc788\ub358 \ub9c1\ud06c \uc911\uc5d0\uc11c ' + nm + '\ub85c \uac00\ub294 \uac78 \ub20c\ub7ec\uc8fc\uc138\uc694. \ud55c \ubc88 \uace0\ub974\uba74 \uc774 \uc0ac\uc774\ud2b8\uc5d0\uc11c\ub294 \uae30\uc5b5\ud574\uc694.</p>';
    var ls = item.ch.links || [];
    if (!ls.length) h += '<p class="hint">\uc6d0\ubcf8 \ud398\uc774\uc9c0\uc5d0\uc11c \ub9c1\ud06c\ub97c \ud558\ub098\ub3c4 \ucc3e\uc9c0 \ubabb\ud588\uc5b4\uc694.</p>';
    ls.forEach(function (c, i) {
      h += '<button class="li" data-act="pickLink" data-k="' + kind + '" data-i="' + i + '"><b>' + esc(c.t.slice(0, 60)) + '</b><small>' + esc(c.u.replace(/^https?:\/\/[^\/]+/, '')) + '</small></button>';
    });
    pn.innerHTML = h; pn.scrollTop = 0; app.classList.add('sheet');
  }
  function closeSheet() { app.classList.remove('sheet'); }

  // ---- \ud654 \ud45c\uc2dc ----
  var pending = {}, chapters = [], appending = false;
  function startTranslate(ch) {
    if (!pending[ch.url]) pending[ch.url] = { ch: ch, parts: [], title: null, done: null, subs: [] };
    var P = pending[ch.url];
    if (!P.done) {
      P.done = translate(ch, function (ls, t) { P.title = t; P.parts.push(ls); P.subs.forEach(function (f) { f(ls, t); }); });
    }
    return P;
  }
  async function prefetch(url) {
    try { var d = await getDoc(url); var ch = chapterOf(d, url); startTranslate(ch); return ch; }
    catch (e) { return { err: e }; }
  }
  function show(ch, old) {
    var sec = el('section'), h = el('h2', null, ch.title), st = el('div', 'st', '\ubc88\uc5ed \uc911\u2026');
    sec.appendChild(h); sec.appendChild(st);
    var item = { ch: ch, sec: sec, title: ch.title, done: false, failed: false, nextP: null };
    var oi = old ? chapters.indexOf(old) : -1;
    if (oi >= 0) { old.sec.replaceWith(sec); chapters[oi] = item; }
    else { wrap.appendChild(sec); chapters.push(item); }
    var P = startTranslate(ch), t0 = Date.now();
    var tm = setInterval(function () { st.textContent = '\ubc88\uc5ed \uc911\u2026 ' + Math.round((Date.now() - t0) / 1000) + '\ucd08'; }, 1000);
    function add(ls, t) { h.textContent = t; item.title = t; ls.forEach(function (l) { sec.insertBefore(el('p', null, l), st); }); }
    P.parts.forEach(function (ls) { add(ls, P.title); });
    P.subs.push(add);
    updateTail();
    return P.done.then(function (v) {
      clearInterval(tm); st.remove(); h.textContent = v.title; item.title = v.title; item.done = true;
      var rt = el('button', 'mini', '\u21bb \uc774 \ud654 \ub2e4\uc2dc \ubc88\uc5ed'); rt.dataset.act = 'retrans'; rt._item = item; sec.appendChild(rt);
      if (ch.next) item.nextP = prefetch(ch.next);
      updateTail(); onScroll();
      return item;
    }, function (e) {
      clearInterval(tm); item.failed = true;
      st.className = 'er'; st.textContent = '\ubc88\uc5ed \uc2e4\ud328: ' + e.message;
      var rb = el('button', 'btn pri', '\ub2e4\uc2dc \uc2dc\ub3c4'); rb.dataset.act = 'retry'; rb._item = item; sec.appendChild(rb);
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
      var pb = el('button', 'btn pri', '\ub2e4\uc74c \ud654 \ub9c1\ud06c \uc9c1\uc811 \uace0\ub974\uae30'); pb.dataset.act = 'pick'; pb.dataset.k = 'next'; tail.appendChild(pb); return;
    }
    if (appending) { tail.appendChild(el('div', 'st', '\ub2e4\uc74c \ud654 \ubd88\ub7ec\uc624\ub294 \uc911\u2026')); return; }
    if (L.nextErr) {
      tail.appendChild(el('div', 'er', '\ub2e4\uc74c \ud654\ub97c \ubd88\ub7ec\uc624\uc9c0 \ubabb\ud588\uc5b4\uc694: ' + L.nextErr));
      var b = el('button', 'btn pri', '\ub2e4\uc2dc \uc2dc\ub3c4'); b.dataset.act = 'nextRetry'; tail.appendChild(b); return;
    }
    var nb = el('button', 'btn pri', '\ub2e4\uc74c \ud654 \uc774\uc5b4\uc11c \uc77d\uae30'); nb.dataset.act = 'next'; tail.appendChild(nb);
  }
  async function appendNext() {
    var L = lastItem();
    if (!L || !L.done || appending || !L.ch.next) return null;
    appending = true; L.nextErr = null; updateTail();
    if (!L.nextP) L.nextP = prefetch(L.ch.next);
    var nch = await L.nextP;
    appending = false;
    if (nch.err) { L.nextErr = nch.err.message; L.nextP = null; updateTail(); return null; }
    if (chapters.some(function (c) { return c.ch.url === nch.url; })) { L.ch.next = null; updateTail(); toast('\ub2e4\uc74c \ud654 \ub9c1\ud06c\uac00 \uc774\ubbf8 \uc77d\uc740 \ud654\ub97c \uac00\ub9ac\ucf1c\uc694'); return null; }
    wrap.appendChild(el('div', 'sep', '\ub2e4\uc74c \ud654'));
    show(nch);
    return lastItem();
  }
  var progScroll = 0;
  function scrollToItem(it) { progScroll = Date.now(); sc.scrollTo({ top: Math.max(0, it.sec.offsetTop - 70), behavior: 'smooth' }); }
  function curIndex() {
    var y = sc.scrollTop + sc.clientHeight * 0.3, idx = 0;
    for (var i = 0; i < chapters.length; i++) { if (chapters[i].sec.offsetTop <= y) idx = i; }
    return idx;
  }

  // ---- \uc2a4\ud06c\ub864: \uc9c4\ud589\ubc14 \u00b7 \ud604\uc7ac \ud654 \u00b7 \ud234\ubc14 \uc790\ub3d9 \uc228\uae40 \u00b7 \uc790\ub3d9 \uc774\uc5b4 \uc77d\uae30 ----
  var lastTop = 0, ticking = false, curShown = -1;
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var st = sc.scrollTop, vh = sc.clientHeight, i = curIndex(), it = chapters[i];
      if (it) {
        if (i !== curShown || top.textContent !== it.title) {
          curShown = i; top.textContent = it.title; document.title = it.title;
          try { history.replaceState(null, '', it.ch.url); } catch (e) { }
        }
      }
      var d = st - lastTop;
      if (st + vh >= sc.scrollHeight - 40) app.classList.remove('hide');
      else if (d > 8 && st > 120 && Date.now() - progScroll > 1200 && !app.classList.contains('sheet')) app.classList.add('hide');
      else if (d < -8) app.classList.remove('hide');
      lastTop = st;
      if (it) savePos(it, st);
      if (prefs.auto && st + vh > sc.scrollHeight - vh * 1.5) appendNext();
    });
  }
  sc.addEventListener('scroll', onScroll, { passive: true });

  // ---- \uc77d\ub358 \uc704\uce58 \uae30\uc5b5 ----
  var POS = 'nvtrPos', posT = 0, posReady = false;
  function savePos(it, st) {
    if (!posReady || Date.now() - posT < 800) return; posT = Date.now();
    try { localStorage.setItem(POS, JSON.stringify({ u: it.ch.url, y: st - it.sec.offsetTop })); } catch (e) { }
  }
  function restorePos(item) {
    try {
      var p = JSON.parse(localStorage.getItem(POS) || 'null');
      if (p && p.u === item.ch.url && p.y > 200) { progScroll = Date.now(); sc.scrollTop = item.sec.offsetTop + p.y; toast('\uc77d\ub358 \uc704\uce58\ub85c \ub3cc\uc544\uc654\uc5b4\uc694'); }
    } catch (e) { }
    posReady = true;
  }

  // ---- \ub3d9\uc791 ----
  async function act(name, t) {
    buzz();
    if (name === 'aa') { app.classList.contains('sheet') ? closeSheet() : openSheet(); return; }
    if (name === 'close') { closeSheet(); return; }
    if (name === 'theme') { prefs.theme = t.dataset.v; savePrefs(); applyPrefs(); return; }
    if (name === 'font') { prefs.font = t.dataset.v; savePrefs(); applyPrefs(); return; }
    if (name === 'ind') { prefs.ind = +t.dataset.v; savePrefs(); applyPrefs(); return; }
    if (name === 'autoNext') { prefs.auto = prefs.auto ? 0 : 1; savePrefs(); applyPrefs(); toast(prefs.auto ? '\ub05d\uae4c\uc9c0 \uc77d\uc73c\uba74 \ub2e4\uc74c \ud654\uac00 \uc790\ub3d9\uc73c\ub85c \ubd99\uc5b4\uc694' : '\uc790\ub3d9 \uc774\uc5b4\ubd99\uc774\uae30\ub97c \uaed0\uc5b4\uc694'); return; }
    if (name === 'step') {
      var S = STEPS.filter(function (s) { return s[0] === t.dataset.v; })[0];
      var x = Math.round((prefs[S[0]] + S[2] * +t.dataset.d) * 100) / 100;
      prefs[S[0]] = Math.min(S[4], Math.max(S[3], x)); savePrefs(); applyPrefs(); return;
    }
    if (name === 'reset') { prefs = fill({}); savePrefs(); applyPrefs(); toast('\ubcf4\uae30 \uc124\uc815\uc744 \ucd08\uae30\ud654\ud588\uc5b4\uc694'); return; }
    if (name === 'api') { closeSheet(); fr.style.display = 'block'; fr.contentWindow.postMessage({ nvtr: 1, type: 'settings' }, frOrigin); return; }
    if (name === 'retry') { var it = t._item; delete pending[it.ch.url]; show(it.ch, it); return; }
    if (name === 'retrans') {
      var rit = t._item || chapters[curIndex()];
      if (!rit) return;
      if (!rit.done && !rit.failed) { toast('\uc544\uc9c1 \ubc88\uc5ed \uc911\uc774\uc5d0\uc694'); return; }
      closeSheet(); cacheDel(rit.ch.url); delete pending[rit.ch.url];
      var ridx = chapters.indexOf(rit);
      rit.ch.retrans = (rit.ch.retrans || 0) + 1;
      show(rit.ch, rit);
      if (chapters[ridx]) scrollToItem(chapters[ridx]);
      toast('\uc774 \ud654\ub97c \ub2e4\uc2dc \ubc88\uc5ed\ud558\uace0 \uc788\uc5b4\uc694');
      return;
    }
    if (name === 'pick') { openPicker(t.dataset.k, lastItem()); return; }
    if (name === 'pickLink') {
      var k = t.dataset.k, c = pickItem.ch.links[+t.dataset.i];
      learn(k, c.t); pickItem.ch[k] = c.u; closeSheet();
      if (k === 'next') { pickItem.nextP = null; pickItem.nextErr = null; toast('\uae30\uc5b5\ud588\uc5b4\uc694. \ub2e4\uc74c \ud654\ub97c \ubd88\ub7ec\uc62c\uac8c\uc694'); var nn = await appendNext(); if (nn) scrollToItem(nn); }
      else { toast('\uae30\uc5b5\ud588\uc5b4\uc694. \uc774\uc804 \ud654\ub97c \ubd88\ub7ec\uc62c\uac8c\uc694'); act('prev', t); }
      return;
    }
    if (name === 'nextRetry') { lastItem().nextP = null; appendNext(); return; }
    if (name === 'next') {
      var i = curIndex();
      if (chapters[i + 1]) { scrollToItem(chapters[i + 1]); return; }
      var L = lastItem();
      if (!L.done) { toast(L.failed ? '\uc774\ubc88 \ud654 \ubc88\uc5ed\uc774 \uc2e4\ud328\ud588\uc5b4\uc694. \ub2e4\uc2dc \uc2dc\ub3c4\ub97c \ub20c\ub7ec\uc8fc\uc138\uc694' : '\uc774\ubc88 \ud654\ub97c \uc544\uc9c1 \ubc88\uc5ed\ud558\uace0 \uc788\uc5b4\uc694'); return; }
      if (!L.ch.next) { openPicker('next', L); return; }
      toast('\ub2e4\uc74c \ud654\ub97c \ubd88\ub7ec\uc624\uace0 \uc788\uc5b4\uc694');
      var n = await appendNext();
      if (n) scrollToItem(n);
      return;
    }
    if (name === 'prev') {
      var j = curIndex();
      if (chapters[j - 1]) { scrollToItem(chapters[j - 1]); return; }
      var C0 = chapters[j];
      if (!C0) return;
      if (!C0.ch.prev) { openPicker('prev', C0); return; }
      toast('\uc774\uc804 \ud654\ub97c \ubd88\ub7ec\uc624\uace0 \uc788\uc5b4\uc694');
      var pc = await prefetch(C0.ch.prev);
      if (pc.err) { toast('\uc774\uc804 \ud654\ub97c \ubd88\ub7ec\uc624\uc9c0 \ubabb\ud588\uc5b4\uc694'); return; }
      chapters = []; wrap.innerHTML = ''; sc.scrollTop = 0; curShown = -1;
      show(pc); return;
    }
  }

  // ---- \ud0ed \ucc98\ub9ac: \uc0ac\uc774\ud2b8 \uc2a4\ud06c\ub9bd\ud2b8\uac00 \ud074\ub9ad\uc744 \uac00\ub85c\ucc44\ub3c4 \ub3d9\uc791\ud558\ub3c4\ub85d \uc9c1\uc811 \ucc98\ub9ac ----
  function inUI(e) { var p = e.composedPath ? e.composedPath() : []; return p.indexOf(host) >= 0; }
  function actTarget(e) {
    var p = e.composedPath();
    for (var i = 0; i < p.length; i++) { if (p[i] === host) break; if (p[i].dataset && p[i].dataset.act) return p[i]; }
    return null;
  }
  var down = null, lastPtr = 0;
  function fire(e) {
    var t = actTarget(e);
    if (t) { act(t.dataset.act, t); return; }
    var sel = String(window.getSelection ? getSelection() : '');
    if (!sel && !app.classList.contains('sheet')) app.classList.toggle('hide');
  }
  window.addEventListener('pointerdown', function (e) {
    if (!inUI(e)) return;
    down = { x: e.clientX, y: e.clientY, t: Date.now() };
    e.stopImmediatePropagation();
  }, true);
  window.addEventListener('pointerup', function (e) {
    if (!inUI(e)) return;
    e.stopImmediatePropagation();
    if (!down || Math.abs(e.clientX - down.x) > 12 || Math.abs(e.clientY - down.y) > 12 || Date.now() - down.t > 800) { down = null; return; }
    down = null; lastPtr = Date.now(); fire(e);
  }, true);
  window.addEventListener('pointercancel', function (e) { if (inUI(e)) { down = null; e.stopImmediatePropagation(); } }, true);
  ['click', 'touchend'].forEach(function (type) {
    window.addEventListener(type, function (e) {
      if (!inUI(e)) return;
      e.stopImmediatePropagation();
      if (type === 'click') { e.preventDefault(); if (Date.now() - lastPtr > 700) fire(e); } // pointer \uc774\ubca4\ud2b8\uac00 \ub9c9\ud78c \ud658\uacbd \ub300\ube44
    }, true);
  });
  ['touchstart', 'mousedown', 'mouseup', 'contextmenu'].forEach(function (type) {
    window.addEventListener(type, function (e) { if (inUI(e)) e.stopImmediatePropagation(); }, true);
  });

  bridge();
  // \uad11\uace0 \uc2a4\ud06c\ub9bd\ud2b8\uac00 \uc0c8\ub85c \ub07c\uc6cc \ub123\ub294 \uc694\uc18c \uc81c\uac70
  function sweep(n) {
    if (n.nodeType === 1 && n !== host && n !== fr && !/^(HEAD|BODY|META|TITLE|LINK)$/.test(n.tagName)) n.remove();
  }
  [].slice.call(document.body.children).forEach(sweep);
  [].slice.call(document.documentElement.children).forEach(sweep);
  var mo = new MutationObserver(function (ms) { ms.forEach(function (m) { [].slice.call(m.addedNodes).forEach(sweep); }); });
  mo.observe(document.body, { childList: true });
  mo.observe(document.documentElement, { childList: true });

  applyPrefs();
  try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { if (prefs.theme === 'auto') applyPrefs(); }); } catch (e) { }
  show(first).then(function (it) { if (it && it.done) setTimeout(function () { restorePos(it); }, 50); else posReady = true; });
})();
