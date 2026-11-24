/* =============================================================================
   module-suc-khoe/sleep-lock.js — Khóa giờ ngủ 8 tiếng (người dùng chọn giờ ngủ,
   giờ dậy = +8h), điểm danh trong cửa sổ 8 tiếng sau khi dậy, và Màn hình Khóa OS
   có nút truy cập trực tiếp Bảng tùy chỉnh thời gian sử dụng.
   ============================================================================= */
'use strict';

const SleepLock={
  ciRow(){ const s=Core.s, wd=['CN','T2','T3','T4','T5','T6','T7'];
    return `<div class="ci-row">${[-6,-5,-4,-3,-2,-1,0].map(o=>{ const k=U.addDays(s.day,o), [y,m,d]=k.split('-').map(Number), dt=new Date(y,m-1,d);
      const done=s.checkin.hist.includes(k), today=o===0&&!done; return `<div class="ci-day ${done?'done':''} ${today?'today':''}">${wd[dt.getDay()]}<b>${done?'✓':d}</b></div>`; }).join('')}</div>`; },
  ciParts(p){ return `<div class="ci-parts card" style="padding:8px 10px;text-align:left">${p.parts.map(([n,g])=>`<div class="ln"><span>${n}</span><span>+${g} ${sv(IP.gem,13)}</span></div>`).join('')}<div class="divider" style="margin:4px 0"></div><div class="ln"><b>Tổng thưởng</b><b>+${p.gem} Gem</b></div></div>`; },
  winClose(wake){ return U.hToHm(U.hmToH(wake)+DATA.CHECKIN_WINDOW); },
  leftText(h){ const m=Math.max(1,Math.round(h*60)); return m>=60?`${Math.floor(m/60)}h${U.pad(m%60)}`:`${m} phút`; },

  /* Tab "Giấc ngủ" trong health.html */
  render(el){ let bed=Core.s.sleep.bed;
    const draw=()=>{ const s=Core.s, inBed=Core.isBedtime(), m=Core.minsToBed();
      const wake=U.hToHm(U.hmToH(bed)+DATA.SLEEP_HOURS), closeAt=this.winClose(s.sleep.wake);
      const doneToday=s.checkin.last===s.day, can=Core.canCheckIn(), pv=can?Core.checkInPreview():null;
      el.innerHTML=`<div class="card h-hero ${inBed?'tint-teal':''}">${sv(IP.bedtime,44)}
          <div class="grow"><b style="font-size:16px">${inBed?(s.night.broken?'Đang thức khuya quá giờ ngủ!':'Đang trong giờ ngủ 🌙'):`Còn ${Math.floor(m/60)}h${U.pad(m%60)} đến giờ ngủ`}</b>
            <div class="muted">Ngủ đủ ${DATA.SLEEP_HOURS} tiếng: <b>${s.sleep.bed} → ${s.sleep.wake}</b> • Streak ngủ ngon <b>${s.sleep.streak}</b> ngày</div></div></div>

        <div class="h-grid">
          <div class="card" style="padding:12px">
            <b>${sv(IP.moon,18)} Chọn giờ đi ngủ</b>
            <div class="time-pick" id="pkBed">${DATA.BED_OPTIONS.map(t=>`<button data-b="${t}" class="${t===bed?'on':''}">${t}</button>`).join('')}</div>
            <div class="row" style="margin:10px 0 8px;flex-wrap:wrap;gap:6px">
              <span class="tag moss">${sv(IP.sunrise,13)} Dậy dự kiến: ${wake} (ngủ đủ ${DATA.SLEEP_HOURS}h)</span>
              <span class="tag mid">Điểm danh: ${wake} → ${this.winClose(wake)}</span>
            </div>
            <button class="btn pri full" data-a="save" ${bed===s.sleep.bed?'disabled':''}>Lưu giờ ngủ (${bed} → ${wake})</button>
            <p class="muted" style="margin-top:6px">Khóa các app theo chế độ đang chọn trong 8 tiếng ngủ. Không thể đổi lịch khi đang trong giờ khóa.</p>
          </div>

          <div class="card" style="padding:12px">
            <div class="row"><b class="grow">${sv(IP.calendar,18)} Điểm danh (khung 8 tiếng)</b><span class="tag">${sv(IP.fire,12)} ${s.checkin.streak} ngày</span></div>
            <div class="muted" style="margin-top:3px">Mở từ <b>${s.sleep.wake}</b> đến <b>${closeAt}</b> • Dậy trong 60' đầu nhận thêm <b>+15 Gem</b></div>
            ${this.ciRow()}
            ${doneToday?`<p class="center txt-accent" style="font-weight:800;margin-top:6px">Đã điểm danh hôm nay ✓ Hẹn gặp lại sáng mai!</p>`
              :can?`${this.ciParts(pv)}
                <div class="muted center" style="margin-top:6px">Còn <b>${this.leftText(pv.leftH)}</b> để điểm danh hôm nay</div>
                <button class="btn rose full big" style="margin-top:8px" data-a="ci">${sv(IP.calendar,22)} Điểm danh +${pv.gem} Gem</button>`
              :`<div class="card center tint-cream" style="padding:10px;margin-top:6px">
                  <b>${inBed?'Đang giờ ngủ — sáng mai nhớ điểm danh nhé!':'Đã qua khung điểm danh 8 tiếng hôm nay'}</b>
                  <div class="muted">Khung hợp lệ: ${s.sleep.wake} → ${closeAt} (tối đa ${DATA.CHECKIN_WINDOW} tiếng sau khi dậy)</div>
                </div>`}
          </div>
        </div>

        <div class="card" style="padding:12px;margin-top:10px"><b>Giấc ngủ 7 đêm qua</b>
          <div class="row" style="gap:6px;margin-top:6px;flex-wrap:wrap">${(s.sleep.hist.slice(-7).length?s.sleep.hist.slice(-7):[]).map(h=>`<div class="night-dot" style="background:${h.q==='good'?C.mg:C.rb}" title="${h.day}">${sv(IP[h.q==='good'?'moon':'bolt'],14)}</div>`).join('')||'<span class="muted">Chưa có dữ liệu — tối nay bắt đầu nhé!</span>'}</div></div>

        <div class="card tint-teal" style="padding:12px;margin-top:10px"><b>Luôn được phép trong giờ ngủ</b>
          <div class="row" style="margin-top:6px;flex-wrap:wrap;gap:8px">
            <button class="btn sm moss" data-wl="call">${sv(IP.call,16)} Cuộc gọi khẩn cấp (113 / 114 / 115)</button>
            ${emergencySummaryTags()}
          </div></div>`;
      el.querySelectorAll('[data-b]').forEach(b=>b.onclick=()=>{ bed=b.dataset.b; draw(); });
      el.querySelectorAll('[data-wl]').forEach(b=>b.onclick=()=>Overlays.whitelist(b.dataset.wl));
      const sv_=el.querySelector('[data-a=save]');
      if(sv_) sv_.onclick=()=>{ const r=Core.setSleepCfg(bed); UI.toast(r.ok?`Đã lưu lịch ngủ ${bed} → ${r.wake} (ngủ đủ ${DATA.SLEEP_HOURS} tiếng)`:r.msg); if(!r.ok) bed=Core.s.sleep.bed; draw(); };
      const ci=el.querySelector('[data-a=ci]');
      if(ci) ci.onclick=()=>{ const r=Core.checkIn(); if(r.ok){ Core.s.pendingMorning=null; Core.save(); burstFx(UI.app,UI.app.clientWidth/2,UI.app.clientHeight/2,16,'gem',140); UI.toast(`Điểm danh thành công! +${r.gem} Gem • Chuỗi ${r.streak} ngày`); } draw(); }; };
    draw(); const off=Core.on('change',()=>{ if(!el.querySelector('.time-pick button:focus')) draw(); }); return off; }
};

