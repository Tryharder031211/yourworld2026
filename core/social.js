/* =============================================================================
   core/social.js — XÃ HỘI ONLINE THẬT (Supabase):
   • Chat cộng đồng thời gian thực ('global') & Chat riêng 1-1 ('dm:a:b') + báo cáo / chặn.
   • Kết bạn thật qua mã bạn bè / tìm kiếm + ghé thăm phòng decor thật của bạn bè.
   • Bảng xếp hạng trực tuyến thật (Toàn cầu / Bạn bè × Gem / Ít dùng máy / Quest / Ngủ ngon).
   • Túi đồ phụ kiện & hộp nội thất.
   ============================================================================= */
'use strict';

function authGateHTML(feature){
  if(!Cloud.enabled){
    return `<div class="gate card center">
      ${sv(IP.cloud,52)}
      <h3>Chưa kết nối máy chủ online</h3>
      <p class="muted">Để dùng <b>${feature}</b> cho người thật, hãy điền <code>supabaseUrl</code> và <code>supabaseAnonKey</code> trong file <code>config.js</code> theo hướng dẫn ở <b>DEPLOY.md</b>.</p>
    </div>`;
  }
  return `<div class="gate card center">
    ${sv(IP.globe,52)}
    <h3>Đăng nhập để dùng ${feature}</h3>
    <p class="muted">Kết nối với người thật: đồng bộ tiến trình đám mây, chat cộng đồng, thêm bạn bè và đua Bảng Xếp Hạng.</p>
    ${oauthButtonsHTML()}
  </div>`;
}

function timeHM(iso){
  if(!iso) return '';
  const d=new Date(iso); return isNaN(d)?'':U.hm(d);
}
function safeRoom(r){
  if(r && Array.isArray(r.placed)) return {wall:r.wall||'#F7F4D5',floor:r.floor||'#c99a6b',placed:r.placed.filter(p=>DATA.DECOR[p.id])};
  return {wall:'#F7F4D5',floor:'#c99a6b',placed:[{uid:'s1',id:'bed',gx:0,gy:1,rot:0},{uid:'s2',id:'plant',gx:5,gy:0,rot:0}]};
}

/* ---------------- Ghé thăm phòng người chơi thật ---------------- */
async function visitUser(pOrId){
  if(!Cloud.online) return;
  let p=typeof pOrId==='string'?null:pOrId;
  if(!p || p.room===undefined){
    try{ p=await Cloud.getProfile(typeof pOrId==='string'?pOrId:pOrId.id); }catch(e){ UI.toast('Không tải được hồ sơ'); return; }
  }
  if(!p){ UI.toast('Không tìm thấy người chơi'); return; }
  const isMe=p.id===Cloud.uid, isFr=Cloud.friendIds.includes(p.id);
  const todaySc=p.screen_day===Core.s.day?`${p.screen_today} phút hôm nay`:'Chưa đồng bộ hôm nay';
  const m=UI.modal(`<div class="row">${avHTML(p,48)}
      <div class="grow" style="min-width:0"><h2 style="color:${C.mn};overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${U.esc(p.name)}</h2>
        <div class="muted">Mã bạn bè: <b>${U.esc(p.friend_code||'—')}</b></div></div>
      <button class="x-btn" data-x>${sv(IP.x,16)}</button></div>
    <div class="row" style="gap:5px;margin:8px 0;flex-wrap:wrap">
      <span class="tag moss">${sv(IP.moon,12)} Ngủ ngon ${p.sleep_streak||0} ngày</span>
      <span class="tag">${sv(IP.phone,12)} ${todaySc}</span>
      <span class="tag">${sv(IP.gem,12)} ${p.gems||0}</span>
      <span class="tag">${sv(IP.quest,12)} ${p.quests_total||0} quest</span>
    </div>
    <div class="card" style="background:linear-gradient(#e9e3bd,#F7F4D5);padding:4px">
      <svg viewBox="0 -6 390 330" width="100%">${roomSVG(safeRoom(p.room))}</svg>
    </div>
    ${isMe?'':`<div class="row" style="margin-top:10px">
      ${isFr?`<button class="btn grow" data-a="unfr">Hủy kết bạn</button>`:`<button class="btn moss grow" data-a="add">${sv(IP.plus,16)} Kết bạn</button>`}
      <button class="btn pri grow" data-a="dm">${sv(IP.chat,18)} Nhắn tin</button>
    </div>`}`);
  fixAvatars(m.box);
  m.box.querySelector('[data-x]').onclick=()=>m.close();
  const add=m.box.querySelector('[data-a=add]');
  if(add) add.onclick=async()=>{ try{ await Cloud.addFriend(p.id); UI.toast(`Đã kết bạn với ${U.esc(p.name)}!`); m.close(); }catch(e){ UI.toast('Lỗi kết bạn: '+e.message); } };
  const unf=m.box.querySelector('[data-a=unfr]');
  if(unf) unf.onclick=async()=>{ if(!confirm(`Hủy kết bạn với ${p.name}?`)) return; try{ await Cloud.removeFriend(p.id); UI.toast('Đã hủy kết bạn'); m.close(); }catch(e){ UI.toast('Lỗi: '+e.message); } };
  const dm=m.box.querySelector('[data-a=dm]');
  if(dm) dm.onclick=()=>{ m.close(); openDM(p); };
}

