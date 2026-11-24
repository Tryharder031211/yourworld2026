/* module-tycoon-tamly/room-decor.js — Phòng Isometric 2.5D mở rộng 5 phòng (Ngủ • Khách • Bếp • Tắm • Gaming),
   22 đồ nội thất vẽ tay, chọn ngoại hình 6 mẫu nhà bên ngoài, sơn tường & sàn nhà. */
'use strict';
const ISO={tw:52,th:26,ox:195,oy:120,H:104,p(gx,gy,z=0){ return [this.ox+(gx-gy)*this.tw/2,this.oy+(gx+gy)*this.th/2-z]; }};
const pp=pts=>pts.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ');
const poly=(pts,f,ex='')=>`<polygon points="${pp(pts)}" fill="${f}" ${ex}/>`;
function prism(x,y,w,d,z,h,c){ const P=(a,b,zz)=>ISO.p(a,b,zz);
  const A=P(x,y,z+h),B=P(x+w,y,z+h),Cc=P(x+w,y+d,z+h),D=P(x,y+d,z+h),Bb=P(x+w,y,z),Cb=P(x+w,y+d,z),Db=P(x,y+d,z);
  return poly([Db,Cb,Cc,D],shade(c,-.12))+poly([Cb,Bb,B,Cc],shade(c,-.26))+poly([A,B,Cc,D],shade(c,.1)); }
function mkL(gx,gy,rot){ const T=(u,v)=>rot?[gx+v,gy+u]:[gx+u,gy+v];
  return { pt(u,v,z=0){ const [a,b]=T(u,v); return ISO.p(a,b,z); },
    prism(u,v,uw,vd,z,h,c){ return rot?prism(gx+v,gy+u,vd,uw,z,h,c):prism(gx+u,gy+v,uw,vd,z,h,c); } }; }

