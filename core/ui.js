/* core/ui.js — UI helpers (sheet, modal, toast, float, bill fly) + FX (Tap-to-Move, Lock target, Teleport) + điều hướng trang. */
'use strict';
const FX={
  move(layer,x,y){ const e=document.createElement('div'); e.className='fx fx-move'; e.style.cssText=`left:${x}px;top:${y}px;z-index:9000`;
    const ch=`<path d="M27 7 L34 15 L41 7" stroke-linecap="round" stroke-linejoin="round" fill="none"`;
    const ar=[0,90,180,270].map(r=>`<g transform="rotate(${r} 34 34)"><g class="ar">${ch} stroke="#0A3323" stroke-width="7"/>${ch} stroke="#839958" stroke-width="3.6"/></g></g>`).join('');
    e.innerHTML=`<svg viewBox="0 0 68 68"><circle class="ring" cx="34" cy="34" r="27" stroke="#839958" stroke-width="4.5" fill="#83995833"/><circle class="ring2" cx="34" cy="34" r="20" stroke="#0A3323" stroke-width="2" fill="none"/>${ar}</svg>`;
    layer.appendChild(e); setTimeout(()=>e.remove(),700); },
  lock(layer,x,y,r=30){ FX.unlock(); const e=document.createElement('div'); e.className='fx fx-lock'; e.style.cssText=`left:${x}px;top:${y}px;z-index:8999`;
    const d=r*2; e.innerHTML=`<div class="wrap" style="left:${-r}px;top:${-r}px;width:${d}px;height:${d}px"><svg width="${d}" height="${d}" viewBox="-42 -42 84 84"><circle r="30" stroke="#0A3323" stroke-width="7" fill="none" stroke-dasharray="13 7"/><circle r="30" stroke="#D3968C" stroke-width="4" fill="#D3968C2a" stroke-dasharray="13 7"/>${[0,90,180,270].map(a=>`<path transform="rotate(${a})" d="M0 -32 L-6 -41 L6 -41 Z" fill="#D3968C" stroke="#0A3323" stroke-width="1.8" stroke-linejoin="round"/>`).join('')}</svg></div>`;
    layer.appendChild(e); FX._lock=e; return e; },
  unlock(hit){ const e=FX._lock; if(!e) return; FX._lock=null; if(hit){ e.classList.add('hit'); setTimeout(()=>e.remove(),380); } else e.remove(); },
  teleport(layer,x,y,donkey,dir){ return new Promise(res=>{
    const e=document.createElement('div'); e.className='fx fx-tp '+dir; e.style.cssText=`left:${x}px;top:${y}px;z-index:${Math.round(y)+2}`;
    e.innerHTML='<div class="portal"></div><div class="beam"></div>'; layer.appendChild(e);
    if(dir==='in') e.querySelector('.beam').animate([{transform:'translateY(-320px) scaleY(.4)',opacity:0},{transform:'translateY(0) scaleY(1)',opacity:1,offset:.4},{transform:'scaleX(.2)',opacity:0}],{duration:1050,easing:'ease-in',fill:'forwards'});
    for(let i=0;i<18;i++){ const p=document.createElement('div'); p.className='px'; e.appendChild(p);
      const a=Math.random()*Math.PI*2, r=U.rand(12,44), sx=Math.cos(a)*r, sy=Math.sin(a)*r*.4;
      const kf=dir==='out'?[{transform:`translate(${sx}px,${sy}px)`,opacity:1},{transform:`translate(${sx*.3}px,${-U.rand(90,220)}px) rotate(${U.ri(90,400)}deg)`,opacity:0}]
                         :[{transform:`translate(0,${-U.rand(60,140)}px)`,opacity:0},{transform:`translate(0,0)`,opacity:1,offset:.45},{transform:`translate(${sx*1.7}px,${sy*1.7-12}px) rotate(${U.ri(90,300)}deg)`,opacity:0}];
      p.animate(kf,{duration:U.rand(650,1050),delay:U.rand(0,dir==='out'?250:350),easing:'ease-out',fill:'both'}); }
    donkey.el.classList.remove('tp-in','tp-out'); void donkey.el.offsetWidth; donkey.el.classList.add(dir==='out'?'tp-out':'tp-in');
    const t0=performance.now(), y0=donkey.yaw;
    const spin=()=>{ const k=(performance.now()-t0)/1000; if(k<1){ donkey.setYaw(dir==='out'?y0+k*k*720:(1-k)*(1-k)*-540); requestAnimationFrame(spin); } else donkey.setYaw(dir==='out'?y0:0); };
    spin();
    setTimeout(()=>{ e.remove(); if(dir==='in') donkey.el.classList.remove('tp-in'); res(); }, dir==='out'?1000:1080); }); }
};

