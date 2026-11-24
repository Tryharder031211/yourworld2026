/* =============================================================================
   core/lobby.js — SẢNH CHÍNH (index.html): Tap-to-Move / Hold-to-Steer / Tap-to-Interact / A*,
   HUD gọn sạch, thanh điều hướng, Vườn hoa & Thú cưng kèm ƯU ĐÃI CHĂM SÓC, màn Khởi động + OAuth.
   ============================================================================= */
'use strict';

const Lobby={
  OBJ:{
    home:{x:122,y:272,lx:112,ly:200,r:62,open:()=>Nav.go('tycoon')},
    clock:{x:196,y:280,lx:196,ly:250,r:24,open:()=>openUsageSettings('mode')},
    garden:{x:175,y:418,lx:175,ly:372,r:62,open:()=>openGarden()},
    pets:{x:331,y:426,lx:331,ly:392,r:30,open:()=>openPets()},
    shop:{x:322,y:134,lx:334,ly:62,r:36,open:()=>goShop()}
  },
  init(){ const st=this.stage=document.getElementById('lobbyStage');
    const w=this.world=document.createElement('div'); w.className='world'; st.appendChild(w);
    w.innerHTML=SCENE.bg();
    const add=(html,x,y,o={})=>{ const e=document.createElement('div'); e.className='wobj '+(o.cls||''); if(o.abs){ e.style.cssText=`left:${x}px;top:${y}px;transform:none;z-index:${o.z}`; } else { e.style.cssText=`left:${x}px;top:${y}px;z-index:${o.z??Math.round(y)}`; }
      if(o.it) e.dataset.interact=o.it; e.innerHTML=html; w.appendChild(e); return e; };
    add(SCENE.tree(),226,166); add(SCENE.tree('#7a9150'),34,322); add(SCENE.tree(),362,488); add(SCENE.tree('#7a9150'),30,548); add(SCENE.tree(),248,590);
    add(SCENE.bush,60,446); add(SCENE.bush,300,456); add(SCENE.bush,200,520);
    this.houseId_=Core.s.decor.house||'mushroom';
    this.houseEl=add(SCENE.houseOf(this.houseId_),112,258,{it:'home'});
    this.clockEl=add(SCENE.clock,196,262,{it:'clock'});
    this.stage_=Core.gardenStage(); this.gardenEl=add(SCENE.garden(this.stage_),175,398,{it:'garden',cls:'garden'});
    add(SCENE.penBack,272,236,{abs:1,z:240,it:'pets'});
    add(SCENE.penFront,268,386,{abs:1,z:404});
    this.bowlEl=add(SCENE.bowl,331,402,{it:'pets'});
    this.shopEl=add(SCENE.shop,334,82,{it:'shop'});
    const nov=document.createElement('div'); nov.className='night-ov';
    for(let i=0;i<36;i++){ const s=document.createElement('i'); s.className='star'; s.style.cssText=`left:${U.ri(120,1080)}px;top:${U.ri(300,520)}px;animation-delay:${Math.random()*2}s`; nov.appendChild(s); }
    w.appendChild(nov);
    this.bubG=this.mkBub('can'); this.bubP=this.mkBub('bowl');
    this.donkey=new Donkey({scale:.92,acc:Core.s.acc.on}); w.appendChild(this.donkey.el);
    this.mover=new Mover(150,305,120); this.donkey.pos(150,305);
    const R=(x0,y0,x1,y1)=>(x,y)=>x>=x0&&x<=x1&&y>=y0&&y<=y1;
    const blocks=[R(24,0,198,252),R(180,228,212,262),R(92,340,258,398),R(270,236,392,404),R(212,150,240,168),R(20,306,48,324),R(348,474,376,490),R(16,534,44,550),R(234,576,262,592)];
    this.G=Path.make(26,40,15,(x,y)=>y<124||x<6||x>384||y>594||blocks.some(b=>b(x,y)));
    this.pets={}; this.bind(); this.resize(); new ResizeObserver(()=>this.resize()).observe(st);
    setInterval(()=>this.wanderPets(),2600); },
  mkBub(icon){ const b=document.createElement('div'); b.className='need-bub card hide'; b.innerHTML=`${sv(IP[icon],20)}<b>!</b>`; this.world.appendChild(b); return b; },
  resize(){
    const W=this.stage.clientWidth, H=this.stage.clientHeight; if(!W||!H) return;
    /* Co giãn giữ trọn sân 390×600 trên cả điện thoại, iPad và màn lớn */
    const padTop=W>=700?68:84, padBot=W>=700?78:74, availH=Math.max(320,H-padTop-padBot);
    const s=this.sc=Math.min(W/390, availH/560, 1.48);
    this.offX=(W-390*s)/2;
    this.offY=padTop+(availH-560*s)/2-14*s;
    this.world.style.transform=`translate(${this.offX}px,${this.offY}px) scale(${s})`;
  },
  toWorld(cx,cy){ const r=this.stage.getBoundingClientRect(); return [(cx-r.left-this.offX)/this.sc,(cy-r.top-this.offY)/this.sc]; },
  bind(){ const st=this.stage;
    st.addEventListener('contextmenu',e=>e.preventDefault());
    st.addEventListener('pointerdown',e=>{ if(this.busy) return; e.preventDefault(); try{ st.setPointerCapture(e.pointerId); }catch(_){}
      const [x,y]=this.toWorld(e.clientX,e.clientY); const it=e.target.closest&&e.target.closest('[data-interact]');
      this.down={x0:e.clientX,y0:e.clientY,t:performance.now(),steer:false,obj:!!it,last:0};
      this.hideHint();
      if(it){ this.interact(it.dataset.interact); return; }
      this.moveTo(x,y,true); });
    st.addEventListener('pointermove',e=>{ const d=this.down; if(!d||d.obj||this.busy) return;
      const now=performance.now(); if(!d.steer && (Math.hypot(e.clientX-d.x0,e.clientY-d.y0)>10 || now-d.t>220)) d.steer=true;
      if(d.steer && now-d.last>70){ d.last=now; const [x,y]=this.toWorld(e.clientX,e.clientY); this.moveTo(x,y,false); this.steerDot(x,y); } });
    const up=()=>{ this.down=null; if(this.dot){ this.dot.remove(); this.dot=null; } };
    st.addEventListener('pointerup',up); st.addEventListener('pointercancel',up); },
  steerDot(x,y){ if(!this.dot){ this.dot=document.createElement('div'); this.dot.className='fx-steer'; this.world.appendChild(this.dot); } this.dot.style.left=x+'px'; this.dot.style.top=y+'px'; },
  moveTo(x,y,fx){ FX.unlock(); if(fx) FX.move(this.world,x,y); this.mover.go(Path.route(this.G,this.mover.x,this.mover.y,x,y)); },
  interact(k){ const o=this.OBJ[k]; if(!o) return; FX.lock(this.world,o.lx,o.ly,o.r);
    const go=()=>{ FX.unlock(true); this.mover.face(o.lx,o.ly); setTimeout(o.open,180); };
    const path=Path.route(this.G,this.mover.x,this.mover.y,o.x,o.y);
    if(Math.hypot(this.mover.x-o.x,this.mover.y-o.y)<14) { this.mover.stop(); go(); } else this.mover.go(path,go); },
  update(dt){ if(this.busy) return; const m=this.mover; m.update(dt); this.donkey.pos(m.x,m.y); this.donkey.setYaw(m.yaw); this.donkey.setWalk(m.moving); },
  refresh(){ const s=Core.s; if(!s||!this.world) return;
    this.world.classList.toggle('night',Core.isNight());
    const hid=s.decor.house||'mushroom'; if(hid!==this.houseId_){ this.houseId_=hid; this.houseEl.innerHTML=SCENE.houseOf(hid); }
    const st=Core.gardenStage(); if(st!==this.stage_ && !this.fxBusy){ this.stage_=st; this.gardenEl.innerHTML=SCENE.garden(st); }
    const g=this.gardenEl; g.classList.toggle('bloom',s.garden.health>=70&&st>=4); g.classList.toggle('wilt',s.garden.health<40);
    const n=Core.now(), hA=(n.getHours()%12+n.getMinutes()/60)*30, mA=n.getMinutes()*6;
    const h=document.getElementById('clkH'), mm=document.getElementById('clkM'); if(h){ h.setAttribute('transform',`rotate(${hA} 22 27)`); mm.setAttribute('transform',`rotate(${mA} 22 27)`); }
    const gw=Core.activeWin(DATA.GARDEN_WIN), mw=Core.activeWin(DATA.MEAL_WIN);
    this.showBub(this.bubG, gw && !s.garden.watered[s.day+'|'+gw.id], 175, 316);
    this.showBub(this.bubP, mw && !s.pets.fed[s.day+'|'+mw.id], 331, 372);
    this.bowlEl.querySelector('.food').style.display=Core.fedNow()?'':'none';
    if(!this.fxBusy) this.donkey.setMood(Core.mood());
    this.syncPets(); },
  showBub(b,on,x,y){ b.classList.toggle('hide',!on); if(on){ b.style.left=x+'px'; b.style.top=y+'px'; } },
  setAcc(){ this.donkey.setAcc(Core.s.acc.on); },
  syncPets(){ for(const id of Core.s.pets.owned){ const lv=Core.petLv(id), sc=DATA.PET_LV[lv].scale;
      if(!this.pets[id]){ const e=document.createElement('div'); e.className='pet'; e.dataset.interact='pets'; e.style.cursor='pointer';
        e.innerHTML=`<span class="pet-lv"></span><div class="pi"><div class="pf">${sv(IP[id],54,'0 0 50 40')}</div></div>`;
        const x=U.ri(292,372), y=U.ri(296,382); e.style.left=x+'px'; e.style.top=y+'px'; e.style.zIndex=y; this.world.appendChild(e); this.pets[id]={el:e,x,y,lv:-1}; }
      const p=this.pets[id]; if(p.lv!==lv){ p.lv=lv; p.el.style.setProperty('--s',sc); p.el.querySelector('.pet-lv').textContent='Lv'+(lv+1); } } },
  wanderPets(){ if(this.fxBusy) return; for(const id in this.pets){ if(Math.random()<.45) continue; const p=this.pets[id]; const x=U.ri(292,372), y=U.ri(296,382); this.movePet(p,x,y); } },
  movePet(p,x,y){ p.el.classList.toggle('flip',x>p.x); p.x=x; p.y=y; p.el.style.left=x+'px'; p.el.style.top=y+'px'; p.el.style.zIndex=y; },
  hearts(x,y,icon='heart',n=5){ for(let i=0;i<n;i++) setTimeout(()=>{ const h=document.createElement('div'); h.className='heart-pop'; h.style.left=(x+U.ri(-30,30))+'px'; h.style.top=(y+U.ri(-10,10))+'px'; h.innerHTML=sv(IP[icon],20); this.world.appendChild(h); setTimeout(()=>h.remove(),1300); },i*120); },
  label(x,y,html,z=7600){ const l=document.createElement('div'); l.className='lv-pop card'; l.style.cssText=`left:${x}px;top:${y}px;z-index:${z}`; l.innerHTML=html; this.world.appendChild(l); setTimeout(()=>l.remove(),2500); },
  waterFx(){ return new Promise(res=>{ this.fxBusy=true; this.donkey.setMood('happy');
    const w=this.world, can=document.createElement('div'); can.className='prop'; can.innerHTML=SCENE.can; can.style.left='70px'; can.style.top='292px'; w.appendChild(can);
    const dur=2200; can.animate([{transform:'translate(0,-30px) rotate(0)',opacity:0},{transform:'translate(10px,0) rotate(-28deg)',opacity:1,offset:.15},{transform:'translate(150px,4px) rotate(-36deg)',opacity:1,offset:.85},{transform:'translate(170px,-30px) rotate(0)',opacity:0}],{duration:dur,easing:'ease-in-out',fill:'forwards'});
    const t0=performance.now(); this.gardenEl.classList.add('drink');
    const iv=setInterval(()=>{ const k=(performance.now()-t0)/dur; if(k>.85){ clearInterval(iv); return; } if(k<.15) return;
      const sx=70+10+(k-.15)/.7*140+52, sy=300; for(let j=0;j<2;j++){ const d=document.createElement('div'); d.className='drop'; d.style.cssText=`left:${sx+U.ri(-4,4)}px;top:${sy+U.ri(0,6)}px;z-index:7000`; w.appendChild(d);
        d.animate([{transform:'translate(0,0)',opacity:1},{transform:`translate(${U.ri(-6,6)}px,${U.ri(48,66)}px)`,opacity:.9}],{duration:520,easing:'ease-in',fill:'forwards'}); setTimeout(()=>d.remove(),540);
        setTimeout(()=>{ const sp=document.createElement('div'); sp.className='splash'; sp.style.left=(sx+U.ri(-6,6))+'px'; sp.style.top=(sy+U.ri(52,64))+'px'; w.appendChild(sp); setTimeout(()=>sp.remove(),520); },500); } },70);
    setTimeout(()=>{ can.remove(); this.gardenEl.classList.remove('drink'); this.fxBusy=false; res(); },dur+80); }); },
  growFx(stage){ this.stage_=stage; const g=this.gardenEl; g.innerHTML=SCENE.garden(stage); g.classList.remove('grow-pop'); void g.offsetWidth; g.classList.add('grow-pop');
    setTimeout(()=>g.classList.remove('grow-pop'),1300); burstFx(this.world,175,350,14,'sparkle');
    this.label(175,330,`${sv(IP.sprout,16)} Cây đã lớn: ${DATA.GARDEN_STAGES[stage].name}!`); this.hearts(175,340,'flower',5); },
  feedFx(ups){ return new Promise(res=>{ this.fxBusy=true; this.donkey.setMood('happy'); const w=this.world;
    const bag=document.createElement('div'); bag.className='prop'; bag.innerHTML=SCENE.foodBag; bag.style.left='318px'; bag.style.top='326px'; w.appendChild(bag);
    bag.animate([{transform:'translate(0,-30px) rotate(0)',opacity:0},{transform:'translate(0,0) rotate(0)',opacity:1,offset:.2},{transform:'translate(4px,0) rotate(-120deg)',offset:.45},{transform:'translate(4px,0) rotate(-120deg)',offset:.8},{transform:'translate(0,-30px) rotate(0)',opacity:0}],{duration:1700,easing:'ease-in-out',fill:'forwards'});
    for(let i=0;i<16;i++) setTimeout(()=>{ const k=document.createElement('div'); k.className='kibble'; k.style.left=(326+U.ri(-3,3))+'px'; k.style.top='352px'; w.appendChild(k);
      k.animate([{transform:'translate(0,0)'},{transform:`translate(${U.ri(-10,10)}px,${U.ri(32,40)}px)`}],{duration:420,easing:'cubic-bezier(.5,0,1,1)',fill:'forwards'}); setTimeout(()=>k.remove(),900); },650+i*45);
    setTimeout(()=>{ this.bowlEl.querySelector('.food').style.display=''; const ids=Object.keys(this.pets);
      ids.forEach((id,i)=>{ const p=this.pets[id]; this.movePet(p,316+i*14-(ids.length-1)*7,388); setTimeout(()=>p.el.classList.add('eat'),2300); }); },1300);
    setTimeout(()=>{ Object.values(this.pets).forEach(p=>p.el.classList.remove('eat')); this.hearts(331,352,'heart',6);
      bag.remove(); this.syncPets();
      (ups||[]).forEach((u,i)=>setTimeout(()=>{ const p=this.pets[u.id]; if(!p) return; p.el.classList.remove('levelup'); void p.el.offsetWidth; p.el.classList.add('levelup');
        burstFx(w,p.x,p.y-20,12,'star'); this.label(p.x,p.y-34,`${sv(IP.levelup,14)} ${DATA.PETS[u.id].name} lớn rồi! Lv${u.lv+1} ${DATA.PET_LV[u.lv].name}`); },i*700));
      this.fxBusy=false; res(); },4200); }); },
  showHint(){ if(Core.s.seenHint) return; const h=this.hint=document.createElement('div'); h.className='hint card';
    h.innerHTML=`<b>Chạm đất</b> để đi • <b>giữ & rê</b> để lái • <b>chạm vật thể</b> (Nhà, Đồng hồ, Vườn, Pet, SHOP)`;
    document.getElementById('lobby').appendChild(h); },
  hideHint(){ if(this.hint){ this.hint.remove(); this.hint=null; Core.s.seenHint=true; Core.save(); } },
  async arrive(){ App.show('lobby'); this.resize(); this.busy=true; const m=this.mover; m.stop(); m.x=122; m.y=292; m.yaw=m.tyaw=0;
    this.donkey.pos(m.x,m.y); this.donkey.setWalk(false); await FX.teleport(this.world,m.x,m.y,this.donkey,'in'); this.busy=false; },
  async leave(){ this.busy=true; FX.unlock(); this.donkey.setWalk(false); await FX.teleport(this.world,this.mover.x,this.mover.y,this.donkey,'out'); }
};