const ITEM_DRAW={
  /* Phòng ngủ */
  bed:L=>L.prism(.06,0,.88,.14,0,36,C.wood)+L.prism(.06,.1,.88,1.84,0,12,C.wood)+L.prism(.1,.14,.8,1.76,12,7,'#ffffff')+L.prism(.18,.2,.64,.38,19,5,C.bg)+L.prism(.1,.8,.8,1.1,19,3,C.rb),
  desk:L=>[[.1,.15],[.82,.15],[.1,.77],[.82,.77]].map(([u,v])=>L.prism(u,v,.08,.08,0,26,'#9c7a58')).join('')+L.prism(.05,.1,.9,.8,26,4,C.wood)+L.prism(.15,.2,.35,.25,30,5,C.mn)+L.prism(.18,.22,.3,.22,35,4,C.rb)+L.prism(.6,.5,.2,.2,30,7,C.rbl)+(()=>{ const [x,y]=L.pt(.7,.6,44); return `<circle cx="${x}" cy="${y}" r="6" fill="${C.mg}"/>`; })(),
  wardrobe:L=>{ const a=L.pt(.5,.85,4), b=L.pt(.5,.85,70), k1=L.pt(.42,.85,38), k2=L.pt(.58,.85,38);
    return L.prism(.08,.2,.84,.65,0,72,C.mnl)+L.prism(.04,.16,.92,.73,72,5,shade(C.mn,.25))+`<path d="M${a} L${b}" stroke-width="1.8"/><circle cx="${k1[0]}" cy="${k1[1]}" r="1.8" fill="${C.dg}"/><circle cx="${k2[0]}" cy="${k2[1]}" r="1.8" fill="${C.dg}"/>`; },
  lamp:L=>{ const [bx,by]=L.pt(.5,.5,38), [tx,ty]=L.pt(.5,.5,54), [px,py]=L.pt(.5,.5,3);
    return L.prism(.36,.36,.28,.28,0,3,C.mn)+`<path d="M${px} ${py}L${bx} ${by}" stroke-width="2.6"/><ellipse cx="${bx}" cy="${by+4}" rx="16" ry="6" fill="${C.yl}" opacity=".45" stroke="none"/>`+poly([[bx-12,by],[bx+12,by],[tx+6,ty],[tx-6,ty]],C.bg); },

  /* Phòng khách */
  sofa:L=>L.prism(.06,.14,1.88,.76,0,10,C.wood)+L.prism(.08,.18,1.84,.68,10,10,C.mg)+L.prism(.06,.12,1.88,.22,18,22,shade(C.mg,-.08))+L.prism(.04,.16,.2,.72,10,20,shade(C.mg,-.12))+L.prism(1.76,.16,.2,.72,10,20,shade(C.mg,-.12))+L.prism(.3,.34,.36,.26,20,10,C.rb)+L.prism(1.32,.34,.36,.26,20,10,C.bg),
  tv:L=>{ const [sx,sy]=L.pt(1,.44,44);
    return L.prism(.08,.22,1.84,.58,0,20,C.wood)+L.prism(.14,.28,.75,.48,4,12,C.bg)+L.prism(1.1,.28,.75,.48,4,12,C.bg)+L.prism(.82,.42,.36,.16,20,8,C.dg)+L.prism(.24,.36,1.52,.14,28,36,C.dg)+L.prism(.32,.46,1.36,.06,32,28,C.mn)+`<circle cx="${sx}" cy="${sy}" r="4" fill="${C.yl}" stroke="none"/><path d="M${sx-10} ${sy+4}q10-8 20 0" stroke="${C.mgl}" stroke-width="1.8"/>`; },
  ctable:L=>{ const [cx,cy]=L.pt(.5,.5,22);
    return [[.14,.14],[.78,.14],[.14,.78],[.78,.78]].map(([u,v])=>L.prism(u,v,.08,.08,0,16,'#9c7a58')).join('')+L.prism(.08,.08,.84,.84,16,4,C.wood)+`<ellipse cx="${cx}" cy="${cy}" rx="6" ry="3.2" fill="#fff"/><circle cx="${cx}" cy="${cy-3}" r="3.2" fill="${C.rb}"/>`; },
  shelf:L=>{ let s=L.prism(.1,.3,.8,.45,0,62,C.wood); const cols=[C.rb,C.mn,C.yl,C.mg,C.rbl];
    for(const z0 of [3,19,35,49]){ for(let i=0;i<5;i++){ const u=.15+i*.14; if((i+z0)%7===3) continue; s+=poly([L.pt(u,.76,z0),L.pt(u+.1,.76,z0),L.pt(u+.1,.76,z0+11),L.pt(u,.76,z0+11)],cols[(i+z0)%5],'stroke-width="1.1"'); } }
    for(const z of [17,33,47]){ const a=L.pt(.1,.75,z), b=L.pt(.9,.75,z); s+=`<path d="M${a} L${b}" stroke-width="2"/>`; } return s; },
  plant:L=>{ const [x,y]=L.pt(.5,.5,30); return L.prism(.3,.3,.4,.4,0,14,C.rb)+`<path d="M${x} ${y+14}V${y-2}" stroke-width="2"/><ellipse cx="${x-7}" cy="${y+2}" rx="8" ry="5" fill="${C.mg}" transform="rotate(-25 ${x-7} ${y+2})"/><ellipse cx="${x+7}" cy="${y}" rx="8" ry="5" fill="#6f8748" transform="rotate(25 ${x+7} ${y})"/><ellipse cx="${x}" cy="${y-8}" rx="6" ry="9" fill="${C.mg}"/>`; },
  beanbag:L=>{ const [x,y]=L.pt(.5,.5,0); return `<path d="M${x-20} ${y}C${x-24} ${y-28} ${x+22} ${y-30} ${x+20} ${y}C${x+16} ${y+10} ${x-16} ${y+10} ${x-20} ${y}Z" fill="${C.mg}"/><path d="M${x-10} ${y-10}c4 4 12 4 16 0" stroke-width="1.6"/><path d="M${x-12} ${y-18}c3-3 7-4 10-4" stroke="#fff" opacity=".6" stroke-width="2"/>`; },
  rug:L=>{ const [x,y]=L.pt(1,1,0); return `<ellipse cx="${x}" cy="${y}" rx="${ISO.tw*.88}" ry="${ISO.th*.88}" fill="${C.rb}"/><ellipse cx="${x}" cy="${y}" rx="${ISO.tw*.58}" ry="${ISO.th*.58}" fill="${C.bg}" stroke-dasharray="4 3"/><ellipse cx="${x}" cy="${y}" rx="${ISO.tw*.25}" ry="${ISO.th*.25}" fill="${C.rbl}"/>`; },
  tank:L=>{ const [x,y]=L.pt(.5,.8,30); return L.prism(.1,.25,.8,.55,0,18,C.wood)+`<g opacity=".85">${L.prism(.12,.27,.76,.51,18,24,'#a8d5cf')}</g><ellipse cx="${x}" cy="${y}" rx="4.5" ry="3" fill="${C.rb}"/><path d="M${x+4} ${y}l5-3v6z" fill="${C.rb}" stroke-width="1.2"/><path d="M${x-12} ${y-4}h.1M${x-8} ${y-9}h.1" stroke="#fff" stroke-width="2.2"/>`; },

  /* Nhà bếp */
  fridge:L=>{ const d1=L.pt(.14,.86,44), d2=L.pt(.86,.86,44), h1=L.pt(.24,.88,54), h2=L.pt(.24,.88,30), mg=L.pt(.62,.88,58);
    return L.prism(.12,.14,.76,.72,0,72,'#f7f4e6')+L.prism(.12,.14,.76,.72,72,3,C.mnl)+`<path d="M${d1} L${d2}" stroke-width="2"/><path d="M${h1[0]} ${h1[1]-6}v12M${h2[0]} ${h2[1]-8}v16" stroke-width="2.4"/><circle cx="${mg[0]}" cy="${mg[1]}" r="3" fill="${C.rb}"/>`; },
  stove:L=>{ const [p1x,p1y]=L.pt(.48,.5,34), [p2x,p2y]=L.pt(1.38,.5,36);
    return L.prism(.06,.16,1.88,.68,0,28,C.bg)+L.prism(.04,.14,1.92,.72,28,4,C.wood)+L.prism(.16,.82,.72,.04,6,18,C.mn)+L.prism(1.06,.82,.76,.04,6,18,C.rbl)+`<ellipse cx="${p1x}" cy="${p1y}" rx="8" ry="4" fill="${C.dg}"/><ellipse cx="${p1x}" cy="${p1y-4}" rx="7" ry="4" fill="${C.rb}"/><rect x="${p2x-9}" y="${p2y-4}" width="18" height="8" rx="2" fill="${C.mgl}"/>`; },
  dtable:L=>{ const [a,b]=L.pt(.5,.55,31), [c,d]=L.pt(.5,1.4,31);
    return [[.12,.12],[.8,.12],[.12,1.76],[.8,1.76]].map(([u,v])=>L.prism(u,v,.09,.09,0,25,'#9c7a58')).join('')+L.prism(.06,.06,.88,1.88,25,4,C.wood)+L.prism(.26,.06,.48,1.88,29,1,C.rbl)+`<ellipse cx="${a}" cy="${b}" rx="6" ry="3.2" fill="#fff"/><ellipse cx="${c}" cy="${d}" rx="6" ry="3.2" fill="#fff"/>`; },

  /* Phòng tắm */
  tub:L=>{ const [dx,dy]=L.pt(1.35,.52,24), [b1x,b1y]=L.pt(.65,.48,24), [b2x,b2y]=L.pt(.95,.54,25);
    return L.prism(.08,.16,1.84,.68,0,24,'#ffffff')+L.prism(.18,.24,1.64,.52,18,6,C.mnl)+`<circle cx="${b1x}" cy="${b1y}" r="5.5" fill="#fff"/><circle cx="${b1x+8}" cy="${b1y-3}" r="4.5" fill="#fff"/><circle cx="${b2x}" cy="${b2y}" r="5" fill="#fff"/><circle cx="${dx}" cy="${dy-2}" r="4" fill="${C.yl}"/><circle cx="${dx+3}" cy="${dy-5}" r="2.6" fill="${C.yl}"/>`; },
  sink:L=>{ const [mx,my]=L.pt(.5,.18,52), [fx,fy]=L.pt(.5,.36,36);
    return L.prism(.14,.22,.72,.6,0,26,C.mnl)+L.prism(.1,.2,.8,.64,26,5,'#fff')+L.prism(.24,.32,.52,.38,29,3,C.mnl)+`<path d="M${fx} ${fy}v-6c0-3 4-3 4 0" stroke-width="2"/><ellipse cx="${mx}" cy="${my}" rx="11" ry="13" fill="#dff0f2"/><path d="M${mx-4} ${my-5}l5-5" stroke="#fff" stroke-width="1.8"/>`; },
  toilet:L=>L.prism(.24,.12,.52,.26,12,26,'#ffffff')+L.prism(.26,.34,.48,.46,0,15,'#ffffff')+L.prism(.28,.36,.44,.42,15,3,C.mnl),

  /* Phòng chơi game */
  pc:L=>{ const [m1x,m1y]=L.pt(.65,.34,44), [m2x,m2y]=L.pt(1.25,.34,44);
    return [[.08,.16],[1.84,.16],[.08,.76],[1.84,.76]].map(([u,v])=>L.prism(u,v,.08,.08,0,26,C.dg)).join('')+L.prism(.04,.12,1.92,.76,26,4,C.mn)+L.prism(.12,.22,.36,.52,30,22,C.dg)+L.prism(.14,.72,.32,.04,34,14,C.mg)+L.prism(.54,.24,.66,.12,30,24,C.dg)+L.prism(1.22,.24,.58,.12,30,22,C.dg)+L.prism(.6,.54,.68,.2,30,3,C.bg)+`<circle cx="${m1x}" cy="${m1y}" r="4.5" fill="${C.mg}" stroke="none"/><circle cx="${m2x}" cy="${m2y}" r="4" fill="${C.rb}" stroke="none"/>`; },
  gchair:L=>L.prism(.36,.36,.28,.28,0,10,C.dg)+L.prism(.16,.24,.68,.6,10,7,C.rb)+L.prism(.18,.18,.64,.16,17,32,C.dg)+L.prism(.26,.22,.48,.12,22,22,C.rb)+L.prism(.14,.28,.12,.48,14,10,C.dg)+L.prism(.74,.28,.12,.48,14,10,C.dg),
  arcade:L=>{ const [sx,sy]=L.pt(.5,.56,48);
    return L.prism(.14,.18,.72,.64,0,34,C.mn)+L.prism(.14,.18,.72,.44,34,34,C.mn)+L.prism(.14,.58,.72,.28,32,6,C.rb)+L.prism(.2,.58,.6,.06,40,22,C.dg)+`<circle cx="${sx}" cy="${sy}" r="5" fill="${C.yl}" stroke="none"/><circle cx="${sx+8}" cy="${sy+12}" r="2.2" fill="${C.mg}"/><circle cx="${sx-8}" cy="${sy+12}" r="2.2" fill="${C.bg}"/>`; },
  guitar:L=>{ const [x,y]=L.pt(.5,.55,0); return `<path d="M${x} ${y-30}L${x+7} ${y-64}" stroke-width="5"/><path d="M${x} ${y-30}L${x+7} ${y-64}" stroke="${C.wood}" stroke-width="2"/><rect x="${x+3}" y="${y-72}" width="8" height="9" rx="2" fill="${C.mn}" transform="rotate(12 ${x+7} ${y-67})"/><circle cx="${x-1}" cy="${y-12}" r="11" fill="${C.rb}"/><circle cx="${x+1}" cy="${y-27}" r="8" fill="${C.rb}"/><circle cx="${x-1}" cy="${y-17}" r="3" fill="${C.dg}"/>`; }
};