/* ---------------- Phòng chat thời gian thực dùng chung (Global / DM) ---------------- */
function mountChatRoom(container, room, {showSender=true, emptyText='Chưa có tin nhắn nào. Hãy mở lời chào nhé!'}={}){
  container.innerHTML=`<div class="chat-box card" id="cBox"><p class="muted center" style="margin:auto">Đang tải tin nhắn...</p></div>
    <div class="stk-tray" style="margin-top:8px">${['Chào cả nhà! 🌿','Tối nay ngủ đúng giờ nhé 🌙','Hôm nay bạn làm mấy Quest rồi? 💪','Cất điện thoại nghỉ mắt nào 👀'].map(t=>`<button class="chip" data-t="${U.esc(t)}">${t}</button>`).join('')}</div>
    <div class="stk-tray">${STICKERS.map(st=>`<button data-s="${st.id}" title="${st.label}">${stickerHTML(st.id,48)}</button>`).join('')}</div>
    <div class="row" style="margin-top:6px"><input class="inp" id="cIn" placeholder="Nhắn tin thật (tối đa 300 ký tự)..." maxlength="300"><button class="btn pri" id="cSend">Gửi</button></div>`;
  const box=container.querySelector('#cBox'), inp=container.querySelector('#cIn'), btn=container.querySelector('#cSend');
  const names={}, msgs=[];
  let busy=false, closed=false, sub=null;

  const msgMenu=m=>{
    const who=names[m.user_id]||{id:m.user_id,name:'Người chơi'};
    const mod=UI.modal(`<div class="row">${avHTML(who,40)}<b class="grow">${U.esc(who.name)}</b><button class="x-btn" data-x>${sv(IP.x,16)}</button></div>
      <div class="col" style="margin-top:10px">
        <button class="btn full" data-a="visit">${sv(IP.home,18)} Ghé thăm phòng</button>
        <button class="btn full" data-a="dm">${sv(IP.chat,18)} Nhắn tin riêng</button>
        <button class="btn rose full" data-a="rep">${sv(IP.flag,18)} Báo cáo tin nhắn</button>
        <button class="btn full" data-a="blk">${sv(IP.ban,18)} Chặn người này</button>
      </div>`);
    fixAvatars(mod.box);
    mod.box.querySelector('[data-x]').onclick=()=>mod.close();
    mod.box.querySelector('[data-a=visit]').onclick=()=>{ mod.close(); visitUser(m.user_id); };
    mod.box.querySelector('[data-a=dm]').onclick=()=>{ mod.close(); openDM(who); };
    mod.box.querySelector('[data-a=rep]').onclick=async()=>{ try{ await Cloud.report(m,'Báo cáo bởi người dùng'); UI.toast('Đã gửi báo cáo. Cảm ơn bạn giữ cộng đồng lành mạnh!'); }catch(e){ UI.toast('Không gửi được: '+e.message); } mod.close(); };
    mod.box.querySelector('[data-a=blk]').onclick=async()=>{ await Cloud.block(m.user_id); UI.toast(`Đã chặn ${U.esc(who.name)}`); mod.close(); renderMsgs(); };
  };

  const renderMsgs=()=>{
    const list=msgs.filter(m=>!Cloud.blocked.includes(m.user_id));
    if(!list.length){ box.innerHTML=`<p class="muted center" style="margin:auto">${emptyText}</p>`; return; }
    const atBot=box.scrollHeight-box.scrollTop-box.clientHeight<60;
    box.innerHTML=list.map(m=>{
      const me=m.user_id===Cloud.uid, who=names[m.user_id]||{name:'Người chơi'};
      const head=(showSender&&!me)?`<div class="msg-h"><button class="msg-who" data-mid="${m.id}">${U.esc(who.name)}</button><span>${timeHM(m.created_at)}</span></div>`
        :`<div class="msg-h ${me?'me':''}"><span>${timeHM(m.created_at)}</span>${!me?`<button class="msg-more" data-mid="${m.id}" title="Tùy chọn">⋯</button>`:''}</div>`;
      const body=m.sticker?`<div class="msg stk ${me?'me':''}">${stickerHTML(m.sticker,66)}</div>`
        :`<div class="msg ${me?'me':''}">${U.esc(m.body||'')}</div>`;
      return `<div class="msg-w ${me?'me':''}">${head}${body}</div>`;
    }).join('');
    box.querySelectorAll('[data-mid]').forEach(b=>b.onclick=()=>{
      const m=msgs.find(x=>String(x.id)===b.dataset.mid); if(m) msgMenu(m);
    });
    if(atBot||list.length<=15) box.scrollTop=box.scrollHeight;
  };

  const ensureName=async uid=>{
    if(!uid||names[uid]) return;
    if(uid===Cloud.uid && Cloud.profile){ names[uid]=Cloud.profile; return; }
    try{ Object.assign(names,await Cloud.names([uid])); }catch(e){}
  };

  const pushMsg=async m=>{
    if(!m||msgs.some(x=>x.id===m.id)) return;
    if(showSender && !names[m.user_id]) await ensureName(m.user_id);
    if(closed) return;
    msgs.push(m); if(msgs.length>120) msgs.shift();
    renderMsgs();
  };

  const doSend=async payload=>{
    if(busy) return;
    if(payload.body && !payload.body.trim()) return;
    busy=true; btn.disabled=true;
    try{
      const saved=await Cloud.send(room,payload);
      if(saved){ if(sub) sub.mark(saved.id); await pushMsg(saved); }
    }catch(e){ UI.toast(e.message||'Không gửi được tin nhắn'); }
    finally{ busy=false; btn.disabled=false; }
  };

  btn.onclick=()=>{ const v=inp.value; if(!v.trim()) return; inp.value=''; doSend({body:v.trim()}); };
  inp.onkeydown=e=>{ if(e.key==='Enter'){ const v=inp.value; if(!v.trim()) return; inp.value=''; doSend({body:v.trim()}); } };
  container.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>doSend({body:b.dataset.t}));
  container.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>doSend({sticker:b.dataset.s}));

  (async()=>{
    try{
      const hist=await Cloud.history(room);
      if(closed) return;
      if(showSender){
        const ids=hist.map(m=>m.user_id).filter(Boolean);
        if(Cloud.uid&&Cloud.profile) names[Cloud.uid]=Cloud.profile;
        if(ids.length) Object.assign(names,await Cloud.names(ids));
      }
      if(closed) return;
      msgs.push(...hist);
      renderMsgs();
      sub=Cloud.subscribe(room,m=>pushMsg(m));
      hist.forEach(m=>sub.mark(m.id));
    }catch(e){
      if(!closed) box.innerHTML=`<p class="muted center" style="margin:auto">Không tải được tin nhắn (${U.esc(e.message||'offline')})</p>`;
    }
  })();

  return ()=>{ closed=true; if(sub) sub.close(); };
}

