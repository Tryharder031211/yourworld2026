/* =============================================================================
   core/boot.js — Khởi động từng trang theo <body data-page="...">:
   index (Sảnh) • health (Mảng 1) • tycoon (Phòng) • fomo (Khu Shopping & minigame).
   Khởi tạo Cloud OAuth + PWA Service Worker + vòng lặp game + lớp phủ khóa OS.
   ============================================================================= */
'use strict';

const App={
  cur:null,
  show(n){ document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('on',s.id===n)); this.cur=n; if(n==='lobby'&&typeof Lobby!=='undefined'&&Lobby.world) requestAnimationFrame(()=>Lobby.resize()); }
};
const Loop={ fns:[], last:performance.now(), add(f){ this.fns.push(f); },
  run(t){ const now=t||performance.now(), dt=Math.min(.05,(now-Loop.last)/1000); Loop.last=now; for(const f of Loop.fns){ try{ f(dt); }catch(e){ console.error(e); } } requestAnimationFrame(Loop.run); } };

/* ---------------- Khu Shopping (fomo.html) : sảnh minigame + teleport ---------------- */
const Hub={
  init(){ const el=this.el=document.getElementById('hub');
    el.innerHTML=`<div id="hubStage"><div class="world" id="hubW" style="height:330px">${HUB_SVG}</div></div>
      <div class="hub-cards">
        <div class="card row" style="padding:8px 12px">${sv(IP.portal,28)}<b class="grow" style="font-size:16px;color:${C.mn}">Khu Shopping & Giải Trí</b>${sv(IP.gem,18)}<b id="hubGem" data-gem-anchor></b><button class="icon-btn" data-a="set" style="width:34px;height:34px;border-radius:10px">${sv(IP.gear,20)}</button></div>
        <div class="hub-grid">
          <div class="mg-card card">${sv(IP.cart,48)}<div class="grow"><b style="font-size:15.5px">Minigame 1: Shopping Tỉnh Thức</b><div class="muted">Chi tiêu 1 tháng bằng tiền giấy VNĐ • Sàn TMĐT hoặc Xe Đẩy Siêu Thị • Né bẫy FOMO!</div></div><button class="btn pri" data-a="play">Chơi</button></div>
          <div class="mg-card card">${sv(IP.monster,48)}<div class="grow"><b style="font-size:15.5px">Minigame 2: Quái Vật Ăn Thịt FOMO</b><div class="muted">Gom thói quen tốt, né thông báo & sale sốc • Kỷ lục: <b id="hubBest"></b></div></div><button class="btn pri" data-a="monster">Chơi</button></div>
        </div>
        <button class="btn moss big full" data-a="home">${sv(IP.home,24)} Về Nhà</button></div>`;
    this.world=el.querySelector('#hubW'); this.dk=new Donkey({scale:1.05,tilt:-22,acc:Core.s.acc.on}); this.world.appendChild(this.dk.el); this.dk.pos(195,284);
    el.querySelector('[data-a=play]').onclick=()=>this.openProfile();
    el.querySelector('[data-a=monster]').onclick=()=>MonsterGame.open();
    el.querySelector('[data-a=home]').onclick=()=>this.home();
    el.querySelector('[data-a=set]').onclick=()=>openSettings();
    new ResizeObserver(()=>this.resize()).observe(el); this.refresh(); },
  refresh(){ const g=document.getElementById('hubGem'); if(g){ g.textContent=Core.s.gems; document.getElementById('hubBest').textContent=Core.s.monster.best; } },
  resize(){ const W=this.el.clientWidth, H=this.el.clientHeight; if(!W) return;
    const maxStageH=Math.min(480,Math.max(240,H*0.52));
    const s=Math.min(W/390,maxStageH/330,1.45);
    const ox=(W-390*s)/2;
    this.world.style.transform=`translate(${ox}px,0) scale(${s})`;
    document.getElementById('hubStage').style.height=(330*s)+'px'; },
  setAcc(){ this.dk.setAcc(Core.s.acc.on); },
  async arrive(){ App.show('hub'); this.resize(); this.refresh(); this.busy=true; this.dk.setMood(Core.mood());
    await FX.teleport(this.world,195,284,this.dk,'in'); this.busy=false; },
  async home(){ if(this.busy) return; this.busy=true; await FX.teleport(this.world,195,284,this.dk,'out'); this.busy=false; Nav.go('home','',{tp:1}); },
  openProfile(){ let pid=null, mode=null;
    const m=UI.modal(`<div class="row"><h2 class="grow" style="color:${C.mn}">Shopping Tỉnh Thức</h2><button class="x-btn" data-x>${sv(IP.x,16)}</button></div>
      <p class="muted">Tiêu <b>tiền giấy VNĐ</b> trong 1 tháng (30 ngày game ≈ 1,5 phút). Giữ cân bằng 3 chỉ số <b>Hữu Dụng • Hạnh Phúc • Diện Tích Phòng</b>, đừng để FOMO dắt mũi!</p>
      <b style="display:block;margin-top:10px">1. Chọn hồ sơ</b>
      ${Object.entries(DATA.SHOP).map(([k,p])=>`<div class="card pick" data-p="${k}" style="padding:9px 11px;margin-top:8px"><div class="row"><b class="grow" style="font-size:15px">${p.name}</b><span class="tag mid">${sv(IP.bill,16)} ${U.vnd(p.budget)}</span></div>
        <div class="muted"><b>Mục tiêu:</b> ${p.goals.join(' • ')}</div><div class="muted"><b>Thiết yếu:</b> ${p.items.filter(i=>i.type==='need').map(i=>i.name).join(', ')}</div><div class="muted"><b style="color:#a5584c">Bẫy FOMO:</b> ${p.items.filter(i=>i.type==='fomo').map(i=>i.name).join(', ')}</div></div>`).join('')}
      <b style="display:block;margin-top:12px">2. Chọn chế độ (đổi được giữa chừng)</b>
      <div class="grid2" style="margin-top:6px"><div class="card pick center" data-m="shopee" style="padding:8px">${sv(IP.shop,38)}<br><b>Sàn TMĐT</b><div class="muted">kiểu Shopee</div></div><div class="card pick center" data-m="market" style="padding:8px">${sv(IP.cart,38)}<br><b>Xe Đẩy Siêu Thị</b><div class="muted">Tap-to-Move + A*</div></div></div>
      <button class="btn pri big full" style="margin-top:12px" data-a="go" disabled>Bắt đầu tháng #${Core.s.shop.month}</button>`);
    const go=m.box.querySelector('[data-a=go]'), upd=()=>{ go.disabled=!(pid&&mode); m.box.querySelectorAll('[data-p]').forEach(e=>e.classList.toggle('on',e.dataset.p===pid)); m.box.querySelectorAll('[data-m]').forEach(e=>e.classList.toggle('on',e.dataset.m===mode)); };
    m.box.querySelectorAll('[data-p]').forEach(e=>e.onclick=()=>{ pid=e.dataset.p; upd(); }); m.box.querySelectorAll('[data-m]').forEach(e=>e.onclick=()=>{ mode=e.dataset.m; upd(); });
    m.box.querySelector('[data-x]').onclick=()=>m.close(); go.onclick=()=>{ m.close(); ShopUI.start(pid,mode); }; }
};