function drawItem(p){ const d=DATA.DECOR[p.id]; if(!d||!ITEM_DRAW[p.id]) return ''; return ITEM_DRAW[p.id](mkL(p.gx,p.gy,p.rot),d); }
function itemThumb(id,s=64){ const d=DATA.DECOR[id], ox=ISO.ox, oy=ISO.oy;
  return `<svg width="${s}" height="${s}" viewBox="${ox-d.d*26-6} ${oy-86} ${(d.w+d.d)*26+12} ${86+(d.w+d.d)*13+8}" fill="none" stroke="${C.dg}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">${drawItem({id,gx:0,gy:0,rot:0})}</svg>`; }

function roomWallDecor(roomId,P){
  const hx=P(0,3,66);
  if(roomId==='gaming'){
    return poly([P(0,2.2,50),P(0,3.8,50),P(0,3.8,84),P(0,2.2,84)],C.dg)+`<path d="M${hx[0]} ${hx[1]-8}l3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" fill="${C.yl}" stroke="${C.mg}" stroke-width="1.2"/>`;
  }
  if(roomId==='bathroom'){
    return `<ellipse cx="${hx[0]}" cy="${hx[1]}" rx="14" ry="18" fill="#dff0f2"/><path d="M${hx[0]-5} ${hx[1]-6}l7-7" stroke="#fff" stroke-width="2"/>`;
  }
  if(roomId==='kitchen'){
    return poly([P(0,1.8,58),P(0,4.2,58),P(0,4.2,63),P(0,1.8,63)],C.wood)+`<circle cx="${hx[0]-10}" cy="${hx[1]-8}" r="4.5" fill="${C.rb}"/><circle cx="${hx[0]+2}" cy="${hx[1]-3}" r="4.5" fill="${C.mg}"/><circle cx="${hx[0]+14}" cy="${hx[1]+2}" r="4.5" fill="${C.yl}"/>`;
  }
  return poly([P(0,2.4,52),P(0,3.6,52),P(0,3.6,82),P(0,2.4,82)],C.bg)+`<path d="M${hx[0]} ${hx[1]+5}c-8-5-8-11-3-12 2 0 3 1 3 3 0-2 1-3 3-3 5 1 5 7-3 12z" fill="${C.rb}" stroke-width="1.4"/>`;
}