/* ---------------- Chat riêng 1-1 ---------------- */
function openDM(p){
  if(!Cloud.online){ openFriends(); return; }
  const sh=UI.sheet({title:U.esc(p.name),body:''});
  sh.el.querySelector('.sheet-h').insertAdjacentHTML('afterbegin',avHTML(p,34));
  fixAvatars(sh.el);
  const todaySc=p.screen_day===Core.s.day?`${p.screen_today}p`:'—';
  sh.body.innerHTML=`<div class="row" style="gap:5px;margin-bottom:8px;flex-wrap:wrap">
      <span class="tag moss">${sv(IP.moon,12)} Ngủ ngon ${p.sleep_streak||0} ngày</span>
      <span class="tag">${sv(IP.phone,12)} ${todaySc} vs bạn ${Core.s.screen.used}p</span>
      <button class="btn sm" style="margin-left:auto" data-v>${sv(IP.home,14)} Phòng</button>
    </div><div id="dmWrap"></div>`;
  sh.body.querySelector('[data-v]').onclick=()=>visitUser(p);
  const off=mountChatRoom(sh.body.querySelector('#dmWrap'),Cloud.dmRoom(Cloud.uid,p.id),{showSender:false,emptyText:`Bắt đầu trò chuyện cùng ${U.esc(p.name)}!`});
  sh.track(off);
}

