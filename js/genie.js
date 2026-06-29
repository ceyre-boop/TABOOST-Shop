/* ============================================================
   TABOOST Genie — client-side AI assistant (no backend, no keys)
   - Persistent floating button + panel (greeter / orientation / niche / menu)
   - Product-pop-up Script Generator (HOOK / BUILD / TURN / CLOSE) with 5 angle variants
   - Saved scripts + post-launch follow-up
   Voice: casual, sharp, creator-friend. Never corporate filler.
   ============================================================ */
(function () {
  'use strict';

  var GENIE_IMG = 'images/genie-icon.png';
  var STATE_KEY = 'taboost_genie_state';
  var SAVED_KEY = 'taboost_genie_saved';

  // ---------- state ----------
  function loadState() {
    try { return JSON.parse(localStorage.getItem(STATE_KEY)) || {}; } catch (e) { return {}; }
  }
  function saveState(s) { try { localStorage.setItem(STATE_KEY, JSON.stringify(s)); } catch (e) {} }
  function loadSaved() {
    try { return JSON.parse(localStorage.getItem(SAVED_KEY)) || []; } catch (e) { return []; }
  }
  function pushSaved(entry) {
    var arr = loadSaved(); arr.unshift(entry); arr = arr.slice(0, 25);
    try { localStorage.setItem(SAVED_KEY, JSON.stringify(arr)); } catch (e) {}
  }
  function isLoggedIn() {
    return !!(localStorage.getItem('taboost_user') || localStorage.getItem('shop_user'));
  }

  // ---------- product signal parsing ----------
  function num(v) { return parseFloat(String(v == null ? '' : v).replace(/[^0-9.]/g, '')) || 0; }
  function intNum(v) { return parseInt(String(v == null ? '' : v).replace(/[^0-9]/g, ''), 10) || 0; }

  function signals(item) {
    var price = num(item.price);
    var sold = intNum(item.sold);
    var comm = num(item.commission);
    return {
      priceNum: price,
      priceLabel: price ? ('$' + (price < 100 ? price.toFixed(price % 1 ? 2 : 0) : Math.round(price))) : 'this',
      priceBand: price < 25 ? 'impulse' : price <= 75 ? 'mid' : 'premium',
      soldNum: sold,
      soldLabel: sold ? sold.toLocaleString() : '0',
      soldBand: sold > 50000 ? 'bestseller' : sold >= 10000 ? 'proven' : sold >= 1000 ? 'growing' : 'emerging',
      commNum: comm,
      highComm: comm >= 20,
      name: shortName(item.name),
      brand: (item.creator && item.creator !== 'Unknown Shop') ? item.creator : ''
    };
  }
  function shortName(n) {
    n = String(n || 'this product').replace(/\.\.\.$/, '').trim();
    if (n.length > 46) n = n.slice(0, 44).trim() + '…';
    return n;
  }

  // ---------- category intelligence ----------
  var CAT = {
    'Beauty & Personal Care': { fmt: 'before/after transformation', who: 'skincare & beauty lovers (18–34)', pain: 'products that overpromise and underdeliver', demo: 'show your skin/results on camera, no filter' },
    'Health': { fmt: 'routine / day-in-the-life', who: 'wellness & self-improvement viewers', pain: 'not knowing what actually works', demo: 'work it into your real daily routine' },
    'Phones & Electronics': { fmt: '"problem/solution" demo', who: 'WFH creators, commuters, students (18–34)', pain: 'tangled wires, dead batteries, earbuds that fall out', demo: 'use it in a loud/real environment on camera' },
    'Computers & Office Equipment': { fmt: 'desk-setup / productivity demo', who: 'students, remote workers, creators', pain: 'a messy, half-finished setup', demo: 'show it on your actual desk in use' },
    'Womenswear & Underwear': { fmt: 'try-on haul / styling', who: 'fashion & outfit-inspo viewers (18–34)', pain: 'stuff that looks great online, bad in person', demo: 'try it on, show the real fit + movement' },
    'Shoes': { fmt: 'on-feet / styling', who: 'sneakerheads & outfit-inspo viewers', pain: 'shoes that hurt or look cheap on-feet', demo: 'on-feet walk + how you\'d style them' },
    'Fashion Accessories': { fmt: 'styling / outfit-completer', who: 'fashion & gift shoppers', pain: 'an outfit that feels unfinished', demo: 'show it completing 2–3 different looks' },
    'Sports & Outdoor': { fmt: 'in-action demo', who: 'fitness & outdoor enthusiasts', pain: 'gear that quits when you push it', demo: 'use it mid-workout / outdoors' },
    'Home Supplies': { fmt: 'satisfying restock / organization', who: 'home & #cleantok viewers', pain: 'a small daily annoyance at home', demo: 'show the before-mess and after-fix' },
    'Household Appliances': { fmt: '"is it worth it" review', who: 'home upgraders & new-apartment viewers', pain: 'wasting money on gadgets that flop', demo: 'run a real test on camera' },
    'Kitchenware': { fmt: 'recipe / cooking demo', who: 'foodies & home cooks', pain: 'kitchen tasks that take forever', demo: 'actually cook with it' },
    'Furniture': { fmt: 'room makeover / assembly', who: 'home & apartment-decor viewers', pain: 'a room that feels off', demo: 'show the space before vs after' },
    'Food & Beverages': { fmt: 'taste-test / mukbang', who: 'food & snack-haul viewers', pain: 'boring snacks / overhyped flavors', demo: 'genuine first-taste reaction' },
    'Automotive & Motorcycle': { fmt: 'install / before-after', who: 'car & DIY enthusiasts', pain: 'expensive shop upgrades', demo: 'do the quick install on camera' },
    'Toys & Hobbies': { fmt: 'unboxing / play demo', who: 'parents & gift shoppers', pain: 'gifts that get ignored', demo: 'show it actually being used/played with' },
    'Pet Supplies': { fmt: 'reaction / pet demo', who: 'pet parents', pain: 'stuff your pet ignores', demo: 'film your pet\'s real reaction' },
    'Luggage & Bags': { fmt: 'travel / what-fits-in-my-bag demo', who: 'travelers, commuters & students', pain: 'bags that fall apart or never fit enough', demo: 'pack it on camera and show the real capacity' },
    'Jewelry Accessories & Derivatives': { fmt: 'close-up sparkle / styling', who: 'jewelry lovers & gift shoppers', pain: 'cheap-looking pieces that tarnish fast', demo: 'close-ups in good light + how it looks on' },
    'Menswear & Underwear': { fmt: 'fit check / try-on', who: 'guys & partners shopping for them', pain: 'clothes that fit weird or feel cheap', demo: 'fit check + a fabric close-up' },
    'Home Improvement': { fmt: 'before/after upgrade', who: 'DIYers & new homeowners', pain: 'projects that look hard or pricey', demo: 'quick before-and-after of the fix' },
    'Tools & Hardware': { fmt: '"does it actually work" demo', who: 'DIYers & handy viewers', pain: 'cheap tools that break on first use', demo: 'put it through a real task on camera' },
    'Textiles & Soft Furnishings': { fmt: 'cozy restyle / texture close-up', who: 'home & cozy-aesthetic viewers', pain: 'a room that feels cold or unfinished', demo: 'show the texture + the room glow-up' },
    'Baby & Maternity': { fmt: 'honest parent review', who: 'new & expecting parents', pain: 'overwhelming baby-gear choices', demo: 'show it in a real parent moment' },
    'Other': { fmt: 'honest review / unboxing', who: 'deal-seekers & curious browsers', pain: 'overpaying for the wrong thing', demo: 'show it in real use' }
  };
  function catInfo(cat) { return CAT[cat] || CAT['Other']; }

  function socialProof(s) {
    if (s.soldBand === 'bestseller') return s.soldLabel + ' already sold — lean into "everyone\'s buying this"';
    if (s.soldBand === 'proven') return 'thousands sold — it\'s proven, say so';
    if (s.soldBand === 'growing') return 'it\'s picking up fast — "before it blows up" angle works';
    return 'barely anyone\'s covered this yet — you get first-mover content';
  }

  // ---------- script engine: 5 angles + balanced default ----------
  // each returns {hook:[], build:[], turn:[], close:[]}
  function angleBalanced(s, c) {
    return {
      hook: [
        'Call out a relatable frustration: ' + c.pain,
        s.priceBand === 'impulse' ? 'Or price shock: "these are only ' + s.priceLabel + ' and they\'re actually insane"'
          : 'Or curiosity: "I did not expect ' + s.priceLabel + ' to do this"'
      ],
      build: [
        'Show, don\'t tell — ' + c.demo,
        'Drop the one "wow" detail about ' + s.name,
        socialProof(s)
      ],
      turn: [
        'Make it personal — gym, commute, WFH, studying, whatever\'s real for you',
        'One honest "this surprised me" moment builds trust fast'
      ],
      close: [
        '"Link\'s in my bio / TikTok Shop"',
        s.soldBand === 'emerging' ? 'Soft urgency only if real (limited stock / early price)' : 'Soft urgency: "this is selling, prices move"',
        'Leave them wanting to check the price themselves'
      ]
    };
  }
  function angleStorytime(s, c) {
    return {
      hook: ['Open mid-story: "so I almost didn\'t buy this and I\'m so glad I did"', 'Tease the payoff before you explain — make them stay for it'],
      build: ['Walk the timeline: the problem (' + c.pain + ') → finding ' + s.name + ' → the moment it clicked', c.demo + ' as the "proof" beat of the story'],
      turn: ['The emotional turn: how it actually changed your day-to-day', 'Be specific and real — vague stories don\'t convert'],
      close: ['"If you\'ve dealt with the same thing, it\'s in my TikTok Shop"', 'End on the feeling, not the sell']
    };
  }
  function angleEducational(s, c) {
    return {
      hook: ['Lead with a "did you know" about ' + (s.brand || 'this category') + ' / ' + s.name, '"Most people buy these wrong — here\'s what to look for"'],
      build: ['Teach 2–3 things people don\'t know (' + c.fmt + ')', c.demo + ' to prove the point, not just claim it', 'Name the spec that actually matters and why'],
      turn: ['Position yourself as the one who did the research so they don\'t have to', 'Honest caveat = credibility (say who it\'s NOT for)'],
      close: ['"I dropped the exact one I recommend in my shop"', 'CTA framed as "save yourself the research"']
    };
  }
  function angleBeforeAfter(s, c) {
    return {
      hook: ['Open on the "before" — ' + c.pain, 'Tease the after: "wait til you see the difference ' + s.name + ' made"'],
      build: ['Show a clear before shot, then ' + c.demo, 'Reveal the after — make the contrast impossible to miss', socialProof(s)],
      turn: ['Hold on the side-by-side so the change actually lands', 'One honest "it won\'t fix everything" keeps it believable'],
      close: ['"The exact one I used is in my TikTok Shop"', 'Let the transformation do the selling']
    };
  }
  function angleProductDemo(s, c) {
    return {
      hook: ['Hands-on in the first 2 seconds: "here\'s exactly how ' + s.name + ' works"', s.priceBand === 'impulse' ? 'Drop the price early: "and it\'s only ' + s.priceLabel + '"' : 'Lead with the one feature people always ask about'],
      build: [c.demo, 'Walk it step by step — show the feature that matters most for ' + c.who, socialProof(s)],
      turn: ['Point out the detail a spec sheet won\'t tell you', 'Keep one honest limitation in so it feels real, not an ad'],
      close: ['"Tap the link to grab it — TikTok Shop"', 'Recap the main benefit in one line']
    };
  }
  function angleUnboxing(s, c) {
    return {
      hook: ['Real-time reaction: "ordered this for ' + s.priceLabel + ', let\'s see"', 'Hands + product on screen immediately — no slow intro'],
      build: ['First impressions out loud — packaging, feel, surprise factor', c.demo + ' the second you get it working', 'Genuine reactions > scripted lines here'],
      turn: ['The "okay this is actually good / not what I expected" beat', 'Keep one flaw in — perfect reviews feel fake'],
      close: ['"Linking it now while it\'s on my mind — TikTok Shop"', 'Tease a follow-up ("update after a week") to bank a second video']
    };
  }
  function angleSkit(s, c) {
    return {
      hook: ['Cold-open a relatable scenario where ' + c.pain + ' ruins the moment', 'Play both sides — the struggle, then the fix'],
      build: ['Reveal ' + s.name + ' as the "plot twist" solution', c.demo + ' as the punchline / payoff', 'Keep it fast — the algorithm loves a tight loop'],
      turn: ['Exaggerate the before, keep the after real', 'POV format works great here'],
      close: ['Drop the "ok but for real it\'s in my shop" at the end', 'Comedy gets the views, the soft CTA gets the sales']
    };
  }
  // Angles match Kyra's genie-scripts.md (no Unboxing). 'balanced' === her "Generic".
  var ANGLES = [
    { id: 'balanced', label: '⚖️ Basic', fn: angleBalanced },
    { id: 'storytime', label: '🎬 Storytime', fn: angleStorytime },
    { id: 'educational', label: '🎓 Educational', fn: angleEducational },
    { id: 'beforeafter', label: '🔄 Before & After', fn: angleBeforeAfter },
    { id: 'demo', label: '🎥 Product Demo', fn: angleProductDemo },
    { id: 'skit', label: '😂 Skit/Comedy', fn: angleSkit }
  ];

  // Granular product category -> Kyra script bucket (window.GENIE_SCRIPTS keys).
  // Uncovered categories (Automotive & Motorcycle, Baby & Maternity, Other) map to
  // nothing and fall back to the generated angle functions below.
  var CATEGORY_TO_BUCKET = {
    'Beauty & Personal Care': 'Beauty',
    'Womenswear & Underwear': 'Fashion', 'Menswear & Underwear': 'Fashion', 'Shoes': 'Fashion',
    'Fashion Accessories': 'Accessories', 'Jewelry Accessories & Derivatives': 'Accessories', 'Luggage & Bags': 'Accessories',
    'Phones & Electronics': 'Electronics', 'Computers & Office Equipment': 'Electronics',
    'Home Supplies': 'Home', 'Household Appliances': 'Home', 'Furniture': 'Home',
    'Home Improvement': 'Home', 'Textiles & Soft Furnishings': 'Home', 'Tools & Hardware': 'Home',
    'Kitchenware': 'Kitchen',
    'Health': 'Health',
    'Sports & Outdoor': 'Sports',
    'Food & Beverages': 'Food',
    'Pet Supplies': 'Pets',
    'Toys & Hobbies': 'Toys'
  };

  // Pick one random line from a section and drop in the real product name for [product].
  function pickLine(arr, item) {
    if (!arr || !arr.length) return '';
    var line = arr[Math.floor(Math.random() * arr.length)];
    return line.replace(/\[product\]/gi, shortName(item.name));
  }

  function buildScript(item, angleId) {
    // Kyra's curated copy where we have it; one random line per section.
    var bucket = CATEGORY_TO_BUCKET[item.category];
    var set = bucket && window.GENIE_SCRIPTS && window.GENIE_SCRIPTS[bucket] && window.GENIE_SCRIPTS[bucket][angleId];
    if (set) {
      return [
        { title: 'HOOK', hint: 'first 2 seconds', bullets: [pickLine(set.hook, item)] },
        { title: 'THE BUILD', hint: 'show, don\'t just tell', bullets: [pickLine(set.build, item)] },
        { title: 'THE TURN', hint: 'why you specifically', bullets: [pickLine(set.turn, item)] },
        { title: 'THE CLOSE', hint: 'soft sell, no pressure', bullets: [pickLine(set.close, item)] }
      ];
    }
    // Fallback: generated script for categories Kyra didn't cover.
    var s = signals(item), c = catInfo(item.category);
    var angle = ANGLES.filter(function (a) { return a.id === angleId; })[0] || ANGLES[0];
    var b = angle.fn(s, c);
    return [
      { title: 'HOOK', hint: 'first 2 seconds', bullets: b.hook },
      { title: 'THE BUILD', hint: 'show, don\'t just tell', bullets: b.build },
      { title: 'THE TURN', hint: 'why you specifically', bullets: b.turn },
      { title: 'THE CLOSE', hint: 'soft sell, no pressure', bullets: b.close }
    ];
  }
  function scriptToText(item, blocks) {
    var out = '🧞 TABOOST Genie script — ' + shortName(item.name) + '\n';
    blocks.forEach(function (bl) {
      out += '\n' + bl.title + ' (' + bl.hint + ')\n';
      bl.bullets.forEach(function (x) { out += '• ' + x + '\n'; });
    });
    out += '\nLink: ' + (item.link || '') + '\n';
    return out;
  }

  // ---------- product lookup ----------
  function findProduct(id) {
    var p = (window.PRODUCT_DATA || []).filter(function (x) { return x.id === id; })[0];
    if (!p) p = (window.CAMPAIGN_DATA || []).filter(function (x) { return x.id === id; })[0];
    return p || null;
  }

  // ---------- DOM helpers ----------
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (m) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[m]; }); }

  // ---------- build chrome (fab, panel, toast) ----------
  var fab, panel, panelBody, toast, currentProduct = null, currentAngle = 'balanced', lastBlocks = null;

  function buildChrome() {
    // floating button
    fab = el('button', 'genie-fab pulsing');
    fab.setAttribute('aria-label', 'Ask the TABOOST Genie');
    fab.innerHTML = '<img src="' + GENIE_IMG + '" alt="Genie">' +
      '<span class="genie-fab-spark">✨</span>' +
      '<span class="genie-fab-label">Ask the Genie</span>';
    fab.addEventListener('click', togglePanel);
    document.body.appendChild(fab);

    // panel
    panel = el('div', 'genie-panel');
    panel.innerHTML =
      '<div class="genie-head">' +
        '<img src="' + GENIE_IMG + '" alt="Genie">' +
        '<div><div class="genie-title">TABOOST Genie</div><div class="genie-sub">your TikTok Shop wingman</div></div>' +
        '<button class="genie-close" aria-label="Close">×</button>' +
      '</div>' +
      '<div class="genie-body" id="genie-body"></div>' +
      '<div class="genie-foot">' +
        '<button class="genie-quick" data-view="menu">🏠 Menu</button>' +
        '<button class="genie-quick" data-view="faq">❓ How it works</button>' +
      '</div>';
    document.body.appendChild(panel);
    panelBody = panel.querySelector('#genie-body');
    panel.querySelector('.genie-close').addEventListener('click', closePanel);
    panel.querySelectorAll('.genie-foot .genie-quick').forEach(function (q) {
      q.addEventListener('click', function () { render(q.getAttribute('data-view')); });
    });

    // toast
    toast = el('div', 'genie-toast');
    document.body.appendChild(toast);
  }

  function openPanel() {
    panel.classList.add('open');
    fab.classList.remove('pulsing');
    var st = loadState(); st.hasGreeted = true; saveState(st);
  }
  function closePanel() { panel.classList.remove('open'); }
  function togglePanel() {
    if (panel.classList.contains('open')) { closePanel(); return; }
    openPanel();
    // pick a sensible first view
    var st = loadState();
    if (!st.segment) render('greeter');
    else render('menu');
  }

  // ---------- panel views ----------
  function render(view, data) {
    panelBody.innerHTML = '';
    if (view === 'greeter') return viewGreeter();
    if (view === 'orient') return viewOrient(data || 0);
    if (view === 'niche') return viewNiche();
    if (view === 'findcat') return viewFindCat();
    if (view === 'findsub') return viewFindSub(data);
    if (view === 'menu') return viewMenu();
    if (view === 'saved') return viewSaved();
    if (view === 'faq') return viewFaq();
    viewMenu();
  }

  function addMsg(html) { panelBody.appendChild(el('div', 'genie-msg', html)); }
  function choiceRow(choices) {
    var wrap = el('div', 'genie-choices');
    choices.forEach(function (ch) {
      var b = el('button', 'genie-choice', '<span class="genie-choice-emoji">' + ch.emoji + '</span><span>' + esc(ch.label) + '</span>');
      b.addEventListener('click', ch.onClick);
      wrap.appendChild(b);
    });
    panelBody.appendChild(wrap);
  }

  function viewGreeter() {
    addMsg("Hey! I'm the <b>TABOOST Genie</b>. 🧞");
    addMsg("I help TikTok creators find hot products <b>and</b> know exactly what to say to sell them. What describes you?");
    choiceRow([
      { emoji: '🌱', label: "I'm new to TikTok Shop", onClick: function () { setSegment('new'); render('orient', 0); } },
      { emoji: '🔥', label: 'I already create on TikTok', onClick: function () { setSegment('experienced'); render('niche'); } }
    ]);
  }
  function setSegment(seg) { var st = loadState(); st.segment = seg; st.firstVisitTs = st.firstVisitTs || Date.now(); saveState(st); }

  var ORIENT = [
    { t: "Quick version: <b>TikTok Shop affiliate</b> = you post a video, tag a product, and earn commission on every sale through your link. No inventory, no shipping. You just create." },
    { t: "Why come through <b>TABOOST</b> instead of TikTok direct? We broker <b>higher commission rates</b> with brands than the open rates — so the same video pays you more. Same products, better cut." },
    { t: "Your first move: browse the products below, tap one, and hit <b>🧞 Genie Script</b> — I'll hand you the exact talking points to film. Pick something you'd actually use." }
  ];
  function viewOrient(step) {
    step = Math.max(0, Math.min(ORIENT.length - 1, step));
    var dots = el('div', 'genie-steps');
    ORIENT.forEach(function (_, i) { dots.appendChild(el('div', 'genie-step-dot' + (i === step ? ' active' : ''))); });
    panelBody.appendChild(dots);
    addMsg(ORIENT[step].t);
    var actions = el('div', 'genie-actions');
    if (step > 0) { var back = el('button', 'genie-btn secondary', '← Back'); back.addEventListener('click', function () { render('orient', step - 1); }); actions.appendChild(back); }
    if (step < ORIENT.length - 1) {
      var next = el('button', 'genie-btn', 'Next →'); next.addEventListener('click', function () { render('orient', step + 1); }); actions.appendChild(next);
    } else {
      var done = el('button', 'genie-btn green', "Let's browse 👇"); done.addEventListener('click', function () { closePanel(); window.scrollTo({ top: Math.max(0, (document.getElementById('featured-section') || document.body).offsetTop - 80), behavior: 'smooth' }); }); actions.appendChild(done);
      var su = el('button', 'genie-btn secondary', 'Sign up'); su.addEventListener('click', function () { window.location.href = 'shop-signup.html'; }); actions.appendChild(su);
    }
    panelBody.appendChild(actions);
  }

  var NICHES = ['Beauty & Personal Care', 'Phones & Electronics', 'Womenswear & Underwear', 'Home Supplies', 'Kitchenware', 'Sports & Outdoor', 'Health', 'Food & Beverages', 'Pet Supplies', 'Toys & Hobbies'];
  function viewNiche() {
    addMsg("Love it. What niche do you create in? I'll pull the most relevant products up top.");
    var chips = el('div', 'genie-chips');
    NICHES.forEach(function (n) {
      var label = n.split(' & ')[0];
      var c = el('button', 'genie-chip', esc(label));
      c.addEventListener('click', function () {
        var st = loadState(); st.niche = n; saveState(st);
        applyNiche(n);
        closePanel();
      });
      chips.appendChild(c);
    });
    panelBody.appendChild(chips);
  }
  function applyNiche(niche) {
    // reuse existing search path
    var input = document.getElementById('main-search');
    var trigger = document.getElementById('search-trigger');
    if (input && trigger) { input.value = niche; trigger.click(); }
    // handleSearch runs synchronously on click, so results are now rendered — bring them into view
    var results = document.getElementById('search-results-container');
    if (results) window.scrollTo({ top: Math.max(0, results.offsetTop - 80), behavior: 'smooth' });
  }

  // ---------- two-step product finder (main category → data subcategory) ----------
  // Main buckets mirror the page's main category options; subcategories are the
  // granular data `category` values, pulled live from PRODUCT_DATA.
  var MAIN_CATEGORY_MAP = {
    'Beauty': ['Beauty & Personal Care'],
    'Fashion': ['Womenswear & Underwear', 'Menswear & Underwear', 'Shoes', 'Fashion Accessories', 'Jewelry Accessories & Derivatives', 'Luggage & Bags'],
    'Home': ['Home Supplies', 'Household Appliances', 'Kitchenware', 'Furniture', 'Home Improvement', 'Textiles & Soft Furnishings'],
    'Electronics': ['Phones & Electronics', 'Computers & Office Equipment'],
    'Health': ['Health'],
    'Sports & Outdoor': ['Sports & Outdoor', 'Automotive & Motorcycle', 'Tools & Hardware'],
    'Food': ['Food & Beverages'],
    'Pets': ['Pet Supplies'],
    'Toys & Baby': ['Toys & Hobbies', 'Baby & Maternity'],
    'Other': ['Other']
  };
  var MAIN_ORDER = ['Beauty', 'Fashion', 'Home', 'Electronics', 'Health', 'Sports & Outdoor', 'Food', 'Pets', 'Toys & Baby', 'Other'];

  function distinctCats() {
    var seen = {};
    (window.PRODUCT_DATA || []).forEach(function (p) { if (p.category) seen[p.category] = true; });
    return seen;
  }

  function viewFindCat() {
    addMsg("Nice — what are you into? Pick a <b>main category</b>:");
    var have = distinctCats();
    var chips = el('div', 'genie-chips');
    // Match the top-bar pills: Priority Campaigns + High Commission first (no subcategory step)
    var pc = el('button', 'genie-chip', '🎯 Priority Campaigns');
    pc.addEventListener('click', function () {
      closePanel();
      // Call the exact same handler the homepage Priority Campaigns pill uses (clearSearch + scroll)
      if (window.showPriorityCampaigns) window.showPriorityCampaigns();
    });
    chips.appendChild(pc);
    var hc = el('button', 'genie-chip', 'High Commission');
    hc.addEventListener('click', function () { applyNiche('High Commission'); closePanel(); });
    chips.appendChild(hc);
    MAIN_ORDER.forEach(function (main) {
      var subs = (MAIN_CATEGORY_MAP[main] || []).filter(function (c) { return have[c]; });
      if (!subs.length) return;
      var b = el('button', 'genie-chip', esc(main));
      b.addEventListener('click', function () { render('findsub', main); });
      chips.appendChild(b);
    });
    panelBody.appendChild(chips);
  }

  function viewFindSub(main) {
    main = main || MAIN_ORDER[0];
    var have = distinctCats();
    var subs = (MAIN_CATEGORY_MAP[main] || []).filter(function (c) { return have[c]; });
    addMsg("<b>" + esc(main) + "</b> — pick a subcategory and I'll pull those products up:");
    var chips = el('div', 'genie-chips');
    subs.forEach(function (sub) {
      var b = el('button', 'genie-chip', esc(sub));
      b.addEventListener('click', function () { applyNiche(sub); closePanel(); });
      chips.appendChild(b);
    });
    panelBody.appendChild(chips);
    var actions = el('div', 'genie-actions');
    var back = el('button', 'genie-btn secondary', '← Categories');
    back.addEventListener('click', function () { render('findcat'); });
    actions.appendChild(back);
    panelBody.appendChild(actions);
  }

  function viewMenu() {
    var hi = isLoggedIn() ? 'Welcome back! 👋' : 'What can I help with?';
    addMsg(hi);
    choiceRow([
      { emoji: '🛍️', label: 'Find a product to promote', onClick: function () { render('findcat'); } },
      { emoji: '❓', label: 'How does TABOOST work?', onClick: function () { render('faq'); } },
      { emoji: '🚀', label: 'Join TABOOST', onClick: function () { window.open('https://www.taboost.me/join', '_blank'); } }
    ]);
    addMsg("Tip: tap any product and hit <b>🧞 Genie Script</b> for ready-to-film talking points. ✨");
  }

  function viewSaved() {
    var arr = loadSaved();
    if (!arr.length) { addMsg("No saved scripts yet. When you generate a script and tap <b>Open in TikTok</b>, I'll offer to save it for filming."); return; }
    addMsg("Your saved scripts 📁");
    arr.forEach(function (entry) {
      var card = el('div', 'genie-msg', '<b>' + esc(entry.name) + '</b><br><span style="color:var(--genie-text-dim);font-size:12px;">' + esc(entry.angleLabel || '') + ' · ' + new Date(entry.ts).toLocaleDateString() + '</span>');
      var act = el('div', 'genie-actions');
      var copy = el('button', 'genie-btn secondary', 'Copy'); copy.addEventListener('click', function () { copyText(entry.text, copy); }); act.appendChild(copy);
      card.appendChild(act);
      panelBody.appendChild(card);
    });
  }

  function viewFaq() {
    addMsg("<b>TABOOST in 10 seconds:</b> we line up products from TikTok Shop with <b>higher commission rates</b> than you'd get on your own. You film, you tag, you earn — more per sale.");
    addMsg("<b>The Genie part:</b> tap any product and I write you a flexible <b>script framework</b> — hook, build, turn, close — tuned to that product's price, sales, and category. Bend it to your voice.");
    addMsg("No account needed to browse but if you want more Shop perks apply to join TABOOST!");
    var actions = el('div', 'genie-actions');
    var join = el('button', 'genie-btn green', 'Join TABOOST →');
    join.addEventListener('click', function () { window.open('https://www.taboost.me/join', '_blank'); });
    actions.appendChild(join);
    panelBody.appendChild(actions);
  }

  // ---------- product pop-up: Genie Script section ----------
  function mountScriptSection() {
    var bar = document.getElementById('action-bar');
    if (!bar || document.getElementById('genie-script-mount')) return;
    var wrap = el('div');
    wrap.id = 'genie-script-mount';
    wrap.innerHTML =
      '<div class="genie-script-trigger">' +
        '<span class="genie-script-label">🧞 Genie Script <span style="opacity:.8">✨</span></span>' +
      '</div>' +
      '<div class="genie-script-content" id="genie-script-content"></div>';
    bar.appendChild(wrap);
  }

  function renderScript() {
    var box = document.getElementById('genie-script-content');
    if (!box || !currentProduct) return;
    var blocks = buildScript(currentProduct, currentAngle);
    lastBlocks = blocks;
    var html = '<hr class="genie-script-divider">';
    // angle chips
    html += '<div style="font-size:12px;color:var(--genie-text-dim);margin-bottom:6px;">Which fits your style?</div><div class="genie-angles">';
    ANGLES.forEach(function (a) { html += '<button class="genie-angle' + (a.id === currentAngle ? ' active' : '') + '" data-angle="' + a.id + '">' + a.label + '</button>'; });
    html += '</div>';
    // blocks
    blocks.forEach(function (bl) {
      html += '<div class="genie-block"><div class="genie-block-title">' + bl.title + ' <span class="genie-block-hint">(' + bl.hint + ')</span></div>';
      bl.bullets.forEach(function (x) { html += '<div class="genie-bullet">' + esc(x) + '</div>'; });
      html += '</div>';
    });
    html += '<div class="genie-script-actions">' +
      '<button class="genie-copy" id="genie-copy">📋 Copy Script</button>' +
      '<button id="genie-shuffle">🔀 Shuffle lines</button>' +
      '<button id="genie-regen">🎭 Different angle</button>' +
      '</div>';
    box.innerHTML = html;
    box.querySelectorAll('.genie-angle').forEach(function (b) {
      b.addEventListener('click', function () { currentAngle = b.getAttribute('data-angle'); renderScript(); });
    });
    box.querySelector('#genie-copy').addEventListener('click', function () {
      copyText(scriptToText(currentProduct, blocks), box.querySelector('#genie-copy'));
    });
    box.querySelector('#genie-shuffle').addEventListener('click', function () {
      renderScript(); // fresh random line per section, same angle
    });
    box.querySelector('#genie-regen').addEventListener('click', function () {
      var idx = ANGLES.map(function (a) { return a.id; }).indexOf(currentAngle);
      currentAngle = ANGLES[(idx + 1) % ANGLES.length].id;
      renderScript();
    });
  }

  function copyText(text, btn) {
    function ok() { if (btn) { btn.classList.add('copied'); var t = btn.textContent; btn.textContent = '✓ Copied'; setTimeout(function () { btn.classList.remove('copied'); btn.textContent = t; }, 1600); } }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(ok, function () { fallbackCopy(text); ok(); });
    } else { fallbackCopy(text); ok(); }
  }
  function fallbackCopy(text) {
    var ta = el('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) {} document.body.removeChild(ta);
  }

  // ---------- public hooks (called from index.html) ----------
  window.Genie = {
    open: function () {
      openPanel();
      var st = loadState();
      render(st.segment ? 'menu' : 'greeter');
    },
    onProductSelected: function (id) {
      currentProduct = findProduct(id);
      currentAngle = 'balanced';
      lastBlocks = null;
      mountScriptSection();
      var box = document.getElementById('genie-script-content');
      if (box) { box.classList.add('expanded'); renderScript(); }
    },
    onProductCleared: function () {
      var box = document.getElementById('genie-script-content');
      if (box) { box.classList.remove('expanded'); }
    },
    onLaunch: function () {
      // If they generated a script, offer to save it for filming.
      if (currentProduct && lastBlocks) showFollowUp(currentProduct, lastBlocks);
    }
  };

  function showFollowUp(item, blocks) {
    toast.innerHTML =
      '<img src="' + GENIE_IMG + '" alt="Genie">' +
      '<div><div class="genie-toast-body">Want me to save this script for when you\'re filming?</div>' +
      '<div class="genie-toast-actions">' +
        '<button class="genie-btn green" id="genie-save-yes" style="padding:7px 12px;font-size:12px;">Save it</button>' +
        '<button class="genie-btn secondary" id="genie-save-no" style="padding:7px 12px;font-size:12px;">No thanks</button>' +
      '</div></div>';
    toast.classList.add('show');
    var hide = function () { toast.classList.remove('show'); };
    toast.querySelector('#genie-save-yes').addEventListener('click', function () {
      var lbl = (ANGLES.filter(function (a) { return a.id === currentAngle; })[0] || ANGLES[0]).label;
      pushSaved({ name: shortName(item.name), angleLabel: lbl, text: scriptToText(item, blocks), ts: Date.now(), link: item.link || '' });
      toast.querySelector('.genie-toast-body').textContent = 'Saved! Find it under 📁 Saved scripts.';
      toast.querySelector('.genie-toast-actions').innerHTML = '';
      setTimeout(hide, 1800);
    });
    toast.querySelector('#genie-save-no').addEventListener('click', hide);
    setTimeout(hide, 8000);
  }

  // ---------- greeter auto-open ----------
  function maybeGreet() {
    var st = loadState();
    if (st.hasGreeted || st.segment || isLoggedIn()) return;
    setTimeout(function () {
      if (panel.classList.contains('open')) return;
      openPanel();
      render('greeter');
    }, 2500);
  }

  // ---------- freshness: read "Generated:" date from product-data.js header ----------
  function showFreshness() {
    if (!window.fetch) return;
    fetch('js/product-data.js').then(function (r) {
      // Read only the first chunk (the header comment) — avoid pulling the whole 3.9MB file.
      if (r.body && r.body.getReader) {
        var reader = r.body.getReader();
        return reader.read().then(function (res) {
          try { reader.cancel(); } catch (e) {}
          return new TextDecoder().decode(res.value || new Uint8Array());
        });
      }
      return r.text();
    }).then(function (t) {
      if (!t) return;
      var m = t.match(/Generated:\s*(\d{4})-(\d{2})-(\d{2})/);
      if (!m) return;
      var total = (t.match(/Total Products:\s*([0-9,]+)/) || [])[1];
      var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      var label = months[parseInt(m[2], 10) - 1] + ' ' + parseInt(m[3], 10) + ', ' + m[1];
      var badge = el('div', 'genie-fresh-badge');
      badge.innerHTML = '<span class="dot"></span><span>Catalog refreshed ' + label + (total ? (' · ' + total + ' products') : '') + '</span>';
      var anchor = document.getElementById('featured-section') || document.querySelector('.product-grid');
      if (anchor && anchor.parentNode && !document.querySelector('.genie-fresh-badge')) {
        anchor.parentNode.insertBefore(badge, anchor);
      }
    }).catch(function () {});
  }

  // ---------- init ----------
  function init() {
    buildChrome();
    showFreshness();
    maybeGreet();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