/* ---------------- Mảng 1: health.html ---------------- */
const HealthPage={
  TABS:[['timer','clock','Màn hình'],['tasks','quest','Nhiệm vụ'],['sleep','bedtime','Giấc ngủ']],
  init(){ const el=document.getElementById('health');
    el.innerHTML=`<div class="page-head"><button class="icon-btn" data-a="back" title="Về nhà">${sv(IP.back,24)}</button><div class="title card">${sv(IP.heart,20)}<b class="t">Sức Khỏe Số</b>${sv(IP.gem,16)}<b id="hGem" data-gem-anchor></b></div><button class="icon-btn" data-a="set">${sv(IP.gear,24)}</button></div>
      <div class="page-tabs"><div class="seg">${this.TABS.map(([k,i,n])=>`<button data-t="${k}">${n}</button>`).join('')}</div></div>
      <div class="page-body" id="hBody"></div>`;
    el.querySelector('[data-a=back]').onclick=()=>Nav.go('home');
    el.querySelector('[data-a=set]').onclick=()=>openSettings();
    el.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>this.tab(b.dataset.t));
    const q=new URLSearchParams(location.search); this.blocked=q.get('blocked'); this.reason=q.get('reason');
    App.show('health'); this.tab((location.hash||'#timer').slice(1)); this.gem();
    if(this.blocked){ if(this.reason==='bed' && Core.isBedtime() && !Core.s.night.broken) Overlays.bed(true); else if(Core.s.screen.locked) Overlays.screen(true,{site:this.blocked}); } },
  gem(){ const g=document.getElementById('hGem'); if(g) g.textContent=Core.s.gems; },
  tab(t){ if(!this.TABS.some(x=>x[0]===t)) t='timer'; this.cur=t; if(this.off){ this.off(); this.off=null; }
    document.querySelectorAll('#health [data-t]').forEach(b=>b.classList.toggle('on',b.dataset.t===t)); history.replaceState(null,'',location.pathname+location.search+'#'+t);
    const body=document.getElementById('hBody'); body.innerHTML=''; if(this.blocked) body.appendChild(this.blockedCard());
    const box=document.createElement('div'); body.appendChild(box);
    this.off = t==='timer'?Timer.render(box,()=>this.tab('sleep')) : t==='tasks'?Tasks.render(box) : SleepLock.render(box); },
  blockedCard(){ const d=document.createElement('div'); d.className='card h-hero'; d.style.background='#f3e0dc';
    const upd=()=>{ const open=!Core.s.screen.locked && !(Core.isBedtime()&&!Core.s.night.broken);
      d.innerHTML=`${sv(IP.lock,34)}<div class="grow"><b>Bạn vừa được đưa ra khỏi ${U.esc(this.blocked)}</b><div class="muted">${open?'Đã mở khóa — dùng có chừng mực nhé!':this.reason==='bed'?'Đang giờ ngủ 8 tiếng. Đi ngủ thôi!':'Hết giờ màn hình. Làm 1 Quest để +5 phút.'}</div></div>${open&&!Bridge.android?`<button class="btn sm moss" data-a="back">Mở lại</button>`:''}`;
      const b=d.querySelector('[data-a=back]'); if(b) b.onclick=()=>{ location.href='https://'+this.blocked; }; };
    upd(); Core.on('change',upd); return d; }
};

