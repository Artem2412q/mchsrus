const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));


function headerScrollInit(){
  const header = document.querySelector("header");
  if(!header) return;
  const onScroll = ()=>{
    header.setAttribute("data-scrolled", (window.scrollY > 20) ? "1" : "0");
  };
  onScroll();
  window.addEventListener("scroll", onScroll, {passive:true});
}

function setActiveNav(){
  const path = location.pathname.split("/").pop() || "index.html";
  $$('a[data-nav]').forEach(a=>{
    const match = a.getAttribute('href') === path;
    a.classList.toggle('active', match);
  });
}

function themeInit(){
  // Light theme removed
  document.documentElement.classList.remove("light");
  localStorage.setItem("theme","dark");
}

function toggleTheme(){
  // no-op (light theme removed)
}


function drawerInit(){
  const btn = $("#menuBtn");
  const sourceMenu = $("#mobileMenu"); // keep as source for links
  if(!btn || !sourceMenu) return;

  // build overlay + drawer once
  let overlay = $(".mobileDrawerOverlay");
  let drawer = $(".mobileDrawer");
  if(!overlay){
    overlay = document.createElement("div");
    overlay.className = "mobileDrawerOverlay";
    document.body.appendChild(overlay);
  }
  if(!drawer){
    drawer = document.createElement("div");
    drawer.className = "mobileDrawer";
    drawer.setAttribute("role","dialog");
    drawer.setAttribute("aria-modal","true");
    drawer.setAttribute("aria-label","Меню");
    drawer.innerHTML = `
      <div class="drawerTop">
        <div class="title">
          <span aria-hidden="true">🚒</span>
          <div style="display:flex; flex-direction:column; line-height:1.1">
            <strong>Навигация</strong>
            <span style="font-size:12px; color: rgba(234,242,255,.75)">МЧС России — Невский</span>
          </div>
        </div>
        <button class="btn icon" data-drawer-close aria-label="Закрыть меню" title="Закрыть"><span aria-hidden="true">✕</span></button>
      </div>
      <nav class="drawerNav" aria-label="Меню"></nav>
      <div class="drawerBottom">
        <a class="btn primary" href="psch3.html#contacts" title="Контакты">Связь</a>
      </div>
    `;
    document.body.appendChild(drawer);
  }

  const nav = $(".drawerNav", drawer);
  nav.innerHTML = sourceMenu.innerHTML; // reuse links

  // keep source hidden
  sourceMenu.style.display = "none";

  const open = ()=>{
    document.body.classList.add("drawer-open");
    btn.setAttribute("aria-expanded","true");
    // focus first link
    setTimeout(()=>{
      const first = nav.querySelector("a");
      first && first.focus();
    }, 0);
  };
  const close = ()=>{
    document.body.classList.remove("drawer-open");
    btn.setAttribute("aria-expanded","false");
    btn.focus();
  };

  btn.addEventListener("click", ()=>{
    document.body.classList.contains("drawer-open") ? close() : open();
  });
  overlay.addEventListener("click", close);
  drawer.querySelector("[data-drawer-close]")?.addEventListener("click", close);

  // close on link click
  nav.addEventListener("click", (e)=>{
    const a = e.target.closest("a");
    if(a) close();
  });

  // esc
  document.addEventListener("keydown", (e)=>{
    if(e.key === "Escape" && document.body.classList.contains("drawer-open")){
      close();
    }
  });

  // show/hide hamburger based on width is handled by CSS; ensure aria
  btn.setAttribute("aria-expanded","false");
}


async function loadJSON(path){
  const res = await fetch(path, {cache: "no-store"});
  if(!res.ok) throw new Error(`Не удалось загрузить ${path}`);
  return await res.json();
}

function fmtDate(iso){
  try{
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("ru-RU", {year:"numeric", month:"long", day:"2-digit"});
  }catch(e){ return iso; }
}


