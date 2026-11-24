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

/* ---------------- Hộp thoại xác nhận Doodle (dùng chung UI.confirm) ---------------- */
function confirmSocialAction(opts){ return UI.confirm(opts); }

/* ---------------- Ghé thăm phòng người chơi thật ---------------- */
async function visitUser(pOrId, onMutate){
  if(!Cloud.online) return;
  let p=typeof pOrId==='string'?null:pOrId;
  if(!p || p.room===undefined){
    try{ p=await Cloud.getProfile(typeof pOrId==='string'?pOrId:pOrId.id); }catch(e){ UI.toast('Không tải được hồ sơ'); return; }
  }
  if(!p){ UI.toast('Không tìm thấy người chơi'); return; }
  await Cloud.loadBlocks();
  await Cloud.loadFriends();
  const isMe=p.id===Cloud.uid, rel=Cloud.relOf(p.id);
  const todaySc=p.screen_day===Core.s.day?`${p.screen_today} phút hôm nay`:'Chưa đồng bộ hôm nay';
  const relBtns=rel==='blocked'
    ?`<button class="btn moss grow" data-a="unblk">${sv(IP.shield,16)} Bỏ chặn người này</button>`
    :rel==='friend'
    ?`<button class="btn pri grow" data-a="dm">${sv(IP.chat,16)} Nhắn tin</button><button class="btn grow" data-a="unfr">${sv(IP.x,14)} Xóa bạn</button><button class="btn rose" data-a="blk" title="Chặn">${sv(IP.ban,16)} Chặn</button>`
    :rel==='incoming'
    ?`<button class="btn moss grow" data-a="acc">${sv(IP.check,16)} Đồng ý</button><button class="btn rose grow" data-a="dec">${sv(IP.x,15)} Không đồng ý</button><button class="btn" data-a="blk" title="Chặn">${sv(IP.ban,16)}</button>`
    :rel==='outgoing'
    ?`<button class="btn grow" data-a="can">Hủy lời mời</button><button class="btn pri grow" data-a="dm">${sv(IP.chat,16)} Nhắn tin</button><button class="btn rose" data-a="blk" title="Chặn">${sv(IP.ban,16)}</button>`
    :`<button class="btn moss grow" data-a="req">${sv(IP.plus,15)} Kết bạn</button><button class="btn pri grow" data-a="dm">${sv(IP.chat,16)} Nhắn tin</button><button class="btn rose" data-a="blk" title="Chặn">${sv(IP.ban,16)}</button>`;
  const statusTxt=rel==='blocked'?' • <b class="txt-danger">Đã chặn</b>'
    :rel==='incoming'?' • <b class="txt-danger">Đã gửi lời mời kết bạn cho bạn</b>'
    :rel==='outgoing'?' • <b>Đang chờ đồng ý</b>'
    :rel==='friend'?' • <b>Bạn bè</b>':'';
  const m=UI.modal(`<div class="row">${avHTML(p,48)}
      <div class="grow" style="min-width:0"><h2 class="txt-accent" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${U.esc(p.name)}</h2>
        <div class="muted">Mã bạn bè: <b>${U.esc(p.friend_code||'—')}</b>${statusTxt}</div></div>
      <button class="x-btn" data-x>${sv(IP.x,16)}</button></div>
    <div class="row" style="gap:5px;margin:8px 0;flex-wrap:wrap">
      <span class="tag moss">${sv(IP.moon,12)} Ngủ ngon ${p.sleep_streak||0} ngày</span>
      <span class="tag">${sv(IP.phone,12)} ${todaySc}</span>
      <span class="tag">${sv(IP.gem,12)} ${p.gems||0}</span>
      <span class="tag">${sv(IP.quest,12)} ${p.quests_total||0} quest</span>
    </div>
    <div class="card" style="background:linear-gradient(#e9e3bd,#F7F4D5);padding:4px">
      <svg viewBox="0 -6 390 330" width="100%">${roomSVG(safeRoom(p.room),{roomId:(p.room&&p.room.roomId)||'bedroom'})}</svg>
    </div>
    ${isMe?'':`<div class="row" style="margin-top:10px;flex-wrap:wrap">${relBtns}</div>`}`);
  fixAvatars(m.box);
  m.box.querySelector('[data-x]').onclick=()=>m.close();
  const done=()=>{ m.close(); onMutate&&onMutate(); };
  const req=m.box.querySelector('[data-a=req]');
  if(req) req.onclick=async()=>{ try{ const r=await Cloud.sendRequest(p.id); UI.toast(r==='friend'?`Đã trở thành bạn bè với ${U.esc(p.name)}!`:`Đã gửi lời mời kết bạn tới ${U.esc(p.name)}`); done(); }catch(e){ UI.toast('Lỗi: '+e.message); } };
  const acc=m.box.querySelector('[data-a=acc]');
  if(acc) acc.onclick=async()=>{ try{ await Cloud.acceptRequest(p.id); UI.toast(`Đã đồng ý kết bạn với ${U.esc(p.name)}!`); done(); }catch(e){ UI.toast('Lỗi: '+e.message); } };
  const dec=m.box.querySelector('[data-a=dec]');
  if(dec) dec.onclick=async()=>{ try{ await Cloud.declineRequest(p.id); UI.toast('Đã không đồng ý lời mời kết bạn'); done(); }catch(e){ UI.toast(e.message); } };
  const can=m.box.querySelector('[data-a=can]');
  if(can) can.onclick=async()=>{ try{ await Cloud.cancelRequest(p.id); UI.toast('Đã hủy lời mời kết bạn'); done(); }catch(e){ UI.toast('Lỗi: '+e.message); } };
  const unf=m.box.querySelector('[data-a=unfr]');
  if(unf) unf.onclick=()=>confirmSocialAction({
    title:`Xóa bạn ${U.esc(p.name)}?`,
    body:'Hai bạn sẽ không còn trong danh sách bạn bè nữa. Sau này vẫn có thể gửi lại lời mời kết bạn.',
    okLabel:'Xóa bạn', okCls:'rose',
    onOk:async()=>{ await Cloud.removeFriend(p.id); UI.toast(`Đã xóa ${U.esc(p.name)} khỏi danh sách bạn bè`); done(); }
  });
  const blk=m.box.querySelector('[data-a=blk]');
  if(blk) blk.onclick=()=>confirmSocialAction({
    title:`Chặn ${U.esc(p.name)}?`,
    body:'Chặn sẽ tự động xóa kết bạn/lời mời, ẩn tin nhắn của người này và ngăn họ gửi lại lời mời kết bạn. Bạn có thể bỏ chặn bất kỳ lúc nào ở mục Đã chặn.',
    okLabel:'Chặn ngay', okCls:'rose',
    onOk:async()=>{ await Cloud.block(p.id); UI.toast(`Đã chặn ${U.esc(p.name)}`); done(); }
  });
  const unblk=m.box.querySelector('[data-a=unblk]');
  if(unblk) unblk.onclick=async()=>{ try{ await Cloud.unblock(p.id); UI.toast(`Đã bỏ chặn ${U.esc(p.name)}`); done(); }catch(e){ UI.toast('Lỗi: '+e.message); } };
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
    const rel=Cloud.relOf(m.user_id);
    const frBtn=rel==='friend'
      ?`<button class="btn full" data-a="unfr">${sv(IP.x,16)} Xóa bạn</button>`
      :rel==='incoming'
      ?`<button class="btn moss full" data-a="acc">${sv(IP.check,18)} Đồng ý kết bạn</button>`
      :rel==='outgoing'
      ?`<button class="btn full" data-a="can">Đang chờ • Hủy lời mời</button>`
      :`<button class="btn moss full" data-a="add">${sv(IP.plus,18)} Kết bạn</button>`;
    const mod=UI.modal(`<div class="row">${avHTML(who,40)}<b class="grow">${U.esc(who.name)}</b><button class="x-btn" data-x>${sv(IP.x,16)}</button></div>
      <div class="col" style="margin-top:10px">
        ${frBtn}
        <button class="btn full" data-a="visit">${sv(IP.home,18)} Ghé thăm phòng</button>
        <button class="btn full" data-a="dm">${sv(IP.chat,18)} Nhắn tin riêng</button>
        <button class="btn rose full" data-a="rep">${sv(IP.flag,18)} Báo cáo tin nhắn</button>
        <button class="btn full" data-a="blk">${sv(IP.ban,18)} Chặn người này</button>
      </div>`);
    fixAvatars(mod.box);
    mod.box.querySelector('[data-x]').onclick=()=>mod.close();
    const bAdd=mod.box.querySelector('[data-a=add]');
    if(bAdd) bAdd.onclick=async()=>{ try{ const r=await Cloud.sendRequest(m.user_id); UI.toast(r==='friend'?`Đã thành bạn bè với ${U.esc(who.name)}!`:`Đã gửi lời mời kết bạn tới ${U.esc(who.name)}`); mod.close(); }catch(e){ UI.toast('Lỗi: '+e.message); } };
    const bAcc=mod.box.querySelector('[data-a=acc]');
    if(bAcc) bAcc.onclick=async()=>{ try{ await Cloud.acceptRequest(m.user_id); UI.toast(`Đã đồng ý kết bạn với ${U.esc(who.name)}!`); mod.close(); }catch(e){ UI.toast('Lỗi: '+e.message); } };
    const bCan=mod.box.querySelector('[data-a=can]');
    if(bCan) bCan.onclick=async()=>{ try{ await Cloud.cancelRequest(m.user_id); UI.toast('Đã hủy lời mời kết bạn'); mod.close(); }catch(e){ UI.toast('Lỗi: '+e.message); } };
    const bUnfr=mod.box.querySelector('[data-a=unfr]');
    if(bUnfr) bUnfr.onclick=()=>{ mod.close(); confirmSocialAction({ title:`Xóa bạn ${U.esc(who.name)}?`, body:'Xóa khỏi danh sách bạn bè của bạn.', okLabel:'Xóa bạn', okCls:'rose', onOk:async()=>{ await Cloud.removeFriend(m.user_id); UI.toast(`Đã xóa bạn ${U.esc(who.name)}`); } }); };
    mod.box.querySelector('[data-a=visit]').onclick=()=>{ mod.close(); visitUser(m.user_id); };
    mod.box.querySelector('[data-a=dm]').onclick=()=>{ mod.close(); openDM(who); };
    mod.box.querySelector('[data-a=rep]').onclick=async()=>{ try{ await Cloud.report(m,'Báo cáo bởi người dùng'); UI.toast('Đã gửi báo cáo. Cảm ơn bạn giữ cộng đồng lành mạnh!'); }catch(e){ UI.toast('Không gửi được: '+e.message); } mod.close(); };
    mod.box.querySelector('[data-a=blk]').onclick=()=>{ mod.close(); confirmSocialAction({
      title:`Chặn ${U.esc(who.name)}?`,
      body:'Người này sẽ bị ẩn khỏi chat, danh sách bạn bè và không thể gửi lời mời kết bạn cho bạn.',
      okLabel:'Chặn ngay', okCls:'rose',
      onOk:async()=>{ await Cloud.block(m.user_id); UI.toast(`Đã chặn ${U.esc(who.name)}`); renderMsgs(); }
    }); };
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

/* ---------------- Chat riêng 1-1 (có nút Phòng • Xóa bạn • Chặn / Bỏ chặn) ---------------- */
function openDM(p){
  if(!Cloud.online){ openFriends(); return; }
  const sh=UI.sheet({title:U.esc(p.name),body:''});
  sh.el.querySelector('.sheet-h').insertAdjacentHTML('afterbegin',avHTML(p,34));
  fixAvatars(sh.el);
  let off=null;
  const clearSub=()=>{ if(off){ off(); off=null; } };
  sh.track(clearSub);

  const draw=()=>{
    clearSub();
    if(Cloud.isBlocked(p.id)){
      sh.body.innerHTML=`<div class="card tint-rose center" style="padding:18px">
        ${sv(IP.ban,42)}
        <h3 style="margin-top:8px">Bạn đã chặn ${U.esc(p.name)}</h3>
        <p class="muted" style="margin:6px 0 12px">Tin nhắn và lời mời từ người này đang bị ẩn. Bỏ chặn nếu bạn muốn trò chuyện lại.</p>
        <button class="btn moss" data-unblk>${sv(IP.shield,16)} Bỏ chặn</button>
      </div>`;
      sh.body.querySelector('[data-unblk]').onclick=async()=>{ await Cloud.unblock(p.id); UI.toast(`Đã bỏ chặn ${U.esc(p.name)}`); draw(); };
      return;
    }
    const todaySc=p.screen_day===Core.s.day?`${p.screen_today}p`:'—', isFr=Cloud.relOf(p.id)==='friend';
    sh.body.innerHTML=`<div class="row" style="gap:5px;margin-bottom:8px;flex-wrap:wrap">
        <span class="tag moss">${sv(IP.moon,12)} ${p.sleep_streak||0} ngày</span>
        <span class="tag">${sv(IP.phone,12)} ${todaySc}</span>
        <div class="row" style="margin-left:auto;gap:5px">
          <button class="btn sm" data-v>${sv(IP.home,14)} Phòng</button>
          ${isFr?`<button class="btn sm" data-unfr title="Xóa bạn">${sv(IP.x,13)} Xóa bạn</button>`:''}
          <button class="btn sm rose" data-blk title="Chặn người này">${sv(IP.ban,14)} Chặn</button>
        </div>
      </div><div id="dmWrap"></div>`;
    sh.body.querySelector('[data-v]').onclick=()=>visitUser(p,draw);
    const unfr=sh.body.querySelector('[data-unfr]');
    if(unfr) unfr.onclick=()=>confirmSocialAction({
      title:`Xóa bạn ${U.esc(p.name)}?`,
      body:'Xóa khỏi danh sách bạn bè của bạn.',
      okLabel:'Xóa bạn', okCls:'rose',
      onOk:async()=>{ await Cloud.removeFriend(p.id); UI.toast(`Đã xóa bạn ${U.esc(p.name)}`); draw(); }
    });
    sh.body.querySelector('[data-blk]').onclick=()=>confirmSocialAction({
      title:`Chặn ${U.esc(p.name)}?`,
      body:'Chặn sẽ tự động xóa kết bạn và ẩn mọi tin nhắn của người này.',
      okLabel:'Chặn ngay', okCls:'rose',
      onOk:async()=>{ await Cloud.block(p.id); UI.toast(`Đã chặn ${U.esc(p.name)}`); draw(); }
    });
    off=mountChatRoom(sh.body.querySelector('#dmWrap'),Cloud.dmRoom(Cloud.uid,p.id),{showSender:false,emptyText:`Bắt đầu trò chuyện cùng ${U.esc(p.name)}!`});
  };
  draw();
}

/* ---------------- Bộ vẽ Bảng Lời Mời Kết Bạn (dùng chung cho Sheet riêng & Tab Lời mời) ---------------- */
async function renderRequestsBoard(body, onUpdated, isStale){
  body.innerHTML='<p class="muted center">Đang tải bảng lời mời kết bạn...</p>';
  try{
    const {incoming,outgoing}=await Cloud.pending();
    if(isStale&&isStale()) return;
    const inHTML=incoming.length?incoming.map(p=>`<div class="fr-card card tint-warm">
      <div class="row">
        ${avHTML(p,42)}
        <div class="grow" style="min-width:0">
          <div class="t" style="font-weight:800;font-size:15px">${U.esc(p.name)}</div>
          <div class="muted">Mã ${U.esc(p.friend_code||'—')} • ${p.gems||0} Gem • ngủ ngon ${p.sleep_streak||0} ngày</div>
        </div>
        <button class="btn sm" data-v="${p.id}" title="Thăm phòng">${sv(IP.home,14)}</button>
      </div>
      <div class="fr-acts">
        <button class="btn sm moss grow" data-acc="${p.id}">${sv(IP.check,15)} Đồng ý</button>
        <button class="btn sm rose grow" data-dec="${p.id}">${sv(IP.x,14)} Không đồng ý</button>
        <button class="btn sm" data-blk="${p.id}" data-nm="${U.esc(p.name)}" title="Chặn người này">${sv(IP.ban,14)} Chặn</button>
      </div>
    </div>`).join(''):`<div class="card center tint-cream" style="padding:14px;margin-bottom:10px">
      <p class="muted">Hiện chưa có lời mời kết bạn nào gửi đến bạn.</p>
    </div>`;

    const outHTML=outgoing.length?outgoing.map(p=>`<div class="li card">
      ${avHTML(p,40)}
      <div class="grow" style="min-width:0">
        <div class="t">${U.esc(p.name)}</div>
        <div class="row" style="gap:5px;margin-top:2px;flex-wrap:wrap"><span class="tag">Đang chờ đồng ý</span><span class="muted">Mã ${U.esc(p.friend_code||'')}</span></div>
      </div>
      <button class="btn sm" data-vo="${p.id}" title="Thăm phòng">${sv(IP.home,14)}</button>
      <button class="btn sm rose" data-can="${p.id}">Hủy lời mời</button>
    </div>`).join(''):'<p class="muted" style="margin:4px 0">Bạn chưa gửi lời mời nào đang chờ phản hồi.</p>';

    body.innerHTML=`<div class="row" style="margin-bottom:8px">
        <b class="grow">Lời mời kết bạn đến (${incoming.length})</b>
        ${incoming.length?`<span class="tag rose">Chờ bạn duyệt</span>`:''}
        <button class="btn sm" data-ref title="Tải lại">↻</button>
      </div>
      ${inHTML}
      <div class="divider"></div>
      <div class="row" style="margin-bottom:6px"><b class="grow">Lời mời đã gửi (${outgoing.length})</b></div>
      ${outHTML}`;
    fixAvatars(body);

    const refresh=()=>{ if(onUpdated) onUpdated(); else renderRequestsBoard(body,onUpdated); };
    body.querySelector('[data-ref]').onclick=refresh;
    body.querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>visitUser(incoming.find(x=>x.id===b.dataset.v),refresh));
    body.querySelectorAll('[data-vo]').forEach(b=>b.onclick=()=>visitUser(outgoing.find(x=>x.id===b.dataset.vo),refresh));
    body.querySelectorAll('[data-acc]').forEach(b=>b.onclick=async()=>{
      b.disabled=true;
      try{ await Cloud.acceptRequest(b.dataset.acc); UI.toast('Đã đồng ý kết bạn! 🎉'); refresh(); }
      catch(e){ b.disabled=false; UI.toast('Lỗi: '+e.message); }
    });
    body.querySelectorAll('[data-dec]').forEach(b=>b.onclick=async()=>{
      b.disabled=true;
      try{ await Cloud.declineRequest(b.dataset.dec); UI.toast('Đã không đồng ý lời mời kết bạn'); refresh(); }
      catch(e){ b.disabled=false; UI.toast(e.message); }
    });
    body.querySelectorAll('[data-blk]').forEach(b=>b.onclick=()=>confirmSocialAction({
      title:`Chặn ${U.esc(b.dataset.nm||'người này')}?`,
      body:'Lời mời kết bạn sẽ bị xóa và người này không thể gửi lại lời mời hay nhắn tin cho bạn.',
      okLabel:'Chặn ngay', okCls:'rose',
      onOk:async()=>{ await Cloud.block(b.dataset.blk); UI.toast(`Đã chặn ${U.esc(b.dataset.nm||'người dùng')}`); refresh(); }
    }));
    body.querySelectorAll('[data-can]').forEach(b=>b.onclick=async()=>{
      b.disabled=true;
      try{ await Cloud.cancelRequest(b.dataset.can); UI.toast('Đã hủy lời mời'); refresh(); }
      catch(e){ b.disabled=false; UI.toast('Lỗi: '+e.message); }
    });
  }catch(e){ body.innerHTML=`<p class="muted center">Lỗi tải lời mời: ${U.esc(e.message)}</p>`; }
}