const UI={
  app:document.getElementById('app'),
  rel(cx,cy){ const r=this.app.getBoundingClientRect(); return [cx-r.left-this.app.clientLeft, cy-r.top-this.app.clientTop]; },
  toast(msg){ const t=document.createElement('div'); t.className='toast card'; t.innerHTML=msg; this.app.appendChild(t); setTimeout(()=>t.remove(),2700); },
  float(html,x,y,color=C.dg){ const f=document.createElement('div'); f.className='float'; f.style.cssText=`left:${x}px;top:${y}px;color:${color}`; f.innerHTML=html; this.app.appendChild(f); setTimeout(()=>f.remove(),1350); },
  floatEl(el,html,color){ if(!el) return; const r=el.getBoundingClientRect(); const [x,y]=this.rel(r.left+r.width/2,r.top); this.float(html,x,y,color); },
  sheet({title,icon,body='',cls='',onClose}){ const w=document.createElement('div'); w.className='sheet-wrap';
    w.innerHTML=`<div class="sheet card ${cls}"><div class="sheet-h">${icon?ic(icon,30):''}<h2>${title}</h2><button class="x-btn" data-x>${sv(IP.x,18)}</button></div><div class="sheet-b">${body}</div></div>`;
    this.app.appendChild(w); const offs=[];
    const api={el:w,body:w.querySelector('.sheet-b'),track(off){offs.push(off);},close(){ offs.forEach(f=>f()); w.remove(); onClose&&onClose(); }};
    w.addEventListener('pointerdown',e=>{ if(e.target===w) api.close(); }); w.querySelector('[data-x]').onclick=()=>api.close(); return api; },
  modal(html,{cls='',onClose,dismiss=true}={}){ const w=document.createElement('div'); w.className='modal-wrap';
    w.innerHTML=`<div class="modal card ${cls}">${html}</div>`; this.app.appendChild(w);
    const api={el:w,box:w.querySelector('.modal'),close(){ w.remove(); onClose&&onClose(); }};
    if(dismiss) w.addEventListener('pointerdown',e=>{ if(e.target===w) api.close(); }); return api; },
  bills(fromEl,n=12){ const r=fromEl.getBoundingClientRect(); const [x,y]=this.rel(r.left+r.width/2,r.top+r.height/2);
    for(let i=0;i<n;i++){ const b=document.createElement('div'); b.className='bill-fly'; b.innerHTML=sv(IP.bill,34); b.style.cssText=`left:${x-17}px;top:${y-17}px`; this.app.appendChild(b);
      const dx=U.rand(-170,170), dy=U.rand(-320,-120);
      b.animate([{transform:'translate(0,0) rotate(0) scale(.6)',opacity:1},{transform:`translate(${dx*.6}px,${dy}px) rotate(${U.ri(-200,200)}deg) scale(1.1)`,opacity:1,offset:.6},{transform:`translate(${dx}px,${dy+90}px) rotate(${U.ri(-400,400)}deg) scale(.9)`,opacity:0}],{duration:U.rand(900,1400),delay:i*45,easing:'cubic-bezier(.2,.8,.4,1)',fill:'both'});
      setTimeout(()=>b.remove(),2100); } },
  bar(v,cls=''){ return `<div class="bar ${cls}"><i style="width:${U.clamp(v)}%"></i></div>`; }
};


/* ---------- Điều hướng giữa các trang (index ↔ module) ---------- */
const Nav={
  get root(){ return document.body.dataset.root||'./'; },
  PAGES:{home:'index.html',health:'module-suc-khoe/health.html',tycoon:'module-tycoon-tamly/tycoon.html',fomo:'module-tycoon-tamly/fomo.html'},
  url(p,hash=''){ return this.root+this.PAGES[p]+hash; },
  go(p,hash='',opt={}){ if(typeof Core!=='undefined') Core.save(); try{ sessionStorage.setItem('lc_boot','1'); if(opt.tp) sessionStorage.setItem('lc_tp','1'); }catch(e){}
    const f=document.createElement('div'); f.className='page-fade'; UI.app.appendChild(f); setTimeout(()=>{ location.href=this.url(p,hash); },opt.tp?60:240); },
  takeTp(){ try{ const v=sessionStorage.getItem('lc_tp'); sessionStorage.removeItem('lc_tp'); return !!v; }catch(e){ return false; } },
  booted(){ try{ return !!sessionStorage.getItem('lc_boot'); }catch(e){ return false; } }
};
/* Các lớp phủ Mock OS dùng chung cho mọi trang */
function ensureOverlays(){ for(const id of ['ovScreen','ovBed','ovMorning']) if(!document.getElementById(id)){ const d=document.createElement('div'); d.id=id; d.className='ov'; UI.app.appendChild(d); } }
/* Hiệu ứng tia sáng / ngôi sao bung ra tại 1 điểm trong một layer bất kỳ */
function burstFx(layer,x,y,n=10,icon='sparkle',z=7500){ for(let i=0;i<n;i++){ const b=document.createElement('div'); b.className='burst'; b.style.cssText=`left:${x-9}px;top:${y-9}px;z-index:${z}`; b.innerHTML=sv(IP[icon],18); layer.appendChild(b);
    const a=Math.PI*2*i/n+Math.random()*.4, r=U.rand(28,56); b.animate([{transform:'translate(0,0) scale(.3)',opacity:1},{transform:`translate(${Math.cos(a)*r}px,${Math.sin(a)*r}px) scale(1.1) rotate(${U.ri(-90,90)}deg)`,opacity:1,offset:.6},{transform:`translate(${Math.cos(a)*r*1.3}px,${Math.sin(a)*r*1.3+10}px) scale(.6)`,opacity:0}],{duration:900,easing:'ease-out',fill:'forwards'});
    setTimeout(()=>b.remove(),950); } }