/* ---------------- Sheet Cộng đồng & Bạn bè ---------------- */
function openFriends(){
  const sh=UI.sheet({title:'Cộng Đồng & Bạn Bè',icon:'chat',cls:'wide'});
  let tab='global', cleanup=null;
  const clearSub=()=>{ if(cleanup){ cleanup(); cleanup=null; } };
  sh.track(clearSub);

  const render=async()=>{
    clearSub();
    if(!Cloud.online){
      sh.body.innerHTML=authGateHTML('Chat online & Bạn bè');
      bindOAuth(sh.body);
      return;
    }
    sh.body.innerHTML=`<div class="seg" style="margin-bottom:10px">
        <button class="${tab==='global'?'on':''}" data-k="global">Cộng đồng</button>
        <button class="${tab==='friends'?'on':''}" data-k="friends">Bạn bè (${Cloud.friendIds.length})</button>
        <button class="${tab==='find'?'on':''}" data-k="find">Tìm bạn</button>
      </div><div id="socBody"></div>`;
    sh.body.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{ tab=b.dataset.k; render(); });
    const body=sh.body.querySelector('#socBody');

    if(tab==='global'){
      cleanup=mountChatRoom(body,'global',{showSender:true,emptyText:'Phòng chat cộng đồng còn trống. Gửi lời chào đầu tiên nào!'});
      return;
    }

    if(tab==='friends'){
      body.innerHTML='<p class="muted center">Đang tải danh sách bạn bè...</p>';
      try{
        const list=await Cloud.friends();
        if(!list.length){
          body.innerHTML=`<div class="card center" style="padding:18px">
            ${sv(IP.user,44)}
            <p class="muted" style="margin:8px 0">Bạn chưa thêm ai. Chia sẻ mã bạn bè hoặc tìm theo tên nhé!</p>
            <button class="btn pri" data-go-find>Tìm & kết bạn</button>
          </div>`;
          body.querySelector('[data-go-find]').onclick=()=>{ tab='find'; render(); };
          return;
        }
        body.innerHTML=`<div class="soc-grid">${list.map(f=>`<div class="li card">
          ${avHTML(f,42)}
          <div class="grow" style="min-width:0">
            <div class="t">${U.esc(f.name)}</div>
            <div class="row" style="gap:4px;flex-wrap:wrap;margin-top:3px">
              <span class="tag moss">${sv(IP.moon,12)} ${f.sleep_streak||0} ngày</span>
              <span class="tag">${sv(IP.gem,12)} ${f.gems||0}</span>
              ${f.screen_day===Core.s.day?`<span class="tag">${sv(IP.phone,12)} ${f.screen_today}p</span>`:''}
            </div>
          </div>
          <div class="col" style="gap:5px">
            <button class="btn sm" data-v="${f.id}">${sv(IP.home,15)} Thăm</button>
            <button class="btn sm pri" data-c="${f.id}">${sv(IP.chat,15)} Chat</button>
          </div>
        </div>`).join('')}</div>`;
        fixAvatars(body);
        body.querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>visitUser(list.find(x=>x.id===b.dataset.v)));
        body.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>openDM(list.find(x=>x.id===b.dataset.c)));
      }catch(e){ body.innerHTML=`<p class="muted center">Lỗi tải bạn bè: ${U.esc(e.message)}</p>`; }
      return;
    }

    /* tab === 'find' */
    const code=(Cloud.profile&&Cloud.profile.friend_code)||'------';
    body.innerHTML=`<div class="card row" style="padding:10px 12px;margin-bottom:10px;background:#e4ecd2">
        <div class="grow"><div class="muted">Mã bạn bè của bạn</div><b style="font-size:20px;letter-spacing:2px;color:${C.mn}">${U.esc(code)}</b></div>
        <button class="btn sm" id="cpCode">${sv(IP.copy,16)} Sao chép</button>
      </div>
      <div class="row" style="margin-bottom:10px">
        <input class="inp" id="fSearch" placeholder="Nhập tên hoặc mã 6 ký tự..." maxlength="24">
        <button class="btn pri" id="fGo">${sv(IP.search,18)}</button>
      </div>
      <div id="fRes"><p class="muted center">Nhập ít nhất 2 ký tự để tìm người chơi thật.</p></div>`;
    body.querySelector('#cpCode').onclick=()=>copyText(code,'Đã sao chép mã bạn bè: '+code);
    const runSearch=async()=>{
      const q=body.querySelector('#fSearch').value.trim(), res=body.querySelector('#fRes');
      if(q.length<2){ res.innerHTML='<p class="muted center">Nhập ít nhất 2 ký tự nhé.</p>'; return; }
      res.innerHTML='<p class="muted center">Đang tìm...</p>';
      try{
        const rows=await Cloud.search(q);
        if(!rows.length){ res.innerHTML='<p class="muted center">Không tìm thấy ai khớp từ khóa này.</p>'; return; }
        res.innerHTML=rows.map(p=>{
          const fr=Cloud.friendIds.includes(p.id);
          return `<div class="li card">${avHTML(p,40)}
            <div class="grow" style="min-width:0"><div class="t">${U.esc(p.name)}</div>
              <div class="muted">Mã ${U.esc(p.friend_code||'')} • ${p.gems||0} Gem • ngủ ${p.sleep_streak||0} ngày</div></div>
            ${fr?'<span class="tag moss">Bạn bè</span>':`<button class="btn sm pri" data-add="${p.id}">${sv(IP.plus,14)} Kết bạn</button>`}
          </div>`;
        }).join('');
        fixAvatars(res);
        res.querySelectorAll('[data-add]').forEach(b=>b.onclick=async()=>{
          b.disabled=true;
          try{ await Cloud.addFriend(b.dataset.add); b.outerHTML='<span class="tag moss">Đã thêm ✓</span>'; UI.toast('Đã thêm bạn bè!'); }
          catch(e){ b.disabled=false; UI.toast('Lỗi: '+e.message); }
        });
      }catch(e){ res.innerHTML=`<p class="muted center">Lỗi tìm kiếm: ${U.esc(e.message)}</p>`; }
    };
    body.querySelector('#fGo').onclick=runSearch;
    body.querySelector('#fSearch').onkeydown=e=>{ if(e.key==='Enter') runSearch(); };
  };

  render();
  sh.track(Cloud.on('auth',render));
}

