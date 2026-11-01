(function () {
  'use strict';
  var tb = document.getElementById('theme');
  if (tb) tb.addEventListener('click', function () {
    var cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', cur);
    try { localStorage.setItem('theme', cur); } catch (e) {}
  });
  var EN = document.documentElement.lang === 'en';
  var PFX = EN ? '/en' : '';
  var BN = '০১২৩৪৫৬৭৮৯';
  var cdisp = function (c) { return EN ? c.replace(/[০-৯]/g, function (d) { return BN.indexOf(d); }).replace('ম-', 'W-') : c; };
  var nb = function (n) { return EN ? String(n) : String(n).replace(/\d/g, function (d) { return BN[d]; }); };
  var tx = function (b, e) { return EN ? e : b; };

  // Bangla spelling-tolerant normaliser (also lowercases English)
  function norm(s) {
    return String(s || '').normalize('NFD').replace(/[‌‍]/g, '')
      .replace(/[০-৯]/g, function (d) { return BN.indexOf(d); })
      .replace(/[ীি]/g, 'ি').replace(/[ূু]/g, 'ু').replace(/[ঈ]/g, 'ই').replace(/[ঊ]/g, 'উ')
      .replace(/[ণ]/g, 'ন').replace(/[শষ]/g, 'স').replace(/ৎ/g, 'ত').replace(/ঁ/g, '')
      .replace(/[‘’'"().,\-–_/]/g, ' ').replace(/\s+/g, ' ').toLowerCase().trim();
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // ---------- list filter on static listing pages
  var lf = document.getElementById('lf');
  if (lf && !document.getElementById('q')) {
    var cards = [].slice.call(document.querySelectorAll('.card'));
    var cnt = document.getElementById('lfc');
    cards.forEach(function (c) {
      var codes = [].slice.call(c.querySelectorAll('.tag.code')).map(function (tag) { return tag.textContent; });
      var searchCodes = codes.concat(codes.map(function (code) { return code.replace(/^W-/, 'ম-'); }));
      c._n = norm([c.getAttribute('data-s'), searchCodes.join(' ')].join(' '));
    });
    lf.addEventListener('input', function () {
      var toks = norm(lf.value).split(' ').filter(Boolean), shown = 0;
      cards.forEach(function (c) {
        var ok = toks.every(function (t) { return c._n.indexOf(t) > -1; });
        c.style.display = ok ? '' : 'none'; if (ok) shown++;
      });
      document.querySelectorAll('.grp').forEach(function (g) {
        g.style.display = g.querySelector('.card:not([style*="none"])') ? '' : 'none';
      });
      cnt.textContent = toks.length ? tx(nb(shown) + 'টি পাওয়া গেছে', shown + ' found') : '';
    });
  }

  // ---------- home page search
  var q = document.getElementById('q');
  if (!q) return;
  var $ = function (id) { return document.getElementById(id); };
  var fdiv = $('fdiv'), fdist = $('fdist'), fupz = $('fupz'), ftype = $('ftype');
  var res = $('results'), more = $('more'), count = $('count');
  var PAGE = 30, shown = PAGE, DATA, ITEMS, current = [];

  fetch('/data/madrasas.json').then(function (r) { return r.json(); }).then(function (d) {
    DATA = d;
    ITEMS = d.items.map(function (a) {
      var isLegacyRow = Array.isArray(a);
      var id = isLegacyRow ? a[0] : a.id;
      var name = isLegacyRow ? a[1] : a.name;
      var area = isLegacyRow ? a[2] : a.area;
      var upz = isLegacyRow ? a[3] : a.upazila;
      var di = isLegacyRow ? a[4] : a.districtIndex;
      var w = isLegacyRow ? a[5] : (a.isWomen ? 1 : 0);
      var dist = d.districts[di], div = d.divisions[dist.div];
      var codes = isLegacyRow
        ? (a[6] ? a[6].split(',') : [])
        : (Array.isArray(a.ilhakCodes) ? a.ilhakCodes : []);
      var searchCodes = codes.concat(codes.map(function (c) { return c.replace(/^ম-/, 'W-'); }));
      return { id: id, name: name, area: area, upz: upz, di: di, dv: dist.div, w: w, codes: codes,
        hay: norm([name, area, upz, dist.bn, dist.en, div.bn, div.en, w ? 'মহিলা women' : '', 'ইলহাক ilhak', searchCodes.join(' ')].join(' ')) };
    });
    d.divisions.forEach(function (v, i) { fdiv.add(new Option(EN ? v.en : v.bn, i)); });
    fillDist(); fillUpz();
    var p = new URLSearchParams(location.search);
    if (p.get('q')) q.value = p.get('q');
    if (p.get('division')) { fdiv.value = p.get('division'); fillDist(); }
    if (p.get('district')) { fdist.value = p.get('district'); fillUpz(); }
    if (p.get('upazila')) fupz.value = p.get('upazila');
    if (p.get('type')) ftype.value = p.get('type');
    run(true);
  });

  function fillDist() {
    var keep = fdist.value;
    fdist.length = 1;
    DATA.districts.forEach(function (d, i) {
      if (fdiv.value === '' || String(d.div) === fdiv.value) fdist.add(new Option(EN ? d.en : d.bn, i));
    });
    fdist.value = keep; if (fdist.value !== keep) fdist.value = '';
  }
  function fillUpz() {
    var keep = fupz.value, set = {};
    fupz.length = 1;
    ITEMS.forEach(function (m) {
      if (fdist.value !== '' ? String(m.di) === fdist.value : (fdiv.value === '' || String(m.dv) === fdiv.value)) set[m.upz] = (set[m.upz] || 0) + 1;
    });
    if (fdist.value !== '') Object.keys(set).sort(function (a, b) { return a.localeCompare(b, 'bn'); }).forEach(function (u) { fupz.add(new Option(u + ' (' + nb(set[u]) + ')', u)); });
    fupz.disabled = fdist.value === '';
    fupz.value = keep; if (fupz.value !== keep) fupz.value = '';
  }

  function run(initial) {
    var toks = norm(q.value).split(' ').filter(Boolean);
    current = ITEMS.filter(function (m) {
      if (fdiv.value !== '' && String(m.dv) !== fdiv.value) return false;
      if (fdist.value !== '' && String(m.di) !== fdist.value) return false;
      if (fupz.value !== '' && m.upz !== fupz.value) return false;
      if (ftype.value !== '' && String(m.w) !== ftype.value) return false;
      return toks.every(function (t) { return m.hay.indexOf(t) > -1; });
    });
    if (toks.length) { // name matches first
      var t0 = toks[0];
      current.sort(function (a, b) { return (norm(a.name).indexOf(t0) < 0) - (norm(b.name).indexOf(t0) < 0); });
    }
    shown = PAGE; render();
    if (!initial) sync();
  }

  function render() {
    count.textContent = tx(nb(current.length) + 'টি মাদরাসা পাওয়া গেছে', current.length + ' madrasas found');
    if (!current.length) {
      res.innerHTML = '<li class="card"><b>' + tx('কিছু পাওয়া যায়নি', 'No results') + '</b><p class="loc">' +
        tx('বানান বদলে বা ফিল্টার কমিয়ে চেষ্টা করুন।', 'Try a different spelling or fewer filters.') + '</p></li>';
      more.hidden = true; return;
    }
    res.innerHTML = current.slice(0, shown).map(function (m) {
      var d = DATA.districts[m.di];
      var loc = [m.area, m.upz, EN ? d.en : d.bn].filter(Boolean).join(', ');
      var tags = (m.w ? '<span class="tag fem">' + tx('মহিলা শাখা', 'Women’s section') + '</span>' : '') +
        m.codes.map(function (c) { return '<span class="tag code">' + esc(cdisp(c)) + '</span>'; }).join('');
      return '<li class="card"><a class="cname" href="' + PFX + '/madrasa/' + m.id + '/">' + esc(m.name) + '</a><p class="loc">' + esc(loc) + '</p><p class="tags">' + tags + '</p></li>';
    }).join('');
    more.hidden = shown >= current.length;
  }

  function sync() {
    var p = new URLSearchParams();
    if (q.value) p.set('q', q.value);
    if (fdiv.value) p.set('division', fdiv.value);
    if (fdist.value) p.set('district', fdist.value);
    if (fupz.value) p.set('upazila', fupz.value);
    if (ftype.value) p.set('type', ftype.value);
    var s = p.toString();
    history.replaceState(null, '', location.pathname + (s ? '?' + s : ''));
  }

  var t;
  q.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { run(); }, 120); });
  fdiv.addEventListener('change', function () { fdist.value = ''; fillDist(); fillUpz(); run(); });
  fdist.addEventListener('change', function () { fupz.value = ''; fillUpz(); run(); });
  [fupz, ftype].forEach(function (el) { el.addEventListener('change', function () { run(); }); });
  more.addEventListener('click', function () { shown += PAGE; render(); });
  $('reset').addEventListener('click', function () {
    q.value = ''; fdiv.value = ''; fdist.value = ''; ftype.value = '';
    fillDist(); fupz.value = ''; fillUpz(); run();
  });
})();