/* ---------------- Bảng Lời Mời Kết Bạn chuyên biệt (mở nhanh từ HUD / Bạn bè / Cài đặt) ---------------- */
function openFriendRequests(){
  const sh=UI.sheet({title:'Bảng Lời Mời Kết Bạn',icon:'user',cls:'wide'});
  let seq=0, alive=true;
  sh.track(()=>{ alive=false; });
  const draw=async()=>{
    const my=++seq;
    if(!Cloud.online){
      sh.body.innerHTML=authGateHTML('Bảng lời mời kết bạn');
      bindOAuth(sh.body);
      return;
    }
    sh.body.innerHTML=`<div id="reqBoard"></div>
      <div class="row" style="margin-top:12px;flex-wrap:wrap">
        <button class="btn sm grow" data-go="global">${sv(IP.plus,15)} Cộng đồng & Kết bạn</button>
        <button class="btn sm grow" data-go="friends">${sv(IP.user,15)} Bạn bè (${Cloud.friendIds.length})</button>
        <button class="btn sm grow" data-go="blocked">${sv(IP.ban,15)} Đã chặn (${Cloud.blocked.length})</button>
      </div>`;
    sh.body.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{ sh.close(); openFriends(b.dataset.go); });
    await renderRequestsBoard(sh.body.querySelector('#reqBoard'),draw,()=>!alive||my!==seq);
  };
  draw();
  sh.track(Cloud.on('auth',draw));
}

