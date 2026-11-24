/* assets/doodle-icons.js — Thư viện icon Doodle (inline SVG, viền #0A3323, tô pastel). Dùng chung mọi trang. */
'use strict';
const C={dg:'#0A3323',mg:'#839958',bg:'#F7F4D5',rb:'#D3968C',mn:'#105666',mgl:'#c5d1a6',rbl:'#ecc9c2',mnl:'#b9d3d6',yl:'#f1d77a',wood:'#c9a27a',soil:'#8b6b4a'};
const sv=(inner,s=28,vb='0 0 40 40',sw=2.2)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${s}" height="${s}" fill="none" stroke="${C.dg}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
const IP={
  gem:`<path d="M9 15 15 8h11l6 7-11.5 18z" fill="#a8d5cf"/><path d="M9 15h23M15 8l2.5 7 3 18 3-18L26 8"/><path d="M13.5 12.5l2-2.5" stroke="#fff" stroke-width="2"/>`,
  bill:`<rect x="4" y="11" width="32" height="19" rx="3" fill="#cfd9b4"/><rect x="8" y="14.5" width="24" height="12" rx="2" stroke-dasharray="2 2.5" stroke-width="1.3"/><circle cx="20" cy="20.5" r="5.2" fill="${C.bg}"/><text x="20" y="24.2" font-size="10" font-weight="800" text-anchor="middle" fill="${C.dg}" stroke="none" font-family="Arial">đ</text>`,
  trophy:`<path d="M13 8h14v8a7 7 0 0 1-14 0z" fill="${C.yl}"/><path d="M13 11H8c0 5 3 7 6 7M27 11h5c0 5-3 7-6 7M20 23v5"/><path d="M14 34h12l-1-6H15z" fill="${C.rbl}"/><path d="M17 11v4" stroke="#fff"/>`,
  gear:`<path d="M20 5v4M20 31v4M5 20h4M31 20h4M9.4 9.4l2.8 2.8M27.8 27.8l2.8 2.8M9.4 30.6l2.8-2.8M27.8 12.2l2.8-2.8" stroke-width="4.2"/><circle cx="20" cy="20" r="10.5" fill="${C.mgl}"/><circle cx="20" cy="20" r="4.5" fill="${C.bg}"/>`,
  quest:`<rect x="8" y="7" width="24" height="28" rx="3" fill="${C.bg}"/><path d="M15 5h10v4H15z" fill="${C.rb}"/><path d="M12 16l2 2 3-4M20 16h8M12 25l2 2 3-4M20 25h8"/>`,
  chat:`<path d="M30 14h1a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3v4l-5-4h-7a3 3 0 0 1-3-3" fill="${C.rbl}"/><path d="M6 10a4 4 0 0 1 4-4h14a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4h-9l-6 5v-5a4 4 0 0 1-3-4z" fill="${C.mgl}"/><path d="M12 14h.1M17 14h.1M22 14h.1" stroke-width="3"/>`,
  podium:`<rect x="15" y="13" width="10" height="21" fill="${C.yl}"/><rect x="5" y="20" width="10" height="14" fill="${C.mnl}"/><rect x="25" y="24" width="10" height="10" fill="${C.rbl}"/><path d="M20 4l1.5 3 3 .4-2.2 2 .6 3-2.9-1.5-2.9 1.5.6-3-2.2-2 3-.4z" fill="${C.yl}" stroke-width="1.5"/>`,
  bag:`<path d="M8 15h24l-2 19H10z" fill="${C.rbl}"/><path d="M14 15v-3a6 6 0 0 1 12 0v3M15 22c2 2 8 2 10 0"/>`,
  home:`<path d="M10 17v16h20V17" fill="${C.bg}"/><path d="M6 20 20 8l14 12"/><path d="M17 33v-8h6v8" fill="${C.rb}"/>`,
  clock:`<path d="M8 10l5-4M32 10l-5-4" stroke-width="3.2"/><circle cx="20" cy="21" r="12" fill="${C.rb}"/><circle cx="20" cy="21" r="8.5" fill="${C.bg}"/><path d="M20 16v5l3 2"/><path d="M12 33l-2 3M28 33l2 3"/>`,
  flower:`<path d="M20 22v13"/><path d="M20 31c-4 0-6-2-7-5 4 0 6 2 7 5z" fill="${C.mgl}"/><circle cx="20" cy="10" r="4.5" fill="${C.rbl}"/><circle cx="13.5" cy="15" r="4.5" fill="${C.rbl}"/><circle cx="26.5" cy="15" r="4.5" fill="${C.rbl}"/><circle cx="16" cy="21.5" r="4.5" fill="${C.rbl}"/><circle cx="24" cy="21.5" r="4.5" fill="${C.rbl}"/><circle cx="20" cy="16.5" r="3.6" fill="${C.yl}"/>`,
  can:`<path d="M10 16h16v15a3 3 0 0 1-3 3H13a3 3 0 0 1-3-3z" fill="${C.mnl}"/><path d="M26 20l8-6 1.5 2-7.5 9M14 16v-3a4 4 0 0 1 8 0v3M10 21c-4 0-5 4-3 6"/><path d="M36 9v2M39 13h-2" stroke-width="1.6"/>`,
  bowl:`<path d="M10 21c1-4 4-5 6-4 1-3 5-3 7-1 2-2 6-1 7 5" fill="#e0b27a"/><path d="M6 21h28c0 7-6 11-14 11S6 28 6 21z" fill="${C.rb}"/><path d="M14 35h12"/>`,
  camera:`<path d="M6 14h7l2-4h10l2 4h7v17H6z" fill="${C.mnl}"/><circle cx="20" cy="22" r="6" fill="${C.bg}"/><circle cx="20" cy="22" r="2.4"/><path d="M29 17h.1" stroke-width="3"/>`,
  check:`<circle cx="20" cy="20" r="14" fill="${C.mg}"/><path d="M13 20.5l5 5 9-11" stroke-width="3.4"/>`,
  lock:`<rect x="9" y="17" width="22" height="17" rx="4" fill="${C.rb}"/><path d="M14 17v-4a6 6 0 0 1 12 0v4"/><circle cx="20" cy="24.5" r="2" fill="${C.dg}"/><path d="M20 26v3.5"/>`,
  unlock:`<rect x="9" y="17" width="22" height="17" rx="4" fill="${C.mg}"/><path d="M14 17v-4a6 6 0 0 1 11.5-2.5"/><circle cx="20" cy="24.5" r="2" fill="${C.dg}"/>`,
  moon:`<path d="M26 6a13 13 0 1 0 8 21A11 11 0 0 1 26 6z" fill="#f1e3a0"/><circle cx="16" cy="19" r="1.5" fill="${C.dg}" stroke="none"/><circle cx="21" cy="27" r="1.1" fill="${C.dg}" stroke="none"/>`,
  sun:`<circle cx="20" cy="20" r="7.5" fill="${C.yl}"/><path d="M20 5v4M20 31v4M5 20h4M31 20h4M9.5 9.5l2.6 2.6M27.9 27.9l2.6 2.6M9.5 30.5l2.6-2.6M27.9 12.1l2.6-2.6"/>`,
  cart:`<path d="M4 8h5l4 17h17l3-12H11"/><path d="M11.2 13H33l-3 12H13z" fill="${C.mgl}"/><circle cx="15" cy="31" r="2.6" fill="${C.bg}"/><circle cx="27" cy="31" r="2.6" fill="${C.bg}"/>`,
  x:`<path d="M12 12l16 16M28 12 12 28" stroke-width="3.4"/>`,
  back:`<path d="M24 9 13 20l11 11" stroke-width="3.6"/>`,
  heart:`<path d="M20 33S6 24 6 15a7 7 0 0 1 14-2 7 7 0 0 1 14 2c0 9-14 18-14 18z" fill="${C.rb}"/><path d="M11 14a3 3 0 0 1 3-3" stroke="#fff"/>`,
  bolt:`<path d="M23 4 9 22h10l-3 14 15-19H21z" fill="${C.yl}"/>`,
  phone:`<rect x="11" y="4" width="18" height="32" rx="4" fill="${C.mnl}"/><path d="M17 8h6M18 31h4"/>`,
  star:`<path d="M20 5l4.3 9 9.7 1.2-7.1 6.7 1.8 9.6L20 26.8l-8.7 4.7 1.8-9.6L6 15.2l9.7-1.2z" fill="${C.yl}"/>`,
  search:`<circle cx="17" cy="17" r="9" fill="#fff"/><path d="M24 24l8 8" stroke-width="3.2"/>`,
  fire:`<path d="M20 35c-7 0-11-5-11-11 0-7 6-9 7-17 4 3 5 7 4 10 2-1 3-3 3-5 4 3 8 7 8 12 0 6-4 11-11 11z" fill="${C.rb}"/><path d="M20 35c-3 0-5-2-5-5 0-4 4-5 4-9 3 2 6 5 6 9 0 3-2 5-5 5z" fill="${C.yl}"/>`,
  ticket:`<path d="M5 12h30v5a3 3 0 0 0 0 6v5H5v-5a3 3 0 0 0 0-6z" fill="${C.rbl}"/><path d="M15 12v16" stroke-dasharray="2 2.5"/><path d="M20 17h10M20 22h7"/>`,
  broom:`<path d="M29 5 19 21" stroke-width="3"/><path d="M15 19l9 5-4 11c-5-1-9-4-11-8z" fill="${C.yl}"/><path d="M13 28l4 2M16 25l4 2"/>`,
  roller:`<rect x="6" y="7" width="24" height="9" rx="3" fill="${C.rb}"/><path d="M30 11h3v8H19v5"/><rect x="16" y="24" width="6" height="11" rx="2" fill="${C.mnl}"/>`,
  box:`<path d="M6 14l14-6 14 6v14l-14 6-14-6z" fill="#e0b27a"/><path d="M6 14l14 6 14-6M20 20v14"/><path d="M13 11l14 6" stroke-width="1.6"/>`,
  rotate:`<path d="M30 14a11 11 0 1 0 2 10"/><path d="M31 6v8h-8"/>`,
  move:`<path d="M20 5v30M5 20h30M20 5l-4 4M20 5l4 4M20 35l-4-4M20 35l4-4M5 20l4-4M5 20l4 4M35 20l-4-4M35 20l-4 4"/>`,
  speaker:`<path d="M6 16h6l9-7v22l-9-7H6z" fill="${C.rb}"/><path d="M26 14a7 7 0 0 1 0 12M30 10a12 12 0 0 1 0 20"/>`,
  glass:`<path d="M11 7h18l-3 27H14z" fill="#fff"/><path d="M12.4 17h15.2l-1.9 17H14.3z" fill="${C.mnl}"/><path d="M16 21v8" stroke="#fff"/>`,
  run:`<circle cx="25" cy="8" r="3.6" fill="${C.rbl}"/><path d="M14 19l5-6 7 4 4 5M19 13l-3 10 6 4-2 9M16 23l-6 7M6 16h6M5 22h5"/>`,
  grass:`<path d="M4 35h32"/><path d="M8 35c0-8-2-12-4-14 4 1 6 6 6 10M14 35c0-10 2-16 5-19-1 6-1 12 0 19M22 35c0-8 3-13 7-15-3 5-4 9-3 15M30 35c1-6 3-9 6-10" fill="${C.mgl}"/>`,
  book:`<path d="M20 11c-4-3-9-3-14-2v22c5-1 10-1 14 2 4-3 9-3 14-2V9c-5-1-10-1-14 2z" fill="${C.bg}"/><path d="M20 11v22"/><path d="M9 15h7M9 20h7M24 15h7M24 20h7" stroke-width="1.6"/>`,
  paw:`<ellipse cx="20" cy="26" rx="8" ry="6.5" fill="${C.rbl}"/><circle cx="10" cy="17" r="3.4" fill="${C.rbl}"/><circle cx="16" cy="11" r="3.4" fill="${C.rbl}"/><circle cx="24" cy="11" r="3.4" fill="${C.rbl}"/><circle cx="30" cy="17" r="3.4" fill="${C.rbl}"/>`,
  plus:`<path d="M20 9v22M9 20h22" stroke-width="3.6"/>`,
  shop:`<path d="M7 16h26v18H7z" fill="${C.bg}"/><path d="M5 16l3-9h24l3 9z" fill="${C.rb}"/><path d="M5 16c0 3 5 3 5 0 0 3 5 3 5 0 0 3 5 3 5 0 0 3 5 3 5 0 0 3 5 3 5 0M17 34v-9h6v9"/>`,
  portal:`<ellipse cx="20" cy="28" rx="15" ry="6" fill="${C.mn}" stroke="${C.mg}" stroke-width="3"/><path d="M12 27V9M28 27V9" stroke="${C.mg}" stroke-dasharray="3 3"/><rect x="17" y="12" width="4" height="4" fill="${C.bg}"/><rect x="22" y="18" width="3" height="3" fill="${C.bg}"/>`,
  sparkle:`<path d="M20 4c1 9 4 13 14 16-10 3-13 7-14 16-1-9-4-13-14-16 10-3 13-7 14-16z" fill="${C.yl}"/>`,
  zalo:`<path d="M6 10a4 4 0 0 1 4-4h20a4 4 0 0 1 4 4v14a4 4 0 0 1-4 4H16l-7 6v-6a4 4 0 0 1-3-4z" fill="#fff"/><text x="20" y="21" font-size="9" font-weight="800" text-anchor="middle" fill="${C.mn}" stroke="none" font-family="Arial">Zalo</text>`,
  call:`<path d="M12 6l5 7-3 3c2 4 5 7 9 9l3-3 7 5-3 6c-12 0-24-12-24-24z" fill="#fff"/>`,
  tiktok:`<path d="M22 6v19a5 5 0 1 1-5-5" stroke="#fff" stroke-width="3.6"/><path d="M22 6c1 4 4 7 8 7" stroke="#fff" stroke-width="3.6"/>`,
  fb:`<path d="M24 34V21h4l1-5h-5v-3c0-2 1-3 3-3h2V6h-4c-4 0-6 3-6 7v3h-4v5h4v13" fill="#fff" stroke="none"/>`,
  ig:`<rect x="8" y="8" width="24" height="24" rx="7" stroke="#fff" stroke-width="3"/><circle cx="20" cy="20" r="5.5" stroke="#fff" stroke-width="3"/><path d="M27 13h.1" stroke="#fff" stroke-width="3.5"/>`,
  yt:`<rect x="5" y="10" width="30" height="20" rx="7" fill="#fff" stroke="none"/><path d="M17 15v10l9-5z" fill="${C.rb}" stroke="none"/>`,
  game:`<path d="M10 14h20a6 6 0 0 1 6 6v4a5 5 0 0 1-9 3l-2-3H15l-2 3a5 5 0 0 1-9-3v-4a6 6 0 0 1 6-6z" fill="#fff" stroke="none"/><path d="M12 19v6M9 22h6" stroke="${C.mg}" stroke-width="2.6"/><circle cx="27" cy="20" r="1.6" fill="${C.rb}" stroke="none"/><circle cx="30" cy="24" r="1.6" fill="${C.rb}" stroke="none"/>`,
  /* ---------- shopping items ---------- */
  keyboard:`<rect x="3" y="13" width="34" height="16" rx="3" fill="#e9e3bd"/><path d="M3 26h34" stroke="#D3968C" stroke-width="2.5"/><path d="M3 27.5h34" stroke="#839958" stroke-width="1.5"/><path d="M7 17h3M12 17h3M17 17h3M22 17h3M27 17h3M9 21h3M14 21h3M19 21h3M24 21h3M30 21h3" stroke-width="2.6"/>`,
  blindbox:`<rect x="8" y="14" width="24" height="20" rx="2" fill="${C.rbl}"/><path d="M8 20h24M20 14v20"/><path d="M20 14c-4-6-10-5-8-1 1 2 5 1 8 1 3 0 7 1 8-1 2-4-4-5-8 1z" fill="${C.mnl}"/><text x="27" y="31" font-size="9" font-weight="800" fill="${C.dg}" stroke="none" font-family="Arial">?</text>`,
  cheesecoin:`<circle cx="20" cy="21" r="12" fill="${C.yl}"/><circle cx="20" cy="21" r="8" stroke-dasharray="3 2"/><path d="M28 28c3 3 4 6 7 6M30 25c4 1 5 3 6 5" stroke="#e8c45a" stroke-width="3"/><text x="20" y="25" font-size="10" font-weight="800" text-anchor="middle" fill="${C.dg}" stroke="none" font-family="Arial">10</text>`,
  lemontea:`<path d="M11 13h18l-2 22H13z" fill="#f3e4a6"/><path d="M12 19h16" /><circle cx="20" cy="26" r="4.5" fill="${C.yl}"/><path d="M20 22v8M16 26h8" stroke-width="1.2"/><path d="M23 13l4-9" stroke-width="2.6"/><path d="M9 13h22" stroke-width="3"/>`,
  cooker:`<path d="M8 17h24v12a5 5 0 0 1-5 5H13a5 5 0 0 1-5-5z" fill="#fff"/><path d="M7 17c0-5 6-8 13-8s13 3 13 8z" fill="${C.mnl}"/><path d="M17 9V7h6v2"/><rect x="16" y="22" width="8" height="5" rx="1.5" fill="${C.rbl}"/>`,
  desklamp:`<path d="M10 35h16"/><path d="M18 35l-4-14 10-8" stroke-width="2.8"/><path d="M21 9l10-3 3 9-9 2z" fill="${C.mnl}"/><path d="M29 17l3 5" stroke="${C.yl}" stroke-width="2"/><circle cx="14" cy="21" r="2" fill="${C.bg}"/>`,
  raincoat:`<path d="M14 7h12l3 6 6 18-6 2-2-10v12H13V23l-2 10-6-2 6-18z" fill="${C.mnl}"/><path d="M14 7c1 4 11 4 12 0M20 12v23" />`,
  textbook:`<path d="M6 28l22-5 6 3-22 5z" fill="${C.rbl}"/><path d="M6 28v4l6 3v-4M34 26v4l-22 5"/><path d="M8 19l20-5 6 3-20 5z" fill="${C.mnl}"/><path d="M8 19v4l6 3v-4M34 17v4l-20 5"/>`,
  suitcase:`<rect x="10" y="10" width="20" height="23" rx="3" fill="${C.mn}"/><path d="M16 10V6h8v4M15 15v13M25 15v13"/><circle cx="14" cy="35" r="1.8" fill="${C.bg}"/><circle cx="26" cy="35" r="1.8" fill="${C.bg}"/>`,
  sunscreen:`<path d="M14 6h12l-1 6H15z" fill="${C.rb}"/><path d="M13 12h14l2 22H11z" fill="#fff"/><circle cx="20" cy="21" r="4" fill="${C.yl}"/><path d="M16 28h8" />`,
  powerbank:`<rect x="11" y="5" width="18" height="30" rx="4" fill="${C.mnl}"/><rect x="15" y="11" width="10" height="4" fill="${C.mg}"/><rect x="15" y="17" width="10" height="4" fill="${C.mg}"/><rect x="15" y="23" width="10" height="4" fill="#fff"/><path d="M18 2h4" stroke-width="2.6"/>`,
  shoes:`<path d="M4 28c0-5 1-12 4-14l7 3c3 2 7 3 12 4 6 1 9 3 9 7v3H4z" fill="#fff"/><path d="M4 28h32" /><path d="M12 18l3 3M16 19l2 3M20 20l1 3" /><path d="M4 31h32" stroke="${C.mg}" stroke-width="3"/>`,
  dress:`<path d="M15 5l2 6-3 6 6 1 6-1-3-6 2-6" fill="${C.rbl}"/><path d="M14 17h12l7 18H7z" fill="${C.rb}"/><path d="M33 8l1 3 3 1-3 1-1 3-1-3-3-1 3-1z" fill="${C.yl}" stroke-width="1.2"/>`,
  selfie:`<path d="M11 35l12-20" stroke-width="3.2"/><rect x="20" y="4" width="12" height="18" rx="2.5" fill="${C.mnl}" transform="rotate(30 26 13)"/><text x="7" y="15" font-size="8" font-weight="800" fill="${C.mn}" stroke="none" font-family="Arial">AI</text><path d="M9 20l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" fill="${C.yl}" stroke-width="1"/>`,
  sunglass:`<path d="M4 16h32"/><path d="M6 16h11v5a5 5 0 0 1-11 0z" fill="${C.dg}"/><path d="M23 16h11v5a5 5 0 0 1-11 0z" fill="${C.dg}"/><path d="M8 18l3 0" stroke="#fff"/><path d="M25 18h3" stroke="#fff"/>`,
  buckethat:`<path d="M5 27c3-3 27-3 30 0-3 3-27 3-30 0z" fill="${C.mgl}"/><path d="M11 25l2-12c1-3 13-3 14 0l2 12" fill="${C.mg}"/><path d="M12 20c5 2 11 2 16 0" />`,
  /* ---------- pets (side view, vb 0 0 50 40) ---------- */
  dog:`<path d="M40 22c5-4 6-10 4-12" stroke-width="2.6"/><ellipse cx="27" cy="25" rx="14" ry="8" fill="#e0b27a"/><path d="M17 31v6M22 31v6M32 31v6M37 31v6" stroke-width="3"/><circle cx="14" cy="17" r="8" fill="#e0b27a"/><path d="M9 11c-4 1-5 7-3 10 2 1 4-2 4-5" fill="#a87a4e"/><ellipse cx="8" cy="20" rx="3" ry="2.4" fill="${C.bg}"/><circle cx="6" cy="19" r="1.1" fill="${C.dg}" stroke="none"/><circle cx="13" cy="15.5" r="1.2" fill="${C.dg}" stroke="none"/><path d="M14 25c1 2 4 2 5 0" stroke="${C.rb}" stroke-width="3"/>`,
  cat:`<path d="M40 24c6-2 7-10 3-13" stroke-width="2.8"/><ellipse cx="28" cy="26" rx="12" ry="7.5" fill="#c9c2b8"/><path d="M20 31v6M24 31v6M32 31v6M36 31v6" stroke-width="3"/><circle cx="15" cy="19" r="8" fill="#c9c2b8"/><path d="M9 14l1-8 5 5M17 11l4-5 1 8" fill="#c9c2b8"/><circle cx="12" cy="18" r="1.2" fill="${C.dg}" stroke="none"/><circle cx="18" cy="18" r="1.2" fill="${C.dg}" stroke="none"/><path d="M13.5 22l1.5 1 1.5-1M5 20l4 1M5 23l4-1" stroke-width="1.3"/><path d="M26 21c2 2 2 8 0 10M31 20c2 2 2 9 0 11" stroke="#9a9289" stroke-width="1.6"/>`,
  rabbit:`<ellipse cx="28" cy="27" rx="12" ry="8" fill="#fff"/><circle cx="41" cy="26" r="3.5" fill="#fff"/><path d="M20 33v4M33 33v4" stroke-width="3"/><circle cx="16" cy="21" r="7.5" fill="#fff"/><path d="M12 15c-2-7-1-12 2-13 2 2 2 8 1 13M17 14c1-7 4-11 6-10 1 3-1 8-4 11" fill="#fff"/><path d="M14 13c-1-4-1-7 0-8M19 13c1-3 2-5 3-6" stroke="${C.rb}" stroke-width="1.6"/><circle cx="14" cy="20" r="1.2" fill="${C.dg}" stroke="none"/><circle cx="10" cy="23" r="1.3" fill="${C.rb}" stroke="none"/>`,
  capy:`<path d="M10 18c0-6 6-9 14-9h8c7 0 11 5 11 12v6c0 4-3 6-7 6H16c-4 0-6-3-6-6z" fill="#b98a5e"/><path d="M5 22c0-5 3-8 8-8 3 0 5 3 5 6v4c0 3-2 5-6 5-4 0-7-3-7-7z" fill="#b98a5e"/><path d="M15 32v5M21 33v4M33 33v4M39 32v5" stroke-width="3"/><circle cx="12" cy="18" r="1.3" fill="${C.dg}" stroke="none"/><path d="M14 12l2-3 2 3" fill="#a07850"/><ellipse cx="7" cy="23" rx="1.2" ry="1" fill="${C.dg}" stroke="none"/><circle cx="26" cy="7" r="3.5" fill="#f2a65a"/><path d="M26 3.5l1.5-2" stroke="${C.mg}"/>`,
  monster:`<path d="M8 36c-4-8-4-20 2-27 6-6 16-6 21 0 6 7 6 19 2 27-3-3-5-3-7 0-2-3-4-3-6 0-2-3-4-3-6 0-2-3-4-3-6 0z" fill="${C.mg}"/><circle cx="15" cy="15" r="4.5" fill="#fff"/><circle cx="26" cy="13" r="5.5" fill="#fff"/><circle cx="16" cy="16" r="1.8" fill="${C.dg}" stroke="none"/><circle cx="27" cy="14" r="2.2" fill="${C.dg}" stroke="none"/><path d="M11 24c4 5 14 5 19 0z" fill="${C.dg}"/><path d="M14 25l2 3 2-3M22 25l2 3 2-3" fill="#fff" stroke-width="1.3"/><path d="M33 4l4 4-6 3z" fill="${C.rb}" stroke-width="1.5"/>`
};
const ic=(n,s=28,extra='')=>`<span class="ico" ${extra}>${sv(IP[n],s,(['dog','cat','rabbit','capy'].includes(n))?'0 0 50 40':'0 0 40 40')}</span>`;
const APPS={tiktok:{n:'TikTok',bg:'#0A3323'},fb:{n:'Facebook',bg:'#105666'},ig:{n:'Instagram',bg:'#D3968C'},yt:{n:'YouTube',bg:'#a5584c'},game:{n:'Game',bg:'#839958'},zalo:{n:'Zalo Công việc',bg:'#105666'},call:{n:'Gọi khẩn cấp',bg:'#839958'}};
const appIcon=(k,locked)=>`<div class="app-ic" style="background:${APPS[k].bg}">${sv(IP[k],30)}${locked?`<span class="lk">${sv(IP.lock,22)}</span>`:''}</div>`;
const STICKERS=[{id:'cheer',label:'Cố lên!',ic:'star'},{id:'sleep',label:'Ngủ sớm nha',ic:'moon'},{id:'water',label:'Uống nước!',ic:'glass'},{id:'grass',label:'Chạm cỏ!',ic:'grass'},{id:'heart',label:'Thương!',ic:'heart'},{id:'phone',label:'Cất máy!',ic:'phone'}];
const stickerHTML=(id,s=74)=>{ const t=STICKERS.find(x=>x.id===id)||STICKERS[0];
  return `<div style="width:${s}px;height:${s}px;border:2.5px solid ${C.dg};border-radius:18px 14px 20px 12px;background:${C.bg};display:flex;flex-direction:column;align-items:center;justify-content:center;transform:rotate(-4deg);box-shadow:2px 3px 0 ${C.dg}">${sv(IP[t.ic],s*.5)}<b style="font-size:${s*.15}px;line-height:1">${t.label}</b></div>`; };
