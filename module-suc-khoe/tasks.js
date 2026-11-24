/* =============================================================================
   module-suc-khoe/tasks.js — Quest Đời Thực: checklist + Progress Bar tổng + xác nhận bằng ảnh.
   Tasks.render(el) dùng trong tab "Nhiệm vụ" của health.html; openQuests() mở dạng sheet ở mọi trang.
   ============================================================================= */
'use strict';
function thumbify(file){ return new Promise(res=>{ const fr=new FileReader(); fr.onerror=()=>res(null);
  fr.onload=()=>{ const img=new Image(); img.onerror=()=>res(null); img.onload=()=>{ const S=150, cv=document.createElement('canvas'); cv.width=cv.height=S; const m=Math.min(img.width,img.height);
    cv.getContext('2d').drawImage(img,(img.width-m)/2,(img.height-m)/2,m,m,0,0,S,S); res(cv.toDataURL('image/jpeg',.72)); }; img.src=fr.result; }; fr.readAsDataURL(file); }); }
const Tasks={
  html(){ const n=Core.questCount(), tot=DATA.QUESTS.length, s=Core.s;
    return `<div class="card" style="padding:10px 12px;margin-bottom:12px"><div class="row" style="margin-bottom:4px"><b class="grow">Tiến độ hôm nay</b><b style="color:${C.mn}">${n}/${tot} Quest</b></div>${UI.bar(n/tot*100)}
      <div class="muted" style="margin-top:5px">${Core.hasBuff()?`<b>Buff Ngủ Ngon đang bật:</b> +20% Gem từ Quest hôm nay!`:`Tắt máy trước ${s.sleep.bed} để sáng mai nhận buff +20% Gem.`}${s.screen.locked?`<br><b style="color:#a5584c">Đang khóa màn hình → hoàn thành 1 Quest để nhận +5 phút & +10 Gem.</b>`:''}</div></div>`+
      DATA.QUESTS.map(q=>{ const d=s.quests.done[q.id];
        return `<div class="li card ${d?'q-done':''}"><div class="tick-wrap">${d&&d.photo?`<img class="thumb" src="${d.photo}" alt="">`:`<div class="thumb" style="display:grid;place-items:center;background:${C.bg}">${sv(IP[q.icon],32)}</div>`}${d?`<span class="tk">${sv(IP.check,24)}</span>`:''}</div>
        <div class="grow"><div class="t">${q.name}</div><div class="row" style="gap:4px;margin-top:3px;flex-wrap:wrap"><span class="tag">${sv(IP.gem,13)} +${Core.questGem(q.id)}</span>${d?`<span class="tag moss">${d.photo?'Đã gửi ảnh':'Tự động từ game'}</span>`:''}</div></div>
        ${d&&d.photo?'':`<label class="btn sm ${d?'':'pri'}" style="flex-direction:column;gap:0;padding:4px 8px">${sv(IP.camera,20)}<span style="font-size:11px">${d?'Thêm ảnh':'Chụp / Gửi ảnh'}</span><input type="file" accept="image/*" capture="environment" data-q="${q.id}" hidden></label>`}</div>`; }).join('')+
      `<p class="muted center">Ảnh xác nhận chỉ lưu trên máy bạn (localStorage), không gửi đi đâu.</p>`; },
  /* Vẽ vào 1 phần tử; trả về hàm hủy lắng nghe */
  render(el){ const draw=()=>{ el.innerHTML=this.html();
      el.querySelectorAll('input[data-q]').forEach(inp=>inp.onchange=async()=>{ const f=inp.files[0]; if(!f) return; const url=await thumbify(f); const r=Core.completeQuest(inp.dataset.q,url);
        if(r.ok){ UI.toast(`${sv(IP.check,20)} Tuyệt vời! +${r.g} Gem${r.bonus?' • +5 phút màn hình & +10 Gem':''}`); burstFx(UI.app,UI.app.clientWidth/2,UI.app.clientHeight/2,12,'star',140); } else draw(); }); };
    draw(); return Core.on('quest',draw); }
};
function openQuests(){ const sh=UI.sheet({title:'Quest Đời Thực',icon:'quest'}); sh.track(Tasks.render(sh.body)); }