/* =============================================================================
   HUD gọn sạch + Thanh điều hướng đáy
   ============================================================================= */
const HUD={
  init(){ const h=document.getElementById('hud');
    h.innerHTML=`<div class="hud-card card"><div class="avatar" id="hudAv"></div>
      <div class="grow col" style="gap:3px;min-width:0">
        <div class="row" style="gap:4px;justify-content:space-between">
          <span class="hud-name" id="hudName"></span>
          <span class="gem-pill" id="hudGemWrap" data-gem-anchor>${sv(IP.gem,16)}<b id="hudGem">0</b></span>
        </div>
        <div class="stat">${sv(IP.bolt,12)}<div class="bar"><i id="bE"></i></div><span class="v" id="vE"></span></div>
        <div class="stat">${sv(IP.heart,12)}<div class="bar rose"><i id="bH"></i></div><span class="v" id="vH"></span></div>
        <div class="stat">${sv(IP.phone,12)}<div class="bar mid" id="bSw"><i id="bS"></i></div><span class="v" id="vS"></span></div>
      </div></div>
      <div class="hud-r">
        <div class="row" style="gap:6px">
          <button class="icon-btn" id="btnReq" title="Bảng lời mời kết bạn">${sv(IP.user,22)}<span class="req-dot hide" id="reqDot">0</span></button>
          <button class="icon-btn" id="btnSet" title="Tài khoản & Cài đặt">${sv(IP.gear,24)}<span class="dot-on hide" id="cloudDot"></span></button>
        </div>
        <div class="clock-pill card" id="hudClock"></div>
        <span class="tag hide" id="hudBuff"></span>
        <span class="tag rose hud-check hide" id="hudCheck">${sv(IP.calendar,13)} Điểm danh</span>
      </div>`;
    this.av=new Donkey({scale:.56,tilt:-14,yaw:28,acc:Core.s.acc.on}); this.av.pos(25,46); document.getElementById('hudAv').appendChild(this.av.el);
    document.getElementById('btnReq').onclick=()=>openFriendRequests();
    document.getElementById('btnSet').onclick=()=>openSettings();
    document.getElementById('hudCheck').onclick=()=>Overlays.morning(Core.s.pendingMorning);
    document.getElementById('hudClock').onclick=()=>openUsageSettings('mode');
    const nav=document.getElementById('nav');
    nav.innerHTML=[['quest','Sức Khỏe','q'],['chat','Cộng Đồng','f'],['podium','Xếp Hạng','l'],['bag','Túi Đồ','b']].map(([i,t,f])=>`<button data-f="${f}">${sv(IP[i],26)}<span>${t}</span>${i==='quest'?'<span class="badge" id="qBadge"></span>':i==='chat'?'<span class="badge" id="fBadge" style="display:none"></span>':''}</button>`).join('');
    const F={q:()=>Nav.go('health','#tasks'),f:()=>openFriends(),l:()=>openLeaderboard(),b:()=>openBag()};
    nav.querySelectorAll('button').forEach(b=>b.onclick=()=>F[b.dataset.f]());
    const chip=this.chip=document.createElement('div'); chip.className='lock-chip card hide'; document.getElementById('lobby').appendChild(chip);
    chip.onclick=()=>Overlays.screen(true); },
  update(){ const s=Core.s; if(!s||!this.av) return; const $=id=>document.getElementById(id);
    $('hudName').textContent=s.name; $('hudGem').textContent=s.gems;
    $('bE').style.width=s.energy+'%'; $('vE').textContent=Math.round(s.energy)+'%';
    $('bH').style.width=s.happy+'%'; $('vH').textContent=Math.round(s.happy)+'%';
    const mode=s.block.mode||'apps';
    if(mode==='lockdown'){
      const rem=Core.screenRemaining(), lim=s.screen.limit+s.screen.extra;
      $('bS').style.width=U.clamp(rem/Math.max(1,lim)*100)+'%'; $('vS').textContent=rem>0?rem+'p':'Khóa'; $('bSw').classList.toggle('warn',rem<=20);
    } else if(mode==='groups'){
      const gs=s.block.groups||[], lk=gs.filter(g=>Core.groupUsed(g)>=g.limit+(s.screen.extra||0)).length;
      const pct=gs.length?((gs.length-lk)/gs.length*100):100;
      $('bS').style.width=U.clamp(pct)+'%'; $('vS').textContent=lk?lk+'kh':gs.length+'nh'; $('bSw').classList.toggle('warn',lk>0);
    } else {
      const apps=Core.activeAppEntries(), lk=apps.filter(a=>a.locked).length;
      const pct=apps.length?((apps.length-lk)/apps.length*100):100;
      $('bS').style.width=U.clamp(pct)+'%'; $('vS').textContent=lk?lk+'kh':apps.length+'app'; $('bSw').classList.toggle('warn',lk>0);
    }
    const n=Core.now(); $('hudClock').innerHTML=`${sv(Core.isNight()?IP.moon:IP.sun,15)}${U.hm(n)}`;
    const b=$('hudBuff'); if(Core.hasBuff()){ b.className='tag moss'; b.innerHTML=`${sv(IP.bolt,11)} +20% Gem`; } else if(Core.isTiredToday()){ b.className='tag rose'; b.textContent='Thiếu ngủ'; } else b.className='tag hide';
    $('hudCheck').classList.toggle('hide',!Core.canCheckIn()||Core.isBedtime());
    const dot=$('cloudDot'); if(dot) dot.classList.toggle('hide',!Cloud.online);
    const left=Core.todayQuests().length-Core.questCount(); const qb=$('qBadge'); qb.textContent=left; qb.style.display=left?'':'none';
    const fb=$('fBadge'); const pn=(typeof Cloud!=='undefined'&&Cloud.online)?Cloud.incomingIds.length:0;
    if(fb){ fb.textContent=pn; fb.style.display=pn?'':'none'; }
    const rd=$('reqDot'); if(rd){ rd.textContent=pn>9?'9+':pn; rd.classList.toggle('hide',!pn); }
    this.av.setMood(Core.mood());
    const lockTxt=(mode==='lockdown'&&s.screen.locked)?`${sv(IP.lock,15)} Hết giới hạn hằng ngày • Làm Quest +5 phút`
      :Core.hasAnyLimitLock()?`${sv(IP.lock,15)} Có app/nhóm đang khóa • Làm Quest +5 phút`
      :(Core.isBedtime()&&s.night.broken?`${sv(IP.moon,15)} Đang thức khuya quá ${s.sleep.bed}`:'');
    this.chip.classList.toggle('hide',!lockTxt); this.chip.innerHTML=lockTxt; },
  setAcc(){ if(this.av) this.av.setAcc(Core.s.acc.on); }
};