/* ---------------- Bảng xếp hạng trực tuyến thật ---------------- */
function openLeaderboard(){
  const sh=UI.sheet({title:'Bảng Xếp Hạng',icon:'trophy',cls:'wide'});
  let tab='gems', scope='global';
  const TABS=[['gems','Top Gem'],['screen','Ít Dùng Máy'],['quests','Top Quest'],['sleep','Ngủ Ngon']];
  const DESC={
    gems:'Tổng Gem tích lũy từ thói quen lành mạnh.',
    screen:'Người dùng màn hình ÍT NHẤT hôm nay đứng đầu!',
    quests:'Tổng số Quest đời thực đã hoàn thành.',
    sleep:'Chuỗi ngày ngủ đủ 8 tiếng liên tiếp.'
  };
  const medal=['#f1d77a','#cfd3d6','#e0b27a'];

  const render=async()=>{
    if(!Cloud.online){
      sh.body.innerHTML=authGateHTML('Bảng Xếp Hạng trực tuyến');
      bindOAuth(sh.body);
      return;
    }
    sh.body.innerHTML=`<div class="row" style="margin-bottom:8px;justify-content:space-between;flex-wrap:wrap;gap:6px">
        <div class="seg" style="flex:1;min-width:200px"><button class="${scope==='global'?'on':''}" data-sc="global">Toàn cầu</button><button class="${scope==='friends'?'on':''}" data-sc="friends">Bạn bè</button></div>
        <button class="btn sm" id="lbSync">${sv(IP.cloud,16)} Cập nhật điểm</button>
      </div>
      <div class="seg" style="margin-bottom:8px">${TABS.map(([k,n])=>`<button class="${k===tab?'on':''}" data-k="${k}">${n}</button>`).join('')}</div>
      <p class="muted" style="margin-bottom:8px">${DESC[tab]}</p>
      <div id="lbList"><p class="muted center">Đang tải bảng xếp hạng...</p></div>`;
    sh.body.querySelectorAll('[data-sc]').forEach(b=>b.onclick=()=>{ scope=b.dataset.sc; render(); });
    sh.body.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{ tab=b.dataset.k; render(); });
    sh.body.querySelector('#lbSync').onclick=async()=>{ await Cloud.push(); UI.toast('Đã cập nhật thành tích lên BXH!'); render(); };

    const box=sh.body.querySelector('#lbList');
    try{
      if(Date.now()-(Cloud.lastPush||0)>30e3) Cloud.push().catch(()=>{});
      const list=await Cloud.board(tab,scope);
      if(!list||!list.length){
        box.innerHTML=`<div class="card center" style="padding:16px"><p class="muted">Chưa có dữ liệu cho mục này${tab==='screen'?' hôm nay':''}. Bấm "Cập nhật điểm" để lên bảng nhé!</p></div>`;
        return;
      }
      box.innerHTML=list.map((p,i)=>{
        const me=p.id===Cloud.uid;
        const val=tab==='gems'?`${sv(IP.gem,15)} ${p.gems||0}`
          :tab==='screen'?`${p.screen_today||0} phút`
          :tab==='quests'?`${p.quests_total||0} quest`
          :`${sv(IP.moon,14)} ${p.sleep_streak||0} ngày`;
        return `<div class="lb-row card ${me?'me':''}" data-uid="${p.id}" style="cursor:pointer">
          <div class="rank">${i<3?`<svg width="28" height="28" viewBox="0 0 30 30"><circle cx="15" cy="15" r="12" fill="${medal[i]}" stroke="${C.dg}" stroke-width="2"/><text x="15" y="20" text-anchor="middle" font-size="13" font-weight="800" fill="${C.dg}" font-family="Baloo 2,sans-serif">${i+1}</text></svg>`:i+1}</div>
          ${avHTML(p,38)}
          <b class="grow" style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${U.esc(p.name)}${me?' (Bạn)':''}</b>
          <b style="color:${C.mn};font-size:15px;white-space:nowrap">${val}</b>
        </div>`;
      }).join('');
      fixAvatars(box);
      box.querySelectorAll('[data-uid]').forEach(el=>el.onclick=()=>visitUser(el.dataset.uid));
    }catch(e){
      box.innerHTML=`<p class="muted center">Không tải được BXH: ${U.esc(e.message)}</p>`;
    }
  };

  render();
  sh.track(Cloud.on('auth',render));
}