async function renderNews(){
  const root = $("#newsList");
  if(!root) return;
  const data = await loadJSON("data/news.json");
  root.innerHTML = "";

  const sorted = (data || []).slice().sort((a,b)=>{
    const ap = a && a.pinned ? 1 : 0;
    const bp = b && b.pinned ? 1 : 0;
    if(ap !== bp) return bp - ap; // pinned first
    return (b.date||"").localeCompare(a.date||"");
  });

  sorted.forEach(n=>{
    const li = document.createElement("li");
    const isPinned = !!n.pinned;

    if(isPinned){
      li.className = "newsItem pinned";
      const r = n.recruitment || {};
      const makeList = (arr)=> (Array.isArray(arr) ? arr.map(x=>`<li><span class="bullet"></span><div>${escapeHTML(String(x))}</div></li>`).join("") : "");
      li.innerHTML = `
        <div class="pinnedHead">
          <div class="pinnedTitle">
            <strong>${escapeHTML(n.title)}</strong>
            <span class="chip">закреплено</span>
            <span class="tag">${escapeHTML(n.tag || "Объявление")}</span>
          </div>
          <div class="small">${fmtDate(n.date)} • ${escapeHTML(n.excerpt || "")}</div>
        </div>

        <div class="recruitGrid" style="margin-top:12px">
          <div class="recruitCol">
            <div class="recruitLabel">Кого ищем</div>
            <ul class="list">${makeList(r.who)}</ul>
          </div>

          <div class="recruitCol">
            <div class="recruitLabel">Требования</div>
            <ul class="list">${makeList(r.requirements)}</ul>
          </div>

          <div class="recruitCol">
            <div class="recruitLabel">Что даём</div>
            <ul class="list">${makeList(r.we_give)}</ul>
          </div>

          <div class="recruitCol">
            <div class="recruitLabel">Как откликнуться</div>
            <ul class="list">${makeList(r.how_to_apply)}</ul>
          </div>
        </div>`;
      root.appendChild(li);
      return;
    }

    li.innerHTML = `
      <span class="bullet"></span>
      <div style="flex:1">
        <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap">
          <strong>${escapeHTML(n.title)}</strong>
          <span class="tag">${escapeHTML(n.tag || "Новость")}</span>
        </div>
        <div class="small" style="margin-top:4px">${fmtDate(n.date)} • ${escapeHTML(n.excerpt || "")}</div>
      </div>`;
    root.appendChild(li);
  });
}