function friendFace(f,s=40){ const c=f.color, ears={
  cat:`<path d="M8 14l2-10 8 6M32 14l-2-10-8 6" fill="${c}"/>`, panda:`<circle cx="9" cy="9" r="5" fill="${C.dg}"/><circle cx="31" cy="9" r="5" fill="${C.dg}"/>`,
  fox:`<path d="M7 15l1-12 9 7M33 15l-1-12-9 7" fill="${c}"/>`, rabbit:`<path d="M13 10c-3-8-2-10 1-10s4 3 2 10M27 10c3-8 2-10-1-10s-4 3-2 10" fill="${c}"/>`,
  duck:`<path d="M18 4c2-3 6-2 5 1" />`, owl:`<path d="M8 10l2-7 6 5M32 10l-2-7-6 5" fill="${c}"/>`}[f.animal]||'';
  const extra={panda:`<ellipse cx="14" cy="21" rx="4" ry="5" fill="${C.dg}"/><ellipse cx="26" cy="21" rx="4" ry="5" fill="${C.dg}"/>`,duck:`<path d="M14 27c3 3 9 3 12 0-3-2-9-2-12 0z" fill="#f2a65a"/>`,owl:`<circle cx="14" cy="20" r="5.5" fill="#fff"/><circle cx="26" cy="20" r="5.5" fill="#fff"/>`}[f.animal]||'';
  return sv(`${ears}<circle cx="20" cy="22" r="14" fill="${c}"/>${extra}<circle cx="14.5" cy="20.5" r="1.8" fill="${f.animal==='panda'?'#fff':C.dg}" stroke="none"/><circle cx="25.5" cy="20.5" r="1.8" fill="${f.animal==='panda'?'#fff':C.dg}" stroke="none"/>${f.animal!=='duck'?`<path d="M17.5 26c1.5 1.5 3.5 1.5 5 0" />`:''}<circle cx="11" cy="25" r="2" fill="${C.rb}" stroke="none" opacity=".7"/><circle cx="29" cy="25" r="2" fill="${C.rb}" stroke="none" opacity=".7"/>`,s); }