function roomSVG(dec,o={}){ const P=(a,b,z)=>ISO.p(a,b,z), H=ISO.H, W=dec.wall, F=dec.floor; let s='';
  s+=poly([P(0,6,0),P(0,0,0),P(0,0,H),P(0,6,H)],shade(W,-.07))+poly([P(0,0,0),P(6,0,0),P(6,0,H),P(0,0,H)],W);
  s+=poly([P(0,6,H),P(0,0,H),P(0,0,H+6),P(0,6,H+6)],shade(W,.2))+poly([P(0,0,H),P(6,0,H),P(6,0,H+6),P(0,0,H+6)],shade(W,.25));
  s+=poly([P(2.1,0,46),P(3.9,0,46),P(3.9,0,92),P(2.1,0,92)],C.mnl)+`<path d="M${P(3,0,46)}L${P(3,0,92)}M${P(2.1,0,69)}L${P(3.9,0,69)}" stroke-width="1.8"/>`+poly([P(2,0,44),P(4,0,44),P(4,0,46),P(2,0,46)],C.wood);
  s+=roomWallDecor(o.roomId||'bedroom',P);
  for(let gx=0;gx<6;gx++) for(let gy=0;gy<6;gy++) s+=poly([P(gx,gy),P(gx+1,gy),P(gx+1,gy+1),P(gx,gy+1)],(gx+gy)%2?F:shade(F,-.07),`class="tile" data-g="${gx},${gy}" stroke-width="1" stroke-opacity=".35"`);
  s+=`<path d="M${P(0,6,0)}L${P(0,0,0)}L${P(6,0,0)}" stroke-width="3.2"/>`+poly([P(0,0,0),P(6,0,0),P(6,6,0),P(0,6,0)],'none','stroke-width="2.6" pointer-events="none"');
  if(o.ghost){ const g=o.ghost, f=Core.fp(g.id,g.rot), ok=Core.canPlace(g.id,g.gx,g.gy,g.rot,g.uid);
    s+=poly([P(g.gx,g.gy),P(g.gx+f.w,g.gy),P(g.gx+f.w,g.gy+f.d),P(g.gx,g.gy+f.d)],ok?'#83995899':'#D3968Caa','stroke-width="2.4" stroke-dasharray="5 3" pointer-events="none"'); }
  const items=(dec.placed||[]).filter(p=>DATA.DECOR[p.id]&&!(o.ghost&&p.uid===o.ghost.uid)).slice();
  if(o.ghost) items.push({...o.ghost,_ghost:1});
  items.sort((a,b)=>{ const fa=!!DATA.DECOR[a.id].flat, fb=!!DATA.DECOR[b.id].flat; if(fa!==fb) return fa?-1:1; const A=Core.fp(a.id,a.rot), B=Core.fp(b.id,b.rot); return (a.gx+A.w/2+a.gy+A.d/2)-(b.gx+B.w/2+b.gy+B.d/2); });
  for(const p of items) s+=`<g class="ditem ${o.sel===p.uid?'sel':''}" data-uid="${p.uid}" ${p._ghost?'opacity=".65" pointer-events="none"':''}>${drawItem(p)}</g>`;
  return `<g fill="none" stroke="${C.dg}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">${s}</g>`; }