/* ---------------- Túi đồ / Phụ kiện ---------------- */
function openBag(){
  const sh=UI.sheet({title:'Túi Đồ / Decor',icon:'bag'}); let tab='acc';
  sh.body.innerHTML=`<div id="bagDk" style="position:relative;height:118px;margin-top:-6px"></div><div id="bagC"></div>`;
  const dkWrap=sh.body.querySelector('#bagDk');
  const dk=new Donkey({scale:1.3,tilt:-16,yaw:24,acc:Core.s.acc.on,mood:Core.mood()});
  dkWrap.appendChild(dk.el);
  const placeDk=()=>dk.pos((dkWrap.clientWidth||320)/2,110);
  requestAnimationFrame(placeDk);
  const ro=new ResizeObserver(placeDk); ro.observe(dkWrap); sh.track(()=>ro.disconnect());

  const render=()=>{ const s=Core.s, c=sh.body.querySelector('#bagC'); dk.setAcc(s.acc.on);
    c.innerHTML=`<div class="seg" style="margin-bottom:10px"><button class="${tab==='acc'?'on':''}" data-k="acc">Phụ kiện</button><button class="${tab==='box'?'on':''}" data-k="box">Hộp nội thất (${s.decor.boxes.length})</button></div>`+
      (tab==='acc'?`<div class="grid3">${Object.entries(DATA.ACCS).map(([id,a])=>{ const own=s.acc.owned.includes(id), on=s.acc.on.includes(id);
        return `<div class="pet-card card" style="${on?'background:#e1e9c9':''}">${sv(IP[id],44)}<span style="font-size:12px">${a.name}</span>${own?`<button class="btn sm ${on?'pri':''}" data-t="${id}">${on?'Đang đeo':'Đeo'}</button>`:`<button class="btn sm rose" data-b="${id}">${sv(IP.gem,13)} ${a.price}</button>`}</div>`; }).join('')}</div><p class="muted center" style="margin-top:8px">Phụ kiện hiển thị trên chú lừa Voxel ở mọi màn hình.</p>`
      :`${s.decor.boxes.length?s.decor.boxes.map(b=>`<div class="li card">${sv(IP.box,36)}<b class="grow">${DATA.DECOR[b.id].name}</b><span class="tag">Chưa mở</span></div>`).join(''):'<p class="muted center">Chưa có hộp nào. Mua nội thất bằng Gem trong nhà nhé!</p>'}`)+
      `<button class="btn pri full" style="margin-top:10px" data-a="decor">${sv(IP.home,22)} Vào nhà trang trí (Decor)</button>`;
    c.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{ tab=b.dataset.k; render(); });
    c.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{ Core.toggleAcc(b.dataset.t); render(); });
    c.querySelectorAll('[data-b]').forEach(b=>b.onclick=()=>{ if(Core.buyAcc(b.dataset.b)) UI.toast(`Đã mua ${DATA.ACCS[b.dataset.b].name}!`); else UI.toast('Chưa đủ Gem'); render(); });
    c.querySelector('[data-a=decor]').onclick=()=>{ sh.close(); Nav.go('tycoon'); }; };
  render();
}