/* =============================================================================
   Vườn hoa & Thú cưng — kèm ƯU ĐÃI CHĂM SÓC (Giờ vàng • Chuỗi chăm sóc • Combo cả ngày)
   ============================================================================= */
function winRow(list,map){ return `<div class="win-row">${Core.winState(list,map).map(w=>`<span class="win ${w.st}">${w.label} ${w.from}h–${w.to}h${w.st==='done'?' ✓':w.st==='now'?' • ĐANG MỞ':''}</span>`).join('')}</div>`; }
function xpBar(xp,table,lv){ const cur=table[lv].xp, nxt=table[lv+1]; if(!nxt) return `${UI.bar(100)}<div class="muted">Đã đạt cấp tối đa!</div>`;
  return `${UI.bar((xp-cur)/(nxt.xp-cur)*100)}<div class="muted">${xp-cur}/${nxt.xp-cur} XP → <b>${nxt.name}</b></div>`; }
function careOfferHTML(winList){
  const c=Core.careStatus(), w=Core.activeWin(winList), gold=w&&Core.isGolden(w);
  return `<div class="offer-card card">
    <div class="row" style="margin-bottom:6px">${sv(IP.gift,20)}<b class="grow">Ưu đãi chăm sóc</b>${gold?`<span class="tag rose">${sv(IP.sparkle,11)} Giờ vàng +${DATA.CARE.goldenGem} Gem!</span>`:`<span class="tag moss">Chuỗi ${c.streak} ngày (×${c.mult.toFixed(1)})</span>`}</div>
    <div class="offer-list">
      <div class="offer-i"><span class="tag ${gold?'rose':''}">Giờ vàng</span><span>Chăm trong ${DATA.CARE.golden}' đầu khung giờ: <b>+${DATA.CARE.goldenGem} Gem</b></span></div>
      <div class="offer-i"><span class="tag moss">Chuỗi ×${c.mult.toFixed(1)}</span><span>Chăm đủ cả ngày tăng +${DATA.CARE.streakPct}% Gem/ngày (tối đa +${DATA.CARE.streakMax*DATA.CARE.streakPct}%)</span></div>
      <div class="offer-i"><span class="tag ${c.comboDone?'moss':'mid'}">Combo +${DATA.CARE.combo}</span><span>Tưới <b>${c.wDone}/${c.wTot}</b> + Cho ăn <b>${c.fDone}/${c.fTot}</b>${c.comboDone?' • <b>Đã nhận ✓</b>':''}</span></div>
    </div>
  </div>`;
}
function careToast(prefix,r){
  const extra=r.parts&&r.parts.length>1?` (${r.parts.map(p=>`${p[0]} +${p[1]}`).join(', ')})`:'';
  const cb=r.combo?` 🎉 Combo cả ngày +${r.combo} Gem!`:'';
  return `${prefix} +${r.gem} Gem${extra}${cb}`;
}