const Decor={
  init(){ const el=this.el=document.getElementById('decor');
    el.innerHTML=`<div class="d-top"><button class="icon-btn" data-a="back">${sv(IP.back,24)}</button><div class="card row" style="padding:4px 12px;flex:1;min-width:0"><b class="grow" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis" id="dTitle"></b>${sv(IP.gem,17)}<b id="dGem" data-gem-anchor></b><button class="icon-btn" data-a="set" style="width:34px;height:34px;border-radius:10px">${sv(IP.gear,20)}</button></div></div>
      <div class="d-subbar">
        <button class="income card" id="dInc" style="cursor:pointer;font-family:inherit;flex:none"></button>
        <div class="room-tabs" id="dRooms"></div>
      </div>
      <div class="d-banner card hide" id="dBanner"></div>
      <div class="d-room" id="dRoom"><svg viewBox="0 -6 390 330" preserveAspectRatio="xMidYMid meet" id="dSvg"></svg><div id="dDk" style="position:absolute;left:0;top:0;width:0;height:0"></div></div>
      <div class="d-tools card">
        <div class="tb">${[['shop','shop','Nội thất'],['boxes','box','Hộp đồ'],['houses','home','Ngoại thất'],['wall','roller','Tường'],['floor','roller','Sàn']].map(([t,i,n])=>`<button data-t="${t}">${sv(IP[i],20)}${n}${t==='boxes'?'<span class="badge" id="dBoxN" style="right:4px"></span>':''}</button>`).join('')}</div>
        <div id="dCats" class="d-cats hide"></div>
        <div id="dPanel" style="margin-top:6px;height:126px;overflow-x:auto;overflow-y:hidden;touch-action:pan-x"></div>
      </div>`;
    this.svg=el.querySelector('#dSvg'); this.tab='shop'; this.cat='all'; this.mode='view'; this.sel=null; this.ghost=null;
    el.querySelector('[data-a=back]').onclick=()=>this.close(); el.querySelector('[data-a=set]').onclick=()=>openSettings(); el.querySelector('#dInc').onclick=()=>{ this.hidePop(); Shop.collect(); };
    setInterval(()=>{ if(this.isOpen) Shop.renderIncome(); },15000);
    el.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{ this.hidePop(); this.sel=null; this.tab=b.dataset.t; this.render(); this.renderPanel(); });
    this.svg.addEventListener('pointerdown',e=>this.onDown(e)); this.svg.addEventListener('pointermove',e=>this.onMove(e));
    this.svg.addEventListener('contextmenu',e=>e.preventDefault());
    Core.on('decor',()=>{ if(this.isOpen){ this.render(); this.renderPanel(); } }); Core.on('gems',()=>{ if(this.isOpen) this.renderTop(); });
    this.dk=new Donkey({scale:1.05,tilt:-22,yaw:-35,acc:Core.s.acc.on}); el.querySelector('#dDk').appendChild(this.dk.el);
    new ResizeObserver(()=>this.placeDk()).observe(el.querySelector('#dRoom')); },
  open(){ this.isOpen=true; App.show('decor'); this.mode='view'; this.sel=null; this.ghost=null; this.dk.setAcc(Core.s.acc.on); this.dk.setMood(Core.mood()); this.render(); this.renderPanel(); this.renderTop(); this.placeDk(); this.banner(''); },
  close(){ this.isOpen=false; this.hidePop(); Nav.go('home'); },
  renderRooms(){
    const D=Core.s.decor, wrap=document.getElementById('dRooms'); if(!wrap) return;
    wrap.innerHTML=Object.entries(DATA.ROOMS).map(([id,cfg])=>{
      const owned=!!D.rooms[id], on=D.activeRoom===id;
      return `<button class="room-pill ${on?'on':''} ${owned?'':'locked'}" data-rm="${id}">${owned?'':'🔒 '}${cfg.name}${owned?'':` • ${cfg.price}`}</button>`;
    }).join('');
    wrap.querySelectorAll('[data-rm]').forEach(b=>b.onclick=()=>{
      const id=b.dataset.rm, cfg=DATA.ROOMS[id];
      if(D.rooms[id]){ this.mode='view'; this.sel=null; this.ghost=null; this.cat=id; this.hidePop(); this.banner(''); Core.switchRoom(id); return; }
      const m=UI.modal(`<div class="center">${sv(IP.home,52)}<h2 class="txt-accent" style="margin-top:4px">Mở rộng: ${cfg.name}</h2>
        <p class="muted" style="margin:6px 0">${cfg.desc}</p>
        <p style="font-weight:800;margin-bottom:12px">Mở phòng mới giúp tăng không gian đặt nội thất & tích thêm thu nhập Gem mỗi giờ!</p>
        <div class="row"><button class="btn grow" data-x>Để sau</button><button class="btn pri grow" data-ok>${sv(IP.gem,16)} Mở phòng (${cfg.price} Gem)</button></div></div>`);
      m.box.querySelector('[data-x]').onclick=()=>m.close();
      m.box.querySelector('[data-ok]').onclick=()=>{
        const r=Core.unlockRoom(id);
        if(r.ok){ this.cat=id; burstFx(UI.app,UI.app.clientWidth/2,UI.app.clientHeight/2,16,'sparkle',120); UI.toast(`Chúc mừng! Đã mở rộng ${cfg.name}!`); m.close(); }
        else UI.toast(r.msg);
      };
    });
  },
  renderTop(){
    const D=Core.s.decor, curName=(DATA.ROOMS[D.activeRoom]||DATA.ROOMS.bedroom).name, hName=(DATA.HOUSES[D.house]||DATA.HOUSES.mushroom).name;
    document.getElementById('dTitle').textContent=`${hName} • ${curName}`;
    document.getElementById('dGem').textContent=Core.s.gems;
    const n=D.boxes.length, b=document.getElementById('dBoxN'); b.textContent=n; b.style.display=n?'':'none';
    Shop.renderIncome(); this.renderRooms();
  },
  placeDk(){ const r=this.el.querySelector('#dRoom'), W=r.clientWidth, H=r.clientHeight; if(!W) return; const s=Math.min(W/390,H/330), ox=(W-390*s)/2, oy=(H-330*s)/2;
    const [x,y]=ISO.p(6.4,3.6); this.dk.pos(ox+x*s,oy+(y+6)*s); },
  render(){ this.svg.innerHTML=roomSVG(Core.curRoom(),{ghost:this.ghost,sel:this.sel,roomId:Core.s.decor.activeRoom}); this.renderTop(); },
  banner(t){ const b=document.getElementById('dBanner'); b.classList.toggle('hide',!t); b.innerHTML=t; },
  tileAt(e){ const pt=this.svg.createSVGPoint(); pt.x=e.clientX; pt.y=e.clientY; const m=this.svg.getScreenCTM(); if(!m) return null; const q=pt.matrixTransform(m.inverse());
    const a=(q.x-ISO.ox)/(ISO.tw/2), b=(q.y-ISO.oy)/(ISO.th/2); return [Math.floor((a+b)/2),Math.floor((b-a)/2)]; },
  onDown(e){ e.preventDefault(); if(this.mode==='place'){ const t=this.tileAt(e); if(!t) return; const g=this.ghost; g.gx=t[0]; g.gy=t[1];
      if(Core.place(g.uid,g.id,g.gx,g.gy,g.rot)){ this.mode='view'; this.ghost=null; this.banner(''); UI.toast(`Đã đặt ${DATA.DECOR[g.id].name}!`); this.render(); this.renderPanel(); } else { this.render(); UI.toast('Chỗ này không đủ / bị trùng đồ'); } return; }
    const it=e.target.closest('.ditem'); if(it){ this.sel=it.dataset.uid; this.render(); this.showPop(e); } else { this.sel=null; this.hidePop(); this.render(); } },
  onMove(e){ if(this.mode!=='place') return; const t=this.tileAt(e); if(!t) return; if(t[0]===this.ghost.gx&&t[1]===this.ghost.gy) return; this.ghost.gx=t[0]; this.ghost.gy=t[1]; this.render(); },
  startPlace(uid,id,rot=0){ const p=Core.curRoom().placed.find(x=>x.uid===uid); this.mode='place'; this.sel=null; this.hidePop();
    this.ghost={uid,id,gx:p?p.gx:2,gy:p?p.gy:2,rot:p?p.rot:rot};
    this.banner(`${sv(IP.move,18)} Chạm 1 ô sàn để đặt <b>${DATA.DECOR[id].name}</b> <button class="btn sm" id="dRot">${sv(IP.rotate,14)} Xoay</button><button class="btn sm rose" id="dCancel">Hủy</button>`);
    document.getElementById('dRot').onclick=()=>{ this.ghost.rot=this.ghost.rot?0:1; this.render(); };
    document.getElementById('dCancel').onclick=()=>{ this.mode='view'; this.ghost=null; this.banner(''); this.render(); };
    this.render(); },
  showPop(e){ this.hidePop(); const p=Core.curRoom().placed.find(x=>x.uid===this.sel); if(!p) return; const [rx,ry]=UI.rel(e.clientX,e.clientY);
    const x=U.clamp(rx,110,Math.max(110,UI.app.clientWidth-110)), y=U.clamp(ry-14,100,Math.max(100,UI.app.clientHeight-220));
    const pop=this.pop=document.createElement('div'); pop.className='item-pop card'; pop.style.left=x+'px'; pop.style.top=y+'px';
    pop.innerHTML=`<b style="align-self:center;font-size:12px">${DATA.DECOR[p.id].name}</b><button class="btn sm" data-p="rot">${sv(IP.rotate,16)}</button><button class="btn sm" data-p="move">${sv(IP.move,16)}</button><button class="btn sm rose" data-p="store">${sv(IP.box,16)}</button>`;
    UI.app.appendChild(pop);
    pop.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{ const a=b.dataset.p;
      if(a==='rot'){ if(!Core.place(p.uid,p.id,p.gx,p.gy,p.rot?0:1)) UI.toast('Không đủ chỗ để xoay'); }
      if(a==='move') this.startPlace(p.uid,p.id);
      if(a==='store'){ Core.storeItem(p.uid); UI.toast('Đã cất vào Hộp đồ'); }
      this.hidePop(); this.sel=null; this.render(); }); },
  hidePop(){ if(this.pop){ this.pop.remove(); this.pop=null; } },
  renderPanel(){
    const P=document.getElementById('dPanel'), catsEl=document.getElementById('dCats'), D=Core.s.decor, R=Core.curRoom();
    document.querySelectorAll('#decor [data-t]').forEach(b=>b.classList.toggle('on',b.dataset.t===this.tab));
    catsEl.classList.toggle('hide',this.tab!=='shop');
    if(this.tab==='shop'){
      const CATS=[['all','Tất cả'],['bedroom','Ngủ'],['living','Khách'],['kitchen','Bếp'],['bathroom','Tắm'],['gaming','Gaming']];
      catsEl.innerHTML=CATS.map(([k,n])=>`<button class="${this.cat===k?'on':''}" data-cat="${k}">${n}</button>`).join('');
      catsEl.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{ this.cat=b.dataset.cat; this.renderPanel(); });
      Shop.renderPanel(P,this.cat);
    }
    else if(this.tab==='boxes'){ P.innerHTML=D.boxes.length?`<div class="row" style="gap:8px;width:max-content">${D.boxes.map(b=>`<div class="card" style="width:94px;padding:4px;display:flex;flex-direction:column;align-items:center;cursor:pointer;box-shadow:2px 2px 0 ${C.dg}" data-box="${b.uid}">${sv(IP.box,44)}<b style="font-size:11px;white-space:nowrap">${DATA.DECOR[b.id].name}</b><span class="tag moss">Mở hộp</span></div>`).join('')}</div>`:`<p class="muted center" style="padding-top:26px">Hộp đồ trống. Mua nội thất ở mục Nội thất nhé!</p>`;
      P.querySelectorAll('[data-box]').forEach(b=>b.onclick=()=>this.openBox(D.boxes.find(x=>x.uid===b.dataset.box))); }
    else if(this.tab==='houses'){
      Shop.renderHouses(P);
    }
    else { const kind=this.tab, list=kind==='wall'?DATA.WALLS:DATA.FLOORS;
      P.innerHTML=`<div class="muted">${kind==='wall'?'Màu sơn tường':'Màu sàn nhà'} (${(DATA.ROOMS[D.activeRoom]||{}).name||''}) • ${DATA.PAINT_COST} Gem / lần đổi</div><div class="swatches">${list.map(c=>`<div class="sw ${R[kind]===c?'on':''}" style="background:${c}" data-c="${c}"></div>`).join('')}</div>`;
      P.querySelectorAll('[data-c]').forEach(s=>s.onclick=()=>{ if(Core.paint(kind,s.dataset.c)) UI.toast(kind==='wall'?'Tường mới xinh quá!':'Sàn nhà mới tinh!'); else UI.toast('Chưa đủ Gem'); }); } },
  openBox(box){ Shop.openBox(box); }
};
