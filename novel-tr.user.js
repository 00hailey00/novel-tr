// ==UserScript==
// @name         소설 번역 뷰어
// @namespace    https://github.com/00hailey00/novel-tr
// @version      1.3.1
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
// @downloadURL  https://00hailey00.github.io/novel-tr/novel-tr.user.js
// @updateURL    https://00hailey00.github.io/novel-tr/novel-tr.user.js
// ==/UserScript==
(function () {
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
      for (var k in o) x[k] = o[k];
      x.onload = res;
      x.onerror = function () { rej(new Error('\ub124\ud2b8\uc6cc\ud06c \uc624\ub958')); };
      x.ontimeout = function () { rej(new Error('\uc751\ub2f5\uc774 \ub108\ubb34 \uc624\ub798 \uac78\ub824\uc694 (\uc2dc\uac04 \ucd08\uacfc)')); };
      x.onabort = function () { rej(new Error('\uc694\uccad\uc774 \ucde8\uc18c\ub410\uc5b4\uc694')); };
      GM_xmlhttpRequest(x);
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
  var SKIP = /^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA|NAV|HEADER|FOOTER|ASIDE|BUTTON|SELECT|OPTION|A|H1|H2|H3)$/;
  function hanLen(t) { var m = t.match(/[\u3400-\u9fff]/g); return m ? m.length : 0; }
  // \ubcf8\ubb38 \ucc3e\uae30: \u2460 \ud754\ud55c \ubcf8\ubb38 id/class \u2461 \uae00\uc790(\ud55c\uc790) \uc218 \uc810\uc218 \u2014 \uae00\uc774 \uc9c1\uc811 \ub2f4\uae34 \uc694\uc18c\uc5d0 \uc804\ubd80, \uadf8 \uc704 \ub2e8\uacc4\uc5d0 \uc808\ubc18\u00b74\ubd84\uc758 1\uc744 \ub354\ud574 \uac00\uc7a5 \ub192\uc740 \uacf3
  function findBody(doc) {
    for (var i = 0; i < SEL.length; i++) {
      var e = doc.querySelector(SEL[i]);
      if (e && hanLen(e.textContent) > 150 && own(e) > 100) return e;
    }
    if (!doc.body) return null;
    var score = new Map(), tw = doc.createTreeWalker(doc.body, 4 /* SHOW_TEXT */), n, cnt = 0;
    while ((n = tw.nextNode()) && cnt++ < 60000) {
      var len = hanLen(n.nodeValue); if (len < 4) continue;
      var p = n.parentElement, bad = false;
      for (var q = p; q && q !== doc.body; q = q.parentElement) if (SKIP.test(q.tagName)) { bad = true; break; }
      if (bad || !p) continue;
      if (/^(P|SPAN|FONT|B|I|EM|STRONG|BR)$/.test(p.tagName) && p.parentElement && p.parentElement !== doc.body) p = p.parentElement; // \ubb38\ub2e8 \ud558\ub098 \ub300\uc2e0 \ubb38\ub2e8\uc744 \ubaa8\uc740 \uc0c1\uc790\uc5d0 \uc810\uc218
      for (var k = 0, w = 1; p && p !== doc.documentElement && k < 3; k++, w /= 2, p = p.parentElement) score.set(p, (score.get(p) || 0) + len * w);
    }
    var best = null, bs = 0;
    score.forEach(function (v, k) { if (v > bs) { bs = v; best = k; } });
    if (best && bs > 80) return best;
    var b = 0, all = doc.body.querySelectorAll('div,article,section,td,dd');
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
    return { url: url, title: titleOf(doc), lines: lines(body), links: cands.filter(function (c) { return c.t; }).slice(0, 120),
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
  function sysPrompt(C) {
    return '\ub108\ub294 \uc911\uad6d\uc5b4 \uc6f9\uc18c\uc124 \uc804\ubb38 \ubc88\uc5ed\uac00\ub2e4. \uc785\ub825\uc740 \uc911\uad6d\uc5b4(\ubc88\uccb4 \ub610\ub294 \uac04\uccb4) \uc18c\uc124 \ud55c \ud654\uc758 \ubcf8\ubb38\uc774\uba70 \ud55c \uc904\uc774 \ud55c \ubb38\ub2e8\uc774\ub2e4. ' +
      '\uc790\uc5f0\uc2a4\ub7fd\uace0 \uc77d\uae30 \uc88b\uc740 \ud55c\uad6d\uc5b4 \uc18c\uc124 \ubb38\uccb4\ub85c \ubc88\uc5ed\ud558\ub77c.\n\uaddc\uce59:\n' +
      '1) \ubc88\uc5ed\ubb38\ub9cc \ucd9c\ub825\ud55c\ub2e4. \uc6d0\ubb38, \uc124\uba85, \uc8fc\uc11d, \uba38\ub9ac\ub9d0\uc744 \ubd99\uc774\uc9c0 \uc54a\ub294\ub2e4.\n' +
      '2) \ubb38\ub2e8 \uad6c\ubd84\uc744 \uc720\uc9c0\ud574 \ud55c \ubb38\ub2e8\uc744 \ud55c \uc904\ub85c \ucd9c\ub825\ud55c\ub2e4.\n' +
      '3) \uc778\uba85\u00b7\uc9c0\uba85\u00b7\ubb34\uacf5\uba85 \ub4f1 \uace0\uc720\uba85\uc0ac\ub294 \ud55c\uc790 \ub3c5\uc74c\uc73c\ub85c \uc77c\uad00\ub418\uac8c \uc62e\uae34\ub2e4.\n' +
      '4) \uc0ac\uc774\ud2b8 \uad11\uace0, \ud64d\ubcf4, \uc548\ub0b4 \ubb38\uad6c\ub85c \ubcf4\uc774\ub294 \uc904\uc740 \ucd9c\ub825\ud558\uc9c0 \uc54a\ub294\ub2e4.\n' +
      '5) \uc785\ub825\uc774 "[\uc81c\ubaa9]"\uc73c\ub85c \uc2dc\uc791\ud558\ub294 \uc904\uc774 \uc788\uc73c\uba74 \uadf8 \uc904\uc740 "[\uc81c\ubaa9] \ubc88\uc5ed\ub41c \uc81c\ubaa9" \ud615\uc2dd\uc73c\ub85c \ucd9c\ub825\ud55c\ub2e4.' +
      (C.g ? '\n\n\ub2e4\uc74c \uc6a9\uc5b4\uc9d1\uc744 \ubc18\ub4dc\uc2dc \ub530\ub978\ub2e4:\n' + C.g : '');
  }
  function urlFor(C, loc) {
    var host = loc === 'global' ? 'aiplatform.googleapis.com'
      : /^(us|eu)$/.test(loc) ? 'aiplatform.' + loc + '.rep.googleapis.com'
      : loc + '-aiplatform.googleapis.com';
    return 'https://' + host + '/v1/projects/' + encodeURIComponent(C.sa.project_id) + '/locations/' + encodeURIComponent(loc) +
      '/publishers/google/models/' + encodeURIComponent(C.m) + ':generateContent';
  }
  function sleep(ms) { return new Promise(function (ok) { setTimeout(ok, ms); }); }
  async function callApi(text, temp, sys, onStatus) {
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
    if (!C.noThink) req.generationConfig.thinkingConfig = { thinkingLevel: 'low' };
    var locs = [C.loc || 'global', 'global', 'us', 'us-central1'].filter(function (v, i, a) { return a.indexOf(v) === i; }), li = 0;
    var last;
    for (var t = 0; t < 4; t++) {
      try {
        var tk = await token(t > 0 && last && /API 401/.test(last.message));
        say(t ? '\ub2e4\uc2dc \uc694\uccad\ud558\ub294 \uc911' : '\uc751\ub2f5 \uae30\ub2e4\ub9ac\ub294 \uc911');
        var r = await gxhr({ method: 'POST', url: urlFor(C, locs[li]), anonymous: true, timeout: 120000,
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tk }, data: JSON.stringify(req) });
        var j; try { j = JSON.parse(r.responseText); } catch (e) { j = {}; }
        if (r.status === 404 && li < locs.length - 1) { li++; t--; continue; }
        if (r.status === 400 && req.generationConfig.thinkingConfig && /think/i.test(r.responseText || '')) {
          delete req.generationConfig.thinkingConfig; C.noThink = 1; gset('cfg', C); t--; continue;
        }
        if (r.status === 400 && (C.safe || 0) < SAFE.length - 1 && /threshold|safety|harm/i.test(r.responseText || '')) {
          C.safe = (C.safe || 0) + 1; gset('cfg', C);
          req.safetySettings.forEach(function (x) { x.threshold = SAFE[C.safe]; }); t--; continue;
        }
        if (r.status >= 200 && r.status < 300 && locs[li] !== C.loc) { C.loc = locs[li]; gset('cfg', C); }
        if (r.status < 200 || r.status >= 300) throw new Error('API ' + r.status + ': ' + ((j.error && j.error.message) || r.responseText || '').slice(0, 300));
        var cand = j.candidates && j.candidates[0];
        var out = cand && cand.content && cand.content.parts
          ? cand.content.parts.filter(function (p) { return !p.thought; }).map(function (p) { return p.text || ''; }).join('') : '';
        if (cand && cand.finishReason === 'MAX_TOKENS') throw new Error('MAX_TOKENS: \ucd9c\ub825\uc774 \uc798\ub9bc');
        if (!out) throw new Error('\ubc88\uc5ed \uacb0\uacfc \uc5c6\uc74c (' + ((cand && cand.finishReason) || (j.promptFeedback && j.promptFeedback.blockReason) || '\uc54c \uc218 \uc5c6\uc74c') + ')');
        return out;
      } catch (e) {
        last = e;
        if (/MAX_TOKENS|\ubc88\uc5ed \uacb0\uacfc \uc5c6\uc74c|\ud1a0\ud070 \ubc1c\uae09|\uc124\uc815\uc774 \ud544\uc694/.test(e.message)) break;
        if (/API (429|500|502|503|504)/.test(e.message) && t < 3) { say(/429/.test(e.message) ? '\uc694\uccad\uc774 \ub9ce\uc544 \uc7a0\uc2dc \uae30\ub2e4\ub9ac\ub294 \uc911' : '\uc11c\ubc84 \uc624\ub958, \uc7a0\uc2dc \ub4a4 \ub2e4\uc2dc'); await sleep(5000 * (t + 1)); continue; }
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
  var cidx = null;
  function cIndex() {
    if (cidx) return cidx;
    cidx = gget('cidx', null);
    if (!cidx) { // \uc608\uc804 \ud615\uc2dd(\ud55c \ub369\uc5b4\ub9ac)\uc5d0\uc11c \uc62e\uae30\uae30
      cidx = {}; var old = gget('cache', null);
      if (old) { Object.keys(old).forEach(function (u) { var k = ckey(u); gset('c:' + k, old[u]); cidx[k] = { t: old[u].title, ts: Date.now() }; }); gdel('cache'); }
      gset('cidx', cidx);
    }
    return cidx;
  }
  function cacheGet(u) { var k = ckey(u); return cIndex()[k] ? gget('c:' + k, null) : null; }
  function cacheDel(u) { var k = ckey(u), I = cIndex(); delete I[k]; gdel('c:' + k); gset('cidx', I); }
  function cachePut(u, v) {
    var k = ckey(u), I = cIndex();
    gset('c:' + k, v); I[k] = { t: v.title, ts: Date.now() };
    var ks = Object.keys(I);
    if (ks.length > CMAX) {
      ks.sort(function (a, b) { return I[a].ts - I[b].ts; }).slice(0, ks.length - CMAX).forEach(function (x) { delete I[x]; gdel('c:' + x); });
    }
    gset('cidx', I);
  }
  function cacheHas(u) { return cIndex()[ckey(u)]; }
  // ===================== \ubc88\uc5ed =====================
  // \ub9c9\ud788\uac70\ub098(\uc548\uc804 \ud544\ud130) \uc798\ub9ac\uba74(\uae38\uc774 \ucd08\uacfc) \ubc18\uc73c\ub85c \ub098\ub220 \ub2e4\uc2dc \uc2dc\ub3c4, \ub05d\uae4c\uc9c0 \ub9c9\ud788\ub294 \ud55c \uc904\uc740 \uc6d0\ubb38\uc73c\ub85c \ud45c\uc2dc
  var BLOCKED = /SAFETY|PROHIBITED|BLOCKLIST|SPII|RECITATION|OTHER|MAX_TOKENS|\ubc88\uc5ed \uacb0\uacfc \uc5c6\uc74c/i;
  async function translateLines(ls, depth, temp, say) {
    try {
      return (await callApi(ls.join('\n'), temp, null, say)).split(/\n+/).map(function (x) { return x.trim(); }).filter(Boolean);
    } catch (e) {
      if (!BLOCKED.test(e.message) || depth > 4) throw e;
      if (ls.length === 1) return ['\u3014\ubc88\uc5ed \ucc28\ub2e8 \u2014 \uc6d0\ubb38\u3015 ' + ls[0]];
      say && say('\ucc28\ub2e8\ub41c \ubd80\ubd84\uc744 \ub098\ub220\uc11c \ubc88\uc5ed\ud558\ub294 \uc911');
      var n = Math.min(4, ls.length), size = Math.ceil(ls.length / n), parts = [];
      for (var i = 0; i < ls.length; i += size) parts.push(ls.slice(i, i + size));
      var res = await Promise.all(parts.map(function (p) { return translateLines(p, depth + 1, temp, say); }));
      return [].concat.apply([], res);
    }
  }
  // \uc6d0\ubb38\uc744 \ub369\uc5b4\ub9ac\ub85c \ub098\ub214. \uccab \ub369\uc5b4\ub9ac\ub294 \uc9e7\uac8c(\ube68\ub9ac \ubcf4\uc5ec\uc8fc\ub824\uace0), \uccab \uc904\uc740 \uc81c\ubaa9
  function makeChunks(ch) {
    var src = ['[\uc81c\ubaa9] ' + ch.title].concat(ch.lines), chunks = [], cur = [], n = 0;
    src.forEach(function (l) {
      if (n + l.length > (chunks.length ? 1600 : 800) && cur.length) { chunks.push(cur); cur = []; n = 0; }
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
    var say = function (m) { ctl.status = m; ctl.onStatus && ctl.onStatus(m); };
    var failed = false;
    async function worker() {
      while (nextI < chunks.length && !failed) {
        var i = nextI++;
        if (ctl.cancel) throw new Error('\ucde8\uc18c\ub428');
        var r;
        try { r = ctl.keep && ctl.keep[i] ? { lines: ctl.keep[i], title: title } : splitTitle(await translateLines(chunks[i], 0, temp, say), title); }
        catch (e) { failed = true; throw e; }
        if (ctl.cancel) throw new Error('\ucde8\uc18c\ub428');
        if (i === 0) title = r.title;
        res[i] = r.lines;
        onPart && onPart(i, r.lines, title);
      }
    }
    await Promise.all([worker(), worker()]); // \ub450 \ub369\uc5b4\ub9ac\uc529 \ub3d9\uc2dc\uc5d0
    res.forEach(function (ls) { outLines = outLines.concat(ls); parts.push(ls.length); });
    if (!outLines.length) throw new Error('\ubc88\uc5ed \uacb0\uacfc\uac00 \ube44\uc5b4 \uc788\uc5b4\uc694');
    var v = { title: title, lines: outLines, parts: parts };
    cachePut(ch.url, v);
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
  var THEMES = {
    auto: null,
    light: { n: '\ubc1d\uac8c', bg: '#fbfbfa', fg: '#1f2023', mut: '#8b8d93', card: '#ffffff', bd: '#e6e6e3', ac: '#3b6fe0' },
    paper: { n: '\uc885\uc774', bg: '#f5efe2', fg: '#3d342a', mut: '#9a8d78', card: '#fbf7ee', bd: '#e2d8c3', ac: '#a35a2c' },
    green: { n: '\uc5f0\ub450', bg: '#e6eedb', fg: '#26301f', mut: '#7c8a6c', card: '#eff5e7', bd: '#ccd9ba', ac: '#3b7a3a' },
    gray: { n: '\ud68c\uc0c9', bg: '#2f3237', fg: '#dfe1e5', mut: '#9a9ea6', card: '#3a3e44', bd: '#4a4f57', ac: '#8fb2ff' },
    dark: { n: '\uc5b4\ub461\uac8c', bg: '#151618', fg: '#d4d5d8', mut: '#86888e', card: '#202226', bd: '#33363b', ac: '#7aa5ff' },
    black: { n: '\ube14\ub799', bg: '#000000', fg: '#b9babd', mut: '#6e7075', card: '#121314', bd: '#26282b', ac: '#5d8ff0' }
  };
  var FONTS = {
    pretendard: { n: '\ud504\ub9ac\ud150\ub2e4\ub4dc', f: '"Pretendard Variable",Pretendard,-apple-system,sans-serif',
      css: 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css' },
    notosans: { n: '\ubcf8\uace0\ub515', f: '"Noto Sans KR",sans-serif', g: 'Noto+Sans+KR:wght@400;500;700' },
    nanumgothic: { n: '\ub098\ub214\uace0\ub515', f: '"Nanum Gothic",sans-serif', g: 'Nanum+Gothic:wght@400;700' },
    gowundodum: { n: '\uace0\uc6b4\ub3cb\uc6c0', f: '"Gowun Dodum",sans-serif', g: 'Gowun+Dodum' },
    sys: { n: '\uc2dc\uc2a4\ud15c', f: '-apple-system,"Noto Sans KR",sans-serif' },
    notoserif: { n: '\ubcf8\uba85\uc870', f: '"Noto Serif KR",serif', g: 'Noto+Serif+KR:wght@400;700' },
    gowunbatang: { n: '\uace0\uc6b4\ubc14\ud0d5', f: '"Gowun Batang",serif', g: 'Gowun+Batang:wght@400;700' }
  };
  var STEPS = [
    ['fs', '\uae00\uc790 \ud06c\uae30', 1, 12, 32, function (v) { return v + 'px'; }],
    ['lh', '\uc904 \uac04\uaca9', 0.1, 1.3, 2.6, function (v) { return v.toFixed(1); }],
    ['ps', '\ubb38\ub2e8 \uac04\uaca9', 0.2, 0, 2.4, function (v) { return v.toFixed(1); }],
    ['pad', '\uc88c\uc6b0 \uc5ec\ubc31', 4, 8, 60, function (v) { return v + 'px'; }],
    ['mw', '\ubcf8\ubb38 \ud3ed', 40, 400, 1000, function (v) { return v + 'px'; }]
  ];
  var PK = 'nvtrPrefs';
  var DEF = { theme: 'auto', font: 'pretendard', fs: 18, lh: 1.8, ps: 0.9, mw: 680, pad: 24, ind: 0, auto: 1, ts: 0, v: 2 };
  function fill(p) { p = p || {}; Object.keys(DEF).forEach(function (k) { if (p[k] == null) p[k] = DEF[k]; }); return p; }
  var prefs = gget(PK, {}) || {};
  if (!prefs.v) { if (!prefs.font || prefs.font === 'sys') prefs.font = 'pretendard'; prefs.v = 2; } // \uace0\ub515(\ud504\ub9ac\ud150\ub2e4\ub4dc)\uc744 \uc0c8 \uae30\ubcf8\uc73c\ub85c
  prefs = fill(JSON.parse(JSON.stringify(prefs)));
  function savePrefs() { prefs.ts = Date.now(); gset(PK, JSON.parse(JSON.stringify(prefs))); }
  var loadedFonts = {};
  function loadFont(key) {
    var F = FONTS[key]; if (!F || loadedFonts[key] || (!F.g && !F.css)) return; loadedFonts[key] = 1;
    var l = document.createElement('link'); l.rel = 'stylesheet';
    l.href = F.css || ('https://fonts.googleapis.com/css2?family=' + F.g + '&display=swap');
    document.head.appendChild(l);
  }

  if (MODE === 'button') { addLauncher(); return; }

  // ===================== \uccab \ud654 =====================
  var first;
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
    back: '<svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg>',
    redo: '<svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/></svg>',
    undo: '<svg viewBox="0 0 24 24"><path d="M4 11a8 8 0 1 1 2.3 5.7M4 4v7h7"/></svg>',
    copy: '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>'
  };

  var css = [
    '.app{position:fixed;inset:0;font-family:var(--font);background:var(--bg);color:var(--fg);-webkit-tap-highlight-color:transparent;-webkit-text-size-adjust:100%;transition:background .3s,color .3s}',
    '*{box-sizing:border-box;margin:0;padding:0;font:inherit;color:inherit}',
    'button{background:none;border:0;cursor:pointer;-webkit-user-select:none;user-select:none;touch-action:manipulation;font-family:var(--ui)}',
    'svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;flex:none}',
    '.sc{position:absolute;inset:0;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}',
    '.wrap{position:relative;max-width:var(--mw);margin:0 auto;padding:calc(56px + env(safe-area-inset-top)) var(--pad) 0}',
    // \uc81c\ubaa9 \uc704\uacc4: \uc791\uc740 \ud654 \ubc88\ud638 + \ud070 \uc81c\ubaa9
    'section{padding-top:8px}',
    '.chl{font-family:var(--ui);font-size:13px;font-weight:600;color:var(--ac);letter-spacing:.04em;margin-bottom:10px}',
    '.cht{font-size:calc(var(--fs) * 1.4);font-weight:700;line-height:1.35;letter-spacing:-.03em;margin-bottom:34px;word-break:keep-all}',
    '.meta{font-family:var(--ui);font-size:12.5px;color:var(--mut);margin:-20px 0 30px;display:flex;align-items:center;gap:8px;min-height:20px}',
    '.meta .dot{width:7px;height:7px;border-radius:50%;background:var(--ac);animation:pl 1.2s ease-in-out infinite}',
    '@keyframes pl{50%{opacity:.25}}',
    // \ubcf8\ubb38
    '.grp p{font-size:var(--fs);line-height:var(--lh);margin-bottom:var(--ps);text-indent:var(--ind);word-break:keep-all;overflow-wrap:anywhere;letter-spacing:-.012em;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;border-radius:6px;transition:background .2s}',
    '.grp p.src{color:var(--mut);opacity:.55}',
    '.grp p.tr{animation:fi .5s cubic-bezier(.2,.8,.2,1) both}',
    '.grp p.hold{background:color-mix(in srgb,var(--ac) 12%,transparent)}',
    '.grp p.busy{animation:pl 1.2s ease-in-out infinite}',
    '@keyframes fi{from{opacity:0;transform:translateY(5px)}}',
    '.er{font-family:var(--ui);font-size:14px;color:#e5534b;white-space:pre-wrap;padding:14px 0}',
    '.sep{display:flex;align-items:center;justify-content:center;gap:12px;margin:72px 0 48px;color:var(--mut);font-family:var(--ui);font-size:12px}',
    '.sep:before,.sep:after{content:"";flex:1;max-width:80px;height:1px;background:var(--bd)}',
    '.endrow{display:flex;gap:8px;margin-top:26px;font-family:var(--ui)}',
    '.mini{display:inline-flex;align-items:center;gap:6px;min-height:40px;padding:0 14px;border-radius:12px;border:1px solid var(--bd);font-size:13px;color:var(--mut)}',
    '.mini svg{width:16px;height:16px}',
    '.tail{max-width:var(--mw);margin:0 auto;padding:36px var(--pad) calc(170px + env(safe-area-inset-bottom));text-align:center;color:var(--mut);font-family:var(--ui);font-size:14px}',
    '.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:52px;padding:0 24px;border-radius:16px;border:1px solid var(--bd);background:var(--card);font-size:15px;font-weight:600;margin-top:14px;font-family:var(--ui)}',
    '.btn.pri{background:var(--ac);border-color:var(--ac);color:#fff}',
    // \ubab0\uc785 \ubaa8\ub4dc: \uc704\u00b7\uc544\ub798 \uba54\ub274\ub294 \ud0ed\ud560 \ub54c\ub9cc
    '.top,.bot{position:fixed;left:0;right:0;z-index:3;font-family:var(--ui);background:color-mix(in srgb,var(--card) 86%,transparent);-webkit-backdrop-filter:saturate(1.8) blur(18px);backdrop-filter:saturate(1.8) blur(18px);transition:transform .32s cubic-bezier(.2,.8,.2,1),opacity .25s}',
    '.top{top:0;display:flex;align-items:center;gap:4px;padding:calc(6px + env(safe-area-inset-top)) 6px 6px;border-bottom:1px solid color-mix(in srgb,var(--bd) 70%,transparent);transform:translateY(-105%)}',
    '.top .tt{flex:1;min-width:0;text-align:center;line-height:1.3}',
    '.top .tt b{display:block;font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.top .tt span{display:block;font-size:12px;color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.ib{width:48px;height:48px;border-radius:14px;display:flex;align-items:center;justify-content:center}',
    '.ib:active,.nb:active,.btn:active,.pn button:active,.tile:active,.row:active{transform:scale(.95)}',
    '.bot{bottom:0;padding:10px 12px calc(10px + env(safe-area-inset-bottom));border-top:1px solid color-mix(in srgb,var(--bd) 70%,transparent);transform:translateY(105%)}',
    '.app.ui .top,.app.ui .bot{transform:none}',
    '.btns{display:grid;grid-template-columns:repeat(4,1fr);gap:4px}',
    '.nb{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;min-height:58px;border-radius:16px;font-size:11.5px;color:var(--mut);transition:transform .12s}',
    '.nb svg{width:24px;height:24px;color:var(--fg)}',
    '.nb.nx{background:var(--ac);color:#fff}.nb.nx svg{color:#fff}',
    // \uc2dc\ud2b8
    '.scrim{position:fixed;inset:0;z-index:5;background:rgba(0,0,0,.4);opacity:0;pointer-events:none;transition:opacity .25s}',
    '.app.sheet .scrim{opacity:1;pointer-events:auto}',
    '.pn{position:fixed;left:0;right:0;bottom:0;z-index:6;max-height:86vh;overflow-y:auto;overscroll-behavior:contain;background:var(--card);border-radius:24px 24px 0 0;padding:8px 22px calc(26px + env(safe-area-inset-bottom));box-shadow:0 -12px 40px rgba(0,0,0,.25);transform:translateY(105%);transition:transform .34s cubic-bezier(.2,.8,.2,1);font-family:var(--ui);font-size:15px}',
    '.app.sheet .pn{transform:none}',
    '.pn .grab{width:42px;height:5px;border-radius:3px;background:var(--bd);margin:6px auto 14px}',
    '.pn .hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px}',
    '.pn h3{font-size:19px;font-weight:700}',
    '.pn .x{width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--mut)}',
    '.pn .lb{font-size:13px;color:var(--mut);margin:20px 0 10px;font-weight:600}',
    '.pn .chips{display:flex;flex-wrap:wrap;gap:10px}',
    '.pn .sw{width:46px;height:46px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600}',
    '.pn .sw.sel{box-shadow:0 0 0 3px var(--card),0 0 0 5px var(--ac)}',
    '.pn .ch{min-height:46px;padding:0 16px;border-radius:14px;border:1px solid var(--bd);font-size:15px}',
    '.pn .ch.sel{border-color:var(--ac);background:color-mix(in srgb,var(--ac) 14%,transparent);color:var(--ac);font-weight:700}',
    '.pn .stp{display:flex;align-items:center;justify-content:space-between;min-height:58px;border-bottom:1px solid color-mix(in srgb,var(--bd) 55%,transparent)}',
    '.pn .ctl{display:flex;align-items:center;gap:6px}',
    '.pn .ctl button{width:50px;height:44px;border-radius:14px;border:1px solid var(--bd);font-size:22px;line-height:1}',
    '.pn .ctl b{min-width:66px;text-align:center;font-weight:600;font-variant-numeric:tabular-nums}',
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
    '.cover{flex:none;width:58px;aspect-ratio:3/4;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;color:#fff}',
    '.cont .ci{flex:1;min-width:0}',
    '.cont small{font-size:12px;color:var(--ac);font-weight:600}',
    '.cont b{display:block;font-size:16px;font-weight:700;margin:2px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.cont span{display:block;font-size:13px;color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:18px 14px}',
    '.tile{position:relative;text-align:left;display:block;width:100%}',
    '.tile .cover{width:100%;font-size:30px;border-radius:12px}',
    '.tile b{display:block;font-size:13.5px;font-weight:600;margin-top:8px;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}',
    '.tile span{display:block;font-size:11.5px;color:var(--mut);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.tile .del{position:absolute;top:-8px;right:-8px;width:30px;height:30px;border-radius:50%;background:#e5534b;color:#fff;display:none;align-items:center;justify-content:center}',
    '.tile .del svg{width:16px;height:16px}',
    '.pg.edit .tile .del{display:flex}',
    '.empty{text-align:center;color:var(--mut);padding:60px 20px;font-size:14px;line-height:1.7}',
    '.row{display:flex;align-items:center;gap:12px;width:100%;text-align:left;min-height:54px;padding:10px 4px;border-bottom:1px solid color-mix(in srgb,var(--bd) 60%,transparent)}',
    '.row .rt{flex:1;min-width:0;font-size:15px;line-height:1.4}',
    '.row .rt small{display:block;font-size:12px;color:var(--mut)}',
    '.row.read .rt{color:var(--mut)}',
    '.row.cur{background:color-mix(in srgb,var(--ac) 10%,transparent);border-radius:10px;padding-left:10px}',
    '.row.cur .rt{color:var(--ac);font-weight:600}',
    '.bdg{flex:none;font-size:11px;padding:3px 8px;border-radius:999px;background:color-mix(in srgb,var(--ac) 14%,transparent);color:var(--ac);font-weight:600}',
    '.tbar{display:flex;gap:8px;margin-bottom:12px}',
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
    '<nav class="btns"><button class="nb" data-act="prev">' + I.prev + '\uc774\uc804 \ud654</button><button class="nb" data-act="toc">' + I.toc + '\ubaa9\ucc28</button>' +
    '<button class="nb" data-act="aa">' + I.aa + '\ubcf4\uae30</button><button class="nb nx" data-act="next">' + I.next + '\ub2e4\uc74c \ud654</button></nav></div>' +
    '<div class="pg"><div class="ph"><button class="ib" data-act="pgClose" aria-label="\ub2eb\uae30">' + I.back + '</button><h3></h3><button class="ed" data-act="libEdit">\ud3b8\uc9d1</button></div><div class="pb"></div></div>' +
    '<div class="scrim" data-act="close"></div><div class="pn"></div><div class="toast"></div></div>';
  var $ = function (q) { return root.querySelector(q); };
  var app = $('.app'), sc = $('.sc'), wrap = $('.wrap'), tail = $('.tail'), topB = $('.top b'), topS = $('.top span'),
    pn = $('.pn'), toastEl = $('.toast'), pg = $('.pg'), pgT = $('.pg h3'), pgB = $('.pg .pb'), edBtn = $('.pg .ed');

  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
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
  function showSheet() { app.classList.add('sheet'); pushLayer('sheet'); }

  function applyPrefs() {
    var t = THEMES[prefs.theme] || (matchMedia('(prefers-color-scheme: dark)').matches ? THEMES.dark : THEMES.light);
    var F = FONTS[prefs.font] || FONTS.pretendard; loadFont(prefs.font); loadFont('pretendard');
    var v = { '--bg': t.bg, '--fg': t.fg, '--mut': t.mut, '--card': t.card, '--bd': t.bd, '--ac': t.ac, '--font': F.f,
      '--ui': FONTS.pretendard.f, '--fs': prefs.fs + 'px', '--lh': prefs.lh, '--ps': prefs.ps + 'em', '--mw': prefs.mw + 'px',
      '--pad': prefs.pad + 'px', '--ind': prefs.ind ? '1em' : '0' };
    Object.keys(v).forEach(function (k) { app.style.setProperty(k, v[k]); });
    document.documentElement.style.background = t.bg;
    var mc = document.querySelector('meta[name=theme-color]');
    if (!mc) { mc = document.createElement('meta'); mc.name = 'theme-color'; document.head.appendChild(mc); }
    mc.content = t.bg;
    if (pn.dataset.mode === 'set') syncPanel();
  }

  // ===================== \uc2dc\ud2b8: \ubcf4\uae30 \uc124\uc815 =====================
  function buildPanel() {
    var h = '<div class="grab"></div><div class="hd"><h3>\ubcf4\uae30 \uc124\uc815</h3><button class="x" data-act="close" aria-label="\ub2eb\uae30">' + I.x + '</button></div>';
    h += '<div class="lb">\ud14c\ub9c8</div><div class="chips">';
    Object.keys(THEMES).forEach(function (k) {
      var T = THEMES[k];
      var st = T ? 'background:' + T.bg + ';color:' + T.fg + ';border:1px solid ' + T.bd
        : 'background:linear-gradient(135deg,#fbfbfa 50%,#151618 50%);color:#888;border:1px solid #999';
      h += '<button class="sw" data-act="theme" data-v="' + k + '" style="' + st + '">' + (T ? T.n : '\uc790\ub3d9') + '</button>';
    });
    h += '</div><div class="lb">\uae00\uaf34</div><div class="chips">';
    Object.keys(FONTS).forEach(function (k) {
      loadFont(k);
      h += '<button class="ch" data-act="font" data-v="' + k + '" style="font-family:' + FONTS[k].f.replace(/"/g, '&quot;') + '">' + FONTS[k].n + '</button>';
    });
    h += '</div><div class="lb">\uac04\uaca9</div>';
    STEPS.forEach(function (s) {
      h += '<div class="stp"><span>' + s[1] + '</span><div class="ctl"><button data-act="step" data-v="' + s[0] + '" data-d="-1" aria-label="\uc904\uc774\uae30">\u2212</button><b data-k="' + s[0] + '"></b><button data-act="step" data-v="' + s[0] + '" data-d="1" aria-label="\ub298\ub9ac\uae30">+</button></div></div>';
    });
    h += '<div class="lb">\uae30\ud0c0</div><div class="chips">' +
      '<button class="ch" data-act="ind" data-v="0">\ub4e4\uc5ec\uc4f0\uae30 \ub054</button><button class="ch" data-act="ind" data-v="1">\ub4e4\uc5ec\uc4f0\uae30 \ucf2c</button>' +
      '<button class="ch" data-act="autoNext">\ub2e4\uc74c \ud654 \uc790\ub3d9 \uc774\uc5b4\ubd99\uc774\uae30</button></div>';
    h += '<button class="wide" data-act="retrans">' + I.redo + '\uc9c0\uae08 \ubcf4\ub294 \ud654 \ub2e4\uc2dc \ubc88\uc5ed</button>' +
      '<button class="wide" data-act="reset">\ubcf4\uae30 \uc124\uc815 \ucd08\uae30\ud654</button>' +
      '<button class="wide" data-act="api">\ubc88\uc5ed \uc124\uc815 (\ud0a4 \u00b7 \ubaa8\ub378 \u00b7 \uc6a9\uc5b4\uc9d1)</button>';
    pn.innerHTML = h;
  }
  function syncPanel() {
    [].forEach.call(pn.querySelectorAll('[data-act=theme]'), function (b) { b.classList.toggle('sel', b.dataset.v === prefs.theme); });
    [].forEach.call(pn.querySelectorAll('[data-act=font]'), function (b) { b.classList.toggle('sel', b.dataset.v === prefs.font); });
    [].forEach.call(pn.querySelectorAll('[data-act=ind]'), function (b) { b.classList.toggle('sel', +b.dataset.v === +prefs.ind); });
    pn.querySelector('[data-act=autoNext]').classList.toggle('sel', !!prefs.auto);
    STEPS.forEach(function (s) { pn.querySelector('b[data-k=' + s[0] + ']').textContent = s[5](prefs[s[0]]); });
  }
  function openSheet() { buildPanel(); pn.dataset.mode = 'set'; syncPanel(); pn.scrollTop = 0; showSheet(); }
  function closeSheet() { dropLayer('sheet'); }

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
    if (it && it.done && !p.classList.contains('src')) h += '<button class="wide pri" data-act="paraRetr">' + I.redo + '\uc774 \ubb38\ub2e8\ub9cc \ub2e4\uc2dc \ubc88\uc5ed</button>';
    if (hist) h += '<button class="wide" data-act="paraUndo">' + I.undo + '\uc774\uc804 \ubc88\uc5ed\uc73c\ub85c \ub418\ub3cc\ub9ac\uae30</button>';
    h += '<button class="wide" data-act="paraCopy">' + I.copy + '\ubcf5\uc0ac</button>';
    pn.innerHTML = h; pn.scrollTop = 0; showSheet();
  }
  function itemOf(node) { for (var i = 0; i < chapters.length; i++) if (chapters[i].sec.contains(node)) return chapters[i]; return null; }
  function setPara(it, p, text) {
    p.textContent = text; p.classList.remove('tr'); void p.offsetWidth; p.classList.add('tr');
    if (it.v && p._idx != null) { it.v.lines[p._idx] = text; cachePut(it.ch.url, it.v); }
  }
  async function retrParagraph(p) {
    var it = itemOf(p); if (!it) return;
    var srcLines = (p._grp >= 0 && it.chunks && it.chunks[p._grp]) || it.ch.lines;
    var C = cfg() || {};
    var sys = '\ub108\ub294 \uc911\uad6d\uc5b4 \uc6f9\uc18c\uc124 \ubc88\uc5ed \uad50\uc815\uac00\ub2e4. \uc8fc\uc5b4\uc9c4 \uc6d0\ubb38 \uc77c\ubd80\uc640 \ud55c\uad6d\uc5b4 \ubc88\uc5ed \ubb38\ub2e8 \ud558\ub098\ub97c \ubcf4\uace0, \uadf8 \ubb38\ub2e8\uc5d0 \ud574\ub2f9\ud558\ub294 \uc6d0\ubb38 \ubd80\ubd84\uc744 \ucc3e\uc544 \ub354 \uc815\ud655\ud558\uace0 \uc790\uc5f0\uc2a4\ub7ec\uc6b4 \ud55c\uad6d\uc5b4 \uc18c\uc124 \ubb38\uccb4\ub85c \ub2e4\uc2dc \ubc88\uc5ed\ud55c\ub2e4. \ub2e4\uc2dc \ubc88\uc5ed\ud55c \ubb38\ub2e8 \ud558\ub098\ub9cc \ucd9c\ub825\ud558\uace0 \uc124\uba85\uc740 \ubd99\uc774\uc9c0 \uc54a\ub294\ub2e4.' +
      (C.g ? '\n\n\ub2e4\uc74c \uc6a9\uc5b4\uc9d1\uc744 \ubc18\ub4dc\uc2dc \ub530\ub978\ub2e4:\n' + C.g : '');
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

  // ===================== \ud654 \ud45c\uc2dc =====================
  var pending = {}, chapters = [], appending = false;
  function startTranslate(ch, keep, title) {
    if (!pending[ch.url]) pending[ch.url] = { ch: ch, parts: {}, title: null, done: null, subs: [], ctl: { keep: keep, title: title } };
    var P = pending[ch.url];
    if (!P.done) {
      P.done = translate(ch, function (ci, ls, t) { P.title = t; P.parts[ci] = ls; P.lastProg = Date.now(); P.subs.forEach(function (f) { f(ci, ls, t); }); }, P.ctl);
    }
    return P;
  }
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
      var f = document.createElement('iframe'), t0 = Date.now(), fin = false;
      f.__nvKeep = 1;
      f.setAttribute('sandbox', 'allow-scripts allow-same-origin');
      f.style.cssText = 'position:fixed;left:-10000px;top:0;width:420px;height:900px;border:0;visibility:hidden';
      function snap() {
        try { var d = f.contentDocument; return d && d.documentElement ? new DOMParser().parseFromString(d.documentElement.outerHTML, 'text/html') : null; } catch (e) { return null; }
      }
      function end(d) { if (fin) return; fin = true; clearInterval(iv); setTimeout(function () { f.remove(); }, 50); d ? res(d) : rej(new Error('\ud398\uc774\uc9c0\ub97c \uc5f4\uc9c0 \ubabb\ud588\uc5b4\uc694')); }
      var iv = setInterval(function () {
        var d; try { d = f.contentDocument; } catch (e) { d = null; }
        var ready = d && d.readyState !== 'loading' && d.location && d.location.href !== 'about:blank';
        if (ready) {
          var ok = false;
          try { var b = findBody(d); ok = b && hanLen(b.textContent) > 150 && (findLink(d, url, 'next', linkCands(d, url)) || Date.now() - t0 > 3000); } catch (e) { }
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
  async function prefetch(url) {
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
      if (!ch.next) { var g = guessUrl(url, 'next'); if (g) { ch.next = g; ch.guessed = 1; } }
      if (!ch.prev) { var gp = guessUrl(url, 'prev'); if (gp) ch.prev = gp; }
      startTranslate(ch); return ch;
    }
    catch (e) { return { err: e }; }
  }
  function titleParts(t) {
    var m = String(t).match(/^\s*((?:\uc81c\s*)?[\d,]+\s*[\ud654\uc7a5\ud68c\ud3b8]|\u7b2c\s*[\d\u4e00\u4e8c\u4e09\u56db\u4e94\u516d\u4e03\u516b\u4e5d\u5341\u767e\u5343\u96f6\u3007\u4e24]+\s*[\u7ae0\u56de\u8282\u7bc0\u8bdd\u8a71])\s*[:\uff1a.\-\u2014]?\s*(.*)$/);
    return m && m[2] ? { label: m[1].replace(/\s+/g, ''), name: m[2] } : { label: '', name: t };
  }
  function setTitle(item, t) {
    item.title = t; var tp = titleParts(t);
    item.chl.textContent = tp.label; item.chl.style.display = tp.label ? '' : 'none'; item.cht.textContent = tp.name;
  }
  function show(ch, old, keep, keepTitle) {
    var sec = el('section'), chl = el('div', 'chl'), cht = el('h2', 'cht'), meta = el('div', 'meta');
    sec.appendChild(chl); sec.appendChild(cht); sec.appendChild(meta);
    var item = { ch: ch, sec: sec, chl: chl, cht: cht, meta: meta, title: ch.title, done: false, failed: false, nextP: null, chunks: makeChunks(ch), v: null };
    setTitle(item, ch.title);
    // \uc6d0\ubb38\uc744 \ub369\uc5b4\ub9ac\ubcc4\ub85c \ubbf8\ub9ac \uae54\uc544\ub460 (\uccab \ub369\uc5b4\ub9ac\uc758 \uccab \uc904\uc740 \uc81c\ubaa9\uc774\ub77c \uc81c\uc678)
    var grps = item.chunks.map(function (lines, ci) {
      var g = el('div', 'grp');
      (ci === 0 ? lines.slice(1) : lines).forEach(function (l) { g.appendChild(el('p', 'src', l)); });
      sec.appendChild(g); return g;
    });
    var oi = old ? chapters.indexOf(old) : -1;
    if (oi >= 0) { old.sec.replaceWith(sec); chapters[oi] = item; } else { wrap.appendChild(sec); chapters.push(item); }
    var P = startTranslate(ch, keep, keepTitle), t0 = Date.now(), doneN = 0, total = grps.length, stuckShown = false;
    P.ctl.onStatus = function () { };
    item.P = P;
    meta.innerHTML = '<span class="dot"></span><span>\ubc88\uc5ed \uc911</span>';
    var tm = setInterval(function () {
      if (!meta.isConnected) { clearInterval(tm); return; }
      meta.children[1].textContent = '\ubc88\uc5ed \uc911 \u00b7 ' + doneN + '/' + total + ' \u00b7 ' + Math.round((Date.now() - t0) / 1000) + '\ucd08' + (P.ctl.status && P.ctl.status !== '\uc751\ub2f5 \uae30\ub2e4\ub9ac\ub294 \uc911' ? ' \u00b7 ' + P.ctl.status : '');
      // 45\ucd08 \ub118\uac8c \uc9c4\ud589\uc774 \uc5c6\uc73c\uba74 '\uc774\uc5b4\uc11c \ub2e4\uc2dc \uc2dc\ub3c4' \ubc84\ud2bc
      if (!stuckShown && Date.now() - (P.lastProg || t0) > 45000) {
        stuckShown = true;
        var b = el('button', 'mini', '\uba48\ucd98 \uac83 \uac19\uc544\uc694 \u00b7 \uc774\uc5b4\uc11c \ub2e4\uc2dc \uc2dc\ub3c4'); b.dataset.act = 'resume'; b._item = item; b.style.marginLeft = '6px'; meta.appendChild(b);
      }
    }, 1000);
    var gi = {};
    function fillGroup(ci, ls, t) {
      setTitle(item, t);
      var whole = ci === -1;
      if (whole) { grps.forEach(function (g, k) { if (k) g.remove(); }); grps = [grps[0]]; ci = 0; }
      var g = grps[ci]; if (!g || gi[ci]) return; gi[ci] = 1; doneN = whole ? total : doneN + 1;
      g.innerHTML = '';
      ls.forEach(function (l, k) { var p = el('p', 'tr', l); p.style.animationDelay = Math.min(k, 12) * 25 + 'ms'; p._grp = whole ? -1 : ci; g.appendChild(p); });
    }
    Object.keys(P.parts).forEach(function (ci) { fillGroup(+ci, P.parts[ci], P.title); });
    P.subs.push(fillGroup);
    updateTail();
    return P.done.then(function (v) {
      clearInterval(tm); item.v = v; item.done = true; setTitle(item, v.title);
      var k = 0; [].forEach.call(sec.querySelectorAll('p.tr'), function (p) { p._idx = k++; });
      meta.remove();
      var row = el('div', 'endrow'), rt = el('button', 'mini'); rt.innerHTML = I.redo + '\uc774 \ud654 \ub2e4\uc2dc \ubc88\uc5ed'; rt.dataset.act = 'retrans'; rt._item = item;
      row.appendChild(rt); sec.appendChild(row);
      if (ch.next && !ch.guessed) recordPattern(ch.url, ch.next);
      if (!ch.next) { var gn = guessUrl(ch.url, 'next'); if (gn) { ch.next = gn; ch.guessed = 1; } }
      if (ch.next) item.nextP = prefetch(ch.next);
      updateTail(); onScroll();
      return item;
    }, function (e) {
      clearInterval(tm);
      if (/\ucde8\uc18c\ub428/.test(e.message)) return item; // \uc0c8 \ubc88\uc5ed\uc73c\ub85c \ubc14\ub01c
      item.failed = true; meta.textContent = '';
      var er = el('div', 'er', '\ubc88\uc5ed \uc2e4\ud328: ' + e.message); sec.insertBefore(er, sec.querySelector('.grp'));
      var row = el('div', 'endrow');
      var rb = el('button', 'btn pri', '\ub2e4\uc2dc \uc2dc\ub3c4'); rb.dataset.act = 'retry'; rb._item = item; row.appendChild(rb);
      if (/\uc124\uc815|\ud1a0\ud070|API 40[134]/.test(e.message)) { var sb = el('button', 'btn', '\ubc88\uc5ed \uc124\uc815 \uc5f4\uae30'); sb.dataset.act = 'api'; row.appendChild(sb); }
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
    if (L.nextErr) {
      tail.appendChild(el('div', 'er', '\ub2e4\uc74c \ud654\ub97c \ubd88\ub7ec\uc624\uc9c0 \ubabb\ud588\uc5b4\uc694: ' + L.nextErr));
      var b = el('button', 'btn pri', '\ub2e4\uc2dc \uc2dc\ub3c4'); b.dataset.act = 'nextRetry'; tail.appendChild(b); return;
    }
    var nb = el('button', 'btn pri'); nb.innerHTML = '\ub2e4\uc74c \ud654 \uc774\uc5b4\uc11c \uc77d\uae30' + I.next; nb.dataset.act = 'next'; tail.appendChild(nb);
  }
  async function appendNext() {
    var L = lastItem();
    if (!L || !L.done || appending || !L.ch.next) return null;
    appending = true; L.nextErr = null; updateTail();
    if (!L.nextP) L.nextP = prefetch(L.ch.next);
    var g0 = viewGen, nch = await L.nextP;
    if (g0 !== viewGen) return null; // \uadf8\uc0ac\uc774 \ub2e4\ub978 \ud654(\uc11c\uc7ac\u00b7\ubaa9\ucc28)\ub85c \ubc14\ub01c
    appending = false;
    if (nch.err) {
      if (L.ch.guessed) { L.ch.next = null; L.ch.guessed = 0; L.nextP = null; updateTail(); return null; }
      L.nextErr = nch.err.message; L.nextP = null; updateTail(); return null;
    }
    if (chapters.some(function (c) { return c.ch.url === nch.url; })) { L.ch.next = null; updateTail(); toast('\ub2e4\uc74c \ud654 \ub9c1\ud06c\uac00 \uc774\ubbf8 \uc77d\uc740 \ud654\ub97c \uac00\ub9ac\ucf1c\uc694'); return null; }
    wrap.appendChild(el('div', 'sep', '\u00b7 \u00b7 \u00b7'));
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
  async function openChapter(url, from) {
    var g0 = ++viewGen; appending = false;
    closePage(); closeSheet(); setUI(false);
    wrap.innerHTML = ''; chapters = []; tail.innerHTML = '<div class="spin">\ubd88\ub7ec\uc624\ub294 \uc911</div>'; sc.scrollTop = 0; curShown = -1;
    var ch = await prefetch(url);
    if (g0 !== viewGen) return; // \ub354 \ub098\uc911\uc5d0 \uc5f0 \ud654\uac00 \uc788\uc74c
    if (ch.err) { tail.innerHTML = ''; tail.appendChild(el('div', 'er', '\ubd88\ub7ec\uc624\uc9c0 \ubabb\ud588\uc5b4\uc694: ' + ch.err.message)); var b = el('button', 'btn pri', '\ub2e4\uc2dc \uc2dc\ub3c4'); b.dataset.act = 'open'; b.dataset.u = url; tail.appendChild(b); return; }
    show(ch).then(function (it) { if (it && it.done && from === 'lib') restorePos(it); });
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
  function coverColor(s) { var h = 0; s = String(s); for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return 'hsl(' + (h % 360) + ' 42% 52%)'; }
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
        if (pageMode === 'lib' && app.classList.contains('page') && done % 10 === 0) renderLib();
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
    if (pageMode === 'lib' && app.classList.contains('page')) renderLib();
    if (manual || added) toast('\uc11c\uc7ac\ub97c \ub2e4\uc2dc \ub9cc\ub4e4\uc5c8\uc5b4\uc694 \u00b7 \uc791\ud488 ' + (Object.keys(libAll()).length - 1) + '\uac1c');
  }
  var pageMode = '';
  function openPage(mode, title) { pageMode = mode; pgT.textContent = title; pg.classList.remove('edit'); edBtn.style.display = mode === 'lib' ? '' : 'none'; edBtn.textContent = '\ud3b8\uc9d1'; dropLayer('ui'); dropLayer('sheet'); app.classList.add('page'); pushLayer('page'); }
  function closePage() { dropLayer('page'); }
  function renderLib() {
    openPage('lib', '\ub0b4 \uc11c\uc7ac');
    var LA = libAll(), ws = Object.keys(LA).filter(function (k) { return k !== '__v2' && LA[k] && LA[k].last; }).map(function (k) { return LA[k]; }).sort(function (a, b) { return b.ts - a.ts; });
    if (!ws.length) { pgB.innerHTML = '<div class="empty">\uc544\uc9c1 \uc77d\uc740 \uc791\ud488\uc774 \uc5c6\uc5b4\uc694.<br>\uc18c\uc124 \ud398\uc774\uc9c0\uc5d0\uc11c \ubc88\uc5ed \ubc84\ud2bc\uc744 \ub204\ub974\uba74 \uc5ec\uae30\uc5d0 \uc313\uc5ec\uc694.</div><button class="btn" style="display:flex;margin:0 auto" data-act="libRestore">\ubc88\uc5ed \uae30\ub85d\uc5d0\uc11c \uc11c\uc7ac \ub2e4\uc2dc \ub9cc\ub4e4\uae30</button>'; return; }
    var w0 = ws[0], h = '';
    h += '<button class="cont" data-act="open" data-u="' + esc(w0.last.url) + '"><div class="cover" style="background:' + coverColor(w0.id) + '">' + esc(bookName(w0).charAt(0)) + '</div>' +
      '<div class="ci"><small>\uc774\uc5b4 \uc77d\uae30</small><b>' + esc(bookName(w0)) + '</b><span>' + esc(w0.last.title) + ' \u00b7 ' + relTime(w0.ts) + '</span></div>' + I.next + '</button>';
    if (ws.length > 1) {
      h += '<div class="grid">';
      ws.slice(1).forEach(function (w) {
        h += '<button class="tile" data-act="open" data-u="' + esc(w.last.url) + '"><div class="cover" style="background:' + coverColor(w.id) + '">' + esc(bookName(w).charAt(0)) + '</div>' +
          '<b>' + esc(bookName(w)) + '</b><span>' + esc(w.last.title) + '</span><span>' + relTime(w.ts) + '</span>' +
          '<i class="del" data-act="libDel" data-id="' + esc(w.id) + '">' + I.x + '</i></button>';
      });
      h += '</div>';
    }
    h += '<button class="btn" style="display:flex;margin:34px auto 0;font-size:13px;min-height:44px;color:var(--mut)" data-act="libRestore">\ubc88\uc5ed \uae30\ub85d\uc5d0\uc11c \uc11c\uc7ac \ub2e4\uc2dc \ub9cc\ub4e4\uae30</button>';
    pgB.innerHTML = h; pgB.scrollTop = 0;
  }

  // ===================== \ubaa9\ucc28 =====================
  var tocMem = {};
  function parseToc(doc, tocUrl, chUrl) {
    var dir = workId(chUrl), seen = {}, out = [];
    var CHRX = /\u7b2c\s*[\d\u4e00\u4e8c\u4e09\u56db\u4e94\u516d\u4e03\u516b\u4e5d\u5341\u767e\u5343\u96f6\u3007\u4e24]+\s*[\u7ae0\u56de\u8282\u7bc0\u8bdd\u8a71]|^\s*\d+[\.\u3001\s]/;
    var as = [].slice.call(doc.querySelectorAll('a[href]'));
    function take(test) {
      out = []; seen = {};
      as.forEach(function (a) {
        var u; try { u = new URL(a.getAttribute('href'), tocUrl).href.replace(/#.*$/, ''); } catch (e) { return; }
        var t = a.textContent.replace(/\s+/g, ' ').trim();
        if (!t || seen[u] || u === tocUrl || !test(u, t)) return; seen[u] = 1; out.push({ u: u, t: t });
      });
    }
    take(function (u) { return u.indexOf(dir) === 0 && /\.(s?html?|php)$|\/\d+\/?$/.test(u); });
    if (out.length < 5) take(function (u, t) { return CHRX.test(t); });
    return sortToc(out);
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
      try { list = parseToc(await getDoc(tocUrl), tocUrl, it.ch.url); }
      catch (e) { pgB.innerHTML = '<div class="empty">\ubaa9\ucc28\ub97c \ubd88\ub7ec\uc624\uc9c0 \ubabb\ud588\uc5b4\uc694.<br>' + esc(e.message) + '</div>'; return; }
      tocMem[tocUrl] = list;
    }
    if (pageMode !== 'toc') return;
    if (!list.length) { pgB.innerHTML = '<div class="empty">\ubaa9\ucc28\uc5d0\uc11c \ud654 \ubaa9\ub85d\uc744 \ucc3e\uc9c0 \ubabb\ud588\uc5b4\uc694.</div><button class="btn pri" style="display:flex;margin:0 auto" data-act="pick" data-k="toc">\ub2e4\ub978 \ubaa9\ucc28 \ub9c1\ud06c \uace0\ub974\uae30</button>'; return; }
    var read = (libAll()[it.ch.id] || {}).read || {}, cur = it.ch.url.replace(/#.*$/, ''), readN = 0, trN = 0;
    var rows = list.map(function (c, i) {
      var tr = cacheHas(c.u), isRead = read[ckey(c.u)] || read[c.u], isCur = ckey(c.u) === ckey(cur);
      if (isRead) readN++; if (tr) trN++;
      return '<button class="row' + (isRead ? ' read' : '') + (isCur ? ' cur' : '') + '" data-act="open" data-u="' + esc(c.u) + '"><span class="rt">' +
        esc(tr ? tr.t : c.t) + (tr && tr.t !== c.t ? '<small>' + esc(c.t) + '</small>' : '') + '</span>' +
        (isCur ? '<span class="bdg">\uc77d\ub294 \uc911</span>' : tr ? '<span class="bdg">\ubc88\uc5ed\ub428</span>' : '') + '</button>';
    });
    pgB.innerHTML = '<div class="tbar"><button data-act="tocCur">\uc77d\ub294 \uacf3\uc73c\ub85c</button><button data-act="tocTop">\ucc98\uc74c\uc73c\ub85c</button><button data-act="tocEnd">\ucd5c\uc2e0 \ud654\ub85c</button></div>' +
      '<div class="hint" style="font-size:12.5px;color:var(--mut);margin:0 2px 8px">\uc804\uccb4 ' + list.length + '\ud654 \u00b7 \uc77d\uc74c ' + readN + ' \u00b7 \ubc88\uc5ed\ub428 ' + trN + '</div>' + rows.join('');
    var c = pgB.querySelector('.row.cur'); if (c) pgB.scrollTop = c.offsetTop - pgB.clientHeight / 2;
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
    if (name === 'libEdit') { var on = !pg.classList.contains('edit'); pg.classList.toggle('edit', on); edBtn.textContent = on ? '\uc644\ub8cc' : '\ud3b8\uc9d1'; return; }
    if (name === 'libDel') { var L = libAll(); delete L[t.dataset.id]; gset('lib', L); renderLib(); pg.classList.add('edit'); edBtn.textContent = '\uc644\ub8cc'; return; }
    if (name === 'open') { if (pg.classList.contains('edit')) return; openChapter(t.dataset.u, pageMode === 'lib' ? 'lib' : 'toc'); return; }
    if (name === 'tocCur' || name === 'tocTop' || name === 'tocEnd') {
      var r = name === 'tocTop' ? pgB.querySelector('.row') : name === 'tocEnd' ? pgB.querySelector('.row:last-of-type') : pgB.querySelector('.row.cur');
      if (r) pgB.scrollTo({ top: r.offsetTop - pgB.clientHeight / 2, behavior: 'smooth' }); return;
    }
    if (name === 'theme') { prefs.theme = t.dataset.v; savePrefs(); applyPrefs(); return; }
    if (name === 'font') { prefs.font = t.dataset.v; savePrefs(); applyPrefs(); return; }
    if (name === 'ind') { prefs.ind = +t.dataset.v; savePrefs(); applyPrefs(); return; }
    if (name === 'autoNext') { prefs.auto = prefs.auto ? 0 : 1; savePrefs(); applyPrefs(); toast(prefs.auto ? '\ub05d\uae4c\uc9c0 \uc77d\uc73c\uba74 \ub2e4\uc74c \ud654\uac00 \uc790\ub3d9\uc73c\ub85c \ubd99\uc5b4\uc694' : '\uc790\ub3d9 \uc774\uc5b4\ubd99\uc774\uae30\ub97c \uaed0\uc5b4\uc694'); return; }
    if (name === 'step') {
      var S = STEPS.filter(function (s) { return s[0] === t.dataset.v; })[0];
      var x = Math.round((prefs[S[0]] + S[2] * +t.dataset.d) * 100) / 100;
      prefs[S[0]] = Math.min(S[4], Math.max(S[3], x)); savePrefs(); applyPrefs(); return;
    }
    if (name === 'reset') { prefs = fill({ v: 2 }); savePrefs(); applyPrefs(); toast('\ubcf4\uae30 \uc124\uc815\uc744 \ucd08\uae30\ud654\ud588\uc5b4\uc694'); return; }
    if (name === 'api') { closeSheet(); window.open(SETTINGS_URL, 'nvtrSettings'); return; }
    if (name === 'paraRetr') { var hp = holdP; closeSheet(); retrParagraph(hp); return; }
    if (name === 'paraUndo') { var up = holdP, uit = itemOf(up); closeSheet(); if (up && up._hist && up._hist.length) { setPara(uit, up, up._hist.pop()); toast('\ub418\ub3cc\ub838\uc5b4\uc694'); } return; }
    if (name === 'paraCopy') {
      var txt = holdP ? holdP.textContent : ''; closeSheet();
      try { await navigator.clipboard.writeText(txt); toast('\ubcf5\uc0ac\ud588\uc5b4\uc694'); } catch (e) { toast('\ubcf5\uc0ac\ud558\uc9c0 \ubabb\ud588\uc5b4\uc694'); } return;
    }
    if (name === 'resume') { restartTranslate(t._item); toast('\uba48\ucd98 \ubd80\ubd84\ubd80\ud130 \ub2e4\uc2dc \ubc88\uc5ed\ud560\uac8c\uc694'); return; }
    if (name === 'retry') { restartTranslate(t._item); return; }
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
    if (name === 'nextRetry') { lastItem().nextP = null; appendNext(); return; }
    if (name === 'next') {
      setUI(false);
      var i = curIndex();
      if (chapters[i + 1]) { scrollToItem(chapters[i + 1]); return; }
      var Lt = lastItem();
      if (!Lt.done) { toast(Lt.failed ? '\uc774\ubc88 \ud654 \ubc88\uc5ed\uc774 \uc2e4\ud328\ud588\uc5b4\uc694. \ub2e4\uc2dc \uc2dc\ub3c4\ub97c \ub20c\ub7ec \uc8fc\uc138\uc694' : '\uc774\ubc88 \ud654\ub97c \uc544\uc9c1 \ubc88\uc5ed\ud558\uace0 \uc788\uc5b4\uc694'); return; }
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
  function onInput(e) { return pathOf(e).some(function (n) { return n.tagName === 'INPUT'; }); }
  var down = null, lastPtr = 0, lpT = null, lpFired = false;
  function fire(e) {
    var t = actTarget(e);
    if (t) { act(t.dataset.act, t); return; }
    if (onInput(e) || app.classList.contains('sheet') || app.classList.contains('page')) return;
    var sel = String(window.getSelection ? getSelection() : '');
    if (!sel) setUI(!app.classList.contains('ui'));
  }
  window.addEventListener('pointerdown', function (e) {
    if (!inUI(e)) return;
    e.stopImmediatePropagation();
    down = { x: e.clientX, y: e.clientY, t: Date.now() }; lpFired = false; clearTimeout(lpT);
    var p = paraOf(e);
    if (p && !app.classList.contains('sheet')) lpT = setTimeout(function () { lpFired = true; buzz(); openPara(p); }, 480);
  }, true);
  window.addEventListener('pointermove', function (e) {
    if (!down || !inUI(e)) return;
    if (Math.abs(e.clientX - down.x) > 10 || Math.abs(e.clientY - down.y) > 10) clearTimeout(lpT);
  }, true);
  window.addEventListener('pointerup', function (e) {
    if (!inUI(e)) return;
    e.stopImmediatePropagation(); clearTimeout(lpT);
    if (lpFired) { lpFired = false; down = null; lastPtr = Date.now(); return; }
    if (!down || Math.abs(e.clientX - down.x) > 12 || Math.abs(e.clientY - down.y) > 12 || Date.now() - down.t > 800) { down = null; return; }
    down = null; lastPtr = Date.now(); fire(e);
  }, true);
  window.addEventListener('pointercancel', function (e) { if (inUI(e)) { clearTimeout(lpT); down = null; e.stopImmediatePropagation(); } }, true);
  ['click', 'touchend'].forEach(function (type) {
    window.addEventListener(type, function (e) {
      if (!inUI(e)) return;
      e.stopImmediatePropagation();
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
    });
  });
  applyPrefs();
  try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { if (prefs.theme === 'auto') applyPrefs(); }); } catch (e) { }
  show(first).then(function (it) { if (it && it.done) setTimeout(function () { restorePos(it); }, 50); else posReady = true; });
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
    function check() { pend = null; if (done) return; if (looksLikeNovel()) { done = true; mo3.disconnect(); show(true); } }
    var mo3 = new MutationObserver(function () {
      if (done || pend) return;
      if (Date.now() - t0 > 15000) { mo3.disconnect(); return; }
      pend = setTimeout(check, 600);
    });
    if (document.body) mo3.observe(document.body, { childList: true, subtree: true, characterData: true });
    check(); setTimeout(check, 2000); setTimeout(check, 6000); setTimeout(function () { mo3.disconnect(); }, 15500);
  }
  function makeLauncher() {
    var h = document.createElement('div');
    h.style.cssText = 'position:fixed;right:16px;bottom:calc(84px + env(safe-area-inset-bottom));z-index:2147483646;';
    var r = h.attachShadow({ mode: 'closed' });
    r.innerHTML = '<style>button{all:initial;font:600 15px/1 -apple-system,"Noto Sans KR",sans-serif;color:#fff;background:#2f6fdb;' +
      'padding:15px 20px;border-radius:999px;box-shadow:0 6px 20px rgba(0,0,0,.28);cursor:pointer;-webkit-tap-highlight-color:transparent;' +
      'display:flex;align-items:center;gap:6px;touch-action:manipulation}button:active{transform:scale(.95)}</style><button>\ubc88\uc5ed \u25b8</button>';
    var b = r.querySelector('button'), down = null;
    function go() { openReader(); }
    b.addEventListener('pointerdown', function (e) { down = { x: e.clientX, y: e.clientY }; e.stopPropagation(); }, true);
    b.addEventListener('pointerup', function (e) {
      e.stopPropagation(); e.preventDefault();
      if (down && Math.abs(e.clientX - down.x) < 12 && Math.abs(e.clientY - down.y) < 12) go();
      down = null;
    }, true);
    b.addEventListener('click', function (e) { e.stopPropagation(); e.preventDefault(); }, true);
    (document.body || document.documentElement).appendChild(h);
    // \uad11\uace0 \uc2a4\ud06c\ub9bd\ud2b8\uac00 \ubc84\ud2bc\uc744 \uc9c0\uc6b0\uba74 \ub2e4\uc2dc \ubd99\uc784
    var mo2 = new MutationObserver(function () { if (!h.isConnected && h.__keep) (document.body || document.documentElement).appendChild(h); });
    h.__keep = 1; mo2.observe(document.documentElement, { childList: true, subtree: true });
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
      '<label for="g">\uc6a9\uc5b4\uc9d1 (\uc120\ud0dd)</label><textarea id="g" placeholder="\u6797\u51e1=\uc784\ubc94&#10;\u5929\u5143\u5b97=\ucc9c\uc6d0\uc885"></textarea><div class="h">\ud55c \uc904\uc5d0 \ud558\ub098\uc529.</div>' +
      '<button id="save">\uc800\uc7a5</button><button id="test" class="sec">\uc5f0\uacb0 \ud14c\uc2a4\ud2b8</button><button id="del" class="sec">\uc800\uc7a5\ub41c \ud0a4 \uc0ad\uc81c</button><div id="msg"></div></main>';
    var $ = function (id) { return document.getElementById(id); };
    function refresh() {
      C = gget('cfg', {}) || {};
      $('m').value = C.m || 'gemini-3.8-flash'; $('loc').value = C.loc || 'global'; $('g').value = C.g || ''; $('sa').value = '';
      $('state').textContent = C.sa ? '\u2713 \ud0a4 \uc800\uc7a5\ub428: ' + C.sa.client_email : '\uc544\uc9c1 \ud0a4\uac00 \uc5c6\uc5b4\uc694. JSON\uc744 \ubd99\uc5ec\ub123\uace0 \uc800\uc7a5\ud574 \uc8fc\uc138\uc694.';
      $('state').style.color = C.sa ? '#2e8b57' : '';
    }
    function msg(t, ok) { $('msg').textContent = t; $('msg').style.color = ok ? '#2e8b57' : '#d9534f'; }
    $('save').onclick = function () {
      var n = { sa: C.sa, m: $('m').value.trim() || 'gemini-3.8-flash', loc: $('loc').value.trim() || 'global', g: $('g').value.trim(), safe: C.safe, noThink: (C.m === ($('m').value.trim() || 'gemini-3.8-flash')) ? C.noThink : 0 };
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