function openGarden(){ const sh=UI.sheet({title:'Vườn Hoa',icon:'flower'});
  const render=()=>{ const s=Core.s, hp=s.garden.health, st=hp>=70?['Tươi tốt','moss']:hp>=40?['Bình thường','']:['Đang héo nhẹ','rose'], stg=Core.gardenStage();
    sh.body.innerHTML=`<div class="card" style="padding:10px 12px;margin-bottom:10px"><div class="row"><b class="grow">${sv(IP.sprout,18)} Giai đoạn: ${DATA.GARDEN_STAGES[stg].name}</b><span class="tag ${st[1]}">${st[0]}</span></div>
      ${xpBar(s.garden.xp,DATA.GARDEN_STAGES,stg)}<div class="stage-strip">${DATA.GARDEN_STAGES.map((g,i)=>`<span class="${i<stg?'on':i===stg?'cur':''}">${g.name}</span>`).join('')}</div></div>
      <div class="row" style="margin-bottom:4px"><b class="grow">Sức sống</b><b>${Math.round(hp)}%</b></div>${UI.bar(hp,hp<40?'rose':'')}
      <div class="divider"></div><b>Khung giờ tưới cây đúng giờ</b>${winRow(DATA.GARDEN_WIN,s.garden.watered)}
      ${careOfferHTML(DATA.GARDEN_WIN)}
      <p class="muted" style="margin:6px 0 10px">Tưới đúng giờ: <b>+15 Gem</b> (nhân ưu đãi), <b>+25 XP lớn</b>. Quên tưới: hoa héo nhẹ (-15).</p>
      <button class="btn pri full big" data-a="water">${sv(IP.can,24)} Tưới cây</button>`;
    sh.body.querySelector('[data-a=water]').onclick=async()=>{ const r=Core.water(); if(!r.ok){ UI.toast(r.msg); return; }
      sh.close(); await Lobby.waterFx(); UI.toast(careToast('Hoa đã được tưới!',r)); if(r.stageUp) Lobby.growFx(r.stage); else Lobby.hearts(175,330,'flower',4); Lobby.refresh(); }; };
  render(); sh.track(Core.on('change',render)); }

