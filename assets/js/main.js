/* =========================================================
   ZENITH — interactions & motion
   ========================================================= */
(function () {
  'use strict';

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(pointer: fine)').matches;
  var hasGSAP = !!(window.gsap && window.ScrollTrigger);
  var animOn = hasGSAP && !reduce;
  var isRTL = function () { return root.dir === 'rtl'; };
  var lenis = null;

  if (animOn) root.classList.add('anim');

  /* ---------------- i18n ---------------- */
  var AR = window.ZENITH_AR || {};
  var enCache = new Map();
  var enTitle = document.title;

  function setText(el, html) {
    if (el instanceof SVGElement) el.textContent = html;
    else el.innerHTML = html;
  }
  var ariaCache = new Map();
  function applyLang(lang) {
    $$('[data-i18n]').forEach(function (el) {
      if (!enCache.has(el)) enCache.set(el, el instanceof SVGElement ? el.textContent : el.innerHTML);
      var k = el.getAttribute('data-i18n');
      if (lang === 'ar' && AR[k] != null) setText(el, AR[k]);
      else setText(el, enCache.get(el));
    });
    $$('[data-i18n-aria]').forEach(function (el) {
      if (!ariaCache.has(el)) ariaCache.set(el, el.getAttribute('aria-label'));
      var k = el.getAttribute('data-i18n-aria');
      el.setAttribute('aria-label', lang === 'ar' && AR[k] != null ? AR[k] : ariaCache.get(el));
    });
    root.lang = lang;
    root.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.title = lang === 'ar' && AR._title ? AR._title : enTitle;
    var lb = $('#langBtn');
    if (lb) lb.setAttribute('aria-label', lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية');
    try { localStorage.setItem('zenith-lang', lang); } catch (e) {}
  }
  if (root.lang === 'ar') applyLang('ar');

  function toggleLang() {
    var next = root.lang === 'ar' ? 'en' : 'ar';
    document.body.style.transition = 'opacity .35s ease';
    document.body.style.opacity = '0';
    setTimeout(function () {
      applyLang(next);
      if (hasGSAP) ScrollTrigger.refresh();
      document.dispatchEvent(new CustomEvent('zenith:lang'));
      document.body.style.opacity = '1';
    }, 360);
  }
  $('#langBtn').addEventListener('click', toggleLang);
  $$('[data-lang-toggle]').forEach(function (b) { b.addEventListener('click', toggleLang); });

  /* ---------------- Starfield ---------------- */
  function starfield(canvas) {
    var ctx = canvas.getContext('2d');
    var cs0 = getComputedStyle(document.documentElement), STAR = (cs0.getPropertyValue('--star')||'#FFFFFF').trim(), HI = (cs0.getPropertyValue('--accent-hi-rgb')||'255,255,255').trim();
    if (!ctx) return;
    var base = +canvas.getAttribute('data-stars') || 100;
    var shoot = canvas.hasAttribute('data-shoot');
    var w = 0, h = 0, stars = [], raf = 0, visible = false, meteor = null, nextMeteor = 2500;

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      if (!w || !h) return;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.round(base * Math.max(0.55, Math.min(1.25, w / 1300)));
      stars = [];
      for (var i = 0; i < n; i++) {
        stars.push({
          x: Math.random() * w, y: Math.random() * h,
          r: Math.random() * 1.05 + 0.25,
          a: Math.random() * Math.PI * 2,
          s: 0.35 + Math.random() * 1.4,
          tint: Math.random() < 0.24
        });
      }
      if (reduce) draw(0);
    }
    function draw(t) {
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < stars.length; i++) {
        var st = stars[i];
        var o = reduce ? 0.7 : 0.18 + 0.82 * Math.abs(Math.sin(st.a + t * 0.0009 * st.s));
        ctx.globalAlpha = o;
        ctx.fillStyle = st.tint ? STAR : '#F1F2F4';
        ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, 6.2832); ctx.fill();
        if (st.r > 1.18 && o > 0.85) {
          ctx.globalAlpha = (o - 0.85) * 3;
          ctx.fillRect(st.x - 4, st.y - 0.25, 8, 0.5);
          ctx.fillRect(st.x - 0.25, st.y - 4, 0.5, 8);
        }
      }
      if (shoot && !reduce) {
        if (!meteor && t > nextMeteor) {
          var dir = Math.random() < 0.5 ? 1 : -1;
          meteor = { x: w * (0.2 + Math.random() * 0.6), y: h * (0.04 + Math.random() * 0.2), vx: dir * (5 + Math.random() * 3), vy: 2 + Math.random() * 1.5, life: 0 };
        }
        if (meteor) {
          meteor.life++;
          meteor.x += meteor.vx; meteor.y += meteor.vy;
          var tail = 14;
          var g = ctx.createLinearGradient(meteor.x, meteor.y, meteor.x - meteor.vx * tail, meteor.y - meteor.vy * tail);
          var fade = Math.max(0, 1 - meteor.life / 55);
          g.addColorStop(0, 'rgba(' + HI + ',' + fade + ')');
          g.addColorStop(1, 'rgba(' + HI + ',0)');
          ctx.globalAlpha = 1; ctx.strokeStyle = g; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(meteor.x, meteor.y); ctx.lineTo(meteor.x - meteor.vx * tail, meteor.y - meteor.vy * tail); ctx.stroke();
          if (meteor.life > 55) { meteor = null; nextMeteor = t + 4500 + Math.random() * 6000; }
        }
      }
      ctx.globalAlpha = 1;
    }
    function loop(t) { draw(t); raf = requestAnimationFrame(loop); }
    function start() { if (!raf && !reduce) raf = requestAnimationFrame(loop); }
    function stop() { cancelAnimationFrame(raf); raf = 0; }

    resize();
    var rt;
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(resize, 200); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        visible = en[0].isIntersecting;
        if (visible) { if (!w) resize(); start(); } else stop();
      }, { rootMargin: '100px' }).observe(canvas);
    } else start();
    canvas._resize = resize;
  }
  $$('canvas.stars').forEach(starfield);

  /* ---------------- Preloader ---------------- */
  function runLoader(done) {
    var loader = $('#loader');
    if (!loader) { done(); return; }
    root.classList.add('is-loading');
    var seen = root.classList.contains('seen');
    var num = $('#loaderNum'), gauge = $('#loaderGauge');
    var heroImg = $('.hero__media img');
    var finished = false;

    var imgReady = new Promise(function (r) {
      if (!heroImg || heroImg.complete) return r();
      heroImg.addEventListener('load', r, { once: true });
      heroImg.addEventListener('error', r, { once: true });
      setTimeout(r, 3500);
    });

    function finishSimple() {
      if (finished) return; finished = true;
      loader.style.transition = 'opacity .6s ease';
      loader.style.opacity = '0';
      root.classList.remove('is-loading');
      setTimeout(function () { loader.remove(); }, 650);
      done();
    }

    if (!animOn) { imgReady.then(finishSimple); return; }

    var dur = seen ? 0.9 : 2.1;
    var counter = { v: 1 };
    var tl = gsap.timeline();
    tl.to('.loader__logo .draw', { strokeDashoffset: 0, duration: seen ? 0.7 : 1.5, ease: 'power2.inOut', stagger: 0.25 }, 0)
      .to(counter, {
        v: 17, duration: dur, ease: 'power2.inOut',
        onUpdate: function () { num.textContent = String(Math.round(counter.v)).padStart(2, '0'); }
      }, 0.1)
      .to(gauge, { scaleX: 1, duration: dur, ease: 'power2.inOut' }, 0.1)
      .to('.loader__num', { scale: 1.08, duration: 0.25, yoyo: true, repeat: 1, ease: 'power1.inOut' });

    var timelineDone = new Promise(function (r) { tl.eventCallback('onComplete', r); });
    loader.addEventListener('click', function () { tl.progress(1); });

    Promise.all([imgReady, timelineDone]).then(function () {
      if (finished) return; finished = true;
      var out = gsap.timeline({ onComplete: function () { loader.remove(); } });
      out.to('.loader__inner', { opacity: 0, y: -24, duration: 0.5, ease: 'power2.in' })
        .to('.loader .stars', { opacity: 0, duration: 0.4 }, '<')
        .add(function () {
          root.classList.remove('is-loading');
          try { sessionStorage.setItem('zenith-seen', '1'); } catch (e) {}
          done();
        }, '-=0.05')
        .to('.loader__door--a', { xPercent: isRTL() ? 100 : -100, duration: 1.25, ease: 'expo.inOut' }, '-=0.05')
        .to('.loader__door--b', { xPercent: isRTL() ? -100 : 100, duration: 1.25, ease: 'expo.inOut' }, '<');
    });
  }

  /* ---------------- Hero intro ---------------- */
  function heroIntro() {
    if (!animOn) return;
    var tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.fromTo('.hero__media img', { scale: 1.4 }, { scale: 1.12, duration: 2.8, ease: 'power3.out' }, 0)
      .from('.hero__word span', { yPercent: 115, duration: 1.7, stagger: 0.075 }, 0.25)
      .from('.hero__eyebrow', { opacity: 0, y: 18, duration: 1.2 }, 0.55)
      .from(['.hero__sub', '.hero__tag'], { opacity: 0, y: 22, duration: 1.2, stagger: 0.12 }, 0.8)
      .from('.hero__ctas > *', { opacity: 0, y: 26, duration: 1.2, stagger: 0.1 }, 1.0)
      .from('.hero__foot', { opacity: 0, duration: 1.4 }, 1.3)
      .from('.hdr__bar', { opacity: 0, y: -16, duration: 1.2 }, 1.1);
  }

  /* ---------------- Scroll animations ---------------- */
  function setupScroll() {
    if (!animOn) return;
    gsap.registerPlugin(ScrollTrigger);

    // Smooth scrolling on desktop (native momentum stays on touch devices)
    if (window.Lenis && finePointer) {
      lenis = new window.Lenis({ duration: 1.15, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); } });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
    }

    // Headings: line-by-line mask reveal
    $$('.h-reveal').forEach(function (h) {
      var spans = h.querySelectorAll('.ln > span');
      gsap.set(spans, { y: 0, yPercent: 110 });
      gsap.to(spans, { yPercent: 0, duration: 1.35, ease: 'expo.out', stagger: 0.12, scrollTrigger: { trigger: h, start: 'top 88%' } });
    });

    // Fade-up elements
    var reveals = $$('[data-reveal]');
    gsap.set(reveals, { opacity: 0, y: 28 });
    ScrollTrigger.batch(reveals, {
      start: 'top 90%', once: true,
      onEnter: function (els) { gsap.to(els, { opacity: 1, y: 0, duration: 1.15, ease: 'power3.out', stagger: 0.09, overwrite: 'auto' }); }
    });

    // Image curtain reveal
    $$('.img-reveal').forEach(function (f) {
      gsap.set(f, { clipPath: 'inset(100% 0% 0% 0%)' });
      var img = f.querySelector('img');
      var tl = gsap.timeline({ scrollTrigger: { trigger: f, start: 'top 86%' } });
      tl.to(f, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.5, ease: 'expo.inOut' });
      if (img) tl.from(img, { scale: 1.3, duration: 2.1, ease: 'expo.out' }, 0.25);
    });

    // Parallax
    $$('[data-speed]').forEach(function (el) {
      var s = parseFloat(el.getAttribute('data-speed')) || 0.1;
      gsap.fromTo(el, { yPercent: -s * 50 }, {
        yPercent: s * 50, ease: 'none',
        scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });

    // Hero exit
    gsap.to('.hero__media', { yPercent: 16, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.hero__content', { yPercent: -18, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: '5% top', end: '75% top', scrub: true } });

    // Counters
    $$('.count').forEach(function (el) {
      var to = +el.getAttribute('data-to'), comma = el.hasAttribute('data-comma'), o = { v: 0 };
      el.textContent = '0';
      ScrollTrigger.create({
        trigger: el, start: 'top 92%', once: true,
        onEnter: function () {
          gsap.to(o, { v: to, duration: 2.4, ease: 'power3.out', onUpdate: function () {
            var v = Math.round(o.v); el.textContent = comma ? v.toLocaleString('en-US') : v;
          } });
        }
      });
    });

    // Zenith sky diagram, drawn with the scroll
    var sky = $('.sky');
    if (sky) {
      var drawables = $$('.sky__horizon, .sky__arc2, .sky__zline', sky);
      drawables.forEach(function (p) {
        var len = p.getTotalLength ? p.getTotalLength() : 400;
        p.style.strokeDasharray = len; p.style.strokeDashoffset = len;
      });
      var skyTl = gsap.timeline({ scrollTrigger: { trigger: '.meaning', start: 'top 72%', end: 'center 50%', scrub: 1 } });
      skyTl.to('.sky__horizon', { strokeDashoffset: 0, duration: 1, ease: 'none' })
        .from('.sky__city rect', { scaleY: 0, transformOrigin: '50% 100%', stagger: 0.05, duration: 0.6, ease: 'power2.out' }, 0.3)
        .from('.sky__windows', { opacity: 0, duration: 0.3 }, 0.9)
        .to('.sky__arc2', { strokeDashoffset: 0, duration: 1, ease: 'none' }, 0.5)
        .from('.sky__arc', { opacity: 0, duration: 0.6 }, 0.8)
        .to('.sky__zline', { strokeDashoffset: 0, duration: 0.8, ease: 'none' }, 1.1)
        .from(['.sky__star', '.sky__glow'], { opacity: 0, duration: 0.4 }, 1.75)
        .from('.sky__lbl', { opacity: 0, y: 6, stagger: 0.1, duration: 0.4 }, 1.8);
    }

    // Experience numbers drift
    $$('.exp__num').forEach(function (n) {
      gsap.fromTo(n, { y: 40 }, { y: -40, ease: 'none', scrollTrigger: { trigger: n.closest('.exp__item'), start: 'top bottom', end: 'bottom top', scrub: true } });
    });

    // Taste: pinned horizontal scroll on large screens
    var mm = gsap.matchMedia();
    var track = $('#tasteTrack'), vp = $('#tasteViewport'), bar = $('#tasteBar');
    mm.add('(min-width: 1024px)', function () {
      root.classList.add('has-hscroll');
      var dist = function () {
        var cs = getComputedStyle(vp);
        var inner = vp.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        return Math.max(0, track.scrollWidth - inner);
      };
      gsap.to(track, {
        x: function () { return (isRTL() ? 1 : -1) * dist(); },
        ease: 'none',
        scrollTrigger: {
          trigger: '#taste', start: 'top top', end: function () { return '+=' + dist(); },
          pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1,
          onUpdate: function (self) { bar.style.transform = 'scaleX(' + (0.1 + 0.9 * self.progress) + ')'; }
        }
      });
      return function () { root.classList.remove('has-hscroll'); gsap.set(track, { clearProps: 'transform' }); };
    });

    // Gallery stagger
    gsap.set('.gal__item', { opacity: 0, y: 50, scale: 0.96 });
    ScrollTrigger.batch('.gal__item', {
      start: 'top 94%', once: true,
      onEnter: function (els) { gsap.to(els, { opacity: 1, y: 0, scale: 1, duration: 1.2, ease: 'expo.out', stagger: 0.08, overwrite: 'auto' }); }
    });

    // Marquee speeds up with scroll velocity
    var mq = $('.marquee__track');
    if (mq) {
      ScrollTrigger.create({
        trigger: '.marquee', start: 'top bottom', end: 'bottom top',
        onUpdate: function (self) {
          var v = Math.min(4, 1 + Math.abs(self.getVelocity()) / 900);
          mq.getAnimations && mq.getAnimations().forEach(function (a) { a.playbackRate = v; });
        }
      });
    }

    // Refresh once fonts and images settle
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
    window.addEventListener('load', function () { ScrollTrigger.refresh(); });
  }

  /* Mobile taste progress (native swipe) */
  (function () {
    var vp = $('#tasteViewport'), bar = $('#tasteBar');
    if (!vp || !bar) return;
    vp.addEventListener('scroll', function () {
      if (root.classList.contains('has-hscroll')) return;
      var max = vp.scrollWidth - vp.clientWidth;
      var p = max > 0 ? Math.abs(vp.scrollLeft) / max : 0;
      bar.style.transform = 'scaleX(' + (0.1 + 0.9 * p) + ')';
    }, { passive: true });
  })();

  /* ---------------- Header, progress, rail ---------------- */
  var hdr = $('#hdr'), prog = $('#progress');
  var rail = $('.rail'), railTrack = $('#railTrack'), railMarker = $('#railMarker'), railNum = $('#railNum');
  if (railTrack) for (var i = 0; i < 17; i++) railTrack.appendChild(document.createElement('i'));
  var lastY = 0, ticking = false, menuOpen = false;

  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var p = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
    hdr.classList.toggle('is-solid', y > 40);
    if (!menuOpen) {
      if (y > lastY + 4 && y > window.innerHeight * 0.9) hdr.classList.add('is-hidden');
      else if (y < lastY - 4 || y < 80) hdr.classList.remove('is-hidden');
    }
    prog.style.transform = 'scaleX(' + p + ')';
    if (rail) {
      rail.classList.toggle('is-on', y > window.innerHeight * 0.5);
      railMarker.style.bottom = (p * 100) + '%';
      railNum.textContent = String(1 + Math.round(p * 16)).padStart(2, '0');
    }
    lastY = y; ticking = false;
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  // Active nav link
  if ('IntersectionObserver' in window) {
    var navLinks = $$('.hdr__nav a');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          navLinks.forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('href') === '#' + e.target.id); });
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ['story', 'experience', 'menus', 'chef', 'gallery', 'visit'].forEach(function (id) { var s = document.getElementById(id); if (s) io.observe(s); });
  }

  /* ---------------- Bottom bar + sliding sheet ---------------- */
  var sheet = $('#sheet'), nbar = $('#nbar'), ind = $('#nbarInd');
  var panels = {}, stack = [], rootId = null, closeT = 0;
  $$('.sheet__panel').forEach(function (p) {
    panels[p.getAttribute('data-panel')] = p;
    $$('.st', p).forEach(function (el, i) { el.style.setProperty('--i', Math.min(i, 14)); });
  });
  var barBtns = $$('[data-open]', nbar);

  function moveIndicator() {
    var active = barBtns.filter(function (b) { return b.classList.contains('nbar__btn') && b.getAttribute('aria-expanded') === 'true'; })[0];
    if (!active) { ind.classList.remove('is-on'); return; }
    ind.style.setProperty('--x', active.offsetLeft + 'px');
    ind.style.setProperty('--w', active.offsetWidth + 'px');
    ind.classList.add('is-on');
  }
  function markBar(id) {
    barBtns.forEach(function (b) { b.setAttribute('aria-expanded', String(b.getAttribute('data-open') === id)); });
    moveIndicator();
  }
  function instantSet(p, cls) {
    p.classList.add('instant');
    p.classList.remove('is-active', 'is-left');
    if (cls) p.classList.add(cls);
    void p.offsetWidth;
    requestAnimationFrame(function () { p.classList.remove('instant'); });
  }
  function openSheet(id) {
    if (menuOpen && rootId === id && stack.length === 1) { closeSheet(); return; }
    clearTimeout(closeT);
    Object.keys(panels).forEach(function (k) { instantSet(panels[k], null); });
    var p = panels[id];
    p.scrollTop = 0;
    instantSet(p, 'is-active');
    stack = [id]; rootId = id; menuOpen = true;
    sheet.classList.add('is-open'); sheet.setAttribute('aria-hidden', 'false');
    root.classList.add('sheet-open');
    document.body.style.overflow = 'hidden';
    if (lenis) lenis.stop();
    markBar(id);
    var c = p.querySelector('.sp-close'); if (c) c.focus({ preventScroll: true });
  }
  function closeSheet() {
    if (!menuOpen) return;
    menuOpen = false;
    sheet.classList.remove('is-open'); sheet.setAttribute('aria-hidden', 'true');
    root.classList.remove('sheet-open');
    document.body.style.overflow = '';
    if (lenis) lenis.start();
    markBar(null);
    closeT = setTimeout(function () { Object.keys(panels).forEach(function (k) { instantSet(panels[k], null); }); stack = []; }, 650);
  }
  function pushPanel(id) {
    var cur = panels[stack[stack.length - 1]], next = panels[id];
    if (!next || cur === next) return;
    cur.classList.remove('is-active'); cur.classList.add('is-left');
    instantSet(next, null);
    next.scrollTop = 0;
    requestAnimationFrame(function () { requestAnimationFrame(function () { next.classList.add('is-active'); }); });
    stack.push(id);
  }
  function popPanel() {
    if (stack.length < 2) { closeSheet(); return; }
    var cur = panels[stack.pop()], prev = panels[stack[stack.length - 1]];
    cur.classList.remove('is-active');
    prev.classList.remove('is-left'); prev.classList.add('is-active');
  }

  barBtns.forEach(function (b) { b.addEventListener('click', function () { openSheet(b.getAttribute('data-open')); }); });
  sheet.addEventListener('click', function (e) {
    var t = e.target.closest('[data-push],[data-back],[data-close]');
    if (!t) return;
    e.preventDefault(); e.stopPropagation();
    if (t.hasAttribute('data-push')) pushPanel(t.getAttribute('data-push'));
    else if (t.hasAttribute('data-back')) popPanel();
    else closeSheet();
  });
  // External links inside the sheet close it so the page is calm on return
  sheet.addEventListener('click', function (e) {
    var a = e.target.closest('a[href]');
    if (a && !a.getAttribute('href').startsWith('#') && !a.hasAttribute('data-push')) setTimeout(closeSheet, 300);
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menuOpen) popPanel(); });
  // Swipe back on nested panels
  var sx = 0, sy = 0;
  sheet.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  sheet.addEventListener('touchend', function (e) {
    if (stack.length < 2) return;
    var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5 && (isRTL() ? dx < 0 : dx > 0)) popPanel();
  }, { passive: true });
  window.addEventListener('resize', moveIndicator);
  document.addEventListener('zenith:lang', function () { setTimeout(moveIndicator, 50); });
  function showBar() { nbar.classList.add('is-on'); }

  /* ---------------- Anchor links ---------------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href');
    if (id.length < 2) return;
    var target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    if (menuOpen) closeSheet();
    var y = id === '#top' ? 0 : target;
    if (lenis) lenis.scrollTo(y, { duration: 1.6 });
    else if (y === 0) window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  });

  /* ---------------- FAQ accordion ---------------- */
  var refreshT;
  $$('.acc__q').forEach(function (q) {
    q.addEventListener('click', function () {
      var open = q.getAttribute('aria-expanded') === 'true';
      $$('.acc__q').forEach(function (o) { o.setAttribute('aria-expanded', 'false'); });
      q.setAttribute('aria-expanded', String(!open));
      if (hasGSAP) { clearTimeout(refreshT); refreshT = setTimeout(function () { ScrollTrigger.refresh(); }, 700); }
    });
  });

  /* ---------------- Lightbox ---------------- */
  var lb = $('#lb'), lbImg = $('#lbImg'), lbCap = $('#lbCap'), lbCount = $('#lbCount');
  var items = $$('.gal__item'), cur = 0;
  function show(i) {
    cur = (i + items.length) % items.length;
    var it = items[cur], src = it.getAttribute('data-full'), alt = it.querySelector('img').alt;
    lbImg.classList.add('is-swap');
    var pre = new Image();
    pre.onload = pre.onerror = function () {
      lbImg.src = src; lbImg.alt = alt; lbCap.textContent = alt;
      lbCount.textContent = (cur + 1) + ' / ' + items.length;
      requestAnimationFrame(function () { lbImg.classList.remove('is-swap'); });
    };
    pre.src = src;
  }
  function openLb(i) { show(i); lb.classList.add('is-open'); root.classList.add('lb-open'); lb.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; if (lenis) lenis.stop(); $('#lbClose').focus(); }
  function closeLb() { lb.classList.remove('is-open'); root.classList.remove('lb-open'); lb.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; if (lenis) lenis.start(); items[cur].focus(); }
  items.forEach(function (it, i) { it.addEventListener('click', function () { openLb(i); }); });
  $('#lbClose').addEventListener('click', closeLb);
  $('#lbPrev').addEventListener('click', function () { show(cur - 1); });
  $('#lbNext').addEventListener('click', function () { show(cur + 1); });
  lb.addEventListener('click', function (e) { if (e.target === lb) closeLb(); });
  document.addEventListener('keydown', function (e) {
    if (!lb.classList.contains('is-open')) return;
    if (e.key === 'Escape') closeLb();
    if (e.key === 'ArrowRight') show(cur + (isRTL() ? -1 : 1));
    if (e.key === 'ArrowLeft') show(cur + (isRTL() ? 1 : -1));
  });
  var tx = 0, ty = 0;
  lb.addEventListener('touchstart', function (e) { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
  lb.addEventListener('touchend', function (e) {
    var dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) show(cur + (dx < 0 ? 1 : -1));
    else if (dy > 90 && Math.abs(dy) > Math.abs(dx)) closeLb();
  }, { passive: true });

  /* ---------------- Cursor + magnetic (desktop) ---------------- */
  if (finePointer && window.innerWidth >= 1024 && !reduce) {
    root.classList.add('has-cursor');
    var cur$ = $('.cursor'), dot = $('.cursor__dot'), ring = $('.cursor__ring');
    var mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    window.addEventListener('mousemove', function (e) { mx = e.clientX; my = e.clientY; dot.style.transform = 'translate(' + mx + 'px,' + my + 'px)'; }, { passive: true });
    (function follow() {
      rx += (mx - rx) * 0.16; ry += (my - ry) * 0.16;
      ring.style.transform = 'translate(' + rx + 'px,' + ry + 'px)';
      requestAnimationFrame(follow);
    })();
    document.addEventListener('mouseover', function (e) {
      var view = e.target.closest('.gal__item, .card, .mcard');
      var link = e.target.closest('a, button');
      cur$.classList.toggle('is-view', !!view);
      cur$.classList.toggle('is-link', !view && !!link);
    });
    document.addEventListener('mouseleave', function () { cur$.style.opacity = 0; });
    document.addEventListener('mouseenter', function () { cur$.style.opacity = 1; });

    $$('.magnetic').forEach(function (b) {
      b.addEventListener('mousemove', function (e) {
        var r = b.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) * 0.22, y = (e.clientY - r.top - r.height / 2) * 0.32;
        b.style.transform = 'translate(' + x + 'px,' + y + 'px)';
      });
      b.addEventListener('mouseleave', function () { b.style.transform = ''; });
    });
  }

  /* ---------------- Boot ---------------- */
  function boot() {
    try { setupScroll(); } catch (err) {
      root.classList.remove('anim');
      if (hasGSAP) gsap.set('[data-reveal], .h-reveal .ln > span, .img-reveal', { clearProps: 'all' });
      if (window.console) console.warn('Zenith motion disabled:', err);
    }
    runLoader(function () { heroIntro(); setTimeout(showBar, animOn ? 900 : 0); if (hasGSAP) ScrollTrigger.refresh(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