/* Helpers dùng chung giữa Start / Settings / Social (có mặt ở mọi trang) */
function oauthButtonsHTML(){
  return `<div class="oauth-row">
    <button class="btn full oauth-g" data-oauth="google">${sv(IP.google,20)} Đăng nhập Google</button>
    <button class="btn full oauth-d" data-oauth="discord">${sv(IP.discord,20)} Đăng nhập Discord</button>
  </div>`;
}
function bindOAuth(root){
  root.querySelectorAll('[data-oauth]').forEach(b=>{ b.onclick=()=>typeof Cloud!=='undefined'&&Cloud.signIn(b.dataset.oauth); });
}
function avHTML(p,s=40){
  const url=p&&p.avatar_url;
  return `<div class="face" style="width:${s}px;height:${s}px">${url?`<img class="av-img" src="${U.esc(url)}" referrerpolicy="no-referrer" alt="">`:sv(IP.donkey,s)}</div>`;
}
function fixAvatars(root){
  root.querySelectorAll('img.av-img').forEach(img=>{
    img.addEventListener('error',()=>{ const w=img.parentElement; if(w) w.innerHTML=sv(IP.donkey,w.clientWidth||40); },{once:true});
  });
}
function copyText(txt,okMsg){
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(txt).then(()=>UI.toast(okMsg)).catch(()=>UI.toast('Mã của bạn: '+txt));
  } else UI.toast('Mã của bạn: '+txt);
}

/* ---------- Theme giao diện miễn phí + Dark/Light Mode cho TẤT CẢ các Theme ---------- */
function applyTheme(themeOrObj, schemeOpt){
  let th=null, sc=null;
  if(themeOrObj && typeof themeOrObj==='object'){ th=themeOrObj.theme; sc=themeOrObj.scheme; }
  else { th=themeOrObj; sc=schemeOpt; }
  th=th||(typeof Core!=='undefined'&&Core.s&&Core.s.theme)||(typeof localStorage!=='undefined'&&localStorage.getItem('lc_theme'))||'classic';
  sc=sc||(typeof Core!=='undefined'&&Core.s&&Core.s.scheme)||(typeof localStorage!=='undefined'&&localStorage.getItem('lc_scheme'))||'light';
  if(th==='darkforest'){ th='forest'; sc='dark'; }
  sc=(sc==='dark'?'dark':'light');
  document.documentElement.dataset.theme=th;
  document.documentElement.dataset.scheme=sc;
}
function themePickerHTML(){
  const cur=(typeof Core!=='undefined'&&Core.s&&Core.s.theme)||document.documentElement.dataset.theme||'classic';
  const sc=(typeof Core!=='undefined'&&Core.s&&Core.s.scheme)||document.documentElement.dataset.scheme||'light';
  const isDark=sc==='dark';
  return `<div class="scheme-bar" style="margin-bottom:10px">
      <div class="seg">
        <button class="${!isDark?'on':''}" data-sc="light">${sv(IP.sun,15)} Chế độ Sáng (Light)</button>
        <button class="${isDark?'on':''}" data-sc="dark">${sv(IP.moon,15)} Chế độ Tối (Dark)</button>
      </div>
    </div>
    <div class="theme-grid">${DATA.THEMES.map(t=>{
    const on=t.id===cur, dots=(isDark&&t.dsw)?t.dsw:t.sw;
    return `<button class="theme-card card ${on?'on':''}" data-th="${t.id}">
      <div class="theme-dots">${dots.map(c=>`<i style="background:${c}"></i>`).join('')}</div>
      <b style="font-size:12.5px;line-height:1.15">${t.name}</b>
      <span class="muted" style="font-size:10.5px">${on?(isDark?'Đang dùng (Tối) ✓':'Đang dùng (Sáng) ✓'):'Sáng & Tối • Miễn phí'}</span>
    </button>`;
  }).join('')}</div>`;
}
function bindThemePicker(root,onPick){
  root.querySelectorAll('[data-sc]').forEach(b=>b.onclick=()=>{
    const sc=b.dataset.sc;
    Core.setScheme(sc); applyTheme(null,sc);
    UI.toast(sc==='dark'?'Đã bật Chế độ Tối (Dark Mode) 🌙':'Đã bật Chế độ Sáng (Light Mode) ☀️');
    onPick&&onPick();
  });
  root.querySelectorAll('[data-th]').forEach(b=>b.onclick=()=>{
    Core.setTheme(b.dataset.th); applyTheme(b.dataset.th);
    const t=DATA.THEMES.find(x=>x.id===b.dataset.th);
    UI.toast(`Đã đổi giao diện: ${t?t.name:b.dataset.th}`);
    onPick&&onPick();
  });
}