Object.assign(IP,{
  scarf:`<path d="M8 12c6 4 18 4 24 0l1 7c-6 4-20 4-26 0z" fill="${C.rb}"/><path d="M22 18l2 16 6-2-3-14" fill="${C.rb}"/><path d="M23 24l5-1M24 29l5-1" stroke-width="1.4"/>`,
  beanie:`<path d="M8 28c0-12 5-18 12-18s12 6 12 18z" fill="${C.mn}"/><rect x="6" y="26" width="28" height="7" rx="3" fill="${C.bg}"/><circle cx="20" cy="8" r="4" fill="${C.bg}"/>`,
  headphones:`<path d="M8 25v-5a12 12 0 0 1 24 0v5" stroke-width="3"/><rect x="5" y="22" width="7" height="12" rx="3" fill="${C.mg}"/><rect x="28" y="22" width="7" height="12" rx="3" fill="${C.mg}"/>`,
  donkey:`<path d="M12 14l-3-11 7 7M28 14l3-11-7 7" fill="#b8b0a6"/><path d="M12 6l1 4M28 6l-1 4" stroke="${C.rb}" stroke-width="2"/><rect x="9" y="11" width="22" height="20" rx="6" fill="#b8b0a6"/><rect x="11" y="23" width="18" height="12" rx="5" fill="${C.bg}"/><circle cx="15" cy="18" r="1.8" fill="${C.dg}" stroke="none"/><circle cx="25" cy="18" r="1.8" fill="${C.dg}" stroke="none"/><path d="M16 27h.1M24 27h.1" stroke-width="2.6"/><path d="M17 31c2 1.5 4 1.5 6 0" stroke-width="1.6"/>`
});
Object.assign(IP,{
  calendar:`<rect x="6" y="9" width="28" height="25" rx="4" fill="#fff"/><rect x="6" y="9" width="28" height="8" rx="3" fill="${C.rb}"/><path d="M13 5v7M27 5v7"/><path d="M13 25l4 4 8-8" stroke-width="2.8"/>`,
  sprout:`<path d="M20 35V20"/><path d="M20 22c-8 0-12-5-12-11 7 0 12 4 12 11zM20 18c7 0 11-5 11-10-6 0-11 4-11 10z" fill="${C.mgl}"/><path d="M8 35h24"/>`,
  sunrise:`<path d="M4 30h32"/><path d="M10 30a10 10 0 0 1 20 0z" fill="${C.yl}"/><path d="M20 8v6M8 16l4 3M32 16l-4 3"/><path d="M14 35h12"/>`,
  bedtime:`<circle cx="19" cy="22" r="13" fill="${C.mnl}"/><path d="M19 14v8l5 3"/><path d="M30 3a6 6 0 1 0 6 8 5 5 0 0 1-6-8z" fill="#f1e3a0"/>`,
  crown:`<path d="M6 30l3-17 7 8 4-11 4 11 7-8 3 17z" fill="${C.yl}"/><path d="M6 34h28"/>`,
  levelup:`<path d="M20 5l13 14h-8v15H15V19H7z" fill="${C.mg}"/>`,
  notif:`<rect x="9" y="4" width="22" height="32" rx="4" fill="${C.rbl}"/><circle cx="28" cy="9" r="6" fill="${C.rb}"/><path d="M14 16h12M14 21h12M14 26h8"/>`,
  google:`<circle cx="20" cy="20" r="14" fill="#fff"/><path d="M29 20.5h-9v-3h12.2c.2.9.3 1.8.3 2.8A12.5 12.5 0 1 1 20 7.5c3.2 0 6 1.2 8.2 3.2l-2.8 2.8A8.5 8.5 0 1 0 28.4 22" fill="none" stroke="${C.dg}" stroke-width="2.6"/><circle cx="27.5" cy="11.5" r="2.2" fill="${C.rb}" stroke="none"/><circle cx="11" cy="27" r="2.2" fill="${C.mg}" stroke="none"/>`,
  discord:`<rect x="5" y="9" width="30" height="21" rx="8" fill="${C.mnl}"/><path d="M12 10l2-4M28 10l-2-4M14 30l-2 4M26 30l2 4"/><circle cx="15" cy="20" r="2.5" fill="${C.dg}" stroke="none"/><circle cx="25" cy="20" r="2.5" fill="${C.dg}" stroke="none"/><path d="M16 25c2.5 1.5 5.5 1.5 8 0"/>`,
  shield:`<path d="M20 5l13 5v9c0 8-5.5 13-13 16C12.5 32 7 27 7 19v-9z" fill="${C.mgl}"/><path d="M15 20l3.5 3.5L26 16" stroke-width="3"/>`,
  globe:`<circle cx="20" cy="20" r="14" fill="${C.mnl}"/><ellipse cx="20" cy="20" rx="6.5" ry="14"/><path d="M7 16h26M7 24h26"/>`,
  gift:`<rect x="7" y="16" width="26" height="18" rx="3" fill="${C.rbl}"/><rect x="5" y="11" width="30" height="6" rx="2" fill="${C.rb}"/><path d="M20 11v23M20 11c-4-5-9-4-7-1 1 2 4 1 7 1 3 0 6 1 7-1 2-3-3-4-7 1z" fill="${C.yl}"/>`,
  user:`<circle cx="20" cy="14" r="7" fill="${C.mgl}"/><path d="M8 34c1-7 6-11 12-11s11 4 12 11" fill="${C.rbl}"/>`,
  flag:`<path d="M11 6v28"/><path d="M11 8h18l-4 6 4 6H11z" fill="${C.rb}"/>`,
  ban:`<circle cx="20" cy="20" r="13" fill="${C.rbl}"/><path d="M11 11l18 18" stroke-width="3"/>`,
  copy:`<rect x="13" y="12" width="18" height="22" rx="3" fill="${C.bg}"/><path d="M13 28H9a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4"/>`,
  cloud:`<path d="M12 30h17a6 6 0 0 0 1-11.9A9 9 0 0 0 12.6 15 6.5 6.5 0 0 0 12 30z" fill="${C.mnl}"/>`,
  logout:`<path d="M16 7H9a3 3 0 0 0-3 3v20a3 3 0 0 0 3 3h7"/><path d="M25 13l8 7-8 7M33 20H15" stroke-width="2.6"/>`
});
