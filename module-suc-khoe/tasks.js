/* =============================================================================
   module-suc-khoe/tasks.js — Quest Đời Thực ngẫu nhiên mỗi ngày (6 Quest chọn từ
   kho 24 nhiệm vụ đa dạng + 2 lượt đổi ngẫu nhiên/ngày + xác nhận bằng ảnh).
   Tasks.render(el) dùng trong tab "Nhiệm vụ" của health.html; openQuests() mở dạng sheet ở mọi trang.
   ============================================================================= */
'use strict';
function thumbify(file){ return new Promise(res=>{ const fr=new FileReader(); fr.onerror=()=>res(null);
  fr.onload=()=>{ const img=new Image(); img.onerror=()=>res(null); img.onload=()=>{ const S=150, cv=document.createElement('canvas'); cv.width=cv.height=S; const m=Math.min(img.width,img.height);
    cv.getContext('2d').drawImage(img,(img.width-m)/2,(img.height-m)/2,m,m,0,0,S,S); res(cv.toDataURL('image/jpeg',.72)); }; img.src=fr.result; }; fr.readAsDataURL(file); }); }
const Tasks={
  html(){
    const list=Core.todayQuests(), n=Core.questCount(), tot=list.length, s=Core.s, rerolls=Core.questRerollsLeft();
    return `<div class="card" style="padding:10px 12px;margin-bottom:12px">
        <div class="row" style="margin-bottom:4px;flex-wrap:wrap">
          <b class="grow">Quest ngẫu nhiên hôm nay</b>
          <span class="tag mid">Đổi mới mỗi ngày</span>
          <b class="txt-accent">${n}/${tot} Quest</b>
        </div>
        ${UI.bar(n/Math.max(1,tot)*100)}
        <div class="muted" style="margin-top:5px">
          Tự động chọn ngẫu nhiên 6 nhiệm vụ mới mỗi sáng (${DATA.QUESTS.length} nhiệm vụ trong kho) • Lượt đổi riêng hôm nay: <b>${rerolls}/${DATA.DAILY_REROLLS}</b>
          <br>${Core.hasBuff()?`<b>Buff Ngủ Ngon đang bật:</b> +20% Gem từ Quest hôm nay!`:`Tắt máy trước ${s.sleep.bed} để sáng mai nhận buff +20% Gem.`}
          ${Core.hasAnyLimitLock()?`<br><b class="txt-danger">Đang chạm giới hạn khóa → hoàn thành 1 Quest để nhận +5 phút & +10 Gem.</b>`:''}
        </div>
      </div>`+
      list.map(q=>{
        const d=s.quests.done[q.id], catLbl=DATA.QUEST_CATS[q.cat]||'Đời thực';
        return `<div class="li card ${d?'q-done':''}">
          <div class="tick-wrap">${d&&d.photo?`<img class="thumb" src="${d.photo}" alt="">`:`<div class="thumb" style="display:grid;place-items:center;background:var(--surface)">${sv(IP[q.icon]||IP.quest,32)}</div>`}${d?`<span class="tk">${sv(IP.check,24)}</span>`:''}</div>
          <div class="grow" style="min-width:0">
            <div class="t" style="white-space:normal">${q.name}</div>
            <div class="row" style="gap:4px;margin-top:3px;flex-wrap:wrap">
              <span class="tag">${sv(IP.gem,13)} +${Core.questGem(q.id)}</span>
              <span class="tag ${q.cat==='care'?'mid':''}">${catLbl}</span>
              ${d?`<span class="tag moss">${d.photo?'Đã gửi ảnh':'Tự động từ game'}</span>`:''}
            </div>
          </div>
          <div class="row" style="gap:5px;flex:none">
            ${!d && rerolls>0?`<button class="btn sm" data-reroll="${q.id}" title="Đổi sang Quest ngẫu nhiên khác">↻</button>`:''}
            ${d&&d.photo?'':`<label class="btn sm ${d?'':'pri'}" style="flex-direction:column;gap:0;padding:4px 8px">${sv(IP.camera,20)}<span style="font-size:11px">${d?'Thêm ảnh':'Chụp / Gửi ảnh'}</span><input type="file" accept="image/*" capture="environment" data-q="${q.id}" hidden></label>`}
          </div>
        </div>`;
      }).join('')+
      `<p class="muted center">Ảnh xác nhận chỉ lưu trên máy bạn (localStorage), không gửi đi đâu.</p>`;
  },
  /* Vẽ vào 1 phần tử; trả về hàm hủy lắng nghe */
  render(el){
    let sig='';
    const curSig=()=>{ const q=Core.s&&Core.s.quests; return JSON.stringify([Core.todayQuestIds(),Object.keys((q&&q.done)||{}),Core.questRerollsLeft(),Core.hasBuff(),Core.hasAnyLimitLock()]); };
    const draw=()=>{
      sig=curSig();
      el.innerHTML=this.html();
      el.querySelectorAll('[data-reroll]').forEach(b=>b.onclick=()=>{
        const r=Core.rerollQuest(b.dataset.reroll);
        if(r.ok) UI.toast(`Đã đổi Quest mới: <b>${U.esc(r.next.name)}</b> (còn ${r.left} lượt hôm nay)`);
        else UI.toast(r.msg);
      });
      el.querySelectorAll('input[data-q]').forEach(inp=>inp.onchange=async()=>{
        const f=inp.files[0]; if(!f) return;
        const url=await thumbify(f);
        const r=Core.completeQuest(inp.dataset.q,url);
        if(r.ok){
          UI.toast(`${sv(IP.check,20)} Tuyệt vời! +${r.g} Gem${r.bonus?' • +5 phút màn hình & +10 Gem':''}`);
          burstFx(UI.app,UI.app.clientWidth/2,UI.app.clientHeight/2,12,'star',140);
        } else draw();
      });
    };
    draw();
    const off1=Core.on('quest',draw);
    const off2=Core.on('change',()=>{ if(curSig()!==sig) draw(); });
    return ()=>{ off1(); off2(); };
  }
};
function openQuests(){ const sh=UI.sheet({title:'Quest Ngẫu Nhiên Hôm Nay',icon:'quest'}); sh.track(Tasks.render(sh.body)); }