/* ---------------- Sheet Cộng đồng (gộp Kết bạn) • Bạn bè • Lời mời • Đã chặn ---------------- */
function openFriends(initialTab='global'){
  const sh=UI.sheet({title:'Cộng Đồng & Bạn Bè',icon:'chat',cls:'wide'});
  let focusFind=initialTab==='find';
  let tab=(!initialTab||initialTab==='find')?'global':initialTab, cleanup=null, seq=0, alive=true;
  const clearSub=()=>{ if(cleanup){ cleanup(); cleanup=null; } };
  sh.track(()=>{ alive=false; clearSub(); });

  const syncTabLabels=()=>{
    const tabs=sh.body.querySelector('.soc-tabs'); if(!tabs) return;
    const inN=Cloud.incomingIds.length, blkN=Cloud.blocked.length;
    const bf=tabs.querySelector('[data-k=friends]'); if(bf) bf.textContent=`Bạn bè (${Cloud.friendIds.length})`;
    const bp=tabs.querySelector('[data-k=pending]'); if(bp) bp.textContent=`Lời mời${inN?` (${inN})`:''}`;
    const bb=tabs.querySelector('[data-k=blocked]'); if(bb) bb.textContent=`Đã chặn${blkN?` (${blkN})`:''}`;
  };

  const render=async()=>{
    const my=++seq;
    clearSub();
    if(!Cloud.online){
      sh.body.innerHTML=authGateHTML('Chat online & Bạn bè');
      bindOAuth(sh.body);
      return;
    }
    const inN=Cloud.incomingIds.length, blkN=Cloud.blocked.length;
    sh.body.innerHTML=`<div class="seg soc-tabs" style="margin-bottom:10px">
        <button class="${tab==='global'?'on':''}" data-k="global">Cộng đồng</button>
        <button class="${tab==='friends'?'on':''}" data-k="friends">Bạn bè (${Cloud.friendIds.length})</button>
        <button class="${tab==='pending'?'on':''}" data-k="pending">Lời mời${inN?` (${inN})`:''}</button>
        <button class="${tab==='blocked'?'on':''}" data-k="blocked">Đã chặn${blkN?` (${blkN})`:''}</button>
      </div><div id="socBody"></div>`;
    sh.body.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{ tab=b.dataset.k; render(); });
    const body=sh.body.querySelector('#socBody');

    if(tab==='global'){
      const code=(Cloud.profile&&Cloud.profile.friend_code)||'------';
      body.innerHTML=`<div class="card tint-moss" style="padding:10px 12px;margin-bottom:10px">
          <div class="row" style="flex-wrap:wrap;gap:6px;margin-bottom:8px">
            ${sv(IP.user,18)}
            <b class="grow" style="font-size:13.5px">Tìm & Kết bạn</b>
            <span class="tag">Mã của bạn: <b class="txt-accent" style="letter-spacing:1px">${U.esc(code)}</b></span>
            <button class="btn sm" id="cpCode" title="Sao chép mã bạn bè">${sv(IP.copy,14)} Copy</button>
            ${inN?`<button class="btn sm rose" id="goPendQuick">Lời mời (${inN})</button>`:''}
          </div>
          <div class="row">
            <input class="inp" id="fSearch" placeholder="Nhập tên hoặc mã 6 ký tự để kết bạn..." maxlength="24" style="font-size:13.5px;padding:6px 10px">
            <button class="btn sm pri" id="fGo">${sv(IP.search,16)} Tìm</button>
          </div>
          <div id="fRes" style="margin-top:8px;display:none"></div>
        </div>
        <div id="gChatWrap"></div>`;

      body.querySelector('#cpCode').onclick=()=>copyText(code,'Đã sao chép mã bạn bè: '+code);
      const gp=body.querySelector('#goPendQuick');
      if(gp) gp.onclick=()=>{ tab='pending'; render(); };

      const fRes=body.querySelector('#fRes'), fIn=body.querySelector('#fSearch');
      const runSearch=async()=>{
        const q=fIn.value.trim();
        fRes.style.display='';
        if(q.length<2){ fRes.innerHTML='<p class="muted center">Nhập ít nhất 2 ký tự để tìm người chơi thật.</p>'; return; }
        fRes.innerHTML='<p class="muted center">Đang tìm...</p>';
        try{
          await Cloud.loadBlocks();
          await Cloud.loadFriends();
          const rows=await Cloud.search(q);
          const head=`<div class="row" style="margin-bottom:6px"><span class="muted grow">Kết quả cho "${U.esc(q)}" (${rows.length})</span><button class="btn sm" id="fClear">Đóng ×</button></div>`;
          if(!rows.length){
            fRes.innerHTML=`${head}<p class="muted center">Không tìm thấy ai khớp từ khóa này.</p>`;
            fRes.querySelector('#fClear').onclick=()=>{ fRes.style.display='none'; fIn.value=''; };
            return;
          }
          fRes.innerHTML=head+rows.map(p=>{
            const rel=Cloud.relOf(p.id);
            const act=rel==='blocked'
              ?`<span class="tag rose">Đã chặn</span><button class="btn sm moss" data-unblk="${p.id}" data-nm="${U.esc(p.name)}">Bỏ chặn</button>`
              :rel==='friend'
              ?`<span class="tag moss">Bạn bè</span><button class="btn sm" data-unfr="${p.id}" data-nm="${U.esc(p.name)}">Xóa bạn</button><button class="btn sm rose" data-blk="${p.id}" data-nm="${U.esc(p.name)}" title="Chặn">${sv(IP.ban,13)}</button>`
              :rel==='outgoing'
              ?`<button class="btn sm" data-can="${p.id}">Đang chờ • Hủy</button><button class="btn sm rose" data-blk="${p.id}" data-nm="${U.esc(p.name)}" title="Chặn">${sv(IP.ban,13)}</button>`
              :rel==='incoming'
              ?`<button class="btn sm moss" data-acc="${p.id}">Đồng ý</button><button class="btn sm rose" data-dec="${p.id}">Không đồng ý</button>`
              :`<button class="btn sm pri" data-add="${p.id}">${sv(IP.plus,14)} Kết bạn</button><button class="btn sm rose" data-blk="${p.id}" data-nm="${U.esc(p.name)}" title="Chặn">${sv(IP.ban,13)}</button>`;
            return `<div class="fr-card card">
              <div class="row">${avHTML(p,38)}
                <div class="grow" style="min-width:0"><div class="t" style="font-weight:800;font-size:14.5px">${U.esc(p.name)}</div>
                  <div class="muted">Mã ${U.esc(p.friend_code||'')} • ${p.gems||0} Gem • ngủ ${p.sleep_streak||0} ngày</div></div>
                <button class="btn sm" data-vf="${p.id}" title="Thăm phòng">${sv(IP.home,14)}</button>
              </div>
              <div class="fr-acts">${act}</div>
            </div>`;
          }).join('');
          fixAvatars(fRes);
          fRes.querySelector('#fClear').onclick=()=>{ fRes.style.display='none'; fIn.value=''; };
          fRes.querySelectorAll('[data-vf]').forEach(b=>b.onclick=()=>visitUser(rows.find(x=>x.id===b.dataset.vf),runSearch));
          fRes.querySelectorAll('[data-add]').forEach(b=>b.onclick=async()=>{
            b.disabled=true;
            try{ const r=await Cloud.sendRequest(b.dataset.add); UI.toast(r==='friend'?'Đã thành bạn bè!':'Đã gửi lời mời kết bạn!'); runSearch(); }
            catch(e){ b.disabled=false; UI.toast('Lỗi: '+e.message); }
          });
          fRes.querySelectorAll('[data-acc]').forEach(b=>b.onclick=async()=>{
            b.disabled=true;
            try{ await Cloud.acceptRequest(b.dataset.acc); UI.toast('Đã đồng ý kết bạn!'); runSearch(); }
            catch(e){ b.disabled=false; UI.toast('Lỗi: '+e.message); }
          });
          fRes.querySelectorAll('[data-dec]').forEach(b=>b.onclick=async()=>{
            b.disabled=true;
            try{ await Cloud.declineRequest(b.dataset.dec); UI.toast('Đã không đồng ý lời mời'); runSearch(); }
            catch(e){ b.disabled=false; UI.toast(e.message); }
          });
          fRes.querySelectorAll('[data-can]').forEach(b=>b.onclick=async()=>{
            b.disabled=true;
            try{ await Cloud.cancelRequest(b.dataset.can); UI.toast('Đã hủy lời mời'); runSearch(); }
            catch(e){ b.disabled=false; UI.toast('Lỗi: '+e.message); }
          });
          fRes.querySelectorAll('[data-unfr]').forEach(b=>b.onclick=()=>confirmSocialAction({
            title:`Xóa bạn ${U.esc(b.dataset.nm)}?`,
            body:'Xóa người này khỏi danh sách bạn bè của bạn.',
            okLabel:'Xóa bạn', okCls:'rose',
            onOk:async()=>{ await Cloud.removeFriend(b.dataset.unfr); UI.toast(`Đã xóa bạn ${U.esc(b.dataset.nm)}`); runSearch(); }
          }));
          fRes.querySelectorAll('[data-blk]').forEach(b=>b.onclick=()=>confirmSocialAction({
            title:`Chặn ${U.esc(b.dataset.nm)}?`,
            body:'Chặn sẽ tự động xóa kết bạn/lời mời và ẩn người này khỏi chat.',
            okLabel:'Chặn ngay', okCls:'rose',
            onOk:async()=>{ await Cloud.block(b.dataset.blk); UI.toast(`Đã chặn ${U.esc(b.dataset.nm)}`); runSearch(); }
          }));
          fRes.querySelectorAll('[data-unblk]').forEach(b=>b.onclick=async()=>{
            b.disabled=true;
            try{ await Cloud.unblock(b.dataset.unblk); UI.toast(`Đã bỏ chặn ${U.esc(b.dataset.nm)}`); runSearch(); }
            catch(e){ b.disabled=false; UI.toast('Lỗi: '+e.message); }
          });
        }catch(e){ fRes.innerHTML=`<p class="muted center">Lỗi tìm kiếm: ${U.esc(e.message)}</p>`; }
      };
      body.querySelector('#fGo').onclick=runSearch;
      fIn.onkeydown=e=>{ if(e.key==='Enter') runSearch(); };
      if(focusFind){ focusFind=false; setTimeout(()=>fIn.focus(),80); }

      cleanup=mountChatRoom(body.querySelector('#gChatWrap'),'global',{showSender:true,emptyText:'Phòng chat cộng đồng còn trống. Gửi lời chào đầu tiên nào!'});
      return;
    }

    if(tab==='friends'){
      body.innerHTML='<p class="muted center">Đang tải danh sách bạn bè...</p>';
      try{
        const list=await Cloud.friends();
        if(!alive||my!==seq) return;
        const topTools=`<div class="row" style="margin-bottom:10px;flex-wrap:wrap">
          <button class="btn sm ${Cloud.incomingIds.length?'rose':'moss'} grow" data-open-req>${sv(IP.user,15)} Bảng lời mời kết bạn${Cloud.incomingIds.length?` (${Cloud.incomingIds.length})`:''}</button>
          <button class="btn sm pri" data-go-find>${sv(IP.plus,15)} Thêm bạn</button>
          <button class="btn sm" data-go-blk>${sv(IP.ban,15)} Đã chặn (${Cloud.blocked.length})</button>
        </div>`;
        if(!list.length){
          body.innerHTML=`${topTools}<div class="card center" style="padding:18px">
            ${sv(IP.user,44)}
            <p class="muted" style="margin:8px 0">Bạn chưa có bạn bè chính thức. Vào <b>Cộng đồng</b> để tìm bạn theo tên/mã và gửi lời mời kết bạn nhé!</p>
            <button class="btn pri" data-go-find>Tìm & kết bạn ngay</button>
          </div>`;
          body.querySelector('[data-open-req]').onclick=()=>{ tab='pending'; render(); };
          body.querySelector('[data-go-blk]').onclick=()=>{ tab='blocked'; render(); };
          body.querySelectorAll('[data-go-find]').forEach(b=>b.onclick=()=>{ focusFind=true; tab='global'; render(); });
          return;
        }
        body.innerHTML=`${topTools}<div class="soc-grid">${list.map(f=>`<div class="fr-card card">
          <div class="row">
            ${avHTML(f,42)}
            <div class="grow" style="min-width:0">
              <div class="t" style="font-weight:800;font-size:15px">${U.esc(f.name)}</div>
              <div class="row" style="gap:4px;flex-wrap:wrap;margin-top:3px">
                <span class="tag moss">${sv(IP.moon,12)} ${f.sleep_streak||0} ngày</span>
                <span class="tag">${sv(IP.gem,12)} ${f.gems||0}</span>
                ${f.screen_day===Core.s.day?`<span class="tag">${sv(IP.phone,12)} ${f.screen_today}p</span>`:''}
              </div>
            </div>
          </div>
          <div class="fr-acts">
            <button class="btn sm grow" data-v="${f.id}">${sv(IP.home,14)} Thăm</button>
            <button class="btn sm pri grow" data-c="${f.id}">${sv(IP.chat,14)} Chat</button>
            <button class="btn sm" data-unfr="${f.id}" data-nm="${U.esc(f.name)}">${sv(IP.x,13)} Xóa bạn</button>
            <button class="btn sm rose" data-blk="${f.id}" data-nm="${U.esc(f.name)}">${sv(IP.ban,14)} Chặn</button>
          </div>
        </div>`).join('')}</div>`;
        fixAvatars(body);
        body.querySelector('[data-open-req]').onclick=()=>{ tab='pending'; render(); };
        body.querySelector('[data-go-blk]').onclick=()=>{ tab='blocked'; render(); };
        body.querySelectorAll('[data-go-find]').forEach(b=>b.onclick=()=>{ focusFind=true; tab='global'; render(); });
        body.querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>visitUser(list.find(x=>x.id===b.dataset.v),render));
        body.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>openDM(list.find(x=>x.id===b.dataset.c)));
        body.querySelectorAll('[data-unfr]').forEach(b=>b.onclick=()=>confirmSocialAction({
          title:`Xóa bạn ${U.esc(b.dataset.nm)}?`,
          body:'Hai bạn sẽ không còn trong danh sách bạn bè nữa. Sau này bạn vẫn có thể kết bạn lại.',
          okLabel:'Xóa bạn', okCls:'rose',
          onOk:async()=>{ await Cloud.removeFriend(b.dataset.unfr); UI.toast(`Đã xóa ${U.esc(b.dataset.nm)} khỏi danh sách bạn bè`); render(); }
        }));
        body.querySelectorAll('[data-blk]').forEach(b=>b.onclick=()=>confirmSocialAction({
          title:`Chặn ${U.esc(b.dataset.nm)}?`,
          body:'Chặn sẽ tự động xóa bạn, ẩn tin nhắn và ngăn người này gửi lời mời kết bạn cho bạn.',
          okLabel:'Chặn ngay', okCls:'rose',
          onOk:async()=>{ await Cloud.block(b.dataset.blk); UI.toast(`Đã chặn ${U.esc(b.dataset.nm)}`); render(); }
        }));
      }catch(e){ body.innerHTML=`<p class="muted center">Lỗi tải bạn bè: ${U.esc(e.message)}</p>`; }
      return;
    }

    if(tab==='pending'){
      await renderRequestsBoard(body,render,()=>!alive||my!==seq);
      return;
    }

    /* tab === 'blocked' */
    body.innerHTML='<p class="muted center">Đang tải danh sách đã chặn...</p>';
    try{
      const rows=await Cloud.blockedProfiles();
      if(!alive||my!==seq) return;
      const byId=Object.fromEntries(rows.map(p=>[p.id,p]));
      const ids=Cloud.blocked.slice();
      if(!ids.length){
        body.innerHTML=`<div class="card center" style="padding:18px">
          ${sv(IP.shield,42)}
          <b style="display:block;margin-top:6px">Danh sách chặn đang trống</b>
          <p class="muted" style="margin-top:4px">Khi bạn chặn ai đó, họ sẽ tự động bị xóa khỏi danh sách bạn bè, ẩn tin nhắn và xuất hiện tại đây để bạn có thể bỏ chặn bất cứ lúc nào.</p>
        </div>`;
        return;
      }
      body.innerHTML=`<p class="muted" style="margin-bottom:8px">Những người bạn đã chặn sẽ không hiển thị trong chat, bạn bè hay bảng xếp hạng của bạn:</p>
        <div class="col">${ids.map(id=>{
          const p=byId[id]||{id,name:'Người dùng đã chặn',friend_code:'—'};
          return `<div class="li card tint-rose">
            ${avHTML(p,40)}
            <div class="grow" style="min-width:0">
              <div class="t">${U.esc(p.name)}</div>
              <div class="muted">Mã ${U.esc(p.friend_code||'—')} • Đang bị chặn</div>
            </div>
            <button class="btn sm moss" data-unblk="${id}" data-nm="${U.esc(p.name)}">${sv(IP.shield,14)} Bỏ chặn</button>
          </div>`;
        }).join('')}</div>`;
      fixAvatars(body);
      body.querySelectorAll('[data-unblk]').forEach(b=>b.onclick=async()=>{
        b.disabled=true;
        try{ await Cloud.unblock(b.dataset.unblk); UI.toast(`Đã bỏ chặn ${U.esc(b.dataset.nm)}`); render(); }
        catch(e){ b.disabled=false; UI.toast('Lỗi: '+e.message); }
      });
    }catch(e){ body.innerHTML=`<p class="muted center">Lỗi tải danh sách chặn: ${U.esc(e.message)}</p>`; }
  };

  render();
  sh.track(Cloud.on('auth',render));
  sh.track(Cloud.on('friends',syncTabLabels));
  sh.track(Cloud.on('blocks',syncTabLabels));
}