async function renderEquipment(){
  // Overview page
  const root = $("#equipRoot");
  if(root){
    const data = await loadJSON("data/equipment.json");
    const vehicles = [];
    for(const unit of (data.units||[])){
      for(const v of (unit.vehicles||[])){
        vehicles.push({unit: unit.name, ...v});
      }
    }

    root.innerHTML = "";
    const grid = document.createElement("div");
    grid.className = "cards";
    grid.style.marginTop = "12px";

    for(const v of vehicles){
      const href = v.id ? `equipment-${encodeURIComponent(v.id)}.html` : "equipment.html";
      const card = document.createElement("a");
      card.className = "card item reveal";
      card.href = href;
      card.innerHTML = `
        <div class="cardTitleRow">
          <div class="left">
            <div class="iconBadge" aria-hidden="true" style="color: var(--mchs-orange)">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M7 18h10M8 18l1-10h6l1 10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                <path d="M10 8V6a2 2 0 0 1 4 0v2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
              </svg>
            </div>
            <div>
              <h3 style="margin:0">${escapeHTML(v.title||"Техника")}</h3>
              <div class="small">${escapeHTML(v.unit||"")}</div>
            </div>
          </div>
          <span class="badge">отсеки</span>
        </div>
        <p class="small" style="margin-top:10px">${escapeHTML(v.subtitle||"Открыть фактическое оснащение по отсекам")}</p>
      `;
      grid.appendChild(card);
    }

    root.appendChild(grid);
    initReveal();
    headerScroll();
  bindToolDeck();
    return;
  }

  // Vehicle page
  const vRoot = $("#equipVehicleRoot");
  if(!vRoot) return;

  const vid = vRoot.getAttribute("data-vehicle-id");
  const data = await loadJSON("data/equipment.json");

  let vehicle = null, unitName = "";
  for(const unit of (data.units||[])){
    for(const v of (unit.vehicles||[])){
      if(String(v.id) === String(vid)){
        vehicle = v; unitName = unit.name;
      }
    }
  }

  if(!vehicle){
    vRoot.innerHTML = `<div class="note">Не нашёл технику с id: <span class="kbd">${escapeHTML(vid||"")}</span></div>`;
    return;
  }

  const sections = (vehicle.verified_sections||[]);
  const toc = [];
  for(const sec of sections){
    for(const comp of (sec.compartments||[])){
      const anchor = `sec-${hash(`${sec.side}-${comp.name}`)}`;
      toc.push({title: `${sec.side} • ${comp.name}`, anchor});
    }
  }

  vRoot.innerHTML = `
    <div class="card item reveal">
      <div class="kicker"><span class="dot"></span>${escapeHTML(unitName)}</div>
      <h2 style="margin:6px 0 0">${escapeHTML(vehicle.title||"Техника")}</h2>
      <p class="lead" style="margin-top:10px">
        Это фактическое оснащение по твоим данным. Поиск убран — вместо него быстрые переходы и прокрутка.
      </p>
      <div class="heroActions" style="margin-top:12px">
        <a class="btn" href="equipment.html">← ко всей технике</a>
        <a class="btn primary" href="#toc">Быстрые переходы</a>
      </div>
    </div>

    <div class="card item reveal" id="toc" style="margin-top:12px">
      <h3>Быстрые переходы</h3>
      <div class="tabs" style="margin-top:10px">
        ${toc.map(t=> `<a class="tab" href="#${t.anchor}">${escapeHTML(t.title)}</a>`).join("")}
      </div>
      <div class="note" style="margin-top:12px">Нажал → прыгнул к отсеку. Дальше просто скролл.</div>
    </div>

    <div style="margin-top:12px; display:grid; gap:12px">
      ${sections.map(sec => `
        <div class="card item reveal">
          <div class="cardTitleRow">
            <div class="left">
              <div class="iconBadge" style="color: var(--mchs-blue)">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M9 18l-6 3V6l6-3 6 3 6-3v15l-6 3-6-3Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
                </svg>
              </div>
              <h3 style="margin:0">${escapeHTML(sec.side)}</h3>
            </div>
            <span class="tag">по отсекам</span>
          </div>

          <div style="margin-top:12px; display:grid; gap:10px">
            ${(sec.compartments||[]).map(comp => {
              const anchor = `sec-${hash(`${sec.side}-${comp.name}`)}`;
              return `
                <div class="card" id="${anchor}" style="padding:14px; background: color-mix(in srgb, var(--panel2) 70%, transparent); box-shadow:none">
                  <div class="cardTitleRow">
                    <div class="left">
                      <div class="badge">Отсек</div>
                      <strong>${escapeHTML(comp.name)}</strong>
                    </div>
                    <a class="btn" href="#toc" style="padding:8px 10px">↑</a>
                  </div>

                  <div style="margin-top:12px; display:grid; gap:10px">
                    ${(comp.items||[]).map(it => renderItem(it, true)).join("")}
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        </div>
      `).join("")}
    </div>
  `;

  initReveal();
}

function renderItem(it, showVerified){
  const displayName = it.display || it.name;
  const qty = it.qty ? ` • <span class="small">${escapeHTML(it.qty)}</span>` : "";
  const p = it.purpose ? `<div class="small" style="margin-top:6px"><strong>Назначение:</strong> ${escapeHTML(it.purpose)}</div>` : "";
  const w = it.when ? `<div class="small" style="margin-top:6px"><strong>Когда используется:</strong> ${escapeHTML(it.when)}</div>` : "";
  const n = it.notes ? `<div class="small" style="margin-top:6px"><strong>Примечания:</strong> ${escapeHTML(it.notes)}</div>` : "";
  const s = it.safety ? `<div class="small" style="margin-top:6px"><strong>Безопасность:</strong> ${escapeHTML(it.safety)}</div>` : "";

  const badge = showVerified
    ? (it.verified
        ? `<span class="tag" style="border-color: color-mix(in srgb, var(--mchs-orange) 55%, var(--border));">подтверждено</span>`
        : `<span class="tag">в работе</span>`)
    : "";

  return `
    <div class="card" style="padding:14px; background: color-mix(in srgb, var(--panel2) 65%, transparent); box-shadow:none">
      <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; align-items:center">
        <div><strong>${escapeHTML(displayName)}</strong>${qty}</div>
        <div>${badge}</div>
      </div>
      ${p}${w}${n}${s}
    </div>
  `;
}

function hash(str){
  // tiny stable hash for anchors
  let h = 0;
  for(let i=0;i<str.length;i++){
    h = ((h<<5)-h) + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(36);
}

function initReveal(){
  const els = document.querySelectorAll(".reveal");
  if(!els.length) return;
  const io = new IntersectionObserver((entries)=>{
    for(const e of entries){
      if(e.isIntersecting){
        e.target.classList.add("in");
        io.unobserve(e.target);
      }
    }
  }, {threshold: 0.12});
  els.forEach(el=> io.observe(el));
}

function escapeHTML(str){
  return String(str).replace(/[&<>"']/g, s => ({
    "&": "&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  }[s]));
}

function bindQuickSearch(){
  // Ctrl/⌘ + K focus
  window.addEventListener("keydown", (e)=>{
    const isK = (e.key || "").toLowerCase() === "k";
    if(isK && (e.ctrlKey || e.metaKey)){
      const inp = $("#equipSearch") || $("#siteSearch");
      if(inp){
        e.preventDefault();
        inp.focus();
      }
    }
  });
}


function normalizeKey(s){ return (s||"").toString().trim().replace(/\s+/g," ").toLowerCase(); }

function initEquipModal(){
  const modal = $("#equipModal");
  if(!modal) return;

  const img = $("#equipModalImg", modal);
  const titleEl = $("#equipModalTitle", modal);
  const leadEl = $("#equipModalLead", modal);
  const chipsEl = $("#equipModalChips", modal);
  const blocksEl = $("#equipModalBlocks", modal);
  const jumpEl = $("#equipModalJump", modal);

  const details = window.EQUIP_DETAILS || {};
  const detailsByNorm = new Map(Object.entries(details).map(([k,v])=>[normalizeKey(k), v]));

  let lastFocus = null;

  const close = ()=>{
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden","true");
    document.documentElement.classList.remove("modalOpen");
    document.body.classList.remove("modalOpen");
    if(lastFocus && lastFocus.focus) lastFocus.focus();
  };

  const open = (payload, sourceEl)=>{
    lastFocus = sourceEl || document.activeElement;

    titleEl.textContent = payload.title || "";
    leadEl.textContent = payload.lead || payload.desc || "";
    img.src = payload.img || "";
    img.alt = payload.title || "";

    // chips
    const chips = [];
    if(payload.category) chips.push(payload.category);
    if(payload.group) chips.push(payload.group);
    chipsEl.innerHTML = chips.map(c=>`<span class="equipChip">${escapeHTML(c)}</span>`).join("");

    // blocks
    const blocks = [];
    const addBlock = (icon, t, body)=>{
      if(!body) return;
      blocks.push(`
        <div class="equipBlock">
          <div class="equipBlock__top">
            <div class="equipBlock__title">${escapeHTML(t)}</div>
            <div class="equipBlock__icon" aria-hidden="true">${icon}</div>
          </div>
          <p>${escapeHTML(body)}</p>
        </div>
      `);
    };
    addBlock("🎯", "Для чего", payload.for);
    addBlock("⏱️", "Когда используется", payload.when);
    addBlock("🛠️", "Как используют", payload.how);
    addBlock("⚠️", "Важно помнить", payload.notes);

    // fallback: use card description if nothing else
    if(!blocks.length && payload.desc){
      addBlock("ℹ️", "Описание", payload.desc);
    }
    blocksEl.innerHTML = blocks.join("");

    // jump
    if(payload.href){
      jumpEl.style.display = "inline-flex";
      jumpEl.onclick = (e)=>{
        e.preventDefault();
        close();
        const tgt = document.querySelector(payload.href);
        if(tgt) tgt.scrollIntoView({behavior:"smooth", block:"start"});
      };
    }else{
      jumpEl.style.display = "none";
      jumpEl.onclick = null;
    }

    modal.classList.add("open");
    modal.setAttribute("aria-hidden","false");
    document.documentElement.classList.add("modalOpen");
    document.body.classList.add("modalOpen");

    // small accessibility: focus close button
    const closeBtn = modal.querySelector("[data-close]");
    if(closeBtn) closeBtn.focus();
  };

  // close on backdrop / buttons
  modal.addEventListener("click", (e)=>{
    const t = e.target;
    if(t && t.closest && t.closest("[data-close]")) close();
  });

  window.addEventListener("keydown", (e)=>{
    if(!modal.classList.contains("open")) return;
    if(e.key === "Escape") close();
  });

  const buildPayloadFromCard = (el)=>{
    const imgEl = el.querySelector("img");
    const imgSrc = imgEl ? imgEl.getAttribute("src") : "";
    const title = (el.querySelector("h4")||el.querySelector("h3")||imgEl)?.textContent?.trim() || (imgEl ? imgEl.alt : "");
    const desc = (el.querySelector("p")||{}).textContent ? el.querySelector("p").textContent.trim() : "";
    const href = el.getAttribute("data-href") || null;

    // find category/group from closest cat-* container
    let group = "";
    const cat = el.closest("[id^='cat-']");
    if(cat){
      const h = cat.querySelector("h2,h3,h4");
      if(h) group = h.textContent.trim();
    }

    const d = detailsByNorm.get(normalizeKey(title)) || null;

    return Object.assign({
      title, desc, img: imgSrc, href, group
    }, d || {});
  };

  const bind = (el)=>{
    if(!el) return;
    // ensure focusable
    if(!el.hasAttribute("tabindex")) el.setAttribute("tabindex","0");
    el.addEventListener("click", (e)=>{
      // prevent anchor hijack
      e.preventDefault?.();
      open(buildPayloadFromCard(el), el);
    });
    el.addEventListener("keydown", (e)=>{
      if(e.key === "Enter" || e.key === " "){
        e.preventDefault();
        open(buildPayloadFromCard(el), el);
      }
    });
  };

  document.querySelectorAll(".equipItem, .toolCard").forEach(bind);
}


function detailsSmoothInit(){
  // Smooth open/close for <details> using height animation (no layout jumps)
  const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if(reduced) return;

  document.querySelectorAll("details").forEach(details=>{
    const summary = details.querySelector("summary");
    if(!summary) return;

    const content = document.createElement("div");
    content.className = "detailsContent";
    // move everything except summary into wrapper
    const nodes = Array.from(details.childNodes).filter(n => n !== summary);
    nodes.forEach(n => content.appendChild(n));
    details.appendChild(content);

    content.style.overflow = "hidden";
    content.style.height = details.open ? "auto" : "0px";

    let anim = null;

    summary.addEventListener("click", (e)=>{
      // let default toggle happen, then animate based on new state
      // We must prevent default to control open attribute ourselves
      e.preventDefault();

      const isOpen = details.open;
      if(anim) anim.cancel();

      const startHeight = isOpen ? content.getBoundingClientRect().height : 0;
      if(isOpen){
        // close
        const endHeight = 0;
        content.style.height = startHeight + "px";
        requestAnimationFrame(()=>{
          anim = content.animate([{height: startHeight+"px"},{height: endHeight+"px"}], {duration: 260, easing: "cubic-bezier(.2,.8,.2,1)"});
          anim.onfinish = ()=>{
            details.open = false;
            content.style.height = "0px";
          };
        });
      }else{
        // open
        details.open = true;
        // measure
        content.style.height = "auto";
        const full = content.getBoundingClientRect().height;
        content.style.height = "0px";
        requestAnimationFrame(()=>{
          anim = content.animate([{height:"0px"},{height: full+"px"}], {duration: 300, easing: "cubic-bezier(.2,.8,.2,1)"});
          anim.onfinish = ()=>{
            content.style.height = "auto";
          };
        });
      }
    });
  });
}





// ===== v6.6 JUICE: atmosphere, pointer-reactive background, page transitions =====
function ensureAtmosphere(){
  // Film grain layer
  if(!document.querySelector('.grain')){
    const g = document.createElement('div');
    g.className = 'grain';
    document.body.appendChild(g);
  }

  // Scroll progress bar
  if(!document.querySelector('.scrollProgress')){
    const sp = document.createElement('div');
    sp.className = 'scrollProgress';
    document.body.appendChild(sp);
  }
}

function scrollProgressInit(){
  const bar = document.querySelector('.scrollProgress');
  if(!bar) return;
  const onScroll = ()=>{
    const h = document.documentElement;
    const max = Math.max(1, h.scrollHeight - h.clientHeight);
    const p = Math.min(1, Math.max(0, h.scrollTop / max));
    bar.style.width = (p * 100).toFixed(2) + '%';
  };
  onScroll();
  window.addEventListener('scroll', onScroll, {passive:true});
  window.addEventListener('resize', onScroll, {passive:true});
}

function pointerAtmosInit(){
  const finePointer = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if(!finePointer) return;
  const orbs = document.querySelector('.bg-orbs');
  if(!orbs) return;

  let raf = 0;
  let x = window.innerWidth * 0.5;
  let y = window.innerHeight * 0.25;

  const paint = ()=>{
    raf = 0;
    const mx = Math.round((x / window.innerWidth) * 100);
    const my = Math.round((y / window.innerHeight) * 100);
    orbs.style.setProperty('--mx', mx + '%');
    orbs.style.setProperty('--my', my + '%');
    orbs.classList.add('is-active');
  };

  const onMove = (e)=>{
    x = e.clientX;
    y = e.clientY;
    if(!raf) raf = requestAnimationFrame(paint);
  };

  window.addEventListener('mousemove', onMove, {passive:true});
  window.addEventListener('mouseleave', ()=>{ orbs.classList.remove('is-active'); });
}

function pageTransitionsInit(){
  // Initial fade-in
  document.body.classList.add('preload');
  requestAnimationFrame(()=>{
    document.body.classList.add('loaded');
    document.body.classList.remove('preload');
  });

  // Out transition for internal navigation (avoid interfering with anchors)
  document.addEventListener('click', (e)=>{
    const a = e.target && e.target.closest ? e.target.closest('a') : null;
    if(!a) return;
    if(a.target || a.hasAttribute('download')) return;

    const href = a.getAttribute('href') || '';
    if(!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

    try{
      const url = new URL(a.href, location.href);
      if(url.origin !== location.origin) return;

      // Same page anchor — allow native jump
      if(url.pathname === location.pathname && url.hash) return;

      e.preventDefault();
      document.body.classList.add('page-out');
      setTimeout(()=>{ location.href = url.href; }, 140);
    }catch(_e){}
  }, {capture:true});
}


document.addEventListener('DOMContentLoaded', ()=>{
  ensureAtmosphere();
  pageTransitionsInit();
  // pointerAtmosInit disabled (no cursor glow)
  scrollProgressInit();

  initReveal();
  setActiveNav();
  themeInit();
  drawerInit();
  headerScrollInit();
  detailsSmoothInit();

  renderNews().catch(()=>{});
  renderEquipment().catch(()=>{});
  bindQuickSearch();
  initEquipModal();
});
