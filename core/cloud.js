/* =============================================================================
   core/cloud.js — KẾT NỐI ONLINE (Supabase): đăng nhập Google / Discord, đồng bộ tiến trình,
   bạn bè, CHAT THỜI GIAN THỰC, BẢNG XẾP HẠNG thật. Viết tay (không cần thư viện ngoài)
   để chạy được cả trong Chrome Extension (MV3 cấm script từ CDN) và Android WebView.
   Schema + phân quyền: backend/supabase.sql
   ============================================================================= */
'use strict';
const Cloud={
  cfg:window.LC_CONFIG||{}, session:null, user:null, profile:null, ls:{}, friendIds:[], incomingIds:[], outgoingIds:[], blocked:[],
  SKEY:'lc_session_v1',
  get enabled(){ return !!(this.cfg.supabaseUrl && this.cfg.supabaseAnonKey); },
  get online(){ return !!(this.enabled && this.user); },
  get uid(){ return this.user&&this.user.id; },
  on(e,f){ (this.ls[e]=this.ls[e]||[]).push(f); return ()=>{ this.ls[e]=this.ls[e].filter(x=>x!==f); }; },
  emit(e,d){ (this.ls[e]||[]).slice().forEach(f=>{ try{ f(d); }catch(err){ console.error(err); } }); },
  base(){ return String(this.cfg.supabaseUrl||'').trim().replace(/\/(rest|auth|realtime)\/v1.*$/,'').replace(/\/+$/,''); },

  /* ---------------- AUTH ---------------- */
  async init(){ if(!this.enabled) return;
    try{ this.blocked=JSON.parse(localStorage.getItem('lc_blocked')||'[]'); }catch(e){}
    let pendingHash='';
    if(/access_token=|error_description=|error=/.test(location.hash)) pendingHash=location.hash;
    else if(/access_token=|error_description=|error=/.test(location.search)) pendingHash=location.search;
    if(!pendingHash && Bridge.android && window.LuaChillNative.consumePendingAuth){
      try{ pendingHash=window.LuaChillNative.consumePendingAuth()||''; }catch(e){}
    }
    if(!pendingHash && Bridge.electron && window.LuaChillDesktop.consumeAuth){
      try{ pendingHash=(await window.LuaChillDesktop.consumeAuth())||''; }catch(e){}
    }
    if(pendingHash){
      await this.handleHash(pendingHash, pendingHash===location.hash||pendingHash===location.search);
    } else {
      try{ this.session=JSON.parse(localStorage.getItem(this.SKEY)); }catch(e){}
      if(this.session) await this.loadUser();
    }
    window.addEventListener('online',()=>this.pushSoon()); },
  redirectUrl(){ if(Bridge.android) return this.cfg.androidRedirect||'luachill://auth';
    if(Bridge.electron) return this.cfg.desktopRedirect||'http://127.0.0.1:45821/auth-callback';
    if(Bridge.ext && chrome.identity) return chrome.identity.getRedirectURL('auth');
    return this.cfg.siteUrl || new URL(Nav.url('home'),location.href).href.split('#')[0].split('?')[0]; },
  async signIn(provider){ if(!this.enabled){ UI.toast('Chưa cấu hình máy chủ (config.js) — xem DEPLOY.md'); return; }
    if(!Bridge.android && !Bridge.electron && !Bridge.ext && location.protocol==='file:'){
      UI.modal(`<h3 class="txt-accent">Không thể đăng nhập khi mở file trực tiếp (file://)</h3><p class="muted" style="margin:8px 0">Trình duyệt chặn Google/Discord chuyển hướng về <code>file:///</code>. Hãy mở app qua <b>App Desktop PC</b>, <b>App Android</b>, <b>Chrome Extension</b>, hoặc <code>http://localhost</code>.</p><button class="btn pri full" data-x>Đã hiểu</button>`).box.querySelector('[data-x]').onclick=function(){ this.closest('.modal-wrap').remove(); };
      return;
    }
    const redir=this.redirectUrl();
    const url=`${this.base()}/auth/v1/authorize?provider=${provider}&redirect_to=${encodeURIComponent(redir)}`;
    if(Bridge.android && window.LuaChillNative.openAuth){ window.LuaChillNative.openAuth(url); return; }
    if(Bridge.electron && window.LuaChillDesktop.openAuth){ window.LuaChillDesktop.openAuth(url); UI.toast('Đang mở trình duyệt để đăng nhập...'); return; }
    if(Bridge.ext && chrome.identity){ try{ const r=await chrome.identity.launchWebAuthFlow({url,interactive:true}); await this.handleHash(new URL(r).hash); }catch(e){ UI.toast('Đăng nhập chưa hoàn tất — kiểm tra Redirect URL trong Supabase: '+redir); } return; }
    location.href=url; },
  async handleHash(hash,clean){ const raw=String(hash||'').replace(/^[#?]+/,''); const p=new URLSearchParams(raw);
    if(clean) history.replaceState(null,'',location.pathname);
    if(p.get('error_description')||p.get('error')){ UI.toast('Đăng nhập lỗi: '+(p.get('error_description')||p.get('error'))); return false; }
    const at=p.get('access_token'); if(!at) return false;
    if(this._handlingToken===at || (this.session && this.session.access_token===at && this.user)) return true;
    this._handlingToken=at;
    this.session={access_token:at,refresh_token:p.get('refresh_token'),expires_at:Date.now()+(+p.get('expires_in')||3600)*1000};
    localStorage.setItem(this.SKEY,JSON.stringify(this.session));
    let ok=false;
    try{ ok=await this.loadUser(); }
    finally{ if(!ok) this._handlingToken=null; }
    if(ok) UI.toast(`Đã đăng nhập: ${U.esc((this.profile&&this.profile.name)||this.meta().name)}`);
    else UI.toast('Không tải được tài khoản — hãy kiểm tra kết nối mạng và thử lại.');
    return ok; },
  async refresh(){ if(!this.session||!this.session.refresh_token) return false;
    try{ const r=await fetch(`${this.base()}/auth/v1/token?grant_type=refresh_token`,{method:'POST',headers:{apikey:this.cfg.supabaseAnonKey,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:this.session.refresh_token})});
      if(!r.ok) throw new Error(r.status); const j=await r.json();
      this.session={access_token:j.access_token,refresh_token:j.refresh_token,expires_at:Date.now()+(j.expires_in||3600)*1000}; localStorage.setItem(this.SKEY,JSON.stringify(this.session)); return true;
    }catch(e){ if(String(e.message)==='400'||String(e.message)==='401') this.signOut(true); return false; } },
  async token(){ if(!this.session) return null; if(Date.now()>this.session.expires_at-60e3) await this.refresh(); return this.session&&this.session.access_token; },
  async loadUser(){ try{ const t=await this.token(); if(!t) return false;
      const r=await fetch(`${this.base()}/auth/v1/user`,{headers:{apikey:this.cfg.supabaseAnonKey,Authorization:'Bearer '+t}});
      if(!r.ok){ if(r.status===401){ this.signOut(true); } return false; }
      this.user=await r.json();
      try{ await this.ensureProfile(); }catch(e){
        console.warn('[Cloud] profile fallback',e);
        const m=this.meta();
        this.profile=this.profile||{id:this.uid,name:m.name,avatar_url:m.avatar,friend_code:'------'};
      }
      if(typeof Core!=='undefined' && Core.s && Core.s.name==='Bạn Lừa' && this.profile && this.profile.name && this.profile.name!=='Bạn Lừa'){
        Core.s.name=this.profile.name; Core.save();
      }
      await this.syncSave().catch(()=>{});
      this.startSync();
      await this.loadBlocks().catch(()=>{});
      await this.loadFriends().catch(()=>{});
      this.emit('auth',this.user);
      if(typeof Core!=='undefined' && Core.s) Core.emit('change');
      return true;
    }catch(e){ console.warn('[Cloud] offline',e); return false; } },
  signOut(silent){ this._handlingToken=null; this.session=null; this.user=null; this.profile=null; this.friendIds=[]; this.incomingIds=[]; this.outgoingIds=[]; localStorage.removeItem(this.SKEY); RT.close(); this.emit('friends'); this.emit('auth',null); if(!silent) UI.toast('Đã đăng xuất'); },
  meta(){ const m=(this.user&&this.user.user_metadata)||{}; return {name:(m.full_name||m.name||m.custom_claims&&m.custom_claims.global_name||m.user_name||'Bạn Lừa').slice(0,24),avatar:m.avatar_url||m.picture||null,provider:(this.user&&this.user.app_metadata&&this.user.app_metadata.provider)||''}; },

  /* ---------------- REST (PostgREST) ---------------- */
  async api(path,{method='GET',body,prefer}={},retry=true){ const t=await this.token();
    const h={apikey:this.cfg.supabaseAnonKey,'Content-Type':'application/json'};
    if(t) h.Authorization='Bearer '+t;
    else if(/^eyJ/.test(this.cfg.supabaseAnonKey||'')) h.Authorization='Bearer '+this.cfg.supabaseAnonKey;
    if(prefer) h.Prefer=prefer;
    const r=await fetch(`${this.base()}/rest/v1/${path}`,{method,headers:h,body:body?JSON.stringify(body):undefined});
    if(r.status===401&&retry&&await this.refresh()) return this.api(path,{method,body,prefer},false);
    if(!r.ok){ let msg=r.status; try{ msg=(await r.json()).message||msg; }catch(e){} throw new Error(msg); }
    return r.status===204?null:r.json().catch(()=>null); },

  /* ---------------- PROFILE + SAVE ---------------- */
  async ensureProfile(){ const rows=await this.api(`profiles?id=eq.${this.uid}&select=*`); const m=this.meta();
    if(rows&&rows[0]){ this.profile=rows[0]; if(!this.profile.avatar_url&&m.avatar) this.api(`profiles?id=eq.${this.uid}`,{method:'PATCH',body:{avatar_url:m.avatar}}).catch(()=>{}); return; }
    const ins=await this.api('profiles',{method:'POST',body:{id:this.uid,name:m.name,avatar_url:m.avatar},prefer:'resolution=merge-duplicates,return=representation'}); this.profile=(ins&&ins[0])||{id:this.uid,name:m.name,avatar_url:m.avatar,friend_code:'------'}; },
  statsRow(){ const s=Core.s; return {name:s.name.slice(0,24),gems:Math.max(0,Math.floor(s.gems)),quests_total:s.questsTotal,screen_today:Math.max(s.screen.totalUsed||0,s.screen.used||0),screen_day:s.day,sleep_streak:s.sleep.streak,checkin_streak:s.checkin.streak,
    acc:s.acc.on,room:{wall:s.decor.wall,floor:s.decor.floor,placed:s.decor.placed,roomId:s.decor.activeRoom||'bedroom',house:s.decor.house||'mushroom'},garden_stage:Core.gardenStage(),updated_at:new Date().toISOString()}; },
  async push(){ if(!this.online||!Core.s) return; clearTimeout(this._pt); this._pt=null;
    try{ await this.api(`profiles?id=eq.${this.uid}`,{method:'PATCH',body:this.statsRow()});
      await this.api('saves',{method:'POST',body:{id:this.uid,state:Core.s,updated_at:new Date().toISOString()},prefer:'resolution=merge-duplicates'}); this.lastPush=Date.now();
    }catch(e){ console.warn('[Cloud] push',e.message); } },
  pushSoon(){ if(!this.online||this._pt) return; this._pt=setTimeout(()=>this.push(),8000); },
  startSync(){ if(this._sync) return; this._sync=true; ['gems','quest','checkin','decor','acc'].forEach(e=>Core.on(e,()=>this.pushSoon()));
    setInterval(()=>{ if(!this.online) return; if(Date.now()-(this.lastPush||0)>60e3) this.push(); this.loadFriends(); },30e3);
    document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='hidden') this.push(); }); },
  /* Đồng bộ đa thiết bị: bản nào lưu sau thắng */
  async syncSave(){ try{ const r=await this.api(`saves?id=eq.${this.uid}&select=state,updated_at`); const remote=r&&r[0]&&r[0].state;
      if(remote && (!Core.s || (remote.savedAt||0)>(Core.s.savedAt||0)+5000)){ Store.save(remote); Core.reload(); UI.toast('Đã tải tiến trình từ đám mây ☁️'); }
      else if(Core.s) this.pushSoon();
    }catch(e){ console.warn('[Cloud] save sync',e.message); } },
  async rename(name){ name=String(name).trim().slice(0,24); if(!name) return; Core.s.name=name; Core.save(); await this.api(`profiles?id=eq.${this.uid}`,{method:'PATCH',body:{name}}); if(this.profile) this.profile.name=name; Core.emit('change'); this.emit('auth',this.user); },

  /* ---------------- FRIENDS, PENDING REQUESTS & BLOCKS ---------------- */
  isBlocked(id){ return this.blocked.includes(id); },
  relOf(id){ if(this.isBlocked(id)) return 'blocked'; if(this.friendIds.includes(id)) return 'friend'; if(this.incomingIds.includes(id)) return 'incoming'; if(this.outgoingIds.includes(id)) return 'outgoing'; return 'none'; },
  async loadFriends(){ if(!this.online) return []; try{
      const r=await this.api(`friendships?or=(user_id.eq.${this.uid},friend_id.eq.${this.uid})&select=user_id,friend_id,created_at`);
      const sent=new Set(), recv=new Set(), blk=new Set(this.blocked);
      for(const x of (r||[])){
        if(x.user_id===this.uid && !blk.has(x.friend_id)) sent.add(x.friend_id);
        if(x.friend_id===this.uid && !blk.has(x.user_id)) recv.add(x.user_id);
      }
      this.friendIds=[...sent].filter(id=>recv.has(id));
      this.incomingIds=[...recv].filter(id=>!sent.has(id));
      this.outgoingIds=[...sent].filter(id=>!recv.has(id));
      this.emit('friends');
    }catch(e){} return this.friendIds; },
  async friends(){ await this.loadFriends(); if(!this.friendIds.length) return []; return this.api(`profiles?id=in.(${this.friendIds.join(',')})&select=*&order=name`); },
  async pending(){ await this.loadFriends(); const all=[...new Set([...this.incomingIds,...this.outgoingIds])];
    if(!all.length) return {incoming:[],outgoing:[]};
    const rows=await this.api(`profiles?id=in.(${all.join(',')})&select=*&order=name`);
    const map=Object.fromEntries((rows||[]).map(p=>[p.id,p]));
    return {incoming:this.incomingIds.map(id=>map[id]).filter(Boolean), outgoing:this.outgoingIds.map(id=>map[id]).filter(Boolean)}; },
  async search(q){ q=String(q).trim().replace(/[,()*%]/g,''); if(q.length<2) return [];
    const code=q.toUpperCase(); return (await this.api(`profiles?or=(name.ilike.*${encodeURIComponent(q)}*,friend_code.eq.${encodeURIComponent(code)})&select=id,name,avatar_url,friend_code,gems,sleep_streak&limit=20`)).filter(p=>p.id!==this.uid); },
  async sendRequest(id){
    if(this.isBlocked(id)) throw new Error('Bạn đang chặn người này — hãy bỏ chặn trước khi gửi lời mời.');
    await this.api('friendships',{method:'POST',body:{user_id:this.uid,friend_id:id},prefer:'resolution=ignore-duplicates'});
    await this.loadFriends(); return this.relOf(id); },
  async addFriend(id){ return this.sendRequest(id); },
  async acceptRequest(id){ return this.sendRequest(id); },
  async cancelRequest(id){ await this.api(`friendships?user_id=eq.${this.uid}&friend_id=eq.${id}`,{method:'DELETE'}); await this.loadFriends(); },
  async declineRequest(id){ const del=await this.api(`friendships?user_id=eq.${id}&friend_id=eq.${this.uid}`,{method:'DELETE',prefer:'return=representation'});
    if(Array.isArray(del)&&!del.length) throw new Error('Cần chạy lệnh SQL cập nhật quyền xóa lời mời (xem backend/supabase.sql)');
    await this.loadFriends(); },
  async loadBlocks(){ if(!this.online) return this.blocked; try{
      const r=await this.api(`blocks?user_id=eq.${this.uid}&select=blocked_id`);
      this.blocked=[...new Set((r||[]).map(x=>x.blocked_id))];
      localStorage.setItem('lc_blocked',JSON.stringify(this.blocked));
      this.emit('blocks');
    }catch(e){} return this.blocked; },
  async blockedProfiles(){ await this.loadBlocks(); if(!this.blocked.length) return [];
    const rows=await this.api(`profiles?id=in.(${this.blocked.join(',')})&select=id,name,avatar_url,friend_code,gems,sleep_streak&order=name`);
    return rows||[]; },
  async removeFriend(id){ await this.api(`friendships?user_id=eq.${this.uid}&friend_id=eq.${id}`,{method:'DELETE'});
    await this.api(`friendships?user_id=eq.${id}&friend_id=eq.${this.uid}`,{method:'DELETE'}).catch(()=>{}); await this.loadFriends(); },
  async getProfile(id){ const r=await this.api(`profiles?id=eq.${id}&select=*`); return r[0]; },

  /* ---------------- CHAT ---------------- */
  dmRoom(a,b){ return 'dm:'+[a,b].sort().join(':'); },
  async history(room,after){ const q=after?`&id=gt.${after}&order=id.asc`:'&order=id.desc&limit=60';
    const rows=await this.api(`messages?room=eq.${encodeURIComponent(room)}&select=id,room,user_id,body,sticker,created_at${q}`); return after?rows:rows.reverse(); },
  async send(room,{body,sticker}){ body=body?Moderation.clean(String(body).slice(0,300)):null;
    return (await this.api('messages',{method:'POST',body:{room,user_id:this.uid,body,sticker:sticker||null},prefer:'return=representation'}))[0]; },
  /* realtime + dự phòng polling 5s (phòng khi Realtime chưa bật) */
  subscribe(room,cb){ let last=0; const seen=new Set(); const deliver=m=>{ if(!m||seen.has(m.id)||this.blocked.includes(m.user_id)) return; seen.add(m.id); last=Math.max(last,m.id); cb(m); };
    const off=RT.join(room,deliver); const iv=setInterval(async()=>{ if(!last) return; try{ (await this.history(room,last)).forEach(deliver); }catch(e){} },5000);
    return {mark:id=>{ seen.add(id); last=Math.max(last,id); },close(){ off(); clearInterval(iv); }}; },
  async report(msg,reason){ await this.api('reports',{method:'POST',body:{message_id:msg.id,reported_user:msg.user_id,reason:reason||'Không phù hợp'}}); },
  async block(uid){
    if(!uid||uid===this.uid) return;
    this.blocked=[...new Set([...this.blocked,uid])];
    localStorage.setItem('lc_blocked',JSON.stringify(this.blocked));
    await this.api('blocks',{method:'POST',body:{user_id:this.uid,blocked_id:uid},prefer:'resolution=ignore-duplicates'}).catch(()=>{});
    /* Tự động xóa bạn bè và mọi lời mời kết bạn 2 chiều với người bị chặn */
    await this.removeFriend(uid).catch(()=>{});
    this.emit('blocks'); },
  async unblock(uid){
    this.blocked=this.blocked.filter(x=>x!==uid);
    localStorage.setItem('lc_blocked',JSON.stringify(this.blocked));
    await this.api(`blocks?user_id=eq.${this.uid}&blocked_id=eq.${uid}`,{method:'DELETE'}).catch(()=>{});
    await this.loadFriends().catch(()=>{});
    this.emit('blocks'); },
  async names(ids){ ids=[...new Set(ids)].filter(Boolean); if(!ids.length) return {}; const r=await this.api(`profiles?id=in.(${ids.join(',')})&select=id,name,avatar_url`); return Object.fromEntries(r.map(p=>[p.id,p])); },

  /* ---------------- LEADERBOARD ---------------- */
  async board(tab,scope){ const sel='select=id,name,avatar_url,gems,quests_total,screen_today,screen_day,sleep_streak';
    const ord=tab==='screen'?'screen_today.asc':tab==='quests'?'quests_total.desc':tab==='sleep'?'sleep_streak.desc':'gems.desc';
    let f=''; if(tab==='screen') f+=`&screen_day=eq.${Core.s.day}`;
    if(scope==='friends'){ await this.loadFriends(); f+=`&id=in.(${[this.uid,...this.friendIds].join(',')})`; }
    const rows=await this.api(`profiles?${sel}${f}&order=${ord}&limit=50`);
    return (rows||[]).filter(p=>!this.blocked.includes(p.id)); }
};