function openPets(){ const sh=UI.sheet({title:'Khu Thú Cưng',icon:'paw'});
  const render=()=>{ const s=Core.s;
    sh.body.innerHTML=`<div class="row" style="margin-bottom:6px"><b class="grow">Độ vui của các bé</b><b>${Math.round(s.pets.happy)}%</b></div>${UI.bar(s.pets.happy,'rose')}
      <div class="divider"></div><b>Khung bữa ăn</b>${winRow(DATA.MEAL_WIN,s.pets.fed)}
      ${careOfferHTML(DATA.MEAL_WIN)}
      <p class="muted" style="margin:6px 0 8px">Cho ăn đúng bữa: <b>+10 Gem / mỗi bé</b> (nhân ưu đãi), <b>+20 XP lớn</b>.</p>
      <button class="btn pri full" data-a="feed">${sv(IP.bowl,22)} Cho cả đàn ăn</button><div class="divider"></div>
      <b>Các loài thú cưng</b><div class="grid2" style="margin-top:8px">${Object.entries(DATA.PETS).map(([id,p])=>{ const own=s.pets.owned.includes(id), lv=own?Core.petLv(id):0;
        return `<div class="pet-card card ${own?'':'tint-cream'}"><div style="${own?'':'filter:grayscale(1) opacity(.55)'};transform:scale(${own?DATA.PET_LV[lv].scale:1});transform-origin:50% 100%">${sv(IP[id],60,'0 0 50 40')}</div>${p.name}
          ${own?`<span class="tag moss">Lv${lv+1} • ${DATA.PET_LV[lv].name}</span><div style="width:100%;padding:0 6px">${xpBar(s.pets.xp[id]||0,DATA.PET_LV,lv)}</div>`:`<button class="btn sm rose" data-adopt="${id}">${sv(IP.gem,14)} ${p.price} • Nhận nuôi</button>`}</div>`; }).join('')}</div>`;
    sh.body.querySelector('[data-a=feed]').onclick=async()=>{ const r=Core.feed(); if(!r.ok){ UI.toast(r.msg); return; }
      sh.close(); await Lobby.feedFx(r.ups); UI.toast(careToast('Các bé ăn ngon lành!',r)); Lobby.refresh(); };
    sh.body.querySelectorAll('[data-adopt]').forEach(b=>b.onclick=()=>{ const r=Core.adopt(b.dataset.adopt); if(r.ok){ UI.toast(`Chào mừng ${DATA.PETS[b.dataset.adopt].name} về nhà!`); Lobby.refresh(); Lobby.hearts(331,340,'heart',6); } else UI.toast(r.msg); render(); }); };
  render(); sh.track(Core.on('change',render)); }

