(function() {
    if (window.__oopTr) {
        alert("\uc774\ubbf8 \ubc88\uc5ed \ubaa8\ub4dc\uc608\uc694");
        return;
    }
    var BASE = (document.currentScript && document.currentScript.src || "").replace(/[?#].*$/, "").replace(/[^\/]*$/, "");
    if (!BASE) {
        alert("\uc2a4\ud06c\ub9bd\ud2b8 \uc8fc\uc18c\ub97c \uc54c \uc218 \uc5c6\uc5b4\uc694");
        return;
    }
    window.__oopTr = 1;
    var SEL = [ "#content", "#chaptercontent", "#chapterContent", "#booktxt", "#nr1", "#htmlContent", "#txt", "#TextContent", ".read-content", ".readcontent", ".txtnav", ".content", "article" ];
    var NEXT = /\u4e0b\u4e00[\u7ae0\u9875\u9801\u8282\u7bc0\u8bdd\u8a71]|\u4e0b[\u7ae0\u9875\u9801]|\u4e0b\u4e00\u7bc7|next/i;
    function own(el) {
        var s = 0;
        for (var i = 0; i < el.childNodes.length; i++) {
            var n = el.childNodes[i];
            if (n.nodeType === 3) s += n.textContent.trim().length; else if (n.nodeType === 1 && /^(P|SPAN|FONT|BR)$/.test(n.tagName)) s += n.textContent.trim().length;
        }
        return s;
    }
    function findBody(doc) {
        for (var i = 0; i < SEL.length; i++) {
            var e = doc.querySelector(SEL[i]);
            if (e && own(e) > 200) return e;
        }
        var best = null, b = 0, all = doc.body.querySelectorAll("div,article,section,td,dd");
        for (var j = 0; j < all.length; j++) {
            var v = own(all[j]);
            if (v > b) {
                b = v;
                best = all[j];
            }
        }
        return best;
    }
    function lines(el) {
        var c = el.cloneNode(true);
        c.querySelectorAll("script,style,a,button,ins,iframe,noscript,h1").forEach(function(x) {
            x.remove();
        });
        c.querySelectorAll("br").forEach(function(x) {
            x.replaceWith("\n");
        });
        c.querySelectorAll("p,div").forEach(function(x) {
            x.append("\n");
        });
        return c.textContent.split(/\n+/).map(function(s) {
            return s.replace(/^[\s\u3000\xa0]+|[\s\u3000\xa0]+$/g, "");
        }).filter(Boolean);
    }
    function titleOf(doc) {
        var h = doc.querySelector("h1") || doc.querySelector(".bookname h1, .title, h2");
        return (h ? h.textContent : doc.title).trim();
    }
    function nextOf(doc, base) {
        var a = doc.querySelectorAll("a[href]");
        for (var i = 0; i < a.length; i++) {
            if (NEXT.test(a[i].textContent.trim())) {
                var h = a[i].getAttribute("href");
                if (!h || /^javascript:|^#/.test(h)) continue;
                var u = new URL(h, base).href;
                if (u !== base) return u;
            }
        }
        return null;
    }
    function chapterOf(doc, url) {
        var body = findBody(doc);
        if (!body) throw new Error("\ubcf8\ubb38\uc744 \ucc3e\uc9c0 \ubabb\ud588\uc5b4\uc694");
        return {
            url: url,
            title: titleOf(doc),
            lines: lines(body),
            next: nextOf(doc, url)
        };
    }
    async function getDoc(u) {
        var r = await fetch(u, {
            credentials: "include"
        });
        if (!r.ok) throw new Error("\ud398\uc774\uc9c0 \ubd88\ub7ec\uc624\uae30 \uc2e4\ud328 " + r.status);
        var buf = await r.arrayBuffer();
        var m = (r.headers.get("content-type") || "").match(/charset=([\w-]+)/i), cs = m && m[1];
        if (!cs) {
            var head = new TextDecoder("windows-1252").decode(buf.slice(0, 4096));
            var mm = head.match(/charset=["']?([\w-]+)/i);
            cs = mm && mm[1];
        }
        var html;
        try {
            html = new TextDecoder(cs || "utf-8").decode(buf);
        } catch (e) {
            html = (new TextDecoder).decode(buf);
        }
        return (new DOMParser).parseFromString(html, "text/html");
    }
    var fr, frOrigin = new URL(BASE).origin, reqs = {}, seq = 0, readyRes, ready = new Promise(function(r) {
        readyRes = r;
    });
    function bridge() {
        fr = document.createElement("iframe");
        fr.src = BASE + "bridge.html";
        fr.setAttribute("referrerpolicy", "no-referrer");
        fr.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;border:0;z-index:2147483647;background:#fbfaf7;display:none";
        window.addEventListener("message", function(e) {
            if (e.source !== fr.contentWindow || e.origin !== frOrigin || !e.data || !e.data.nvtr) return;
            var d = e.data;
            if (d.type === "needSetup") fr.style.display = "block"; else if (d.type === "ready") {
                fr.style.display = "none";
                if (d.fs) R.style.setProperty("--nvfs", d.fs + "px");
                readyRes();
            } else if (d.type === "closeSettings") fr.style.display = "none"; else if (d.type === "result") {
                var q = reqs[d.id];
                if (!q) return;
                delete reqs[d.id];
                d.error ? q.rej(new Error(d.error)) : q.res(d.out);
            }
        });
        document.body.appendChild(fr);
    }
    async function callApi(text) {
        await ready;
        return new Promise(function(res, rej) {
            var id = ++seq;
            reqs[id] = {
                res: res,
                rej: rej
            };
            fr.contentWindow.postMessage({
                nvtr: 1,
                type: "translate",
                id: id,
                text: text
            }, frOrigin);
        });
    }
    var CK = "__oopTrCache";
    function cacheGet(u) {
        try {
            return JSON.parse(localStorage.getItem(CK) || "{}")[u];
        } catch (e) {
            return null;
        }
    }
    function cachePut(u, v) {
        try {
            var c = JSON.parse(localStorage.getItem(CK) || "{}");
            c[u] = v;
            var k = Object.keys(c);
            while (k.length > 40) delete c[k.shift()];
            localStorage.setItem(CK, JSON.stringify(c));
        } catch (e) {}
    }
    async function translate(ch, onPart) {
        var hit = cacheGet(ch.url);
        if (hit) {
            onPart && onPart(hit.lines, hit.title);
            return hit;
        }
        var src = [ "[\uc81c\ubaa9] " + ch.title ].concat(ch.lines), chunks = [], cur = [], n = 0;
        src.forEach(function(l) {
            if (n + l.length > (chunks.length ? 3e3 : 1200) && cur.length) {
                chunks.push(cur);
                cur = [];
                n = 0;
            }
            cur.push(l);
            n += l.length + 1;
        });
        if (cur.length) chunks.push(cur);
        var title = ch.title, outLines = [];
        for (var i = 0; i < chunks.length; i++) {
            var res = (await callApi(chunks[i].join("\n"))).split(/\n+/).map(function(s) {
                return s.trim();
            }).filter(Boolean);
            res = res.filter(function(l) {
                var m = l.match(/^\[\uc81c\ubaa9\]\s*(.*)$/);
                if (m) {
                    title = m[1];
                    return false;
                }
                return true;
            });
            outLines = outLines.concat(res);
            onPart && onPart(res, title);
        }
        var v = {
            title: title,
            lines: outLines
        };
        cachePut(ch.url, v);
        return v;
    }
    var css = '#oopR{all:initial;display:block;position:fixed;top:0;left:0;right:0;bottom:0;overflow-y:auto;-webkit-overflow-scrolling:touch;z-index:2147483646;font-family:-apple-system,"Noto Sans KR",sans-serif;background:#fbfaf7;color:#222;min-height:100vh;padding:18px 18px 80px;box-sizing:border-box}' + "#oopR *{box-sizing:border-box;font-family:inherit}" + "#oopR h2{font-size:21px;line-height:1.4;margin:28px 0 18px;font-weight:700;color:inherit}" + "#oopR p{font-size:var(--nvfs,18px);line-height:1.85;margin:0 0 .9em;word-break:keep-all;overflow-wrap:anywhere;color:inherit}" + "#oopR .cfg{position:fixed;right:10px;bottom:8px;font-size:13px;opacity:.6;margin:0;z-index:5;background:none;border:0;padding:6px;width:auto;color:inherit}" + "#oopR .st{font-size:14px;color:#888;margin:10px 0}" + "#oopR .er{font-size:14px;color:#c0392b;white-space:pre-wrap;margin:10px 0}" + "#oopR button{display:block;width:100%;padding:14px;margin:24px 0 8px;font-size:16px;border:1px solid #ccc;border-radius:10px;background:#fff;color:#222}" + "#oopR hr{border:0;border-top:1px solid #ddd;margin:36px 0}" + "@media (prefers-color-scheme:dark){#oopR{background:#16171a;color:#d8d8d8}#oopR button{background:#25272b;color:#ddd;border-color:#444}#oopR hr{border-color:#333}}";
    document.head.insertAdjacentHTML("beforeend", '<meta name="viewport" content="width=device-width,initial-scale=1"><style>' + css + "</style>");
    var first;
    try {
        first = chapterOf(document, location.href);
    } catch (e) {
        alert(e.message);
        window.__oopTr = 0;
        return;
    }
    document.body.innerHTML = "";
    document.body.style.cssText = "margin:0;padding:0;background:none";
    var R = document.createElement("div");
    R.id = "oopR";
    document.body.appendChild(R);
    document.title = "\ubc88\uc5ed \uc911\u2026";
    function el(tag, cls, txt) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (txt != null) e.textContent = txt;
        return e;
    }
    var pending = {};
    function startTranslate(ch) {
        if (!pending[ch.url]) pending[ch.url] = {
            ch: ch,
            parts: [],
            title: null,
            done: null,
            subs: []
        };
        var P = pending[ch.url];
        if (!P.done) {
            P.done = translate(ch, function(ls, t) {
                P.title = t;
                P.parts.push(ls);
                P.subs.forEach(function(f) {
                    f(ls, t);
                });
            });
        }
        return P;
    }
    async function prefetch(url) {
        try {
            var d = await getDoc(url);
            var ch = chapterOf(d, url);
            startTranslate(ch);
            return ch;
        } catch (e) {
            return {
                err: e
            };
        }
    }
    async function show(ch) {
        var sec = el("section"), h = el("h2", null, ch.title), st = el("div", "st", "\ubc88\uc5ed \uc911\u2026"), t0 = Date.now(), tm = setInterval(function() {
            st.textContent = "\ubc88\uc5ed \uc911\u2026 " + Math.round((Date.now() - t0) / 1e3) + "\ucd08";
        }, 1e3);
        sec.appendChild(h);
        sec.appendChild(st);
        R.appendChild(sec);
        var P = startTranslate(ch);
        function add(ls, t) {
            h.textContent = t;
            ls.forEach(function(l) {
                sec.insertBefore(el("p", null, l), st);
            });
        }
        P.parts.forEach(function(ls) {
            add(ls, P.title);
        });
        P.subs.push(add);
        try {
            var v = await P.done;
            clearInterval(tm);
            st.remove();
            h.textContent = v.title;
            document.title = v.title;
            try {
                history.replaceState(null, "", ch.url);
            } catch (e) {}
        } catch (e) {
            clearInterval(tm);
            st.className = "er";
            st.textContent = "\ubc88\uc5ed \uc2e4\ud328: " + e.message;
            var rb = el("button", null, "\ub2e4\uc2dc \uc2dc\ub3c4");
            rb.onclick = function() {
                delete pending[ch.url];
                sec.remove();
                show(ch);
            };
            sec.appendChild(rb);
            return;
        }
        if (!ch.next) {
            R.appendChild(el("div", "st", "\ub2e4\uc74c \ud654 \ub9c1\ud06c\ub97c \ucc3e\uc9c0 \ubabb\ud588\uc5b4\uc694."));
            return;
        }
        var nextP = prefetch(ch.next);
        var b = el("button", null, "\ub2e4\uc74c \ud654 \u25b6");
        b.onclick = async function() {
            b.disabled = true;
            b.textContent = "\ubd88\ub7ec\uc624\ub294 \uc911\u2026";
            var nch = await nextP;
            if (nch.err) {
                b.disabled = false;
                b.textContent = "\ub2e4\uc74c \ud654 \ubd88\ub7ec\uc624\uae30 \uc2e4\ud328 \u2014 \ub2e4\uc2dc \uc2dc\ub3c4";
                nextP = prefetch(ch.next);
                return;
            }
            b.remove();
            R.appendChild(el("hr"));
            show(nch);
            setTimeout(function() {
                R.lastChild.scrollIntoView({
                    behavior: "smooth"
                });
            }, 50);
        };
        R.appendChild(b);
    }
    var cfg = el("button", "cfg", "\u2699 \uc124\uc815");
    cfg.onclick = function() {
        fr.style.display = "block";
        fr.contentWindow.postMessage({
            nvtr: 1,
            type: "settings"
        }, frOrigin);
    };
    R.appendChild(cfg);
    bridge();
    var mine = [ R, fr ];
    function sweep(n) {
        if (n.nodeType === 1 && mine.indexOf(n) < 0 && !/^(HEAD|BODY|STYLE|META|LINK|TITLE)$/.test(n.tagName)) n.remove();
    }
    [].slice.call(document.body.children).forEach(sweep);
    [].slice.call(document.documentElement.children).forEach(sweep);
    var mo = new MutationObserver(function(ms) {
        ms.forEach(function(m) {
            [].slice.call(m.addedNodes).forEach(sweep);
        });
    });
    mo.observe(document.body, {
        childList: true
    });
    mo.observe(document.documentElement, {
        childList: true
    });
    [ "click", "touchstart", "touchend", "pointerdown", "pointerup", "mousedown", "mouseup" ].forEach(function(t) {
        R.addEventListener(t, function(e) {
            e.stopPropagation();
        });
    });
    show(first);
})();