/* ---------- Supabase Realtime (Phoenix websocket protocol) ---------- */
const RT={ ws:null, ref:0, topics:{}, hb:null, timer:null,
  url(){ return Cloud.base().replace(/^http/,'ws')+`/realtime/v1/websocket?apikey=${Cloud.cfg.supabaseAnonKey}&vsn=1.0.0`; },
  send(m){ if(this.ws&&this.ws.readyState===1) this.ws.send(JSON.stringify({...m,ref:String(++this.ref)})); },
  connect(){ if(this.ws||!Cloud.online) return; try{ this.ws=new WebSocket(this.url()); }catch(e){ this.ws=null; return; }
    this.ws.onopen=async()=>{ this.hb=setInterval(()=>this.send({topic:'phoenix',event:'heartbeat',payload:{}}),25000); for(const t in this.topics) await this.joinMsg(t); };
    this.ws.onmessage=e=>{ let m; try{ m=JSON.parse(e.data); }catch(_){ return; } if(m.event==='postgres_changes'){ const t=this.topics[m.topic]; const rec=m.payload&&m.payload.data&&m.payload.data.record; if(t&&rec) t.cbs.forEach(cb=>cb(rec)); } };
    this.ws.onclose=()=>{ clearInterval(this.hb); this.ws=null; if(Object.keys(this.topics).length&&Cloud.online) this.timer=setTimeout(()=>this.connect(),4000); }; this.ws.onerror=()=>{}; },
  async joinMsg(topic){ const t=this.topics[topic]; this.send({topic,event:'phx_join',payload:{config:{broadcast:{self:false},presence:{key:''},postgres_changes:[{event:'INSERT',schema:'public',table:'messages',filter:`room=eq.${t.room}`}]},access_token:await Cloud.token()}}); },
  join(room,cb){ const topic='realtime:room-'+room.replace(/[^a-zA-Z0-9:-]/g,''); let t=this.topics[topic]; if(!t){ t=this.topics[topic]={room,cbs:[]}; if(this.ws&&this.ws.readyState===1) this.joinMsg(topic); else this.connect(); }
    t.cbs.push(cb); return ()=>{ t.cbs=t.cbs.filter(x=>x!==cb); if(!t.cbs.length){ this.send({topic,event:'phx_leave',payload:{}}); delete this.topics[topic]; } }; },
  close(){ this.topics={}; clearTimeout(this.timer); if(this.ws){ try{ this.ws.close(); }catch(e){} this.ws=null; } }
};

/* ---------- An toàn cho cộng đồng trẻ: lọc từ ngữ thô tục ---------- */
const Moderation={
  WORDS:['địt','đụ','đéo','lồn','buồi','cặc','đĩ','vcl','vkl','vãi lồn','đm','dm','đmm','clm','cmm','fuck','shit','bitch'],
  clean(t){ let s=t; for(const w of this.WORDS){ const re=new RegExp(`(^|[^\\p{L}])(${w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})(?=$|[^\\p{L}])`,'giu'); s=s.replace(re,(m,a,b)=>a+'*'.repeat(b.length)); } return s; }
};