/* ---------------- Bảng xếp hạng trực tuyến thật ---------------- */
function openLeaderboard(){
  const sh=UI.sheet({title:'Bảng Xếp Hạng',icon:'trophy',cls:'wide'});
  let tab='gems', scope='global', seq=0, alive=true;
  sh.track(()=>{ alive=false; });
  const TABS=[['gems','Top Gem'],['screen','Ít Dùng Máy'],['quests','Top Quest'],['sleep','Ngủ Ngon']];
  const DESC={
    gems:'Tổng Gem tích lũy từ thói quen lành mạnh.',
    screen:'Người dùng màn hình ÍT NHẤT hôm nay đứng đầu!',
    quests:'Tổng số Quest đời thực đã hoàn thành.',
    sleep:'Chuỗi ngày ngủ đủ 8 tiếng liên tiếp.'
  };
  const medal=['#f1d77a','#cfd3d6','#e0b27a'];

  const render=async()=>{
    const my=++seq;
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
      if(!alive||my!==seq) return;
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
          <b class="txt-accent" style="font-size:15px;white-space:nowrap">${val}</b>
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

/* ---------------- Túi đồ / Phụ kiện / Ngoại thất nhà / Theme ---------------- */
function openBag(){
  const sh=UI.sheet({title:'Túi Đồ • Nhà • Giao Diện',icon:'bag',cls:'wide'}); let tab='acc';
  sh.body.innerHTML=`<div id="bagDk" style="position:relative;height:114px;margin-top:-6px"></div><div id="bagC"></div>`;
  const dkWrap=sh.body.querySelector('#bagDk');
  const dk=new Donkey({scale:1.25,tilt:-16,yaw:24,acc:Core.s.acc.on,mood:Core.mood()});
  dkWrap.appendChild(dk.el);
  const placeDk=()=>dk.pos((dkWrap.clientWidth||320)/2,106);
  requestAnimationFrame(placeDk);
  const ro=new ResizeObserver(placeDk); ro.observe(dkWrap); sh.track(()=>ro.disconnect());

  const render=()=>{ const s=Core.s, c=sh.body.querySelector('#bagC'); dk.setAcc(s.acc.on);
    let inner='';
    if(tab==='acc'){
      inner=`<div class="grid3">${Object.entries(DATA.ACCS).map(([id,a])=>{ const own=s.acc.owned.includes(id), on=s.acc.on.includes(id);
        return `<div class="pet-card card ${on?'tint-active':''}">${sv(IP[id],44)}<span style="font-size:12px">${a.name}</span>${own?`<button class="btn sm ${on?'pri':''}" data-t="${id}">${on?'Đang đeo':'Đeo'}</button>`:`<button class="btn sm rose" data-b="${id}">${sv(IP.gem,13)} ${a.price}</button>`}</div>`; }).join('')}</div><p class="muted center" style="margin-top:8px">Phụ kiện hiển thị trên chú lừa Voxel ở mọi màn hình.</p>`;
    } else if(tab==='houses'){
      const D=s.decor;
      inner=`<div class="grid2">${Object.entries(DATA.HOUSES).map(([id,h])=>{
        const own=D.housesOwned.includes(id), on=D.house===id;
        return `<div class="pet-card card ${on?'tint-active':''}" style="padding:8px 6px;${on?'border-color:var(--accent)':''}">
          <div class="house-mini">${typeof SCENE!=='undefined'?SCENE.houseOf(id):sv(IP.home,48)}</div>
          <b style="font-size:13px">${h.name}</b>
          <span class="muted" style="font-size:11px">${h.size} • ${h.theme}${h.comfort?` • +${h.comfort} ấm cúng`:''}</span>
          ${on?'<span class="tag moss">Đang ở ✓</span>':own?`<button class="btn sm pri" data-hb="${id}">Chọn nhà</button>`:`<button class="btn sm rose" data-hb="${id}">${sv(IP.gem,13)} ${h.price}</button>`}
        </div>`;
      }).join('')}</div>`;
    } else if(tab==='theme'){
      inner=`<p class="muted" style="margin-bottom:8px">Đổi màu giao diện <b>miễn phí 100%</b> — lấy cảm hứng từ bảng màu dịu mắt của Lừa Chill:</p>${themePickerHTML()}`;
    } else {
      inner=`${s.decor.boxes.length?s.decor.boxes.map(b=>`<div class="li card">${sv(IP.box,36)}<b class="grow">${DATA.DECOR[b.id].name}</b><span class="tag">Chưa mở</span></div>`).join(''):'<p class="muted center">Chưa có hộp nào. Mua nội thất bằng Gem trong nhà nhé!</p>'}`;
    }
    c.innerHTML=`<div class="seg" style="margin-bottom:10px">
        <button class="${tab==='acc'?'on':''}" data-k="acc">Phụ kiện</button>
        <button class="${tab==='houses'?'on':''}" data-k="houses">Ngoại thất</button>
        <button class="${tab==='theme'?'on':''}" data-k="theme">Theme Free</button>
        <button class="${tab==='box'?'on':''}" data-k="box">Hộp (${s.decor.boxes.length})</button>
      </div>${inner}
      <button class="btn pri full" style="margin-top:10px" data-a="decor">${sv(IP.home,20)} Vào nhà mở rộng & trang trí</button>`;
    c.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{ tab=b.dataset.k; render(); });
    c.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{ Core.toggleAcc(b.dataset.t); render(); });
    c.querySelectorAll('[data-b]').forEach(b=>b.onclick=()=>{ if(Core.buyAcc(b.dataset.b)) UI.toast(`Đã mua ${DATA.ACCS[b.dataset.b].name}!`); else UI.toast('Chưa đủ Gem'); render(); });
    c.querySelectorAll('[data-hb]').forEach(b=>b.onclick=()=>{
      const id=b.dataset.hb, h=DATA.HOUSES[id], r=Core.buyHouse(id);
      if(r.ok){ UI.toast(r.bought?`Chúc mừng mua ${h.name}!`:`Đã đổi sang ${h.name}!`); render(); }
      else UI.toast(r.msg);
    });
    bindThemePicker(c,render);
    c.querySelector('[data-a=decor]').onclick=()=>{ sh.close(); Nav.go('tycoon'); }; };
  render();
}
