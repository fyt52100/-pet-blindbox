(() => {
  const PETS = [
    { id: 'capybara-lulu', name: '水豚噜噜', rate: 18, hidden: false,
      img: '../assets/characters/capybara-lulu/candidate-v2.png?v=3' },
    { id: 'silly-bird',    name: '呆呆鸟',   rate: 18, hidden: false,
      img: '../assets/characters/silly-bird/candidate-v2.png?v=3' },
    { id: 'calico',        name: '三花',     rate: 18, hidden: false,
      img: '../assets/characters/calico/candidate-v2.png?v=3' },
    { id: 'komaniqi',      name: '科曼尼奇', rate: 18, hidden: false,
      img: '../assets/characters/komaniqi/candidate-v2.png?v=3' },
    { id: 'little-yellow', name: '小黄',     rate: 18, hidden: false,
      img: '../assets/characters/little-yellow/candidate-v2.png?v=3' },
    { id: 'naiva',         name: '奶蛙',     rate: 10, hidden: true,
      img: '../assets/characters/naiva/candidate-v2.png?v=3' }
  ];

  const ACTIONS = ['idle', 'laugh', 'sleep', 'cover'];

  // 纯网页模式：没有桌面程序时，小家伙就站在网页上
  let webMode = false;
  function applyWebCopy() {
    const tag = document.querySelector('.hero .tag');
    if (tag) tag.innerHTML = '<span class="tag-dot"></span>六只小家伙 · 抽到就住在页面里';
    const sub = document.querySelector('.hero .sub');
    if (sub) sub.textContent = '五只普通款、一位隐藏款奶蛙。抽中的那只不会消失——它会直接站在这页面上，你拖它、点它、敲键盘吓它，它都会立刻回应。';
    const hint = document.getElementById('drawHint');
    if (hint) hint.textContent = '一次一只，抽出新的就换掉旧的，页面里始终只陪着一只';
    const note = document.querySelector('.how .pool-note');
    if (note) note.textContent = '关掉网页它就回去了';
    const ul = document.querySelector('.how ul');
    if (ul) ul.innerHTML = `
      <li><b>刚抽到</b>直接站在这页面上，拖它到哪儿都行</li>
      <li><b>鼠标久不动</b>它趴下睡着，鼠标一动就醒</li>
      <li><b>单击一下</b>大笑给你看</li>
      <li><b>按住拖动</b>拎到页面任意角落，位置会记住</li>
      <li><b>敲键盘</b>它会捂上眼睛，停手一秒再松开</li>`;
  }
  // 送出/召回：网页上这只的显隐，直接改元素样式，最稳
  function setPagePetVisible(visible) {
    instances.forEach(inst => {
      const n = inst.node;
      if (!n) return;
      n.style.transition = 'opacity .28s ease';
      if (!visible) {
        n.style.opacity = '0';
        n.style.pointerEvents = 'none';
        setTimeout(() => {
          if (!document.body.classList.contains('pet-sent')) return;
          n.style.display = 'none';
        }, 320);
      } else {
        n.style.display = '';
        requestAnimationFrame(() => {
          n.style.opacity = '1';
          n.style.pointerEvents = 'auto';
        });
      }
    });
  }

  // 当前站点对应的 GitHub 仓库（形如 owner/repo），从 Pages 域名与路径反推
  function repoSlug() {
    const host = location.hostname;
    if (!/\.github\.io$/i.test(host)) return '';
    const owner = host.split('.')[0];
    const repo = (location.pathname.split('/').filter(Boolean)[0] || '').replace(/\.git$/i, '');
    return owner && repo ? owner + '/' + repo : '';
  }

  // 桌面版下载页（兜底：直链拿不到时才跳这里）
  function releasePageUrl() {
    const slug = repoSlug();
    return slug ? 'https://github.com/' + slug + '/releases/latest' : '';
  }

  // Release 里桌面版包的文件名（GitHub 会把中文名清洗成 04_.-.zip）
  // 换成新包时保持这个附件名，网页就不用改代码
  const KNOWN_ASSET = '04_.-.zip';

  // 永久直链： releases/latest/download/<文件名> ，点了直接在网页里开始下载，不跳 GitHub
  function latestDownloadHref() {
    const slug = repoSlug();
    return slug ? 'https://github.com/' + slug + '/releases/latest/download/' + KNOWN_ASSET : '';
  }

  // 直接下载：先拿永久直链立刻下（不依赖 API 配额），有 API 时顺带校准一次文件名
  function directDownload() {
    const direct = latestDownloadHref();
    if (!direct) return Promise.resolve(false);
    const slug = repoSlug();
    const api = slug ? 'https://api.github.com/repos/' + slug + '/releases/latest' : '';
    return new Promise(resolve => {
      let done = false;
      const finish = ok => { if (done) return; done = true; resolve(ok); };
      const go = href => { try { triggerDownload(href); } catch (_) {} finish(true); };

      if (!api) { go(direct); return; }

      let settled = false;
      const fallbackTimer = setTimeout(() => {
        if (settled) return;
        settled = true;
        go(direct);
      }, 1200);

      try {
        const ctl = new AbortController();
        fetch(api, { headers: { Accept: 'application/vnd.github+json' }, signal: ctl.signal })
          .then(r => (r.ok ? r.json() : null))
          .then(j => {
            if (settled) return;
            settled = true;
            clearTimeout(fallbackTimer);
            const zips = ((j && j.assets) || []).filter(a => /\.zip$/i.test(a.name || ''));
            zips.sort((a, b) => (b.size || 0) - (a.size || 0));
            go(zips.length ? zips[0].browser_download_url : direct);
          })
          .catch(() => {
            if (settled) return;
            settled = true;
            clearTimeout(fallbackTimer);
            go(direct);
          });
      } catch (_) {
        settled = true;
        clearTimeout(fallbackTimer);
        go(direct);
      }
    }).then(ok => {
      if (!ok) {
        const page = releasePageUrl();
        if (page) window.open(page, '_blank', 'noopener');
      }
      return ok;
    });
  }

  function triggerDownload(href) {
    const a = document.createElement('a');
    a.href = href;
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { try { a.remove(); } catch (_) {} }, 900);
  }

  // 记住"这台电脑下过/送过一次了"，下次别再劝人重下
  function readHint(key) {
    try { return localStorage.getItem(key) === '1'; } catch (_) { return false; }
  }
  function markHint(key) {
    try { localStorage.setItem(key, '1'); } catch (_) {}
  }

  // 没装桌面版时的下载提示卡片（下过的人不再被劝重下）
  function showDownloadCard() {
    if (document.querySelector('.dl-mask')) return;
    const url = releasePageUrl();
    const seen = readHint('petbox-dl-hint') || readHint('petbox-sent-once');
    const mask = document.createElement('div');
    mask.className = 'dl-mask';
    mask.innerHTML = `
      <div class="dl-card">
        <h3>${seen ? '没检测到桌面版在运行' : '这台电脑还没装桌面版'}</h3>
        <p>${seen
          ? '你之前应该装过了。可能它启动慢了一点，或者被移位、删掉了：先等两三秒再点一次「送到我的桌面」；还是不行就重新下一次。'
          : '桌面版是 Windows 免安装程序，约 170 MB，解压后双击 <b>Desktop Pet.exe</b> 就能把它放到桌面上。系统要求 Windows 10 / 11（64 位）。'}</p>
        ${url
          ? `<button type="button" class="dl-main">${seen ? '重新下载桌面版' : '下载桌面版（点一下直接下）'}</button>`
          : `<p class="dl-note">桌面版下载地址请向作者索取。</p>`}
        ${seen ? '<button type="button" class="dl-retry">我再试一次</button>' : ''}
        <p class="dl-sub">不想装也完全没问题——抽到的小家伙本来就能在这页面上走动、互动。</p>
        <button type="button" class="dl-close">先用网页版</button>
      </div>`;
    document.body.appendChild(mask);

    const main = mask.querySelector('.dl-main');
    if (main) main.addEventListener('click', ev => {
      ev.preventDefault();
      markHint('petbox-dl-hint');
      main.textContent = '正在开始下载…';
      directDownload();
    });
    const retry = mask.querySelector('.dl-retry');
    if (retry) retry.addEventListener('click', () => {
      mask.remove();
      const btn = document.querySelector('.to-desktop');
      if (btn) sendToDesktop(btn);
    });
    mask.addEventListener('click', e => {
      if (e.target === mask || (e.target.classList && e.target.classList.contains('dl-close'))) mask.remove();
    });
  }

  // 真的把宠物送去桌面：隐藏 iframe 唤起协议 → 看窗口有没有失焦 → 判定成没成
  // 3.4 秒窗口：程序冷启动普遍要两三秒，窗口太短会把"装过但没开"误判成"没装"
  function sendToDesktop(a) {
    const label = a.querySelector('span');

    // 已经送出过：再点一次是把小家伙请回页面
    if (document.body.classList.contains('pet-sent')) {
      document.body.classList.remove('pet-sent');
      a.classList.remove('done');
      if (label) label.textContent = '送到我的桌面';
      setPagePetVisible(true);
      toast('把它请回页面了');
      return;
    }

    const inst = instances.length ? instances[instances.length - 1] : null;
    const id = (inst && inst.pet && inst.pet.id) || 'little-yellow';
    let left = false;
    const onBlur = () => { left = true; };
    window.addEventListener('blur', onBlur, { once: true });

    // 先让它从网页上退场，再交给桌面程序
    document.body.classList.add('pet-sent');
    setPagePetVisible(false);
    // 用隐藏 iframe 唤起协议：本机没注册 petbox 时，主页面不会被导航走、也不会白屏
    try {
      const frame = document.createElement('iframe');
      frame.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:0;height:0;border:0';
      frame.src = 'petbox://pet/' + id;
      document.body.appendChild(frame);
      setTimeout(() => { try { frame.remove(); } catch (_) {} }, 1200);
    } catch (_) {}

    setTimeout(() => {
      window.removeEventListener('blur', onBlur);
      if (left) {
        markHint('petbox-sent-once');
        a.classList.add('done');
        if (label) label.textContent = '已送到桌面 · 点这里请回来';
        toast('它已经住进桌面了，去屏幕右下角看看');
      } else {
        // 协议没被系统接管，或程序起得比窗口还慢：先放回页面再给提示
        document.body.classList.remove('pet-sent');
        setPagePetVisible(true);
        a.classList.remove('done');
        if (label) label.textContent = '送到我的桌面';
        showDownloadCard();
      }
    }, 3400);
  }

  // 网页模式：挂一个“送到电脑桌面”的入口，点它用 petbox:// 协议唤起桌面程序
  function offerDesktopShortcut() {
    if (document.querySelector('.to-desktop')) return;
    const a = document.createElement('a');
    a.className = 'to-desktop';
    a.href = 'petbox://pet/little-yellow';
    a.innerHTML = '<i></i><span>送到我的桌面</span>';
    a.addEventListener('click', ev => {
      ev.preventDefault();
      sendToDesktop(a);
    });
    document.body.appendChild(a);

    // 常驻下载入口：点一下从网页里直接开始下载，不跳到 GitHub 页面
    const dlUrl = releasePageUrl();
    if (dlUrl) {
      const link = document.createElement('button');
      link.type = 'button';
      link.className = 'dl-link';
      link.innerHTML = '<i></i><span>下载桌面版</span>';
      link.addEventListener('click', ev => {
        ev.preventDefault();
        markHint('petbox-dl-hint');
        if (link.dataset.busy) return;
        link.dataset.busy = '1';
        const span = link.querySelector('span');
        if (span) span.textContent = '正在开始下载…';
        directDownload().then(() => {
          link.dataset.busy = '';
          if (span) span.textContent = '下载桌面版';
        });
      });
      document.body.appendChild(link);
    }
  }

  function setWebMode() {
    if (webMode) return;
    webMode = true;
    document.body.classList.add('web-mode');
    applyWebCopy();
    offerDesktopShortcut();
  }
  if (location.protocol === 'file:') setWebMode();
  // 线上部署（GitHub Pages 等）够不到本机的桌面服务，直接进网页模式，省一次失败请求
  else if (!/^(127\.0\.0\.1|localhost|::1)$/.test(location.hostname)) setWebMode();

  // 1.5cm ≈ 57px（96dpi）；画面 320×350，按高度换算
  const PET_H = 57;
  const PET_W = Math.round(PET_H * 320 / 350);

  const IDLE_SLEEP_MS = 8000;   // 鼠标静止多久后睡着
  const KEY_RELEASE_MS = 900;   // 停手多久后停止蒙眼
  const LAUGH_MS = 1200;
  const MANUAL_HOLD_MS = 5000;  // 按 1~4 点名动作，保持多久后交还自动

  const stage = document.getElementById('petStage');
  const grid = document.getElementById('poolGrid');
  const historyList = document.getElementById('historyList');
  const historyNote = document.getElementById('historyNote');
  const drawCount = document.getElementById('drawCount');
  const drawBtn = document.getElementById('drawBtn');
  const overlay = document.getElementById('drawOverlay');
  const overlayText = document.getElementById('drawOverlayText');
  const toastEl = document.getElementById('toast');

  const STORE_KEY = 'desktop-pet-gacha-v2';
  let store = { count: 0, owned: [], log: [], pets: [] };
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
    if (raw && Array.isArray(raw.owned)) store = {
      count: raw.count || 0,
      owned: raw.owned,
      log: raw.log || [],
      pets: Array.isArray(raw.pets) ? raw.pets : []
    };
  } catch (_) {}

  const save = (immediate) => {
    try {
      store.pets = instances.map(p => ({ id: p.pet.id, x: Math.round(p.x), y: Math.round(p.y) }));
      localStorage.setItem(STORE_KEY, JSON.stringify(store));
    } catch (_) {}
    syncDesktop(immediate);
  };

  // 把桌面上的小家伙同步给本地服务，供 Electron 桌面版读取
  let syncTimer = null;
  function ensureDesktopRunning() {
    if (webMode) return;
    try { fetch('/api/desktop/launch', { method: 'POST' }).catch(() => {}); } catch (_) {}
  }
  function syncDesktop(immediate) {
    if (webMode) return;
    clearTimeout(syncTimer);
    const push = () => {
      const pets = instances.map(p => ({
        id: p.pet.id,
        name: p.pet.name,
        x: Math.round(p.x),
        y: Math.round(p.y)
      }));
      if (pets.length) ensureDesktopRunning();
      try {
        fetch('/api/desktop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pets })
        }).catch(() => {});
      } catch (_) {}
    };
    if (immediate) { push(); return; }
    syncTimer = setTimeout(push, 260);
  }

  const instances = [];

  let lastMouseMove = Date.now();
  let dragging = null;
  let keyTimer = null;
  let anyKey = false;
  // 键盘点名的动作（1 走路 2 大笑 3 睡觉 4 蒙眼），5 秒后交还给自动状态
  let manual = null;
  let manualUntil = 0;

  function toast(text) {
    toastEl.textContent = text;
    toastEl.classList.add('on');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toastEl.classList.remove('on'), 1800);
  }

  const ANIM_FILE = { idle: 'walk', laugh: 'laugh', sleep: 'sleep', cover: 'cover' };

  function animSrc(id, act) {
    return `../assets/characters/${id}/anim/${ANIM_FILE[act]}.gif`;
  }

  /* ---------------- 单只宠物 ---------------- */
  function createPet(pet, x, y) {
    const node = document.createElement('div');
    node.className = 'pet';
    node.style.width = PET_W + 'px';
    node.style.height = PET_H + 'px';

    const shadow = document.createElement('div');
    shadow.className = 'pet-shadow';
    node.appendChild(shadow);

    const frames = {};
    let sprite = null;
    const spriteMeta = window.PET_SPRITE_META && window.PET_SPRITE_META[pet.id];
    if (webMode && spriteMeta) {
      // 纯网页版：用 PNG 序列播放，任何浏览器都稳
      sprite = document.createElement('div');
      sprite.className = 'pet-sprite';
      node.appendChild(sprite);
      // 预取四个动作的整张图，切动作时不会因为临时解码而卡一帧
      const cache = window.__spriteCache || (window.__spriteCache = {});
      Object.keys(ANIM_FILE).forEach(k => {
        const file = ANIM_FILE[k];
        if (cache[pet.id + '_' + file]) return;
        const im = new Image();
        im.src = 'sprites/' + pet.id + '_' + file + '.png?v=3';
        cache[pet.id + '_' + file] = im;
      });
    } else {
      ACTIONS.forEach(act => {
        const img = document.createElement('img');
        img.className = 'pet-frame';
        img.alt = '';
        img.src = animSrc(pet.id, act);
        img.onerror = () => {
          if (act === 'idle') img.src = pet.img;   // 没有走路素材时退回定妆图
        };
        frames[act] = img;
        node.appendChild(img);
      });
    }

    const tag = document.createElement('div');
    tag.className = 'pet-tag';
    tag.textContent = pet.name;
    node.appendChild(tag);

    // 网页模式下直接挂在 body 上，避开固定层容器的渲染问题
    const host = webMode ? document.body : stage;
    host.appendChild(node);

    const inst = {
      pet, node, frames, sprite,
      x, y,
      state: 'none',
      laughUntil: 0,
      dragging: false,
      i: 0,
      acc: 0
    };

    setFrame(inst, 'idle');
    place(inst, x, y);
    bindDrag(inst);
    instances.push(inst);
    return inst;
  }

  function place(inst, x, y) {
    const maxX = Math.max(0, window.innerWidth - PET_W);
    const maxY = Math.max(0, window.innerHeight - PET_H);
    inst.x = Math.min(maxX, Math.max(0, x));
    inst.y = Math.min(maxY, Math.max(0, y));
    inst.node.style.left = inst.x + 'px';
    inst.node.style.top = inst.y + 'px';
  }

  function setFrame(inst, act) {
    if (inst.state === act) return;
    inst.state = act;
    if (inst.sprite) {
      const all = window.PET_SPRITE_META && window.PET_SPRITE_META[inst.pet.id];
      const key = ANIM_FILE[act] || 'walk';
      const mm = all && all[key];
      if (!mm) return;
      inst.i = 0;
      inst.acc = 0;
      const sp = inst.sprite;
      // 只在真的换动作时动样式，避免每次切换都触发一次布局
      if (inst.key !== key) {
        sp.style.backgroundSize = (mm.n * 100) + '% 100%';
        sp.style.backgroundImage = `url(sprites/${inst.pet.id}_${key}.png?v=3)`;
        inst.key = key;
        inst.lastP = null;
      }
      if (inst.lastP !== 0) {
        sp.style.backgroundPosition = '0% 0%';
        inst.lastP = 0;
      }
      return;
    }
    ACTIONS.forEach(a => {
      const f = inst.frames[a];
      f.classList.remove('on');
      f.style.opacity = '0';
      f.style.display = 'none';
    });
    const cur = inst.frames[act];
    cur.classList.add('on');
    cur.style.display = 'block';
    cur.style.opacity = '1';
  }

  function applyGlobal(state) {
    instances.forEach(inst => {
      if (state === 'laugh' && Date.now() < inst.laughUntil) return;
      setFrame(inst, state);
    });
  }

  /* ---------------- 拖拽 ---------------- */
  function bindDrag(inst) {
    let start = null;

    inst.node.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      start = {
        px: e.clientX, py: e.clientY,
        ox: inst.x, oy: inst.y,
        moved: false,
        id: e.pointerId
      };
      inst.dragging = true;
      dragging = inst;
      inst.node.classList.add('dragging');
      try { inst.node.setPointerCapture(e.pointerId); } catch (_) {}
      e.preventDefault();
    });

    inst.node.addEventListener('pointermove', e => {
      if (!start || start.id !== e.pointerId) return;
      const dx = e.clientX - start.px;
      const dy = e.clientY - start.py;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) start.moved = true;
      start.x0 = start.x0 || inst.x;
      place(inst, start.ox + dx, start.oy + dy);
      lastMouseMove = Date.now();
    });

    inst.node.addEventListener('pointerup', e => {
      if (!start || start.id !== e.pointerId) return;
      const moved = start.moved;
      start = null;
      inst.dragging = false;
      dragging = null;
      inst.node.classList.remove('dragging');
      save();
      if (!moved) tapPet(inst);
    });

    inst.node.addEventListener('pointercancel', () => {
      inst.dragging = false;
      dragging = null;
      inst.node.classList.remove('dragging');
      start = null;
    });
  }

  function tapPet(inst) {
    inst.laughUntil = Date.now() + LAUGH_MS;
    setFrame(inst, 'laugh');
    // 若此刻整体处于睡觉/蒙眼，短暂结束后再回来
    if (anyKey) inst.laughUntil = 0;
  }

  /* ---------------- 全局状态 ---------------- */
  function currentGlobal() {
    if (Date.now() < Math.max(...instances.map(i => i.laughUntil), 0)) return 'laugh';
    if (manual && Date.now() < manualUntil) return manual;
    if (anyKey) return 'cover';
    if (Date.now() - lastMouseMove > IDLE_SLEEP_MS && !dragging) return 'sleep';
    return 'idle';
  }

  function tick() {
    if (!instances.length) return;
    const g = currentGlobal();
    instances.forEach(inst => {
      const target = inst.laughUntil > Date.now() ? 'laugh' : g;
      setFrame(inst, target);
    });
  }
  setInterval(tick, 120);

  /* ---------- 网页模式：精灵图逐帧播放 ---------- */
  let lastTs = performance.now();
  function frameLoop(ts) {
    const dt = Math.min(48, ts - lastTs);
    lastTs = ts;
    instances.forEach(inst => {
      if (!inst.sprite) return;
      const all = window.PET_SPRITE_META && window.PET_SPRITE_META[inst.pet.id];
      const key = ANIM_FILE[inst.state] || 'walk';
      const mm = all && all[key];
      if (!mm) return;
      inst.acc += dt;
      let guard = 0;
      while (inst.acc >= (mm.d[inst.i] || 300) && guard++ < 4) {
        inst.acc -= (mm.d[inst.i] || 300);
        inst.i = (inst.i + 1) % mm.n;
      }
      const p = mm.n > 1 ? (inst.i * 100 / (mm.n - 1)) : 0;
      if (inst.lastP !== p) {
        inst.sprite.style.backgroundPosition = p + '% 0%';
        inst.lastP = p;
      }
    });
    requestAnimationFrame(frameLoop);
  }
  requestAnimationFrame(frameLoop);

  // 1 走路、2 大笑、3 睡觉、4 蒙眼、Esc 取消；其余任意键＝临时蒙眼
  const KEY_ACTIONS = { '1': 'idle', '2': 'laugh', '3': 'sleep', '4': 'cover' };

  window.addEventListener('keydown', e => {
    // 输入框里打字不触发
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;

    const act = KEY_ACTIONS[e.key];
    if (act) {
      e.preventDefault();
      manual = act;
      manualUntil = Date.now() + MANUAL_HOLD_MS;
      anyKey = false;
      clearTimeout(keyTimer);
      lastMouseMove = Date.now();
      instances.forEach(i => { i.laughUntil = 0; });
      tick();
      return;
    }

    if (e.key === 'Escape') {
      manual = null;
      manualUntil = 0;
      anyKey = false;
      clearTimeout(keyTimer);
      lastMouseMove = Date.now();
      tick();
      return;
    }

    manual = null;
    anyKey = true;
    lastMouseMove = Date.now();
    clearTimeout(keyTimer);
  });

  window.addEventListener('keyup', () => {
    clearTimeout(keyTimer);
    keyTimer = setTimeout(() => { anyKey = false; }, KEY_RELEASE_MS);
  });

  window.addEventListener('mousemove', () => { lastMouseMove = Date.now(); }, { passive: true });
  window.addEventListener('wheel', () => { lastMouseMove = Date.now(); }, { passive: true });
  window.addEventListener('pointerdown', () => { lastMouseMove = Date.now(); });

  window.addEventListener('resize', () => {
    instances.forEach(inst => place(inst, inst.x, inst.y));
  });

  /* ---------------- 抽取 ---------------- */
  function roll() {
    const total = PETS.reduce((s, p) => s + p.rate, 0);
    let r = Math.random() * total;
    for (const p of PETS) {
      r -= p.rate;
      if (r < 0) return p;
    }
    return PETS[PETS.length - 1];
  }

  function renderGrid() {
    grid.innerHTML = '';
    PETS.forEach(p => {
      const got = store.owned.includes(p.id);
      const card = document.createElement('div');
      card.className = 'pool-card' + (p.hidden ? ' hidden-card' : '') + (got ? ' got' : ' locked');
      card.innerHTML = `
        <div class="thumb"><img src="${p.img}" alt="${p.name}"></div>
        <span class="name">${p.name}</span>
        <span class="rate">${p.rate}%</span>`;
      grid.appendChild(card);
    });
  }

  function renderHistory() {
    drawCount.textContent = store.count;
    if (!store.log.length) {
      historyList.innerHTML = '<p class="empty">点上面的按钮，抽第一只。</p>';
      historyNote.textContent = '还没有抽过';
      return;
    }
    historyNote.textContent = `共 ${store.log.length} 条`;
    historyList.innerHTML = store.log.slice(0, 24).map(id => {
      const p = PETS.find(x => x.id === id) || PETS[0];
      return `<span class="chip${p.hidden ? ' gold' : ''}"><img src="${p.img}" alt="">${p.name}</span>`;
    }).join('');
  }

  function spawnPosition() {
    if (webMode) {
      // 网页模式：默认贴右下角，像桌面宠物一样待着，不挡正文
      return {
        x: Math.max(12, window.innerWidth - PET_W - 28),
        y: Math.max(80, window.innerHeight - PET_H - 24)
      };
    }
    const padX = 40;
    const maxX = Math.max(padX, window.innerWidth - PET_W - padX);
    const maxY = Math.max(80, window.innerHeight - PET_H - 40);
    return {
      x: padX + Math.random() * (maxX - padX),
      y: Math.max(120, maxY - Math.random() * Math.min(220, maxY * 0.4))
    };
  }

  function clearPets() {
    instances.forEach(i => {
      if (i.node && i.node.remove) i.node.remove();
    });
    instances.length = 0;
  }

  function ensurePet(pet) {
    // 桌面上永远只留最新这一只，抽到新的就把上一只换掉
    const exist = instances.length === 1 && instances[0].pet.id === pet.id ? instances[0] : null;
    if (exist) return exist;
    clearPets();
    const pos = spawnPosition();
    return createPet(pet, pos.x, pos.y);
  }

  function draw() {
    if (drawBtn.disabled) return;
    // 上一只已经送到桌面时，重新抽盒先把页面这一套复位
    if (document.body.classList.contains('pet-sent')) {
      document.body.classList.remove('pet-sent');
      const btn = document.querySelector('.to-desktop');
      if (btn) {
        btn.classList.remove('done');
        const l = btn.querySelector('span');
        if (l) l.textContent = '送到我的桌面';
      }
    }
    drawBtn.disabled = true;
    overlay.hidden = false;
    overlayText.textContent = '正在拆盒…';

    setTimeout(() => {
      const pet = roll();
      store.count += 1;
      store.log.unshift(pet.id);
      const isNew = !store.owned.includes(pet.id);
      if (isNew) store.owned.push(pet.id);
      // 先把它摆进清单并推给桌面，别等拆盒动画播完
      ensurePet(pet);
      save(true);

      overlayText.textContent = pet.hidden ? '隐藏款！' : '抽到了：' + pet.name;
      lastMouseMove = Date.now();
      setTimeout(() => {
        overlay.hidden = true;
        drawBtn.disabled = false;
        renderGrid();
        renderHistory();
        toast(pet.hidden
          ? (webMode ? `隐藏款「${pet.name}」跳到你眼前了` : `隐藏款「${pet.name}」已经住到你桌面上了`)
          : (webMode ? `「${pet.name}」跳到你眼前了，拖一下它试试` : `「${pet.name}」已经住到你桌面上了`));
      }, 280);
    }, 180);
  }

  drawBtn.addEventListener('click', draw);

  document.getElementById('resetBtn').addEventListener('click', () => {
    instances.forEach(i => i.node.remove());
    instances.length = 0;
    store = { count: 0, owned: [], log: [], pets: [] };
    save();
    renderGrid();
    renderHistory();
    toast(webMode ? '页面和记录都清空了' : '桌面和记录都清空了');
  });

  /* ---------------- 恢复上次的宠物（只留最近一只） ---------------- */
  function restore() {
    const saved = Array.isArray(store.pets) ? store.pets.slice() : [];
    store.owned.forEach(id => {
      if (!saved.some(item => item.id === id)) saved.push({ id });
    });
    if (!saved.length) return null;
    const item = saved[saved.length - 1];
    const pet = PETS.find(p => p.id === item.id);
    if (!pet) return null;
    const pos = (typeof item.x === 'number')
      ? { x: item.x, y: item.y }
      : spawnPosition();
    return createPet(pet, pos.x, pos.y);
  }

  renderGrid();
  renderHistory();

  // 探测桌面端：有桌面程序就把宠物推过去，没有就让小家伙站在网页上
  if (!webMode) {
    (async () => {
      try {
        const res = await fetch('/api/desktop/launch', { method: 'POST' });
        const data = await res.json();
        if (!(data && (data.running || data.started))) setWebMode();
      } catch (_) {
        setWebMode();
      }
    })();
  }

  // ?demo=<id>：直接摆一只出来，方便预览和截图
  const demoId = new URLSearchParams(location.search).get('demo');

  // 启动时：本地记录 + 本地服务里的桌面清单，两边合并，谁都不丢
  (async () => {
    let serverList = [];
    try {
      const res = await fetch('/api/desktop');
      const data = await res.json();
      serverList = (data && data.pets) || [];
    } catch (_) {}
    if (demoId) return;   // 演示模式：只摆指定的那一只，别再按记录补一只
    restore();
    if (!instances.length && serverList.length) {
      const item = serverList[serverList.length - 1];
      const pet = PETS.find(p => p.id === item.id);
      if (pet) {
        const pos = (Number.isFinite(+item.x) && +item.x > 0 && Number.isFinite(+item.y))
          ? { x: +item.x, y: +item.y }
          : spawnPosition();
        createPet(pet, pos.x, pos.y);
        if (!store.owned.includes(pet.id)) store.owned.push(pet.id);
        renderGrid();
        renderHistory();
      }
    }
    save();
  })();

  // ?demo=<id>：见上方 demoId，这里只负责摆出来
  if (demoId) {
    const demoPet = PETS.find(p => p.id === demoId);
    if (demoPet) {
      clearPets();
      const pos = spawnPosition();
      createPet(demoPet, pos.x, pos.y);
    }
  }

  lastMouseMove = Date.now();
  tick();
})();
