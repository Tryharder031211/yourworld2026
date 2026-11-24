/* =============================================================================
   module-tycoon-tamly/shop.js — Cửa hàng nội thất (lọc theo phòng), mở hộp carton,
   Cửa hàng Ngoại thất Nhà (6 mẫu to/nhỏ đa theme), và thu nhập Tycoon toàn nhà.
   ============================================================================= */
'use strict';
const Shop={
  renderPanel(P,cat='all'){
    const list=Object.entries(DATA.DECOR).filter(([,d])=>cat==='all'||d.cat===cat);
    P.innerHTML=`<div class="row" style="gap:8px;width:max-content">${list.map(([id,d])=>`<div class="card" style="width:94px;padding:4px 3px;display:flex;flex-direction:column;align-items:center;box-shadow:1.5px 2px 0 ${C.dg}">${itemThumb(id,46)}<b style="font-size:11px;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:86px">${d.name}</b><span style="font-size:9.5px;font-weight:700;opacity:.7">+${d.comfort} ấm cúng</span><button class="btn sm moss" data-buy="${id}" style="margin-top:2px;padding:1px 8px">${sv(IP.gem,12)}${d.price}</button></div>`).join('')}</div>`;
    P.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>{ const id=b.dataset.buy; if(Core.buyDecor(id)){ const box=Core.s.decor.boxes[Core.s.decor.boxes.length-1]; this.openBox(box); } else UI.toast('Chưa đủ Gem — làm Quest đời thực để kiếm thêm nhé!'); });
  },
  renderHouses(P){
    const D=Core.s.decor;
    P.innerHTML=`<div class="row" style="gap:8px;width:max-content">${Object.entries(DATA.HOUSES).map(([id,h])=>{
      const own=D.housesOwned.includes(id), on=D.house===id;
      const preview=typeof SCENE!=='undefined'?`<div class="house-mini">${SCENE.houseOf(id)}</div>`:sv(IP.home,44);
      return `<div class="card ${on?'tint-active':''}" style="width:132px;padding:5px 6px;display:flex;flex-direction:column;align-items:center;gap:2px;${on?'border-color:var(--accent)':''}">
        ${preview}
        <b style="font-size:11px;line-height:1.1;text-align:center">${h.name}</b>
        <span style="font-size:9.5px;opacity:.75;font-weight:700">${h.size} • ${h.theme}${h.comfort?` • +${h.comfort}`:''}</span>
        ${on?'<span class="tag moss">Đang dùng ✓</span>':own?`<button class="btn sm pri" data-h="${id}" style="padding:1px 10px">Chọn nhà</button>`:`<button class="btn sm rose" data-h="${id}" style="padding:1px 8px">${sv(IP.gem,12)}${h.price}</button>`}
      </div>`;
    }).join('')}</div>`;
    P.querySelectorAll('[data-h]').forEach(b=>b.onclick=()=>{
      const id=b.dataset.h, h=DATA.HOUSES[id], r=Core.buyHouse(id);
      if(r.ok){
        if(r.bought){ burstFx(UI.app,UI.app.clientWidth/2,UI.app.clientHeight/2,16,'sparkle',120); UI.toast(`Chúc mừng mua ${h.name}! Ra sân để ngắm nhà mới nhé!`); }
        else UI.toast(`Đã đổi sang ${h.name}!`);
        Decor.renderPanel();
      } else UI.toast(r.msg);
    });
  },
  openBox(box){ if(!box) return; const d=DATA.DECOR[box.id];
    const m=UI.modal(`<div class="center"><h2 class="txt-accent">Hộp carton mới!</h2><p class="muted">Chạm vào hộp để mở</p>
      <div style="position:relative;height:190px;display:flex;align-items:flex-end;justify-content:center">
        <div id="popIt" style="position:absolute;bottom:70px;left:50%;transform:translateX(-50%);display:none"><div class="pop-item">${itemThumb(box.id,120)}</div></div>
        <svg class="carton" id="carton" width="120" height="110" viewBox="0 0 120 110" fill="none" stroke="${C.dg}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round">
          <path d="M14 40h92v62H14z" fill="#e0b27a"/><path d="M14 40h92" /><path d="M48 60h24" stroke-width="2"/><text x="60" y="88" font-size="11" font-weight="800" text-anchor="middle" fill="${C.dg}" stroke="none" font-family="Baloo 2,sans-serif">FRAGILE ♥</text>
          <path class="flapL" d="M14 40 L60 40 L54 22 L22 22 Z" fill="#d4a06a"/><path class="flapR" d="M60 40 L106 40 L98 22 L66 22 Z" fill="#d4a06a"/></svg></div>
      <h3 id="boxName" style="visibility:hidden">${d.name} <span class="tag moss">+${d.comfort} ấm cúng</span></h3>
      <div class="row" style="justify-content:center;margin-top:8px"><button class="btn" data-a="later">Để sau</button><button class="btn pri" data-a="place" disabled>Đặt vào phòng</button></div></div>`);
    const ct=m.box.querySelector('#carton'); ct.onclick=()=>{ ct.classList.add('open'); m.box.querySelector('#popIt').style.display=''; m.box.querySelector('#boxName').style.visibility='visible'; m.box.querySelector('[data-a=place]').disabled=false;
      const r=ct.getBoundingClientRect(), [x,y]=UI.rel(r.left+r.width/2,r.top+20); burstFx(UI.app,x,y,12,'sparkle',95); };
    m.box.querySelector('[data-a=later]').onclick=()=>{ m.close(); Decor.tab='boxes'; Decor.renderPanel(); };
    m.box.querySelector('[data-a=place]').onclick=()=>{ m.close(); Decor.startPlace(box.uid,box.id); }; },
  renderIncome(){ const el=document.getElementById('dInc'); if(!el) return; const inc=Core.income(), rate=Core.incomeRate();
    const elapsedMin=(Date.now()-Core.s.decor.lastCollect)/60e3, minPerGem=60/Math.max(1,rate), leftMin=Math.max(1,Math.ceil(minPerGem-(elapsedMin%minPerGem)));
    el.innerHTML=`${sv(IP.heart,15)} <b>${Core.comfort()}</b> • +${rate}/h ${inc>0?`<span class="tag rose coin-pop">${sv(IP.gem,11)} Thu ${inc}</span>`:`<span class="tag">~${leftMin}p nữa</span>`}`; },
  collect(){ const g=Core.collect(); const el=document.getElementById('dInc');
    if(g>0){ const r=el.getBoundingClientRect(), [x,y]=UI.rel(r.left+r.width/2,r.top+r.height/2); burstFx(UI.app,x,y,14,'gem',95); UI.toast(`Ngôi nhà ấm cúng sinh lời: +${g} Gem!`); }
    else UI.toast('Nhà đang tích lũy Gem... Mở thêm phòng, mua nhà lớn hoặc đặt nội thất để tăng điểm!'); this.renderIncome(); }
};