function emergencyListNames(){
  const b=Core.s.block;
  if(b.mode!=='lockdown') return [];
  if(Bridge.electron) return (b.emergencyPc||[]).slice(0,3).map(x=>x.name||x.pkg||x);
  if(Bridge.android) return (b.emergency||[]).slice(0,3).map(x=>x.name||x.pkg||x);
  return (b.emergencyWeb||[]).slice(0,3);
}
function emergencySummaryTags(){
  const list=emergencyListNames();
  if(list.length) return list.map(n=>`<span class="tag">${U.esc(n)}</span>`).join('');
  return `<span class="muted" style="font-size:12px">Chế độ hiện tại: ${Core.blockModeLabel()}</span>`;
}
function emergencyBadgesHTML(){
  const em=emergencyListNames().map(n=>`<div class="os-app wl"><div class="app-ic" style="background:${C.mg}">${sv(IP.shield,26)}</div><span>${U.esc(String(n).slice(0,12))}</span></div>`).join('');
  return `${em}<div class="os-app wl" data-wl="call" style="cursor:pointer">${appIcon('call')}<span>Gọi khẩn cấp</span></div>`;
}

function lockedBadgesHTML(){
  const b=Core.s.block, mode=b.mode||'apps';
  if(mode==='lockdown'){
    return `<div class="os-app locked"><div class="app-ic" style="background:${C.mn}">${sv(IP.shield,28)}<span class="lk">${sv(IP.lock,20)}</span></div><span>Toàn bộ app</span></div>`;
  }
  const fKey=Bridge.electron?'pc':'android';
  if(Bridge.nativeApps){
    const arr=mode==='groups'?(b.groups||[]).flatMap(g=>g[fKey]||[]):(b[fKey]||[]);
    if(arr.length) return arr.slice(0,5).map(a=>`<div class="os-app locked"><div class="app-ic" style="background:${C.mn}">${sv(IP.shield,28)}<span class="lk">${sv(IP.lock,20)}</span></div><span>${U.esc((a.name||a.pkg||a).slice(0,12))}</span></div>`).join('');
  }
  const webIds=mode==='groups'?[...new Set((b.groups||[]).flatMap(g=>g.web||[]))]:(b.web||[]);
  const picked=DATA.WEB_APPS.filter(a=>webIds.includes(a.id)).slice(0,5);
  if(!picked.length) return ['tiktok','fb','ig','yt','game'].map(k=>`<div class="os-app locked">${appIcon(k,true)}<span>${APPS[k].n}</span></div>`).join('');
  return picked.map(a=>`<div class="os-app locked">${APPS[a.icon]?appIcon(a.icon,true):`<div class="app-ic" style="background:${C.mn}">${sv(IP[a.icon]||IP.shield,28)}<span class="lk">${sv(IP.lock,20)}</span></div>`}<span>${a.name}</span></div>`).join('');
}

