(() => {
  const PETS = [
    { id: 'capybara-lulu', name: '水豚噜噜', rate: 18, hidden: false,
      img: 'assets/characters/capybara-lulu/candidate-v2.png' },
    { id: 'silly-bird',    name: '呆呆鸟',   rate: 18, hidden: false,
      img: 'assets/characters/silly-bird/candidate-v2.png' },
    { id: 'calico',        name: '三花',     rate: 18, hidden: false,
      img: 'assets/characters/calico/candidate-v2.png' },
    { id: 'komaniqi',      name: '科曼尼奇', rate: 18, hidden: false,
      img: 'assets/characters/komaniqi/candidate-v2.png' },
    { id: 'little-yellow', name: '小黄',     rate: 18, hidden: false,
      img: 'assets/characters/little-yellow/candidate-v2.png' },
    { id: 'naiva',         name: '奶蛙',     rate: 10, hidden: true,
      img: 'assets/characters/naiva/candidate-v2.png' }
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

  // 网页模式：挂一个“送到电脑桌面”的入口，点它用 petbox:// 协议唤起桌面程序
  // 点下去之后网页里这只就退场，不再在页面上重复显示；送失败会自己回来
  function offerDesktopShortcut() {
    if (document.querySelector('.to-desktop')) return;
    const a = document.createElement('a');
    a.className = 'to-desktop';
    a.href = 'petbox://pet/little-yellow';
    a.innerHTML = '<i></i><span>送到我的桌面</span>';
    a.addEventListener('click', ev => {
      ev.preventDefault();
      const label = a.querySelector('span');

      // 已经送出过：再点一次是把小家伙请回页面（演示、截图时用）
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
      try { location.href = 'petbox://pet/' + id; } catch (_) {}

      setTimeout(() => {
        window.removeEventListener('blur', onBlur);
        if (left) {
          a.classList.add('done');
          if (label) label.textContent = '已送到桌面 · 点这里请回来';
          toast('它已经住进桌面了，去屏幕右下角看看');
        } else {
          // 协议没被系统接管，说明这台机器还没装桌面版，把它放回页面
          document.body.classList.remove('pet-sent');
          setPagePetVisible(true);
          toast('电脑上好像还没装桌面版，先下载安装，再点这个按钮');
        }
      }, 1600);
    });
    document.body.appendChild(a);
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
    return `assets/characters/${id}/anim/${ANIM_FILE[act]}.gif`;
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
        im.src = 'sprites/' + pet.id + '_' + file + '.png';
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
        sp.style.backgroundImage = `url(sprites/${inst.pet.id}_${key}.png)`;
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