function goShop(){ const s=Core.s;
  if(s.block.mode==='lockdown' && s.screen.locked){ UI.toast('Khu giải trí đang khóa vì hết giới hạn hằng ngày. Làm 1 Quest để mở thêm 5 phút!'); Overlays.screen(true); return; }
  if(Core.isBedtime() && !s.night.broken){ Overlays.bed(true); return; }
  (async()=>{ await Lobby.leave(); Nav.go('fomo','',{tp:1}); })(); }

/* =============================================================================
   START SCREEN — Đăng nhập Google / Discord + tạo chú Lừa khởi đầu
   ============================================================================= */
const Start={
  render(onStart){ const el=document.getElementById('start'), s=Core.s; let acc='scarf';
    const meta=Cloud.online?Cloud.meta():null;
    const preName=(Cloud.profile&&Cloud.profile.name)||(meta&&meta.name)||'';
    const authCard=Cloud.online
      ?`<div class="row card tint-moss" style="padding:8px 10px;margin-bottom:10px">${avHTML(Cloud.profile||{avatar_url:meta&&meta.avatar},36)}<div class="grow" style="min-width:0"><b style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${U.esc(preName)}</b><span class="muted">Đã kết nối đám mây • ${U.esc((meta&&meta.provider)||'online')}</span></div><button class="btn sm" data-a="logout">${sv(IP.logout,15)}</button></div>`
      :`<div style="margin-bottom:10px">${oauthButtonsHTML()}${!Cloud.enabled?'<p class="muted center" style="margin-top:4px;font-size:11.5px">Chưa cấu hình config.js — vẫn có thể chơi ngoại tuyến</p>':''}</div>`;

    el.innerHTML=`<div class="start-wrap">
      <div class="start-hero">
        <div class="title"><h1>LỪA CHILL</h1><div class="sub">Healthy habits in a digital world</div><div class="sdg"><span class="tag mid">UN SDG 3</span><span class="tag moss">Sống khỏe thời số</span></div></div>
        <div class="scene" id="stScene"><div style="position:absolute;left:50%;top:6px;transform:translateX(-30%) scale(1.02)">${SCENE.houseOf(s&&s.decor?s.decor.house:'mushroom')}</div><div style="position:absolute;left:4%;top:118px">${SCENE.tree()}</div><div style="position:absolute;right:2%;top:148px">${SCENE.bush}</div></div>
      </div>
      <div class="form card">
        ${authCard}
        ${s?`<h2 class="txt-accent">Chào mừng trở lại, ${U.esc(s.name)}!</h2>
          <p class="muted">${sv(IP.gem,14)} ${s.gems} Gem • Ngủ ngon ${s.sleep.streak} ngày • Lịch ngủ ${s.sleep.bed} → ${s.sleep.wake}</p>
          <div class="row" style="margin-top:10px"><button class="btn grow" data-a="new">Chơi mới</button><button class="btn pri big grow" data-a="cont">TIẾP TỤC</button></div>`
        :`<label style="font-weight:800">Tên của bạn</label>
          <input class="inp" id="stName" maxlength="20" placeholder="VD: Minh Anh" value="${U.esc(preName)}" style="margin:4px 0 10px">
          <label style="font-weight:800">Phụ kiện khởi đầu cho chú Lừa</label>
          <div class="acc-pick" style="margin:6px 0 12px">${Object.entries(DATA.ACCS).map(([k,a])=>`<button data-acc="${k}" class="${k===acc?'on':''}">${sv(IP[k],30)}${a.name}</button>`).join('')}</div>
          <button class="btn pri big full" data-a="start">START GAME</button>`}
      </div>
    </div>`;
    fixAvatars(el);
    bindOAuth(el);
    const dk=new Donkey({scale:1.7,tilt:-16,yaw:22,acc:s?s.acc.on:[acc],mood:'happy',cls:'wave'}); dk.pos(118,256); el.querySelector('#stScene').appendChild(dk.el);
    el.querySelectorAll('[data-acc]').forEach(b=>b.onclick=()=>{ acc=b.dataset.acc; el.querySelectorAll('[data-acc]').forEach(x=>x.classList.toggle('on',x===b)); dk.setAcc([acc]); });
    const lo=el.querySelector('[data-a=logout]'); if(lo) lo.onclick=()=>{ Cloud.signOut(); this.render(onStart); };
    const st=el.querySelector('[data-a=start]'); if(st) st.onclick=()=>{ const n=(el.querySelector('#stName').value||'').trim()||'Bạn Lừa'; Core.newGame(n,acc); if(Cloud.online) Cloud.push(); onStart(); };
    const ct=el.querySelector('[data-a=cont]'); if(ct) ct.onclick=()=>onStart();
    const nw=el.querySelector('[data-a=new]'); if(nw) nw.onclick=()=>{ UI.confirm({
      title:'Bắt đầu lại từ đầu?',
      body:'Dữ liệu lưu trên thiết bị này sẽ bị xóa để tạo chú Lừa mới.',
      okLabel:'Chơi mới', okCls:'rose',
      onOk:()=>{ Store.clear(); Core.state=null; this.render(onStart); }
    }); };
    App.show('start'); }
};