const Overlays={
  /* Màn hình khóa OS (hết giờ màn hình) — hiển thị đúng cơ chế khóa của chế độ đang bật */
  screen(on,info={}){ const o=document.getElementById('ovScreen'); if(!on){ o.classList.remove('on'); return; } const s=Core.s, mode=info.mode||s.block.mode||'apps';
    const subMsg=mode==='lockdown'
      ?`Bạn đã dùng hết <b>${Math.floor((s.screen.limit+(s.screen.extra||0))/60)}h${U.pad((s.screen.limit+(s.screen.extra||0))%60)}</b> giới hạn hằng ngày • Chế độ <b>Khóa toàn bộ hằng ngày</b> (chỉ mở 3 app khẩn cấp).`
      :mode==='groups'
      ?`${info.site?`<b>${U.esc(info.site)}</b> đã chạm giới hạn nhóm`:'Một nhóm ứng dụng đã hết quỹ giờ'}${info.limit?` (${info.limit}p)`:''}. Các nhóm khác vẫn hoạt động bình thường.`
      :`${info.site?`<b>${U.esc(info.site)}</b> đã chạm giới hạn riêng`:'Ứng dụng đã chạm giới hạn riêng'}${info.limit?` (${info.limit}p)`:''}. Các ứng dụng khác vẫn hoạt động bình thường.`;
    o.innerHTML=`<div class="os-bar"><span>${U.hm(Core.now())}</span><span class="row" style="gap:6px">LừaOS • Bảo vệ<button class="icon-btn" data-a="usage" style="width:30px;height:30px;border-radius:9px" title="Tùy chỉnh thời gian sử dụng">${sv(IP.clock,18)}</button><button class="icon-btn" data-a="set" style="width:30px;height:30px;border-radius:9px" title="Cài đặt">${sv(IP.gear,18)}</button></span></div>
      <div class="ov-inner">
        <div class="center" style="margin-top:12px"><div style="display:inline-grid;place-items:center;width:82px;height:82px;border-radius:50%;background:#F7F4D5;border:3px solid ${C.rb};box-shadow:0 0 24px #D3968C88">${sv(IP.lock,50)}</div>
          <h2 style="font-size:24px;margin-top:8px">${info.site?U.esc(info.site)+' đã bị khóa!':mode==='lockdown'?'Hết giới hạn hằng ngày!':'Đã chạm giới hạn sử dụng!'}</h2>
          <p style="opacity:.9;font-weight:600">${subMsg}</p></div>
        <div class="os-grid" style="margin:14px 0">${lockedBadgesHTML()}${emergencyBadgesHTML()}</div>
        <div class="card" style="padding:12px;margin-bottom:10px">
          <div class="row" style="margin-bottom:6px">${sv(IP.clock,20)}<b class="grow" style="font-size:14.5px">Tùy chỉnh thời gian sử dụng & Chế độ khóa</b></div>
          <p class="muted">Đang bật: <b>${Core.blockModeLabel(mode)}</b>. Bạn có thể chuyển sang chế độ khác hoặc điều chỉnh giới hạn riêng của từng chế độ.</p>
          <button class="btn moss full" data-a="usage" style="margin-top:8px">${sv(IP.clock,18)} Mở Bảng tùy chỉnh thời gian</button>
        </div>
        <div class="card" style="padding:12px"><b style="font-size:15px">Muốn thêm +5 phút & +10 Gem?</b><p class="muted">Hoàn thành 1 Quest đời thực (kèm ảnh xác nhận) để nhận thêm 5 phút cho chế độ đang bật.</p><button class="btn pri full" data-a="quest" style="margin-top:8px">${sv(IP.quest,20)} Làm 1 Quest đời thực</button></div>
        <button class="btn ghost full" style="color:#F7F4D5;border-color:#F7F4D5;margin-top:10px" data-a="close">Quay lại chăm vườn (app lành mạnh)</button>
      </div>`;
    o.classList.add('on');
    o.querySelector('[data-a=set]').onclick=()=>openSettings();
    o.querySelectorAll('[data-a=usage]').forEach(b=>b.onclick=()=>openUsageSettings('mode'));
    o.querySelector('[data-a=quest]').onclick=()=>openQuests();
    o.querySelector('[data-a=close]').onclick=()=>{ o.classList.remove('on'); if(document.body.dataset.page!=='index') Nav.go('home'); };
    o.querySelectorAll('[data-wl]').forEach(e=>e.onclick=()=>this.whitelist(e.dataset.wl)); },

  whitelist(){
    const m=UI.modal(`<div class="center"><div style="display:inline-block">${appIcon('call')}</div><h2>Cuộc gọi khẩn cấp</h2><p class="muted">Luôn được phép ngay cả khi đang trong giờ khóa.</p><div class="grid3" style="margin-top:10px">${['113 Công an','114 Cứu hỏa','115 Cấp cứu'].map(t=>`<button class="btn moss" data-call="${t.split(' ')[0]}">${t}</button>`).join('')}</div><button class="btn full" style="margin-top:10px" data-x>Đóng</button></div>`);
    m.box.querySelector('[data-x]').onclick=()=>m.close();
    m.box.querySelectorAll('[data-call]').forEach(b=>b.onclick=()=>{ if(Bridge.android) location.href='tel:'+b.dataset.call; else UI.toast(`Số điện thoại khẩn cấp: ${b.dataset.call}`); }); },

  bed(on){ const o=document.getElementById('ovBed'); if(!on){ o.classList.remove('on'); return; } const s=Core.s, slept=s.night.slept;
    o.innerHTML=`<div class="os-bar"><span>${U.hm(Core.now())}</span><span class="row" style="gap:6px">${sv(IP.moon,14)} Chế độ Ngủ<button class="icon-btn" data-a="usage" style="width:30px;height:30px;border-radius:9px" title="Tùy chỉnh thời gian sử dụng">${sv(IP.clock,18)}</button><button class="icon-btn" data-a="set" style="width:30px;height:30px;border-radius:9px" title="Cài đặt">${sv(IP.gear,18)}</button></span></div>
      <div class="ov-inner center">
        <div class="moon" style="margin-top:6px">${sv(IP.moon,54)}</div>
        <div style="font-size:46px;font-weight:800;line-height:1" id="bedTime">${U.hm(Core.now())}</div>
        <h2 style="font-size:21px;margin-top:4px">${slept?'Chúc ngủ ngon, '+U.esc(s.name)+'!':'Đến giờ ngủ rồi, '+U.esc(s.name)+' ơi!'}</h2>
        <p style="opacity:.88;font-weight:600">${slept?`Ngủ đủ 8 tiếng! Từ ${s.sleep.wake} đến ${SleepLock.winClose(s.sleep.wake)} nhớ vào <b>Điểm danh</b> nhận Gem nhé!`:`Giờ ngủ đã chọn: <b>${s.sleep.bed}</b>. Khóa theo chế độ <b>${Core.blockModeLabel()}</b> đến <b>${s.sleep.wake}</b>.`}</p>
        <div id="bedDk" style="position:relative;height:112px;width:200px;margin:0 auto"></div>
        <div style="font-size:11px;font-weight:800;opacity:.8;letter-spacing:.5px">LUÔN ĐƯỢC PHÉP</div>
        <div class="row" style="justify-content:center;gap:18px;margin:6px 0 12px;flex-wrap:wrap">${emergencyBadgesHTML()}</div>
        <div class="col" style="gap:10px;margin-top:6px">
          <button class="btn full" data-a="usage" style="background:rgba(247,244,213,.16);color:#F7F4D5;border-color:#F7F4D5">${sv(IP.clock,18)} Bảng tùy chỉnh thời gian & Đồng hồ</button>
          ${slept?`<p class="muted" style="color:#b9d3d6">Chế độ ngủ đang bật. Chạm nút trên nếu cần xem bảng thời gian hoặc cài đặt.</p>`
            :`<button class="btn moss big full" data-a="sleep">${sv(IP.moon,24)} Đi ngủ (Tắt máy)</button>
              <button class="btn full hold-btn" data-a="break" style="background:#ffffff22;color:#F7F4D5;border-color:#F7F4D5"><i></i><span>Giữ 2 giây để phá khóa (thức khuya)</span></button>`}
        </div>
      </div>`;
    o.classList.add('on');
    o.querySelector('[data-a=set]').onclick=()=>openSettings();
    o.querySelectorAll('[data-a=usage]').forEach(b=>b.onclick=()=>openUsageSettings('mode'));
    const dk=new Donkey({scale:1.25,tilt:-16,yaw:20,mood:slept?'sleep':'tired',acc:Core.s.acc.on}); dk.pos(100,102); o.querySelector('#bedDk').appendChild(dk.el);
    o.querySelectorAll('[data-wl]').forEach(e=>e.onclick=()=>this.whitelist(e.dataset.wl));
    const sl=o.querySelector('[data-a=sleep]'); if(sl) sl.onclick=()=>{ Core.goSleep(); this.bed(true); };
    const br=o.querySelector('[data-a=break]'); if(br){ let t=null, k=0; const bar=br.querySelector('i');
      const stop=()=>{ clearInterval(t); t=null; k=0; bar.style.width='0'; };
      br.onpointerdown=e=>{ e.preventDefault(); stop(); t=setInterval(()=>{ k+=50; bar.style.width=(k/2000*100)+'%'; if(k>=2000){ stop(); Core.breakBedLock(); UI.toast('Bạn đã phá khóa giờ ngủ... Sáng mai giấc ngủ sẽ bị đánh giá "không ngon" 🥱'); } },50); };
      br.onpointerup=br.onpointerleave=br.onpointercancel=stop; } },

  /* Buổi sáng: tổng kết giấc ngủ + ĐIỂM DANH trong 8 tiếng */
  morning(pm){ const o=document.getElementById('ovMorning'); const s=Core.s;
    if(!pm && !Core.canCheckIn()){ o.classList.remove('on'); return; }
    const q=pm?pm.q:(s.sleep.lastDay===s.day?s.sleep.last:null), good=q!=='bad';
    const draw=()=>{ const can=Core.canCheckIn(), pv=can?Core.checkInPreview():null;
      o.innerHTML=`<div class="morning-card card ${good?'good':'bad'}">${good?'<div class="sun-rays"></div>':''}
        <div style="position:relative">${good?sv(IP.sunrise,42):''}<h2 class="txt-accent" style="font-size:24px">${q==='bad'?'Ôi... ngáp ngắn ngáp dài':'Chào buổi sáng!'}</h2>
        <p style="font-weight:700">${q==='good'?`<b>Giấc ngủ NGON</b> — bạn đã ngủ đủ ${DATA.SLEEP_HOURS} tiếng từ ${s.sleep.bed}`:q==='bad'?`<b>Giấc ngủ KHÔNG NGON</b> — thức khuya quá ${s.sleep.bed}`:`Điểm danh trong ${DATA.CHECKIN_WINDOW} tiếng (${s.sleep.wake} → ${SleepLock.winClose(s.sleep.wake)}) để nhận Gem!`}</p>
        <div id="mDk" style="position:relative;height:122px"></div>
        ${q==='good'?`<div class="row" style="justify-content:center;gap:6px;flex-wrap:wrap"><span class="tag moss">${sv(IP.bolt,12)} Năng lượng 100%</span><span class="tag moss">+20% Gem Quest</span><span class="tag">${sv(IP.fire,12)} Ngủ ngon ${s.sleep.streak} ngày</span></div>`
          :q==='bad'?`<div class="row" style="justify-content:center;gap:6px;flex-wrap:wrap"><span class="tag rose">${sv(IP.bolt,12)} Năng lượng 40%</span><span class="tag rose">Mất streak • không buff</span></div>
            <div class="card" style="padding:8px 10px;margin-top:8px;text-align:left"><b>Gợi ý hồi phục nhẹ nhàng</b><div class="row" style="margin-top:4px;flex-wrap:wrap;gap:8px">${sv(IP.glass,18)}<span>Uống nước ấm</span>${sv(IP.run,18)}<span>Giãn cơ 5'</span>${sv(IP.sun,18)}<span>Phơi nắng sáng</span></div></div>`:''}
        <div class="card" style="padding:8px 10px;margin-top:10px;text-align:left"><div class="row"><b class="grow">${sv(IP.calendar,18)} Điểm danh (${s.sleep.wake} → ${SleepLock.winClose(s.sleep.wake)})</b><span class="tag">${sv(IP.fire,12)} ${s.checkin.streak} ngày</span></div>${SleepLock.ciRow()}${can?SleepLock.ciParts(pv):''}</div>
        ${can?`<button class="btn rose big full" style="margin-top:10px" data-a="ci">${sv(IP.calendar,24)} Điểm danh +${pv.gem} Gem</button>`:`<button class="btn pri big full" style="margin-top:10px" data-a="ok">${q==='bad'?'Mình sẽ ngủ sớm hơn':'Bắt đầu ngày mới!'}</button>`}</div></div>`;
      const dk=new Donkey({scale:1.45,tilt:-14,yaw:18,mood:q==='bad'?'tired':'happy',acc:s.acc.on}); dk.pos(o.querySelector('#mDk').clientWidth/2||170,114); o.querySelector('#mDk').appendChild(dk.el);
      if(good) for(let i=0;i<6;i++){ const sp=document.createElement('div'); sp.className='sparkle'; sp.style.cssText=`left:${U.ri(15,85)}%;top:${U.ri(10,80)}px;animation-delay:${Math.random()*1.5}s`; sp.innerHTML=sv(IP.sparkle,18); o.querySelector('#mDk').appendChild(sp); }
      const ci=o.querySelector('[data-a=ci]'); if(ci) ci.onclick=()=>{ const r=Core.checkIn(); if(r.ok){ const rc=ci.getBoundingClientRect(), [x,y]=UI.rel(rc.left+rc.width/2,rc.top); burstFx(UI.app,x,y,16,'gem',140); UI.toast(`Điểm danh thành công! +${r.gem} Gem • Chuỗi ${r.streak} ngày`); } draw(); };
      const ok=o.querySelector('[data-a=ok]'); if(ok) ok.onclick=()=>{ s.pendingMorning=null; Core.save(); o.classList.remove('on'); }; };
    o.classList.add('on'); draw(); }
};
