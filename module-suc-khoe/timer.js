/* =============================================================================
   module-suc-khoe/timer.js — Giới hạn thời gian màn hình + CHỌN ỨNG DỤNG / WEB BỊ CHẶN.
   • Android app: đọc danh sách app cài trên máy + kiểm tra quyền UsageStats / Accessibility.
   • Chrome Extension: chọn trang mạng xã hội / thêm tên miền tùy chỉnh → background.js chặn thật.
   • Web/PWA: lưu cấu hình sẵn (chỉ chặn trong app; cài bản Android / Chrome Ext để chặn hệ thống).
   ============================================================================= */
'use strict';

const Timer={
  SIM_SPLIT:[['tiktok',.4],['fb',.25],['ig',.2],['yt',.15]],
  SITE_ICON:{'facebook.com':'fb','fb.com':'fb','tiktok.com':'tiktok','instagram.com':'ig','youtube.com':'yt','shopee.vn':'cart','lazada.vn':'cart'},
  _apps:null, _filter:'',

  rows(){ const s=Core.s, sc=s.screen, locked=sc.locked||(Core.isBedtime()&&!s.night.broken), lim=Math.max(1,sc.limit+sc.extra);
    if(Bridge.android||Bridge.ext){
      const sites=Object.entries(sc.sites||{});
      if(!sites.length) return `<p class="muted">Chưa ghi nhận phút nào trên các ứng dụng đã chặn hôm nay. Giỏi lắm!</p>`;
      return sites.sort((a,b)=>b[1]-a[1]).map(([d,m])=>{
        const ik=this.SITE_ICON[d]||'shield';
        const icEl=APPS[ik]?appIcon(ik,locked):`<div class="app-ic" style="background:${C.mn}">${sv(IP[ik]||IP.shield,26)}${locked?`<span class="lk">${sv(IP.lock,20)}</span>`:''}</div>`;
        return `<div class="row" style="margin-top:7px"><div style="transform:scale(.75);margin:-6px">${icEl}</div><b class="grow" style="font-size:13px;overflow:hidden;text-overflow:ellipsis">${U.esc(d)}</b><div style="width:90px">${UI.bar(m/lim*100,'mid')}</div><b style="width:42px;text-align:right;font-size:13px">${m}p</b></div>`;
      }).join('');
    }
    return this.SIM_SPLIT.map(([k,r])=>`<div class="row" style="margin-top:7px"><div style="transform:scale(.75);margin:-6px">${appIcon(k,locked)}</div><b class="grow" style="font-size:13px">${APPS[k].n}</b><div style="width:90px">${UI.bar(r*100*sc.used/lim,'mid')}</div><b style="width:42px;text-align:right;font-size:13px">${Math.round(sc.used*r)}p</b></div>`).join(''); },

  /* ---------------- Khối chọn ứng dụng bị chặn (Android / Web & Extension) ---------------- */
  androidPermsHTML(){
    let p={usage:false,accessibility:false,overlay:false};
    try{ p=JSON.parse(window.LuaChillNative.getPermissions()); }catch(e){}
    const items=[
      ['usage','Quyền đọc thời gian dùng app (Usage Access)',p.usage],
      ['accessibility','Dịch vụ chặn app tự động (Accessibility)',p.accessibility],
      ['overlay','Hiển thị màn hình khóa đè lên app',p.overlay]
    ];
    const allOk=p.usage&&p.accessibility;
    return `<div class="card" style="padding:10px 12px;margin-bottom:10px;background:${allOk?'#e2ebd1':'#f5e5e1'}">
      <div class="row"><b class="grow">${sv(IP.shield,18)} Quyền chặn app trên điện thoại</b><span class="tag ${allOk?'moss':'rose'}">${allOk?'Sẵn sàng':'Cần cấp quyền'}</span></div>
      ${items.map(([k,n,ok])=>`<div class="row" style="margin-top:6px"><span class="grow" style="font-size:12.5px">${n}</span>${ok?'<span class="tag moss">Đã bật ✓</span>':`<button class="btn sm rose" data-perm="${k}">Bật ngay</button>`}</div>`).join('')}
    </div>`;
  },
  blockerHTML(){
    const b=Core.s.block;
    if(Bridge.android){
      if(!this._apps){
        try{ this._apps=JSON.parse(window.LuaChillNative.getInstalledApps()||'[]'); }catch(e){ this._apps=[]; }
      }
      const picked=new Set(b.android.map(x=>x.pkg||x));
      const q=this._filter.trim().toLowerCase();
      const list=this._apps.filter(a=>!q||(a.name||'').toLowerCase().includes(q)||(a.pkg||'').toLowerCase().includes(q));
      return `${this.androidPermsHTML()}
        <div class="card" style="padding:12px;margin-bottom:10px">
          <div class="row"><b class="grow">${sv(IP.shield,18)} Chọn ứng dụng cần chặn trên máy</b><span class="tag mid">${picked.size} app</span></div>
          <p class="muted" style="margin:4px 0 8px">Khi hết giờ màn hình hoặc đến giờ ngủ (${Core.s.sleep.bed}), các app tick chọn sẽ bị khóa tự động.</p>
          <input class="inp" id="appFilter" placeholder="Tìm tên ứng dụng (TikTok, Facebook, Game...)" value="${U.esc(this._filter)}" style="margin-bottom:8px">
          <div class="app-list">${list.length?list.map(a=>{
            const on=picked.has(a.pkg);
            return `<label class="app-pick ${on?'on':''}"><input type="checkbox" data-pkg="${U.esc(a.pkg)}" data-name="${U.esc(a.name)}" ${on?'checked':''}><span class="grow"><b>${U.esc(a.name)}</b><span class="muted" style="display:block;font-size:11px">${U.esc(a.pkg)}</span></span></label>`;
          }).join(''):'<p class="muted center">Không tìm thấy ứng dụng phù hợp.</p>'}</div>
        </div>`;
    }
    const selCount=b.web.length+b.custom.length;
    return `<div class="card" style="padding:12px;margin-bottom:10px">
      <div class="row"><b class="grow">${sv(IP.shield,18)} Chọn ứng dụng / trang web bị chặn</b><span class="tag mid">${selCount} mục</span></div>
      <p class="muted" style="margin:4px 0 8px">${Bridge.ext?'Extension Chrome đang chạy — các trang chọn bên dưới sẽ bị chặn thật ngay khi hết giờ hoặc tới giờ ngủ.'
        :'Trên trình duyệt web / iPad chỉ khóa trong app. Cài <b>Chrome Extension</b> (PC) hoặc <b>App Android</b> (điện thoại) để chặn app/web thật ngoài hệ thống.'}</p>
      <div class="web-grid">${DATA.WEB_APPS.map(a=>{
        const on=b.web.includes(a.id), bg=APPS[a.icon]?APPS[a.icon].bg:'#eaf0dc';
        return `<button class="web-pill ${on?'on':''}" data-web="${a.id}"><span class="web-ic" style="background:${bg}">${sv(IP[a.icon]||IP.shield,15)}</span><span>${a.name}</span>${on?'<b>✓</b>':''}</button>`;
      }).join('')}</div>
      <div class="row" style="margin-top:10px">
        <input class="inp" id="customDom" placeholder="Thêm web khác (vd: twitch.tv)" maxlength="60">
        <button class="btn sm pri" data-a="addDom">Thêm</button>
      </div>
      ${b.custom.length?`<div class="row" style="gap:6px;flex-wrap:wrap;margin-top:8px">${b.custom.map(d=>`<span class="tag">${U.esc(d)} <button class="x-mini" data-rmdom="${U.esc(d)}" title="Xóa">×</button></span>`).join('')}</div>`:''}
    </div>`;
  },

  html(){ const s=Core.s, sc=s.screen, rem=Core.screenRemaining(), lim=sc.limit+sc.extra, pct=U.clamp(rem/lim*100), R=50, L=2*Math.PI*R, bed=Core.isBedtime();
    return `<div class="h-grid">
        <div class="card" style="padding:12px">
          <div class="ring-wrap"><svg width="124" height="124" viewBox="0 0 130 130"><circle cx="65" cy="65" r="${R}" stroke="#0A33231c" stroke-width="12" fill="none"/><circle cx="65" cy="65" r="${R}" stroke="${rem<=20?C.rb:C.mg}" stroke-width="12" fill="none" stroke-linecap="round" stroke-dasharray="${L*pct/100} ${L}" transform="rotate(-90 65 65)"/><circle cx="65" cy="65" r="${R+6.5}" stroke="${C.dg}" stroke-width="1.8" fill="none"/><circle cx="65" cy="65" r="${R-6.5}" stroke="${C.dg}" stroke-width="1.8" fill="none"/></svg>
            <div class="lbl"><span class="big-num">${Math.max(0,rem)}</span><span style="font-size:12px">phút còn lại</span></div></div>
          <p class="center" style="font-weight:800;margin:6px 0 8px">${sc.locked?`<span class="tag rose">${sv(IP.lock,13)} Đang khóa</span>`:bed&&!s.night.broken?`<span class="tag mid">${sv(IP.moon,13)} Khóa giờ ngủ</span>`:`<span class="tag moss">${sv(IP.unlock,13)} Đang mở</span>`} Đã dùng ${sc.used}p${sc.extra?` • +${sc.extra}p`:''}</p>
          <div class="divider"></div>
          <b>Giới hạn mỗi ngày</b>
          <div class="row" style="margin-top:6px"><button class="btn sm" data-a="-">–15p</button><div class="grow center big-num" style="font-size:23px">${Math.floor(sc.limit/60)}h${U.pad(sc.limit%60)}</div><button class="btn sm" data-a="+">+15p</button></div>
          <div class="muted center" style="margin-top:4px">Hết giờ tự động bật Màn hình Khóa</div>
          ${sc.locked?`<button class="btn rose full" style="margin-top:8px" data-a="ov">Mở Màn hình Khóa</button>`:''}
        </div>

        <div class="col" style="gap:10px">
          <div class="card" style="padding:12px"><div class="row"><b class="grow">Thời gian dùng hôm nay</b><span class="tag ${Bridge.canBlock?'moss':''}">${Bridge.canBlock?'Đo thật':'Giả lập web'}</span></div>${this.rows()}</div>
          <div class="card" style="padding:12px;background:#dfe9ea">
            <div class="row">${sv(IP.bedtime,24)}<b class="grow">Khóa ngủ ${s.sleep.bed} → ${s.sleep.wake}</b><button class="btn sm" data-a="sleep">Đổi giờ</button></div>
            <div class="muted" style="margin-top:4px">Whitelist không bị chặn: Zalo Công việc & Cuộc gọi khẩn cấp.</div>
            <div class="muted" style="margin-top:4px">Chế độ: <b>${Bridge.mode()}</b></div>
          </div>
        </div>
      </div>
      <div style="margin-top:10px">${this.blockerHTML()}</div>`; },

  render(el,onSleep){
    const draw=()=>{ el.innerHTML=this.html(); const sc=Core.s.screen;
      el.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>{ const a=b.dataset.a;
        if(a==='-') Core.setLimit(Math.max(30,sc.limit-15));
        if(a==='+') Core.setLimit(Math.min(240,sc.limit+15));
        if(a==='ov') Overlays.screen(true);
        if(a==='sleep'&&onSleep) onSleep();
        if(a==='addDom'){
          const inp=el.querySelector('#customDom');
          const d=(inp.value||'').trim().toLowerCase().replace(/^https?:\/\//,'').replace(/^www\./,'').split('/')[0];
          if(!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(d)){ UI.toast('Tên miền chưa hợp lệ (vd: twitch.tv)'); return; }
          Core.setBlock('custom',[...Core.s.block.custom,d]); UI.toast('Đã thêm '+d+' vào danh sách chặn');
        }
        draw(); });
      el.querySelectorAll('[data-web]').forEach(b=>b.onclick=()=>{
        const id=b.dataset.web, cur=Core.s.block.web;
        Core.setBlock('web',cur.includes(id)?cur.filter(x=>x!==id):[...cur,id]); draw(); });
      el.querySelectorAll('[data-rmdom]').forEach(b=>b.onclick=()=>{
        Core.setBlock('custom',Core.s.block.custom.filter(x=>x!==b.dataset.rmdom)); draw(); });
      el.querySelectorAll('[data-perm]').forEach(b=>b.onclick=()=>{
        try{ window.LuaChillNative.openPermissionSettings(b.dataset.perm); }catch(e){} });
      const flt=el.querySelector('#appFilter');
      if(flt){ flt.oninput=()=>{ this._filter=flt.value; draw(); const nf=el.querySelector('#appFilter'); if(nf){ nf.focus(); nf.setSelectionRange(nf.value.length,nf.value.length); } }; }
      el.querySelectorAll('[data-pkg]').forEach(cb=>cb.onchange=()=>{
        const pkg=cb.dataset.pkg, name=cb.dataset.name, cur=Core.s.block.android.filter(x=>(x.pkg||x)!==pkg);
        if(cb.checked) cur.push({pkg,name});
        Core.setBlock('android',cur); draw(); });
    };
    draw();
    const off=Core.on('tick',()=>{ if(!el.contains(document.activeElement)) draw(); });
    return off; }
};
