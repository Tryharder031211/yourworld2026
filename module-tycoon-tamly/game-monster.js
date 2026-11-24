/* =============================================================================
   module-tycoon-tamly/game-monster.js — Minigame 2: QUÁI VẬT ĂN THỊT FOMO.
   Chú lừa (Tap-to-Move / Hold-to-Steer theo trục ngang) gom thói quen tốt rơi xuống và NÉ các
   "mồi FOMO" (thông báo, sale sốc, trend...). Mỗi mồi FOMO bắt phải sẽ nuôi Quái vật lớn thêm;
   thanh FOMO đầy 100% là Quái vật nuốt mất thời gian của bạn. Trụ 45 giây để thắng.
   ============================================================================= */
'use strict';
const MonsterGame={
  W:390,H:560,GROUND:525,DUR:45,
  GOOD:[{ic:'glass',t:'Uống nước'},{ic:'book',t:'Đọc sách'},{ic:'run',t:'Vận động'},{ic:'moon',t:'Ngủ sớm'},{ic:'grass',t:'Chạm cỏ'},{ic:'heart',t:'Gặp bạn bè'},{ic:'sprout',t:'Tưới cây'}],
  BAD:['Sale 90%!','99+ thông báo','Trend mới!!','Bạn bè đang online','Flash sale 0đ','Livestream hot','Ai cũng có rồi','Còn 2 suất cuối'],
  init(){ const el=this.el=document.getElementById('monster'); if(!el) return; Object.assign(this,{items:[],pops:[],meter:0,chomp:0,t:0,score:0,playing:false});
    el.innerHTML=`<div class="mon-hud card"><div class="row"><button class="icon-btn" data-a="back" style="width:34px;height:34px;border-radius:10px">${sv(IP.back,20)}</button>
        <b class="grow txt-accent" style="font-size:15px">Quái Vật Ăn Thịt FOMO</b><span class="tag">${sv(IP.clock,13)} <b id="mnT">45</b>s</span><span class="tag moss">${sv(IP.star,13)} <b id="mnS">0</b></span></div>
        <div class="row" style="margin-top:5px;gap:6px"><b style="font-size:11px">${sv(IP.notif,14)} FOMO</b><div class="bar grow" style="height:11px"><i id="mnB" style="width:0"></i></div><b id="mnP" style="font-size:11px;width:34px;text-align:right">0%</b></div></div>
      <div class="mon-stage" id="mnStage"><div class="world" id="mnW"><canvas id="mnC"></canvas></div></div>`;
    this.stage=el.querySelector('#mnStage'); this.world=el.querySelector('#mnW'); this.cv=el.querySelector('#mnC'); this.ctx=this.cv.getContext('2d');
    this.imgs={}; for(const g of this.GOOD) this.imgs[g.ic]=toImg(sv(IP[g.ic],48)); this.imgs.fire=toImg(sv(IP.fire,40)); this.imgs.notif=toImg(sv(IP.notif,40));
    this.dk=new Donkey({scale:.95,tilt:-18,acc:Core.s.acc.on,mood:'normal'}); this.world.appendChild(this.dk.el);
    this.mv=new Mover(195,this.GROUND,190); this.dk.pos(195,this.GROUND);
    el.querySelector('[data-a=back]').onclick=()=>{ this.playing=false; App.show('hub'); Hub.resize(); if(Hub.dk) Hub.dk.el.classList.remove('tp-out','tp-in'); };
    this.bind(); new ResizeObserver(()=>this.resize()).observe(this.stage); },
  resize(){ const W=this.stage.clientWidth, H=this.stage.clientHeight; if(!W||!H) return; const s=this.sc=Math.min(W/this.W,H/this.H); this.ox=(W-this.W*s)/2; this.oy=(H-this.H*s)/2;
    this.world.style.transform=`translate(${this.ox}px,${this.oy}px) scale(${s})`; const r=Math.min(3,(window.devicePixelRatio||1)*s);
    if(this.cv.width!==Math.round(this.W*r)){ this.cv.width=Math.round(this.W*r); this.cv.height=Math.round(this.H*r); this.cv.style.width=this.W+'px'; this.cv.style.height=this.H+'px'; this.ctx.setTransform(r,0,0,r,0,0); }
    this.draw(); },
  toWorld(cx,cy){ const r=this.stage.getBoundingClientRect(); return [(cx-r.left-this.ox)/this.sc,(cy-r.top-this.oy)/this.sc]; },
  bind(){ const st=this.stage; st.addEventListener('contextmenu',e=>e.preventDefault());
    const go=(e,fx)=>{ const [x]=this.toWorld(e.clientX,e.clientY); const tx=U.clamp(x,28,this.W-28); if(fx) FX.move(this.world,tx,this.GROUND); this.mv.go([[tx,this.GROUND]]); };
    st.addEventListener('pointerdown',e=>{ if(!this.playing) return; e.preventDefault(); try{ st.setPointerCapture(e.pointerId); }catch(_){} this.down=true; go(e,true); });
    st.addEventListener('pointermove',e=>{ if(this.down&&this.playing) go(e,false); });
    const up=()=>{ this.down=false; }; st.addEventListener('pointerup',up); st.addEventListener('pointercancel',up); },
  open(){ App.show('monster'); this.resize(); this.dk.setAcc(Core.s.acc.on); this.reset(); this.draw();
    const m=UI.modal(`<div class="center">${sv(IP.monster,90)}<h2 class="txt-accent">Quái Vật Ăn Thịt FOMO</h2>
      <p style="font-weight:700;margin:6px 0">Chạm / giữ & rê để chú lừa chạy ngang.</p>
      <div class="grid2" style="text-align:left;margin:8px 0"><div class="card tint-active" style="padding:8px"><b>GOM thói quen tốt</b><div class="muted">Nước, sách, vận động, ngủ sớm... +10 điểm & làm Quái vật teo lại</div></div>
      <div class="card tint-rose" style="padding:8px"><b>NÉ mồi FOMO</b><div class="muted">Thông báo, sale sốc, trend... bắt phải là Quái vật lớn thêm!</div></div></div>
      <p class="muted">Trụ ${this.DUR} giây mà thanh FOMO chưa đầy là THẮNG. Kỷ lục: <b>${Core.s.monster.best}</b></p>
      <button class="btn pri big full" data-a="go" style="margin-top:8px">Bắt đầu!</button></div>`,{dismiss:false});
    m.box.querySelector('[data-a=go]').onclick=()=>{ m.close(); this.playing=true; }; },
  reset(){ Object.assign(this,{t:0,score:0,meter:0,items:[],spawnT:.6,playing:false,caught:0,dodged:0,chomp:0,pops:[]}); this.mv.x=195; this.mv.stop(); this.hud(); },
  hud(){ const $=id=>document.getElementById(id); if(!$('mnT')) return; $('mnT').textContent=Math.max(0,Math.ceil(this.DUR-this.t)); $('mnS').textContent=this.score; $('mnB').style.width=this.meter+'%'; $('mnP').textContent=Math.round(this.meter)+'%'; },
  spawn(){ const k=this.t/this.DUR, bad=Math.random()<.5+k*.15;
    const it={x:U.rand(30,this.W-30),y:120,vy:U.rand(95,130)*(1+k*1.1),bad,wob:Math.random()*6};
    if(bad){ it.text=U.pick(this.BAD); it.ic=Math.random()<.5?'fire':'notif'; } else Object.assign(it,U.pick(this.GOOD));
    this.items.push(it); },
  update(dt){ if(!this.dk) return; const m=this.mv; m.update(dt); this.dk.pos(m.x,this.GROUND);
    this.dk.setYaw(m.moving?(m.path.length&&m.path[0][0]>m.x?90:-90):0); this.dk.setWalk(m.moving);
    this.dk.setMood(this.meter>70?'sad':this.meter>40?'normal':'happy');
    if(!this.playing){ this.draw(); return; }
    if(document.querySelector('.ov.on,.sheet-wrap')){ this.draw(); return; }
    this.t+=dt; this.spawnT-=dt; if(this.spawnT<=0){ this.spawn(); this.spawnT=U.rand(.45,.8)*(1-this.t/this.DUR*.45); }
    this.meter=U.clamp(this.meter-dt*.8); this.chomp=Math.max(0,this.chomp-dt*2);
    for(const it of this.items){ it.y+=it.vy*dt; it.x+=Math.sin((this.t+it.wob)*3)*20*dt;
      if(!it.done && Math.abs(it.x-m.x)<36 && Math.abs(it.y-(this.GROUND-30))<32){ it.done=true;
        if(it.bad){ this.meter=U.clamp(this.meter+18); this.chomp=1; this.pop(it.x,it.y,'+18 FOMO',C.rb); }
        else { this.score+=10; this.caught++; this.meter=U.clamp(this.meter-8); this.pop(it.x,it.y,'+10 '+it.t,C.mg); } }
      if(!it.done && it.y>this.H+20){ it.done=true; if(it.bad) this.dodged++; } }
    this.items=this.items.filter(i=>!i.done); this.pops=this.pops.filter(p=>(p.t-=dt)>0);
    this.hud(); this.draw();
    if(this.meter>=100) this.end(false); else if(this.t>=this.DUR) this.end(true); },
  pop(x,y,text,color){ this.pops.push({x,y,text,color,t:1}); },
  end(win){ this.playing=false; const score=this.score+(win?50:0), gem=Math.max(5,Math.min(80,Math.round(score/4))+(win?10:0));
    Core.finishMonster(score,gem);
    const m=UI.modal(`<div class="center">${win?sv(IP.trophy,72):sv(IP.monster,90)}<h2 class="${win?'txt-accent':'txt-danger'}">${win?'Bạn đã thắng FOMO!':'Quái vật FOMO đã nuốt mất thời gian của bạn!'}</h2>
      <p style="font-weight:700;margin:6px 0">Gom <b>${this.caught}</b> thói quen tốt • Né <b>${this.dodged}</b> mồi FOMO • Điểm <b>${score}</b></p>
      <p class="muted">${win?'Bình tĩnh trước thông báo & sale sốc giúp bạn giữ được thời gian cho điều quan trọng.':'Mỗi thông báo, mỗi "sale sốc" đều cố kéo sự chú ý của bạn. Thử tắt bớt thông báo nhé!'}</p>
      <div class="row" style="margin-top:10px"><button class="btn grow" data-a="hub">Về khu giải trí</button><button class="btn pri grow" data-a="again">Chơi lại</button></div>
      <p class="muted" style="margin-top:6px">+${gem} Gem đã cộng vào ví</p></div>`,{dismiss:false});
    m.box.querySelector('[data-a=hub]').onclick=()=>{ m.close(); App.show('hub'); Hub.resize(); if(Hub.dk) Hub.dk.el.classList.remove('tp-out','tp-in'); };
    m.box.querySelector('[data-a=again]').onclick=()=>{ m.close(); this.open(); }; },
  draw(){ const c=this.ctx; if(!c) return; const t=performance.now()/1000, W=this.W, H=this.H;
    c.clearRect(0,0,W,H);
    const g=c.createLinearGradient(0,0,0,H); g.addColorStop(0,'#105666'); g.addColorStop(1,'#1d4f3c'); c.fillStyle=g; c.fillRect(0,0,W,H);
    c.fillStyle='#F7F4D555'; for(let i=0;i<24;i++){ const x=(i*67)%W, y=(i*131)%(H*.6); c.fillRect(x,y,2,2); }
    c.fillStyle=C.mg; c.strokeStyle=C.dg; c.lineWidth=3; c.beginPath(); c.moveTo(0,this.GROUND+4); for(let x=0;x<=W;x+=30) c.quadraticCurveTo(x+15,this.GROUND-2,x+30,this.GROUND+4); c.lineTo(W,H); c.lineTo(0,H); c.closePath(); c.fill(); c.stroke();
    /* Quái vật FOMO */
    const k=this.meter/100, R=36+k*70, mx=W/2+Math.sin(t*1.3)*10, my=70+k*40, col=k>.6?C.rb:C.mg;
    c.save(); c.translate(mx,my); c.fillStyle=col; c.strokeStyle=C.dg; c.lineWidth=3.5; c.beginPath();
    for(let a=0;a<=Math.PI*2+.01;a+=Math.PI/14){ const rr=R*(1+.06*Math.sin(a*5+t*4)); c.lineTo(Math.cos(a)*rr,Math.sin(a)*rr*.85); } c.closePath(); c.fill(); c.stroke();
    const eo=R*.38; for(const s of [-1,1]){ c.fillStyle='#fff'; c.beginPath(); c.arc(s*eo,-R*.25,R*.2,0,7); c.fill(); c.stroke(); c.fillStyle=C.dg; c.beginPath(); c.arc(s*eo+Math.sin(t*2)*2,-R*.22,R*.09,0,7); c.fill(); }
    const mo=R*(.18+.22*this.chomp+.05*Math.sin(t*6)); c.fillStyle=C.dg; c.beginPath(); c.ellipse(0,R*.3,R*.5,mo,0,0,Math.PI*2); c.fill();
    c.fillStyle='#fff'; for(let i=-2;i<=2;i++){ c.beginPath(); c.moveTo(i*R*.18-R*.07,R*.3-mo*.9); c.lineTo(i*R*.18,R*.3-mo*.3); c.lineTo(i*R*.18+R*.07,R*.3-mo*.9); c.fill(); }
    c.restore();
    c.font='800 12px "Baloo 2",sans-serif'; c.textAlign='center'; c.fillStyle=C.bg; c.fillText(this.meter>70?'NOM NOM... ĐÓI QUÁ!':'Quái vật FOMO',mx,my+R*.85+16);
    /* vật phẩm rơi */
    for(const it of this.items){ if(it.bad){ c.font='800 12px "Baloo 2",sans-serif'; const tw=c.measureText(it.text).width+34, x=it.x-tw/2, y=it.y-15;
        c.fillStyle='#ecc9c2'; c.strokeStyle=C.dg; c.lineWidth=2.5; c.beginPath(); c.roundRect?c.roundRect(x,y,tw,30,12):c.rect(x,y,tw,30); c.fill(); c.stroke();
        const im=this.imgs[it.ic]; if(im&&im.complete) c.drawImage(im,x+4,y+4,22,22); c.fillStyle='#7a3b33'; c.textAlign='left'; c.fillText(it.text,x+28,y+20); }
      else { c.fillStyle=C.bg; c.strokeStyle=C.mg; c.lineWidth=4; c.beginPath(); c.arc(it.x,it.y,21,0,7); c.fill(); c.stroke(); c.strokeStyle=C.dg; c.lineWidth=2; c.stroke();
        const im=this.imgs[it.ic]; if(im&&im.complete) c.drawImage(im,it.x-15,it.y-15,30,30); } }
    c.textAlign='center'; for(const p of this.pops){ c.globalAlpha=p.t; c.font='800 14px "Baloo 2",sans-serif'; c.lineWidth=3; c.strokeStyle=C.bg; c.strokeText(p.text,p.x,p.y-(1-p.t)*40); c.fillStyle=p.color==='#D3968C'?'#a5584c':C.dg; c.fillText(p.text,p.x,p.y-(1-p.t)*40); } c.globalAlpha=1; }
};
