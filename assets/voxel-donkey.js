/* assets/voxel-donkey.js — Nhân vật Lừa Voxel dựng bằng CSS 3D cubes (biểu cảm, phụ kiện, xe đẩy). */
'use strict';
function shade(hex,amt){ let c=hex.replace('#',''); if(c.length===3) c=c.split('').map(x=>x+x).join('');
  const n=parseInt(c,16); let r=n>>16,g=(n>>8)&255,b=n&255; const t=amt<0?0:255, p=Math.abs(amt);
  r=Math.round((t-r)*p)+r; g=Math.round((t-g)*p)+g; b=Math.round((t-b)*p)+b; return '#'+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1); }
const FACE={
  eyes(m){ const D=C.dg; switch(m){
    case 'happy': return `<path d="M2.4 6.4Q4 3.6 5.6 6.4M8.4 6.4Q10 3.6 11.6 6.4" stroke="${D}" stroke-width="1.25" fill="none" stroke-linecap="round"/>`;
    case 'tired': return `<ellipse cx="4" cy="6" rx="1.4" ry=".85" fill="${D}"/><ellipse cx="10" cy="6" rx="1.4" ry=".85" fill="${D}"/><path d="M2.2 5.2H5.8M8.2 5.2H11.8" stroke="${D}" stroke-width="1"/><path d="M2.3 7.8Q4 9.2 5.7 7.8M8.3 7.8Q10 9.2 11.7 7.8" stroke="#6b5a7a" stroke-width="1.3" fill="none"/>`;
    case 'sleep': return `<path d="M2.4 5.6Q4 7.4 5.6 5.6M8.4 5.6Q10 7.4 11.6 5.6" stroke="${D}" stroke-width="1.15" fill="none"/>`;
    case 'sad': return `<ellipse cx="4" cy="6" rx="1.2" ry="1.6" fill="${D}"/><ellipse cx="10" cy="6" rx="1.2" ry="1.6" fill="${D}"/><path d="M2.3 3.6L5.4 2.6M8.6 2.6L11.7 3.6" stroke="${D}" stroke-width="1"/>`;
    default: return `<ellipse cx="4" cy="5.6" rx="1.3" ry="1.85" fill="${D}"/><ellipse cx="10" cy="5.6" rx="1.3" ry="1.85" fill="${D}"/><circle cx="4.5" cy="4.8" r=".55" fill="#fff"/><circle cx="10.5" cy="4.8" r=".55" fill="#fff"/>`; } },
  side(m,x){ const D=C.dg; switch(m){
    case 'happy': return `<path d="M${x-1.6} 6.4Q${x} 3.6 ${x+1.6} 6.4" stroke="${D}" stroke-width="1.25" fill="none"/>`;
    case 'tired': return `<ellipse cx="${x}" cy="6" rx="1.4" ry=".8" fill="${D}"/><path d="M${x-1.8} 5.2H${x+1.8}" stroke="${D}"/><path d="M${x-1.7} 7.8Q${x} 9.2 ${x+1.7} 7.8" stroke="#6b5a7a" stroke-width="1.3" fill="none"/>`;
    case 'sleep': return `<path d="M${x-1.6} 5.6Q${x} 7.4 ${x+1.6} 5.6" stroke="${D}" stroke-width="1.15" fill="none"/>`;
    default: return `<ellipse cx="${x}" cy="5.6" rx="1.2" ry="1.8" fill="${D}"/><circle cx="${x+.4}" cy="4.8" r=".5" fill="#fff"/>`; } },
  mouth(m){ const D=C.dg, nose=`<ellipse cx="3.4" cy="2.4" rx=".9" ry=".7" fill="${D}"/><ellipse cx="8.6" cy="2.4" rx=".9" ry=".7" fill="${D}"/>`; switch(m){
    case 'happy': return nose+`<path d="M3.8 4.4Q6 8.6 8.2 4.4Z" fill="${D}"/><ellipse cx="6" cy="6.3" rx="1.1" ry=".6" fill="${C.rb}"/><circle cx="1.2" cy="5" r="1" fill="${C.rb}" opacity=".8"/><circle cx="10.8" cy="5" r="1" fill="${C.rb}" opacity=".8"/>`;
    case 'tired': return nose+`<ellipse class="yawn" cx="6" cy="5.5" rx="1.5" ry="1.7" fill="${D}"/>`;
    case 'sleep': return nose+`<path d="M4.8 5.4H7.2" stroke="${D}" stroke-width=".9"/>`;
    case 'sad': return nose+`<path d="M4.2 6.4Q6 4.8 7.8 6.4" stroke="${D}" stroke-width=".9" fill="none"/>`;
    default: return nose+`<path d="M4.2 5Q6 6.8 7.8 5" stroke="${D}" stroke-width=".9" fill="none"/>`; } }
};
class Donkey {
  static COL={body:'#b8b0a6',belly:'#F7F4D5',mane:'#6f655e',hoof:'#4a423d'};
  static box(par,w,h,d,x,y,z,c){ const b=document.createElement('div'); b.className='vx-box'; b.style.transform=`translate3d(${x}px,${y}px,${z}px)`;
    const F=[['f',w,h,`translateZ(${d/2}px)`,0],['k',w,h,`rotateY(180deg) translateZ(${d/2}px)`,-.14],['r',d,h,`rotateY(90deg) translateZ(${w/2}px)`,-.2],['l',d,h,`rotateY(-90deg) translateZ(${w/2}px)`,-.08],['t',w,d,`rotateX(90deg) translateZ(${h/2}px)`,.16]];
    for(const [n,fw,fh,tr,sh] of F){ const f=document.createElement('div'); f.className='vx-f f-'+n;
      f.style.cssText=`width:${fw}px;height:${fh}px;left:${-fw/2}px;top:${-fh/2}px;transform:${tr};background:${shade(c,sh)}`; b.appendChild(f); }
    par.appendChild(b); return b; }
  static grp(par,x,y,z,cls,extra=''){ const o=document.createElement('div'); o.className='vx-g'; o.style.transform=`translate3d(${x}px,${y}px,${z}px) ${extra}`;
    const i=document.createElement('div'); i.className='vx-i '+(cls||''); o.appendChild(i); par.appendChild(o); return i; }
  constructor(o={}){ this.s=o.scale||1; this.tilt=o.tilt??-24; this.yaw=0; this.mood=null;
    const el=this.el=document.createElement('div'); el.className='vx idle';
    el.innerHTML='<div class="vx-shadow"></div><div class="vx-persp"><div class="vx-tele"><div class="vx-cam"><div class="vx-yaw"><div class="vx-bob"></div></div></div></div></div><div class="vx-zzz"><b>z</b><b>Z</b><b>z</b></div>';
    [this.shadow,this.persp,this.tele,this.cam,this.yawEl,this.bob]=['.vx-shadow','.vx-persp','.vx-tele','.vx-cam','.vx-yaw','.vx-bob'].map(q=>el.querySelector(q));
    this.persp.style.transform=`scale(${this.s})`; this.shadow.style.transform=`scale(${this.s})`;
    const z=el.querySelector('.vx-zzz'); z.style.top=(-72*this.s)+'px'; z.style.left=(10*this.s)+'px';
    this.cam.style.transform=`rotateX(${this.tilt}deg)`;
    this.build(); this.setYaw(o.yaw||0); this.setMood(o.mood||'normal'); this.setAcc(o.acc||[]);
    if(o.cls) el.classList.add(...o.cls.split(' ')); }
  build(){ const B=Donkey.box, G=Donkey.grp, b=this.bob, K=Donkey.COL;
    for(const [x,z,c] of [[-6,11,'leg-a leg-fr'],[6,-11,'leg-a'],[6,11,'leg-b'],[-6,-11,'leg-b']]){ const g=G(b,x,-15,z,c); B(g,6,15,6,0,7.5,0,K.body); B(g,6.6,3.2,6.6,0,13.6,0,K.hoof); }
    B(b,20,17,34,0,-23,0,K.body); B(b,16,3,26,0,-15,0,K.belly);
    B(b,10,14,10,0,-34,13,K.body); B(b,4,4,14,0,-42,10,K.mane);
    const t=G(b,0,-29,-17,'tail-i'); B(t,3,11,3,0,5.5,0,K.body); B(t,4.6,4.6,4.6,0,12,0,K.mane);
    this.accNeck=G(b,0,0,0,'');
    const h=G(b,0,-40,16,'head-i');
    const hb=B(h,14,14,15,0,-7,6,K.body), mz=B(h,12,8,7,0,-2,16.5,K.belly);
    B(h,4,3,6,0,-15,4,K.mane);
    this.fFace=hb.querySelector('.f-f'); this.fL=hb.querySelector('.f-l'); this.fR=hb.querySelector('.f-r'); this.fM=mz.querySelector('.f-f');
    for(const [x,c,r] of [[-4.5,'ear-l',-14],[4.5,'ear-r',14]]){ const e=G(h,x,-14,4,c,`rotateZ(${r}deg)`); const eb=B(e,4,13,3,0,-6.5,0,K.body); eb.querySelector('.f-f').style.background=C.rb; }
    this.accHead=G(h,0,0,0,''); }
  setAcc(list){ const B=Donkey.box; this.accNeck.innerHTML=''; this.accHead.innerHTML='';
    if(list.includes('scarf')){ B(this.accNeck,12.6,5,12.6,0,-31,13,C.rb); B(this.accNeck,4,9,2,-4,-26,19.6,'#c47f75'); }
    if(list.includes('beanie')){ B(this.accHead,15,5,16,0,-15.6,6,C.mn); B(this.accHead,15.8,2.4,16.8,0,-13.4,6,'#e9e3bd'); B(this.accHead,5,5,5,0,-20.6,6,C.bg); }
    if(list.includes('headphones')){ B(this.accHead,17,2,3,0,-15.4,4,C.dg); B(this.accHead,2,7,3,-8.2,-11,4,C.dg); B(this.accHead,2,7,3,8.2,-11,4,C.dg); B(this.accHead,3,6,6,-8.8,-6.5,4,C.mg); B(this.accHead,3,6,6,8.8,-6.5,4,C.mg); } }
  setMood(m){ if(m===this.mood) return; this.el.classList.remove(this.mood||'x'); this.mood=m; this.el.classList.add(m);
    const svg=(vb,inner)=>`<svg viewBox="${vb}">${inner}</svg>`;
    this.fFace.innerHTML=svg('0 0 14 14',FACE.eyes(m)); this.fR.innerHTML=svg('0 0 15 14',FACE.side(m,4)); this.fL.innerHTML=svg('0 0 15 14',FACE.side(m,11)); this.fM.innerHTML=svg('0 0 12 8',FACE.mouth(m)); }
  setYaw(d){ this.yaw=d; this.yawEl.style.transform=`rotateY(${d}deg)`; }
  setWalk(w){ if(w===this._w) return; this._w=w; this.el.classList.toggle('walk',w); this.el.classList.toggle('idle',!w); }
  pos(x,y){ this.el.style.left=x+'px'; this.el.style.top=y+'px'; this.el.style.zIndex=Math.round(y); }
  addCart(){ const B=Donkey.box, cg=this.cart=Donkey.grp(this.yawEl,0,0,0,'');
    B(cg,22,11,17,0,-13,46,'#cfd9b4'); B(cg,24,2.4,2.4,0,-24,31,C.dg);
    B(cg,2,11,2,-10.5,-18,32.5,'#7d8b86'); B(cg,2,11,2,10.5,-18,32.5,'#7d8b86');
    B(cg,20,2,2,0,-6.5,39,'#7d8b86'); B(cg,20,2,2,0,-6.5,53,'#7d8b86');
    for(const [x,z] of [[-8,39],[8,39],[-8,53],[8,53]]) B(cg,2.6,4,4,x,-2,z,C.dg);
    this.cartItems=Donkey.grp(cg,0,0,0,''); this._cf=-1; }
  setCartFill(n,cols){ if(n===this._cf) return; this._cf=n; this.cartItems.innerHTML='';
    for(let i=0;i<n;i++){ const L=Math.floor(i/9), k=i%9; Donkey.box(this.cartItems,5.4,5,4.6,(k%3-1)*6.2,-21-L*5,46+(Math.floor(k/3)-1)*5,cols[i%cols.length]); } }
  setCartSwing(d){ if(this.cart) this.cart.style.transform=`rotateY(${d}deg)`; }
}

