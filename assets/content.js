/* Live content from Google Sheets.
   Edit "Website content (edit me)" in Drive → the site picks it up on next load.
   If the sheet can't be reached, the static HTML already on the page stays as is. */
(function () {
  var SHEET = "1gqZ1fxzj5F-BIhHqZoe61p2RbQg0z5smhbFvPzFMHGU";
  var url = function (tab) {
    return "https://docs.google.com/spreadsheets/d/" + SHEET + "/gviz/tq?tqx=out:csv&headers=1&sheet=" + encodeURIComponent(tab) + "&_=" + Date.now();
  };

  // ---------- helpers ----------
  function parseCSV(text) {
    var rows = [], row = [], cell = "", q = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (q) {
        if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
        else if (c === '"') q = false;
        else cell += c;
      } else if (c === '"') q = true;
      else if (c === ",") { row.push(cell); cell = ""; }
      else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
      else if (c !== "\r") cell += c;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows;
  }
  function load(tab) {
    return fetch(url(tab)).then(function (r) {
      if (!r.ok) throw new Error(tab + " " + r.status);
      return r.text();
    }).then(function (t) {
      if (/^\s*</.test(t)) throw new Error(tab + " not public"); // got a login page
      var rows = parseCSV(t).slice(1); // drop header
      return rows.filter(function (r) { return r.some(function (c) { return c.trim(); }); });
    });
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function rich(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, '<span class="stat">$1</span>'); }
  function safeUrl(u) { u = (u || "").trim(); return /^(https?:|mailto:)/i.test(u) ? u : ""; }
  function driveId(link) {
    var m = (link || "").match(/\/d\/([\w-]{20,})/) || (link || "").match(/[?&]id=([\w-]{20,})/);
    return m ? m[1] : "";
  }
  var EXT = ' target="_blank" rel="noopener"';
  function reveal(root) {
    root.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("in"); });
  }
  function q(sel) { return document.querySelector(sel); }
  function qa(sel) { return document.querySelectorAll(sel); }

  // ---------- Settings ----------
  load("Settings").then(function (rows) {
    var s = {};
    rows.forEach(function (r) { if (r[0]) s[r[0].trim()] = (r[1] || "").trim(); });

    qa("[data-s]").forEach(function (el) {
      var v = s[el.getAttribute("data-s")];
      if (!v) return;
      var svg = el.querySelector("svg");
      if (svg) { el.firstChild.nodeValue = v; } else { el.textContent = v; }
    });
    var h1 = q("h1.h-stack");
    if (h1 && s.headline_1) h1.setAttribute("aria-label", [s.headline_1, s.headline_2, s.headline_3].filter(Boolean).join(" "));

    if (s.right_now) {
      var items = s.right_now.split(",").map(function (x) { return x.trim(); }).filter(Boolean).slice(0, 5);
      while (items.length && items.length < 5) items = items.concat(items).slice(0, 5);
      var track = q(".flip-track");
      if (track && items.length) track.innerHTML = items.concat(items[0]).map(function (x) { return "<span>" + esc(x) + "</span>"; }).join("");
    }
    if (s.email) qa("[data-mail]").forEach(function (a) { a.href = "mailto:" + s.email; });
    ["linkedin", "github", "notion_certificates"].forEach(function (k) {
      var u = safeUrl(s[k]);
      if (u) qa('[data-href="' + k + '"]').forEach(function (a) { a.href = u; });
    });

    var rid = driveId(s.resume_link);
    if (rid) {
      qa('[data-resume="download"]').forEach(function (a) {
        a.href = "https://drive.google.com/uc?export=download&id=" + rid; a.removeAttribute("download");
      });
      qa('[data-resume="view"]').forEach(function (a) { a.href = "https://drive.google.com/file/d/" + rid + "/view"; });
    }
    var pid = driveId(s.photo_link);
    if (pid) {
      var img = q("[data-photo]");
      if (img) {
        var test = new Image();
        test.onload = function () { img.src = test.src; };
        test.src = "https://lh3.googleusercontent.com/d/" + pid + "=w1000";
      }
    }
  }).catch(warn);

  // ---------- Stats ----------
  load("Stats").then(function (rows) {
    var box = q("#stats");
    if (!box || !rows.length) return;
    box.innerHTML = rows.slice(0, 3).map(function (r) {
      return '<div><div class="v"><span>' + esc(r[0]) + "</span>" + esc(r[1]) + '</div><div class="t-xs muted">' + esc(r[2]) + "</div></div>";
    }).join("");
  }).catch(warn);

  // ---------- Highlights (marquee) ----------
  load("Highlights").then(function (rows) {
    var box = q("#highlights");
    if (!box || !rows.length) return;
    var spans = rows.map(function (r) { return "<span>" + esc(r[0]) + "</span>"; }).join("");
    box.innerHTML = spans + spans;
  }).catch(warn);

  // ---------- Experience ----------
  var COLORS = { green: "green", blue: "blue", amber: "amber", red: "red", dark: "dark" };
  load("Experience").then(function (rows) {
    var box = q("#xp-list");
    if (!box || !rows.length) return;
    box.innerHTML = rows.map(function (r, i) {
      var title = r[0], company = r[1], link = safeUrl(r[2]), details = r[3], badge = r[4],
          color = COLORS[(r[5] || "").trim().toLowerCase()] || "", bullets = r[6] || "", tags = r[7] || "";
      var co = link ? '<a href="' + esc(link) + '"' + EXT + ">" + esc(company) + "</a>" : esc(company);
      var meta = [co, esc(details)].filter(Boolean).join(details && /^\(/.test(details) ? " " : " · ");
      var live = color === "green" && /current/i.test(badge) ? " live" : "";
      return '<article class="xp reveal in"><div class="pos">#' + (i + 1) + "</div><div>" +
        '<div class="row between"><h3 class="t-h3">' + esc(title) + "</h3>" +
        (badge ? '<span class="badge ' + color + live + '">' + esc(badge) + "</span>" : "") + "</div>" +
        '<div class="t-sm muted co">' + meta + "</div>" +
        "<ul>" + bullets.split("\n").map(function (b) { return b.trim(); }).filter(Boolean).map(function (b) { return "<li>" + rich(b) + "</li>"; }).join("") + "</ul>" +
        (tags.trim() ? '<div class="tags">' + tags.split(",").map(function (t) { return t.trim(); }).filter(Boolean).map(function (t) { return '<span class="chip">' + esc(t) + "</span>"; }).join("") + "</div>" : "") +
        "</div></article>";
    }).join("");
  }).catch(warn);

  // ---------- Projects ----------
  load("Projects").then(function (rows) {
    var box = q("#projects");
    if (!box || !rows.length) return;
    box.innerHTML = rows.map(function (r) {
      var num = r[0], title = r[1], desc = r[2], link = safeUrl(r[3]), foot = r[4], dark = /dark/i.test(r[5] || "");
      var tag = link ? "a" : "div";
      var attrs = link ? ' href="' + esc(link) + '"' + EXT : "";
      var cls = "card stack reveal in" + (link ? " hover" : "") + (dark ? " dark" : "");
      var numStyle = dark ? ' style="color:#9DB1FF"' : "";
      var footCls = link ? "link" : (dark ? "label" : "label muted");
      var footStyle = dark && !link ? ' style="color:#9DB1FF"' : "";
      return "<" + tag + ' class="' + cls + '"' + attrs + '><div class="proj-num"' + numStyle + ">" + esc(num) + "</div>" +
        '<h3 class="t-h3">' + esc(title) + '</h3><p class="t-sm muted">' + esc(desc) + "</p>" +
        (foot ? '<span class="' + footCls + '"' + footStyle + ">" + esc(foot) + "</span>" : "") + "</" + tag + ">";
    }).join("");
  }).catch(warn);

  // ---------- Certificates ----------
  load("Certificates").then(function (rows) {
    var box = q("#certs");
    if (!box || !rows.length) return;
    var last = box.querySelector(".card.blue"); // keep the "full library" card
    var html = rows.map(function (r, i) {
      var link = safeUrl(r[2]);
      var tag = link ? "a" : "div";
      var attrs = link ? ' href="' + esc(link) + '"' + EXT : "";
      return "<" + tag + ' class="card' + (link ? " hover" : "") + ' cert reveal in"' + attrs + ">" +
        '<span class="num">' + String(i + 1).padStart(2, "0") + "</span>" +
        '<span class="issuer" title="' + esc(r[1]) + '">' + esc(r[1]) + "</span>" +
        '<h3 class="t-h3">' + esc(r[0]) + "</h3>" +
        (link ? '<span class="link">View certificate →</span>' : "") + "</" + tag + ">";
    }).join("");
    box.innerHTML = html;
    if (last) box.appendChild(last);
  }).catch(warn);

  // ---------- Leadership ----------
  load("Leadership").then(function (rows) {
    var box = q("#lead");
    if (!box || !rows.length) return;
    box.innerHTML = rows.map(function (r, i) {
      var link = safeUrl(r[4]);
      var tag = link ? "a" : "div";
      var attrs = link ? ' href="' + esc(link) + '"' + EXT : "";
      var host = link ? link.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "") : "";
      return "<" + tag + ' class="card' + (link ? " hover" : "") + ' stack reveal in"' + attrs + ">" +
        '<div class="row between"><span class="label blue">' + esc(r[0]) + "</span>" +
        (r[1] ? '<span class="badge ' + (i % 2 ? "blue" : "dark") + '">' + esc(r[1]) + "</span>" : "") + "</div>" +
        '<h3 class="t-h2">' + esc(r[2]) + '</h3><p class="t-sm muted">' + esc(r[3]) + "</p>" +
        (link ? '<span class="link">' + esc(host) + " →</span>" : "") + "</" + tag + ">";
    }).join("");
  }).catch(warn);

  function warn(e) { if (window.console) console.warn("[content] using built-in copy:", e && e.message); }
})();