/* ---------------- Khởi động chung ---------------- */
const Boot={
  page:document.body.dataset.page||'index',
  async start(){
    ensureOverlays();
    UI.app.addEventListener('contextmenu',e=>e.preventDefault());
    /* Callback cho app Android trả token từ Custom Tabs (luachill://auth#...) */
    window.__onAuthCallback=async hash=>{
      if(typeof Cloud!=='undefined') await Cloud.handleHash(hash,false);
    };
    if('serviceWorker' in navigator && (location.protocol==='https:'||location.hostname==='localhost'||location.hostname==='127.0.0.1')){
      navigator.serviceWorker.register(Nav.root+'sw.js').catch(()=>{});
    }
    if(!Core.s && this.page!=='index'){ location.replace(Nav.url('home')); return; }
    /* Render giao diện NGAY LẬP TỨC, không để màn trắng khi chờ mạng Supabase */
    this[this.page]();
    if(typeof Cloud!=='undefined'){
      if(/access_token=|error_description=/.test(location.hash)) UI.toast('Đang hoàn tất đăng nhập...');
      Cloud.init().catch(e=>console.warn(e));
    }
  },
  common(){ if(this._c) return; this._c=true;
    Core.on('screenLock',on=>{ Overlays.screen(on,HealthPage.blocked?{site:HealthPage.blocked}:{}); });
    Core.on('bedLock',on=>{ Overlays.bed(on); });
    Core.on('morning',pm=>{ Overlays.bed(false); Overlays.screen(false); Overlays.morning(pm); });
    Core.on('tick',()=>{ const bt=document.getElementById('bedTime'); if(bt) bt.textContent=U.hm(Core.now()); });
    Core.on('gems',d=>{ const html=`${d.n>0?'+':''}${d.n} ${sv(IP.gem,16)}`; const a=[...document.querySelectorAll('[data-gem-anchor]')].find(e=>e.offsetParent);
      if(a){ UI.floatEl(a,html,C.mn); if(a.tagName==='B') a.textContent=Core.s.gems; } else UI.float(html,UI.app.clientWidth/2,70,C.mn); });
    document.addEventListener('visibilitychange',()=>{ Core.visible=document.visibilityState!=='hidden'; Core.save(); });
    window.addEventListener('beforeunload',()=>Core.save());
    window.addEventListener('storage',e=>{ if(e.key===Store.KEY && e.newValue){ Core.reload(); } });
    setInterval(()=>Core.tick(),1000); requestAnimationFrame(Loop.run);
    Core.syncPolicy(); Core.tick();
    if(Core.s.pendingMorning) Overlays.morning(Core.s.pendingMorning); },
  index(){ const enter=()=>{ if(!this._lobby){ this._lobby=true; Lobby.init(); HUD.init();
        Core.on('tick',()=>{ HUD.update(); Lobby.refresh(); }); Core.on('change',()=>{ HUD.update(); Lobby.refresh(); });
        Core.on('acc',()=>{ HUD.setAcc(); Lobby.setAcc(); }); Core.on('bedLock',()=>{ HUD.update(); Lobby.refresh(); });
        Core.on('wilt',()=>UI.toast('Ôi, bạn quên tưới cây đúng giờ — hoa héo nhẹ mất rồi...'));
        if(typeof Cloud!=='undefined') Cloud.on('auth',()=>HUD.update());
        Loop.add(dt=>{ if(App.cur==='lobby') Lobby.update(dt); }); }
      App.show('lobby'); Lobby.setAcc(); HUD.setAcc(); HUD.update(); Lobby.refresh(); Lobby.showHint(); this.common();
      if(Nav.takeTp()) Lobby.arrive(); };
    const go=()=>{ try{ sessionStorage.setItem('lc_boot','1'); }catch(e){} enter(); };
    if(Core.s && Nav.booted()) enter();
    else { Start.render(go); if(typeof Cloud!=='undefined') Cloud.on('auth',()=>{ if(App.cur==='start') Start.render(go); }); } },
  health(){ HealthPage.init(); Core.on('change',()=>HealthPage.gem()); this.common(); },
  tycoon(){ Decor.init(); Decor.open(); this.common(); },
  fomo(){ Hub.init(); ShopUI.init(); MonsterGame.init(); Core.on('acc',()=>Hub.setAcc()); Core.on('change',()=>Hub.refresh());
    Loop.add(dt=>{ if(App.cur==='shopping') ShopUI.update(dt); else if(App.cur==='monster') MonsterGame.update(dt); });
    this.common();
    if(location.hash==='#demo-month'){ history.replaceState(null,'',location.pathname); App.show('hub'); Hub.resize(); ShopUI.demoMonthEnd(); }
    else if(Nav.takeTp()) Hub.arrive(); else { App.show('hub'); Hub.resize(); } }
};
Boot.start();
