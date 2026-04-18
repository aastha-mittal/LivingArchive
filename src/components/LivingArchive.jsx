import { useState, useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { generateScrapbookPages, extractStorySignals, formatSignalsLine } from "../lib/scrapbookGenerator";
import { generateSceneImageDataUrl } from "../lib/sceneImageGenerator";

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700&family=DM+Sans:wght@300;400;500&display=swap');`;

const CSS = `
${FONTS}
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#f5f0e8;--ink:#0f0d0a;--ink2:#3a3530;--muted:#9a9490;
  --border:#e0d8cc;--border2:#ccc4b8;--surface:#faf7f2;--surface2:#f0ebe0;
  --chat-w:320px;--accent:#c8623e;
  --canvas-bottom:28px;
}
html,body{height:100%;overflow:hidden;cursor:default}
body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--ink)}
body.geo-map-on{background:linear-gradient(165deg,#ebe4d8 0%,#e5ddd2 45%,#ddd4c8 100%)}

/* CANVAS (full sky; ticker strip at bottom) */
.canvas{position:fixed;top:0;left:0;right:0;bottom:var(--canvas-bottom);overflow:hidden;z-index:1}

/* PARTICLE CANVAS */
.particle-canvas{position:fixed;top:0;left:0;right:0;bottom:var(--canvas-bottom);pointer-events:none;z-index:0}

/* AMBIENT TICKER */
.ticker{position:fixed;bottom:0;left:0;right:0;z-index:8;overflow:hidden;height:28px;pointer-events:none;border-top:1px solid var(--border)}
.ticker-inner{display:flex;gap:48px;white-space:nowrap;animation:ticker-scroll 40s linear infinite;padding:5px 0}
.ticker-item{font-family:'Playfair Display',serif;font-style:italic;font-size:11px;color:var(--muted);opacity:.6;flex-shrink:0;display:flex;align-items:center;gap:8px}
.ticker-sep{opacity:.3}
@keyframes ticker-scroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}

/* CENTER TITLE */
.center-title{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:5;text-align:center;pointer-events:none;user-select:none;transition:left .5s cubic-bezier(.16,1,.3,1)}
.center-title.shifted{left:calc(50% - 160px)}
.center-title h1{font-family:'Playfair Display',serif;font-size:clamp(52px,7vw,90px);font-weight:700;color:var(--ink);line-height:1;letter-spacing:-.02em;opacity:.45;animation:title-breathe 8s ease-in-out infinite}
@keyframes title-breathe{0%,100%{opacity:.45}50%{opacity:.38}}
.center-title p{font-family:'Playfair Display',serif;font-style:italic;font-size:14px;color:var(--muted);margin-top:10px;opacity:.75}
.center-title .live-tag{display:inline-flex;align-items:center;gap:5px;background:rgba(200,98,62,.1);border:1px solid rgba(200,98,62,.25);border-radius:100px;padding:3px 10px;font-family:'DM Sans',sans-serif;font-size:10px;font-weight:500;color:var(--accent);letter-spacing:.08em;text-transform:uppercase;margin-top:8px}
.live-pip{width:5px;height:5px;border-radius:50%;background:var(--accent);animation:pip 1.5s ease-in-out infinite}

/* NAV */
.nav{position:fixed;top:0;left:0;right:0;z-index:50;display:flex;align-items:center;justify-content:space-between;padding:10px 20px;background:rgba(245,240,232,.95);backdrop-filter:blur(24px);border-bottom:1px solid var(--border);gap:10px}
.nav-left{display:flex;align-items:center;gap:8px;flex-shrink:0}
.nav-pip{width:7px;height:7px;border-radius:50%;background:var(--accent);animation:pip 2.5s ease-in-out infinite;flex-shrink:0}
@keyframes pip{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(.6);opacity:.5}}
.nav-count{font-size:11px;color:var(--muted)}
.nav-center{flex:1;max-width:340px;position:relative}
.search-box{width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:100px;padding:6px 12px 6px 32px;font-family:'DM Sans',sans-serif;font-size:12px;color:var(--ink);outline:none;transition:border-color .18s,box-shadow .18s}
.search-box::placeholder{color:var(--muted)}
.search-box:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(200,98,62,.1)}
.search-icon{position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:12px;pointer-events:none;opacity:.45}
.nav-right{display:flex;align-items:center;gap:7px;flex-shrink:0}
.btn{padding:6px 14px;border-radius:100px;font-family:'DM Sans',sans-serif;font-size:11px;font-weight:500;cursor:pointer;transition:all .18s;border:1px solid var(--border2);background:var(--surface);color:var(--ink2);white-space:nowrap}
.btn:hover{border-color:#aaa;color:var(--ink)}
.btn.primary{background:var(--ink);border-color:var(--ink);color:#f5f0e8}
.btn.primary:hover{background:#2a2520;transform:translateY(-1px);box-shadow:0 4px 14px rgba(15,13,10,.18)}
.btn.on{background:var(--surface2);border-color:var(--accent);color:var(--accent);box-shadow:0 0 0 2px rgba(200,98,62,.12)}
.btn.on:hover{border-color:var(--accent);color:var(--ink)}
.btn.chat-toggle{display:flex;align-items:center;gap:4px;position:relative}
.chat-badge{position:absolute;top:-4px;right:-4px;width:15px;height:15px;background:var(--accent);border-radius:50%;font-size:8px;font-weight:700;color:white;display:flex;align-items:center;justify-content:center;border:2px solid var(--bg)}

/* FILTER */
.filter{position:fixed;top:50px;left:50%;transform:translateX(-50%);z-index:40;display:flex;gap:2px;padding:3px;background:rgba(245,240,232,.96);border:1px solid var(--border);border-radius:100px;backdrop-filter:blur(16px)}
.fpill{padding:4px 10px;border-radius:100px;font-size:9px;letter-spacing:.06em;font-weight:500;text-transform:uppercase;cursor:pointer;transition:all .18s;border:none;background:transparent;color:var(--muted);white-space:nowrap}
.fpill:hover{color:var(--ink2)}
.fpill.on{background:var(--ink);color:#f5f0e8;box-shadow:0 2px 8px rgba(0,0,0,.12)}

/* BUBBLES */
.bub-wrap{position:absolute;left:0;top:0;animation:bub-intro .7s cubic-bezier(.16,1,.3,1) both}
@keyframes bub-intro{from{opacity:0;transform:translate(var(--ix),var(--iy)) scale(.3)}to{opacity:1}}
.bub{position:relative;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;text-align:center;will-change:transform;transition:opacity .4s,filter .4s}
.bub::after{content:'';position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle at 28% 22%,rgba(255,255,255,.28),transparent 60%);pointer-events:none}
.bub::before{content:'';position:absolute;inset:-2px;border-radius:50%;background:inherit;filter:blur(8px);opacity:.4;z-index:-1;transition:opacity .3s}
.bub:hover::before{opacity:.7}
.bub:hover{z-index:20;transform:scale(1.06)}
.bub:hover .bub-ring{transform:scale(1.16);opacity:.65}
.bub-ring{position:absolute;inset:-8px;border-radius:50%;transition:transform .35s,opacity .35s;opacity:0;pointer-events:none;border-width:1.5px;border-style:solid;animation:ring-spin 20s linear infinite}
@keyframes ring-spin{to{transform:rotate(360deg) scale(1)}}
.bub:hover .bub-ring{animation:none;transform:scale(1.16)}
.bub-inner{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;padding:12px;width:100%;height:100%}
.bub-emoji{line-height:1;flex-shrink:0}
.bub-label{font-family:'Playfair Display',serif;font-style:italic;font-weight:700;line-height:1.2;color:white;text-shadow:0 1px 6px rgba(0,0,0,.55)}
.bub-person{font-size:8px;font-family:'DM Sans',sans-serif;letter-spacing:.07em;text-transform:uppercase;color:rgba(255,255,255,.88);font-weight:500;text-shadow:0 1px 4px rgba(0,0,0,.45)}
.bub-likes{position:absolute;bottom:-6px;right:-6px;background:white;border-radius:100px;padding:2px 6px;font-size:9px;font-weight:700;color:var(--ink2);box-shadow:0 2px 8px rgba(0,0,0,.15);display:flex;align-items:center;gap:2px;border:1px solid var(--border);transition:transform .2s}
.bub:hover .bub-likes{transform:scale(1.1)}

/* BURST */
.burst{position:fixed;pointer-events:none;z-index:100}
.burst-particle{position:absolute;width:6px;height:6px;border-radius:50%;animation:burst-fly var(--dur) ease-out forwards}
@keyframes burst-fly{0%{transform:translate(0,0) scale(1);opacity:1}100%{transform:translate(var(--tx),var(--ty)) scale(0);opacity:0}}

/* FLOAT QUOTE */
.float-quotes{position:fixed;top:0;left:0;right:0;bottom:var(--canvas-bottom);pointer-events:none;z-index:6;overflow:hidden}

body.geo-map-on .canvas,
body.geo-map-on .particle-canvas,
body.geo-map-on .float-quotes,
body.geo-map-on .conn,
body.geo-map-on .center-title{display:none!important}

/* STORY MAP (full view) — warm parchment over muted tiles */
.map-shell{display:none}
.map-shell.map-shell--geo{display:block;position:fixed;inset:0 0 28px 0;height:auto;z-index:4;background:linear-gradient(180deg,#f2ebe2 0%,#e8dfd4 55%,#e0d6ca 100%);border-top:none;box-shadow:inset 0 1px 0 rgba(255,255,255,.35)}
.map-shell.map-shell--geo::after{
  content:'';position:absolute;inset:0;pointer-events:none;z-index:450;
  box-shadow:inset 0 0 100px 24px rgba(245,240,232,.25),inset 0 0 200px 80px rgba(200,98,62,.04);
  border-radius:0;
}
.map-shell .leaflet-container{font-family:'DM Sans',sans-serif;height:100%;width:100%;background:#e8dfd4;z-index:1}
.map-shell .leaflet-tile-pane img{
  filter:sepia(.22) saturate(.68) hue-rotate(352deg) brightness(1.06) contrast(.93);
  border-radius:1px;
}
.map-shell .leaflet-control-zoom a{
  width:30px;height:30px;line-height:28px;background:rgba(250,247,242,.95);color:var(--ink2);border:1px solid var(--border);
  font-size:16px;font-weight:500;
}
.map-shell .leaflet-control-zoom a:hover{background:var(--surface);color:var(--ink);border-color:var(--border2)}
.map-shell .leaflet-control-zoom a.leaflet-disabled{opacity:.35}
.map-shell .leaflet-control-attribution{
  background:rgba(245,240,232,.9)!important;color:var(--muted)!important;font-size:9px;line-height:1.4;
  padding:4px 10px 4px 8px!important;margin:0!important;border-radius:10px 0 0 0;
  border-top:1px solid var(--border);border-right:1px solid var(--border);backdrop-filter:blur(10px);max-width:70vw;
}
.map-shell .leaflet-control-attribution a{color:var(--accent);text-decoration:none}
.map-shell .leaflet-control-attribution a:hover{text-decoration:underline}
.map-shell .leaflet-popup-content-wrapper{background:var(--surface);border-radius:12px;border:1px solid var(--border);box-shadow:0 12px 36px rgba(15,13,10,.12)}
.map-shell .leaflet-popup-tip{background:var(--surface);border:1px solid var(--border)}
.map-shell .leaflet-popup-content{margin:10px 12px;font-size:12px;color:var(--ink2);line-height:1.5}
.map-bubble-wrap{background:transparent!important;border:none!important;margin:0!important}
.map-bubble{position:relative;border-radius:50%;display:flex;align-items:center;justify-content:center;text-align:center;transition:transform .2s,opacity .35s,filter .35s;box-sizing:border-box}
.map-bubble::after{content:'';position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle at 28% 22%,rgba(255,255,255,.32),transparent 60%);pointer-events:none}
.map-bubble:hover{transform:scale(1.08);z-index:800!important}
.map-bubble.dim{opacity:.22;filter:saturate(0) blur(.5px);pointer-events:none}
.map-bub-inner{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;padding:6px;width:100%;height:100%}
.map-bub-emoji{line-height:1}
.map-bub-label{font-family:'Playfair Display',serif;font-style:italic;font-weight:700;line-height:1.1;color:white;text-shadow:0 1px 5px rgba(0,0,0,.55)}
.map-bub-person{font-size:7px;font-family:'DM Sans',sans-serif;letter-spacing:.05em;text-transform:uppercase;color:rgba(255,255,255,.9);text-shadow:0 1px 3px rgba(0,0,0,.45)}
.map-legend{
  position:absolute;z-index:500;left:10px;top:8px;display:flex;align-items:center;gap:7px;
  background:linear-gradient(135deg,rgba(250,247,242,.96) 0%,rgba(245,237,228,.94) 100%);
  border:1px solid var(--border);border-radius:12px;padding:7px 12px;
  font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink2);
  pointer-events:none;backdrop-filter:blur(12px);
  box-shadow:0 4px 18px rgba(15,13,10,.06),inset 0 1px 0 rgba(255,255,255,.6);
}
.map-legend::before{content:'';width:5px;height:5px;border-radius:50%;background:var(--accent);flex-shrink:0;opacity:.85;animation:pip 2.2s ease-in-out infinite}
.map-shell .leaflet-bar{border-radius:12px;overflow:hidden;border:1px solid var(--border);box-shadow:0 4px 20px rgba(15,13,10,.1)}
.map-shell .leaflet-bar a{border-bottom-color:var(--border)}
.map-shell .leaflet-bar a:first-child{border-radius:12px 12px 0 0}
.map-shell .leaflet-bar a:last-child{border-radius:0 0 12px 12px;border-bottom:none}
.fquote{position:absolute;font-family:'Playfair Display',serif;font-style:italic;color:var(--ink2);opacity:0;max-width:200px;line-height:1.5;animation:fquote-float var(--dur) ease-in-out forwards;text-align:center;letter-spacing:.01em;pointer-events:none}
@keyframes fquote-float{0%{opacity:0;transform:translateY(8px)}15%{opacity:.13}75%{opacity:.09}100%{opacity:0;transform:translateY(-60px)}}

/* TOOLTIP */
.tooltip{position:fixed;z-index:70;max-width:230px;background:var(--ink);color:#f5f0e8;border-radius:14px;padding:12px 14px;pointer-events:none;animation:t-pop .18s cubic-bezier(.16,1,.3,1);box-shadow:0 12px 40px rgba(0,0,0,.25)}
@keyframes t-pop{from{opacity:0;transform:scale(.92) translateY(4px)}to{opacity:1;transform:scale(1) translateY(0)}}
.tooltip-type{font-size:9px;letter-spacing:.14em;text-transform:uppercase;opacity:.55;margin-bottom:5px}
.tooltip-quote{font-family:'Playfair Display',serif;font-style:italic;font-size:13px;line-height:1.55;opacity:.95}
.tooltip-meta{font-size:10px;opacity:.45;margin-top:6px}
.tooltip-hint{font-size:10px;opacity:.4;margin-top:4px;text-align:right}

/* CONNECTIONS */
.conn{position:fixed;top:0;left:0;right:0;bottom:var(--canvas-bottom);pointer-events:none;z-index:2}

/* STATS */
.stats-bar{position:fixed;bottom:calc(var(--canvas-bottom) + 10px);left:20px;z-index:10;display:flex;flex-direction:column;gap:5px;pointer-events:none}
.stat-pill{display:flex;align-items:center;gap:6px;background:rgba(245,240,232,.9);border:1px solid var(--border);border-radius:100px;padding:4px 11px;backdrop-filter:blur(12px)}
.stat-dot{width:5px;height:5px;border-radius:50%;background:var(--accent);animation:pip 2s ease-in-out infinite}
.stat-text{font-size:10px;color:var(--ink2);font-weight:500}
.stat-num{font-family:'Playfair Display',serif;font-weight:700;font-size:12px;color:var(--ink);min-width:24px;text-align:right;transition:transform .2s}
.stat-num.bump{animation:num-bump .3s ease}
@keyframes num-bump{0%{transform:scale(1)}50%{transform:scale(1.3)}100%{transform:scale(1)}}

/* HINT */
.hint{position:fixed;bottom:calc(var(--canvas-bottom) + 10px);right:20px;z-index:10;pointer-events:none;animation:hint-up .8s .8s ease both;opacity:0}
@keyframes hint-up{to{opacity:1}from{opacity:0;transform:translateY(6px)}}
.hint p{font-family:'Playfair Display',serif;font-style:italic;font-size:11px;color:var(--muted);text-align:right;line-height:1.6}

/* SEARCH RESULTS */
.search-results{position:fixed;top:50px;left:50%;transform:translateX(-50%);z-index:60;background:var(--surface);border:1px solid var(--border);border-radius:14px;box-shadow:0 16px 48px rgba(15,13,10,.15);min-width:320px;max-width:400px;overflow:hidden;animation:t-pop .2s ease}
.sr-item{display:flex;align-items:center;gap:10px;padding:9px 13px;cursor:pointer;transition:background .15s;border-bottom:1px solid var(--border)}
.sr-item:last-child{border-bottom:none}
.sr-item:hover{background:var(--surface2)}
.sr-emoji{font-size:18px;flex-shrink:0}
.sr-info{flex:1;min-width:0}
.sr-label{font-family:'Playfair Display',serif;font-style:italic;font-size:13px;color:var(--ink)}
.sr-meta{font-size:10px;color:var(--muted)}
.sr-empty{padding:18px;text-align:center;font-size:12px;color:var(--muted);font-style:italic}

/* CHAT PANEL */
.chat-panel{position:fixed;top:0;right:0;bottom:0;width:var(--chat-w);background:var(--surface);border-left:1px solid var(--border);z-index:45;display:flex;flex-direction:column;transform:translateX(100%);transition:transform .38s cubic-bezier(.16,1,.3,1);box-shadow:-8px 0 40px rgba(15,13,10,.08)}
.chat-panel.open{transform:translateX(0)}
.chat-head{padding:14px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.chat-head-left{display:flex;flex-direction:column;gap:2px}
.chat-head-title{font-family:'Playfair Display',serif;font-size:15px;font-weight:700;color:var(--ink)}
.chat-head-sub{font-size:10px;color:var(--muted)}
.chat-close{width:26px;height:26px;border-radius:50%;background:var(--surface2);border:1px solid var(--border);color:var(--muted);cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center;transition:all .15s}
.chat-close:hover{background:var(--border);color:var(--ink)}
.chat-locked{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:28px;text-align:center;gap:14px}
.lock-icon{font-size:32px;opacity:.4}
.lock-title{font-family:'Playfair Display',serif;font-size:17px;font-weight:700;color:var(--ink)}
.lock-sub{font-size:13px;color:var(--muted);line-height:1.6}
.lock-btn{padding:10px 20px;border-radius:100px;background:var(--ink);border:none;color:#f5f0e8;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;cursor:pointer;transition:all .18s}
.lock-btn:hover{background:#2a2520;transform:translateY(-1px)}
.members-bar{padding:8px 12px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:5px;flex-shrink:0;overflow-x:auto}
.members-bar::-webkit-scrollbar{display:none}
.member-av{width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:600;color:white;flex-shrink:0;position:relative;cursor:default;transition:transform .2s}
.member-av:hover{transform:scale(1.1)}
.member-av[data-online]::after{content:'';position:absolute;bottom:0;right:0;width:6px;height:6px;border-radius:50%;background:#5a9e6e;border:1.5px solid var(--surface)}
.members-more{font-size:10px;color:var(--muted);white-space:nowrap;margin-left:2px}
.chat-messages{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:9px}
.chat-messages::-webkit-scrollbar{width:3px}
.chat-messages::-webkit-scrollbar-thumb{background:var(--border2);border-radius:2px}
.msg{display:flex;gap:7px;align-items:flex-start;animation:msg-in .3s ease}
@keyframes msg-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.msg.mine{flex-direction:row-reverse}
.msg-av{width:24px;height:24px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:600;color:white}
.msg-body{max-width:200px;display:flex;flex-direction:column;gap:2px}
.msg.mine .msg-body{align-items:flex-end}
.msg-name{font-size:10px;color:var(--muted);letter-spacing:.04em}
.msg-bubble{padding:7px 11px;font-size:13px;line-height:1.5;background:var(--surface2);color:var(--ink2);border-radius:4px 14px 14px 14px}
.msg.mine .msg-bubble{background:var(--ink);color:#f5f0e8;border-radius:14px 4px 14px 14px}
.msg-time{font-size:9px;color:var(--muted)}
.msg-story-ref{font-size:11px;font-style:italic;color:var(--muted);margin-top:3px;padding:5px 9px;background:var(--surface);border:1px solid var(--border);border-radius:8px;cursor:pointer;transition:background .15s;display:flex;align-items:center;gap:5px}
.msg-story-ref:hover{background:var(--border)}
.chat-input-wrap{padding:10px 12px;border-top:1px solid var(--border);flex-shrink:0;display:flex;gap:7px;align-items:flex-end}
.chat-input{flex:1;background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:7px 11px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:300;color:var(--ink);outline:none;resize:none;line-height:1.5;max-height:80px;transition:border-color .18s}
.chat-input:focus{border-color:var(--accent)}
.chat-input::placeholder{color:var(--muted)}
.chat-send{width:30px;height:30px;border-radius:50%;background:var(--ink);border:none;color:#f5f0e8;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;transition:all .18s}
.chat-send:hover:not(:disabled){background:#2a2520;transform:scale(1.1)}
.chat-send:disabled{opacity:.3;cursor:not-allowed}

/* OVERLAY */
.overlay{position:fixed;inset:0;z-index:80;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(15,13,10,.55);backdrop-filter:blur(20px);animation:ov-in .25s ease}
@keyframes ov-in{from{opacity:0}to{opacity:1}}

/* STORY MODAL */
.smodal{width:100%;max-width:700px;max-height:88vh;overflow-y:auto;background:var(--surface);border-radius:22px;border:1px solid var(--border);box-shadow:0 20px 60px rgba(15,13,10,.12);animation:m-up .4s cubic-bezier(.16,1,.3,1)}
@keyframes m-up{from{opacity:0;transform:translateY(32px) scale(.95)}to{opacity:1;transform:none}}
.smodal::-webkit-scrollbar{width:4px}
.smodal::-webkit-scrollbar-thumb{background:var(--border2);border-radius:2px}
.smhero{height:210px;border-radius:22px 22px 0 0;position:relative;overflow:hidden;display:flex;align-items:flex-end;padding:24px}
.smhero-pattern{position:absolute;inset:0;opacity:.08}
.smhero-ov{position:absolute;inset:0;background:linear-gradient(to top,rgba(250,247,242,1) 0%,rgba(250,247,242,.3) 55%,transparent 100%)}
.smhero-content{position:relative;z-index:1}
.sm-chip{font-size:10px;letter-spacing:.12em;text-transform:uppercase;padding:4px 10px;border-radius:20px;display:inline-block;font-weight:500;margin-bottom:8px}
.sm-title{font-family:'Playfair Display',serif;font-size:clamp(20px,3.5vw,30px);font-weight:400;color:var(--ink);line-height:1.15;margin-bottom:4px}
.sm-meta{font-size:12px;color:var(--muted);letter-spacing:.04em}
.sm-close{position:absolute;top:14px;right:14px;width:30px;height:30px;border-radius:50%;background:rgba(250,247,242,.9);border:1px solid var(--border);color:var(--ink2);cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;z-index:10;transition:all .2s}
.sm-close:hover{background:var(--border);color:var(--ink);transform:rotate(90deg)}
.sm-actions{display:flex;gap:8px;padding:14px 26px;border-bottom:1px solid var(--border);flex-wrap:wrap}
.sm-act-btn{display:flex;align-items:center;gap:5px;padding:6px 13px;border-radius:100px;font-family:'DM Sans',sans-serif;font-size:11px;font-weight:500;cursor:pointer;transition:all .18s;border:1px solid var(--border);background:transparent;color:var(--muted)}
.sm-act-btn:hover{background:var(--surface2);color:var(--ink2)}
.sm-act-btn.liked{background:#fff8f5;border-color:#f4d0c0;color:var(--accent)}
.sm-act-btn.liked .h-icon{animation:heartpop .35s ease}
@keyframes heartpop{0%{transform:scale(1)}40%{transform:scale(1.6)}100%{transform:scale(1)}}
.smbody{padding:20px 26px 28px}
.sm-quote{font-family:'Playfair Display',serif;font-style:italic;font-size:17px;line-height:1.65;color:var(--ink2);border-left:1px solid var(--border2);padding:8px 0 8px 18px;margin-bottom:22px;font-weight:300}
.sm-sec{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);font-weight:500;margin-bottom:10px}
.sm-text{font-size:15px;line-height:1.82;font-weight:300;color:var(--ink2);margin-bottom:22px}
.sm-text p{margin-bottom:1em}
.tags{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:22px}
.tag{padding:4px 11px;border-radius:20px;font-size:11px;font-weight:500;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;transition:all .18s}
.tag:hover{transform:translateY(-1px)}
.sm-sig{font-size:14px;line-height:1.78;color:var(--muted);margin-bottom:22px;font-weight:300}
.sm-rq{list-style:none;display:flex;flex-direction:column;gap:8px;margin-bottom:22px}
.sm-rq li{font-size:13px;color:var(--muted);font-style:italic;padding:9px 13px;background:var(--surface2);border-radius:8px;border-left:2px solid var(--border2);transition:border-color .2s}
.sm-rq li:hover{border-color:var(--accent)}
.sm-related-row{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px}
.sm-related-row::-webkit-scrollbar{display:none}
.sm-rel-card{flex-shrink:0;width:130px;padding:10px 12px;background:var(--surface2);border:1px solid var(--border);border-radius:10px;cursor:pointer;transition:all .2s}
.sm-rel-card:hover{background:var(--border2);transform:translateY(-3px);box-shadow:0 6px 20px rgba(0,0,0,.08)}
.sm-rel-emoji{font-size:16px;margin-bottom:4px}
.sm-rel-label{font-family:'Playfair Display',serif;font-style:italic;font-size:11px;color:var(--ink2);line-height:1.3}
.sm-rel-person{font-size:9px;color:var(--muted);margin-top:3px}
.sm-chat-btn{width:100%;margin-top:16px;padding:10px;border-radius:100px;background:transparent;border:1px solid var(--border2);color:var(--muted);font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;cursor:pointer;transition:all .2s}
.sm-chat-btn:hover{background:var(--surface2);color:var(--ink);transform:translateY(-1px)}
.sm-video-wrap{margin-bottom:22px;border-radius:14px;overflow:hidden;border:1px solid var(--border);background:var(--ink)}
.sm-video{width:100%;max-height:320px;display:block;vertical-align:middle}
.sm-video-note{font-size:12px;color:var(--muted);margin-top:8px;line-height:1.5;font-weight:300}

/* ADD MODAL */
.amodal{width:100%;max-width:560px;background:var(--surface);border-radius:20px;border:1px solid var(--border);box-shadow:0 40px 100px rgba(15,13,10,.18);animation:m-up .38s cubic-bezier(.16,1,.3,1);overflow:hidden;position:relative}
.amodal::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#a04e30,#8a6a10,#2d6e48)}
.ahead{padding:22px 24px 0}
.a-title{font-family:'Playfair Display',serif;font-size:24px;font-weight:700;color:var(--ink);margin-bottom:3px}
.a-sub{font-size:12px;color:var(--muted)}
.abody{padding:16px 24px 24px;display:flex;flex-direction:column;gap:12px}
.afield{display:flex;flex-direction:column;gap:5px}
.alabel{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);font-weight:500}
.ainput,.atextarea,.aselect{background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:9px 12px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:300;color:var(--ink);outline:none;transition:border-color .18s,box-shadow .18s;width:100%}
.ainput::placeholder,.atextarea::placeholder{color:var(--muted)}
.ainput:focus,.atextarea:focus,.aselect:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(200,98,62,.1)}
.atextarea{resize:vertical;min-height:110px;line-height:1.7}
.astory-meta{font-size:11px;margin-top:6px;display:flex;justify-content:space-between;align-items:center;gap:8px}
.astory-count{font-variant-numeric:tabular-nums}
.astory-count.warn{color:var(--accent)}
.avideo-hint{font-size:11px;color:var(--muted);line-height:1.5;margin-top:4px}
.avideo-preview{width:100%;max-height:160px;border-radius:8px;margin-top:8px;background:var(--ink)}
.avideo-file{font-size:12px;color:var(--ink2)}
.aselect{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%239a9490'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;padding-right:32px;cursor:pointer}
.agrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.abtnrow{display:flex;gap:10px;margin-top:4px}
.abtn{flex:1;padding:11px;border-radius:100px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;cursor:pointer;transition:all .18s;border:1px solid var(--border2);background:transparent;color:var(--muted)}
.abtn:hover{color:var(--ink);background:var(--surface2)}
.abtn.go{background:var(--ink);border-color:var(--ink);color:#f5f0e8}
.abtn.go:hover:not(:disabled){background:#2a2520;transform:translateY(-1px);box-shadow:0 4px 14px rgba(0,0,0,.18)}
.abtn.go:disabled{opacity:.35;cursor:not-allowed;transform:none}

/* LOADING */
.lmodal{width:100%;max-width:360px;background:var(--surface);border-radius:20px;border:1px solid var(--border);box-shadow:0 40px 100px rgba(15,13,10,.15);padding:40px 32px;text-align:center;animation:m-up .35s ease}
.lring{width:44px;height:44px;border:2px solid var(--border2);border-top-color:var(--accent);border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 20px}
@keyframes spin{to{transform:rotate(360deg)}}
.l-title{font-family:'Playfair Display',serif;font-size:21px;font-weight:700;color:var(--ink);margin-bottom:5px}
.l-sub{font-size:12px;color:var(--muted);line-height:1.6}
.lsteps{display:flex;flex-direction:column;gap:6px;margin-top:16px;text-align:left}
.lstep{font-size:12px;color:var(--muted);display:flex;align-items:center;gap:7px;opacity:0;animation:fup .35s ease forwards}
.lstep.ok{color:#6e9e82}
.lstep-d{width:5px;height:5px;border-radius:50%;background:currentColor;flex-shrink:0}
@keyframes fup{to{opacity:1}}

/* SCRAPBOOK */
.sb-overlay{position:fixed;inset:0;z-index:90;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(15,13,10,.6);backdrop-filter:blur(24px);animation:ov-in .25s ease}
.sb-modal{width:100%;max-width:560px;background:var(--surface);border-radius:20px;border:1px solid var(--border);box-shadow:0 32px 80px rgba(15,13,10,.2);animation:m-up .4s cubic-bezier(.16,1,.3,1);overflow:hidden;position:relative}
.sb-head{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--border)}
.sb-head-left{display:flex;flex-direction:column;gap:2px}
.sb-title{font-family:'Playfair Display',serif;font-size:16px;font-weight:400;font-style:italic;color:var(--ink)}
.sb-sub{font-size:10px;color:var(--muted);letter-spacing:.06em;text-transform:uppercase}
.sb-close{width:26px;height:26px;border-radius:50%;background:var(--surface2);border:1px solid var(--border);color:var(--muted);cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center;transition:all .15s;flex-shrink:0}
.sb-close:hover{background:var(--border);color:var(--ink)}
.sb-generating{padding:60px 32px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:14px}
.sb-gen-ring{width:40px;height:40px;border:2px solid var(--border2);border-top-color:var(--accent);border-radius:50%;animation:spin 1s linear infinite}
.sb-gen-title{font-family:'Playfair Display',serif;font-size:18px;font-weight:300;font-style:italic;color:var(--ink)}
.sb-gen-sub{font-size:12px;color:var(--muted);line-height:1.6;max-width:280px}
.sb-gen-steps{display:flex;flex-direction:column;gap:5px;margin-top:4px;text-align:left;min-width:220px}
.sb-gen-step{font-size:11px;color:var(--muted);display:flex;align-items:center;gap:6px;opacity:0;animation:fup .4s ease forwards}
.sb-gen-step.ok{color:#5aaa78}
.sb-gen-step-d{width:4px;height:4px;border-radius:50%;background:currentColor;flex-shrink:0}
/* FLIPBOOK */
.sb-book{position:relative;overflow:hidden;background:var(--surface2);border-bottom:1px solid var(--border)}
.sb-pages{display:flex;transition:transform .45s cubic-bezier(.16,1,.3,1)}
.sb-page{min-width:100%;display:flex;flex-direction:column}
.sb-scene-art{width:100%;height:260px;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden}
.sb-scene-art svg{width:100%;height:100%}
.sb-scene-fallback{width:100%;height:100%;min-height:260px;display:flex;align-items:center;justify-content:center;padding:20px 22px;background:linear-gradient(165deg,rgba(245,237,224,.95) 0%,rgba(232,216,192,.88) 45%,rgba(200,98,62,.08) 100%);border-bottom:1px solid var(--border2)}
.sb-fallback-frame{width:100%;max-width:340px;border-radius:12px;border:1px solid rgba(58,53,48,.12);background:rgba(250,247,242,.65);padding:16px 18px;box-shadow:inset 0 1px 0 rgba(255,255,255,.5)}
.sb-fallback-label{font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin-bottom:8px}
.sb-fallback-details{font-size:12px;line-height:1.75;color:var(--ink2);font-weight:300;font-style:italic}
.sb-page-visual{font-size:11px;line-height:1.65;color:var(--ink2);margin-top:8px;padding-top:10px;border-top:1px solid var(--border2);font-weight:300}
.sb-page-prompt{margin-top:8px}
.sb-page-prompt summary{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);cursor:pointer;user-select:none}
.sb-page-prompt summary:hover{color:var(--ink2)}
.sb-prompt-body{font-size:11px;line-height:1.65;color:var(--muted);margin-top:6px;font-style:italic;font-weight:300}
.sb-analysis{font-size:10px;color:var(--muted);padding:10px 18px;background:var(--surface2);border-bottom:1px solid var(--border);line-height:1.55}
.sb-scene-art-loading{width:100%;height:260px;display:flex;align-items:center;justify-content:center;background:var(--surface2)}
.sb-page-caption{padding:14px 18px;background:var(--surface)}
.sb-page-num-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:5px}
.sb-page-num{font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
.sb-emotion-pill{font-size:9px;letter-spacing:.08em;font-weight:500;padding:2px 8px;border-radius:20px;text-transform:capitalize}
.sb-page-moment{font-family:'Playfair Display',serif;font-style:italic;font-size:15px;color:var(--ink2);line-height:1.4;margin-bottom:4px;font-weight:400}
.sb-page-detail{font-size:12px;color:var(--muted);line-height:1.6;font-weight:300}
/* FLIPBOOK CONTROLS */
.sb-controls{display:flex;align-items:center;justify-content:space-between;padding:12px 18px;border-top:1px solid var(--border)}
.sb-nav-btn{width:32px;height:32px;border-radius:50%;background:var(--surface2);border:1px solid var(--border);color:var(--ink2);cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;transition:all .18s}
.sb-nav-btn:hover:not(:disabled){background:var(--border);color:var(--ink);transform:scale(1.06)}
.sb-nav-btn:disabled{opacity:.3;cursor:not-allowed}
.sb-dots{display:flex;gap:6px;align-items:center}
.sb-dot{width:6px;height:6px;border-radius:50%;background:var(--border2);cursor:pointer;transition:all .2s}
.sb-dot.on{background:var(--accent);transform:scale(1.2)}
.sb-auto-btn{font-size:11px;color:var(--muted);background:transparent;border:none;cursor:pointer;font-family:'DM Sans',sans-serif;padding:4px 8px;border-radius:4px;transition:color .15s}
.sb-auto-btn:hover{color:var(--ink)}
.sb-auto-btn.playing{color:var(--accent)}

/* TOAST */
.toast{position:fixed;bottom:36px;left:50%;transform:translateX(-50%);background:var(--ink);color:#f5f0e8;border-radius:100px;padding:10px 18px;font-size:12px;z-index:200;animation:toast-in .35s cubic-bezier(.16,1,.3,1);white-space:nowrap;display:flex;align-items:center;gap:7px;box-shadow:0 8px 32px rgba(0,0,0,.25)}
.t-pip{width:5px;height:5px;background:#6e9e82;border-radius:50%}
@keyframes toast-in{from{opacity:0;transform:translateX(-50%) translateY(16px) scale(.9)}to{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}}
`;

// ── Palette (dark, saturated) ─────────────────────────────────────────────────
const PALETTES = [
  {bg:"#d4845a",ring:"rgba(212,132,90,.5)"},    // soft terracotta
  {bg:"#4a9e8a",ring:"rgba(74,158,138,.45)"},   // soft teal
  {bg:"#c46898",ring:"rgba(196,104,152,.45)"},  // soft rose
  {bg:"#c9a030",ring:"rgba(201,160,48,.5)"},    // warm gold
  {bg:"#5a82c4",ring:"rgba(90,130,196,.45)"},   // soft cobalt
  {bg:"#a0724a",ring:"rgba(160,114,74,.45)"},   // warm caramel
  {bg:"#5aaa78",ring:"rgba(90,170,120,.45)"},   // soft sage
  {bg:"#8a68c4",ring:"rgba(138,104,196,.45)"},  // soft lavender
];

const TAG_COLORS={food:"#a04e30",migration:"#1e3e7a",family:"#7a2858",memory:"#5a2e10",tradition:"#7a5a0a",resilience:"#1e5244",language:"#1a5e38",celebration:"#7a5a0a",nature:"#1a5e38",mythology:"#7a2858",identity:"#1e3e7a",loss:"#9a9490",childhood:"#a04e30",music:"#1a5e38",history:"#1e5244"};
const tagStyle=t=>{const c=TAG_COLORS[t]||"#9a9490";return{background:c+"1a",color:c,border:`1px solid ${c}40`};};

// ── Seed stories — spread across viewport ─────────────────────────────────────
const SEED=[
  {id:1,label:"Nana's Dumplings",emoji:"🥟",p:0,likes:24,
   title:"The Fold That Seals the Love",person:"Mei-Ling Zhao",place:"Chengdu → Vancouver",culture:"Sichuan Chinese",
   type:"Recipe & Ritual",themes:["food","family","memory","tradition"],
   quote:"She said the fold was the most important part. 'You are sealing in the love,' she told me. 'If you rush, the love escapes.'",
   story:"My grandmother made dumplings every Sunday of my childhood, and the smell of sesame oil and ginger would pull me from sleep better than any alarm. She learned from her mother in Chengdu, who learned from hers — a chain of hands stretching back through time like linked fingers.\n\nWhen she emigrated to Vancouver in 1974 with two suitcases and a worn recipe card, she brought the recipe as seriously as she brought anything else. In a new country where nobody knew our name or our food, those dumplings became how we recognized ourselves.\n\nI learned by watching. There were no measurements — a palm of flour, enough water until it talks to you, pork and cabbage mixed until it smells right. The knowledge lived in her hands, not on any page. I am still learning to translate it into mine.",
   significance:"This story captures how food operates as living memory — a technology for transmitting cultural identity across displacement and generation.",
   reflections:["What food connects you most deeply to your heritage?","What knowledge does someone in your life carry that has never been written down?","How do you preserve a tradition that lives in the body rather than on the page?"],
   x:4,y:14,size:118,lat:49.2827,lng:-123.1207},
  {id:2,label:"The Long Walk",emoji:"🚶",p:1,likes:38,
   title:"Forty Days to the Border, a Lifetime Across It",person:"Yusuf Al-Rashid",place:"Aleppo → Berlin",culture:"Syrian",
   type:"Migration Story",themes:["migration","resilience","identity","loss"],
   quote:"I carried nothing but my children and a photograph of our house. The house I thought I could rebuild. The photograph — that I could not replace.",
   story:"There are things you rehearse for — job interviews, weddings, arguments with your brother. Nobody rehearses leaving.\n\nWe left in the 3am dark of a November night, my wife holding our youngest, me carrying our older daughter on my shoulders. Our neighbors watched from their windows. Nobody waved.\n\nThe journey took 40 days through four countries. We slept in an abandoned factory in Serbia where other families had scratched their names into the walls. I added ours: Al-Rashid, 2015, Syria. Germany was cold and bureaucratic and the most beautiful thing I had ever seen, because it was the end of moving.",
   significance:"Personal migration testimonies are among the most important historical documents of our era.",
   reflections:["What would you carry if you had to leave tonight?","How does a person hold two identities at once?","What does 'home' mean when you've had to leave it?"],
   x:72,y:8,size:128,lat:52.52,lng:13.405},
  {id:3,label:"The Star Bride",emoji:"✨",p:2,likes:17,
   title:"When the Sky Came Down to Marry the River",person:"Priya Nair",place:"Kerala, India",culture:"Malayalam",
   type:"Village Legend",themes:["mythology","nature","tradition","memory"],
   quote:"The elders say that on certain nights, if you listen to the river, you can still hear her singing — the star bride who chose water over heaven.",
   story:"In the village where my grandmother was born, children were taught never to turn their backs on the river at night. Not because it was dangerous, they said, but because it was watching.\n\nThe legend of the Star Bride predates memory. A celestial being descended to bathe in the Periyar and fell in love with the way it moved. She chose mortal form. The night sky, missing her, dimmed slightly — which is why, if you compare the Kerala sky to skies elsewhere, there is a softness in it, a small persistent grief.\n\nMy grandmother told this story differently each time, which I now understand was the point. The legend was a vessel. You filled it with whatever a child needed.",
   significance:"This story represents an ecosystem of oral mythology that encodes ecological relationships, moral teaching, and communal identity in narrative form.",
   reflections:["What legends shaped how you understood the world as a child?","How do stories change across generations?","What would it mean to preserve a story meant to be told, not written?"],
   x:82,y:42,size:103,lat:9.9312,lng:76.2673},
  {id:4,label:"Festival of Lights",emoji:"🪔",p:3,likes:31,
   title:"The Year I Carried the Lantern",person:"Amara Osei",place:"Accra, Ghana",culture:"Akan",
   type:"Celebration Memory",themes:["celebration","childhood","family","tradition"],
   quote:"I was eight years old and the lantern was taller than me and I have never felt so important in my entire life.",
   story:"The Homowo harvest festival happened every year but it only happened like that once — the year I was eight and my uncle chose me, specifically me, to carry the family lantern.\n\nIt was taller than I was. The light made everything golden. The drums were so loud I felt them in my chest. My grandmother pressed her palm to my forehead and said something in Twi my mother later translated as 'you carry more than light.'\n\nI've lived in London for eleven years now. I make palm nut soup on Homowo and call my mother and she calls her mother and the three of us eat at the same time across three time zones. The lantern is gone. The feeling — I still carry it.",
   significance:"Diaspora communities develop sophisticated practices for maintaining connection to home traditions across geographic distance.",
   reflections:["What childhood memory carries the most weight for you now?","How do you maintain traditions when separated from the community?","What rituals would you pass to the next generation?"],
   x:38,y:28,size:113,lat:5.6037,lng:-0.187},
  {id:5,label:"Last Lullaby",emoji:"🎵",p:4,likes:29,
   title:"The Last Song My Grandmother Sang",person:"Haruko Yamamoto",place:"Hokkaido, Japan",culture:"Ainu",
   type:"Song & Language",themes:["language","music","memory","loss"],
   quote:"There are fewer than ten people alive who can sing it correctly. My grandmother was one. She is no longer.",
   story:"The Ainu language has perhaps 300 living speakers. The number who can sing the traditional upopo — the seat songs — is far fewer. My grandmother was one of the last.\n\nI recorded her six months before she died. I set my phone on the kitchen table between her tea and mine and pressed record with shaking hands. The song is four minutes long. She sang it twice.\n\nListening now, I can hear the refrigerator hum. I can hear her breathe. A car outside. And underneath all of that, this melody older than the building we sat in, older than the nation we lived in. My daughter is three. I play her the recording. I sing along, badly. She corrects me.",
   significance:"Language death is among the most irreversible forms of cultural loss. Each language carries unique ways of conceptualizing time, relationship, and nature.",
   reflections:["Is there a song in your family that might not survive another generation?","What languages do people in your family speak that you don't?","How might you document knowledge that exists only in living memory?"],
   x:62,y:62,size:108,lat:43.0642,lng:141.3469},
  {id:6,label:"Wedding Trunk",emoji:"👗",p:5,likes:22,
   title:"What She Packed and What She Left Behind",person:"Fatima Al-Hassan",place:"Marrakech → Paris",culture:"Moroccan Berber",
   type:"Wedding Memory",themes:["family","tradition","identity","memory"],
   quote:"My mother packed seven dresses and one secret in that trunk. I only learned what the secret was at my own wedding.",
   story:"In my mother's family, every bride received a cedar trunk. Into it went things that could not be spoken — a grandmother's bracelet, a folded prayer, a packet of seeds from a garden that no longer exists.\n\nI grew up knowing the trunk existed and not knowing what was in it. Some things are for the woman you will become, not the girl you are.\n\nAt my wedding in Paris, my mother opened the trunk. Inside: an embroidered belt from the 1930s, a photograph of a woman I didn't recognize but whose jawline is mine exactly, a piece of paper with seven words in Tamazight that my mother whispered in my ear. I am learning Tamazight now. Slowly.",
   significance:"Material culture functions as a medium for transmitting cultural memory, particularly the inner lives of women whose experiences were rarely recorded in official history.",
   reflections:["What objects in your family carry stories never fully told?","What was passed to you at a significant moment?","What would you put in a trunk for someone you loved?"],
   x:4,y:60,size:108,lat:48.8566,lng:2.3522},
  {id:7,label:"River Father",emoji:"🐟",p:6,likes:19,
   title:"My Father Knew Every Bend by Name",person:"Carlos Ribeiro",place:"Amazon Basin, Brazil",culture:"Ribeirinho",
   type:"Craft & Knowledge",themes:["nature","tradition","family","resilience"],
   quote:"He could tell the weather by the color of the water. He could tell the time by where the birds sat in the trees. The river was his clock, his calendar, his library.",
   story:"My father could navigate 200 kilometers of the Amazon River by feel. He learned from his father, who learned from his — knowledge accumulated over generations like sediment.\n\nHe knew which fish to take and which to release. He knew where the water went fast and where it held still. He knew where a village had been before the water rose and swallowed it.\n\nWhen the dam was built upstream, it changed everything. He adapted what he could. Some things could not be adapted. I bring my children to the river. I tell them what I know, which is less than what he knew. But we go. Every year.",
   significance:"Traditional ecological knowledge represents thousands of years of observation and relationship with specific environments — and vanishes when its carriers do.",
   reflections:["What practical knowledge in your family isn't written anywhere?","How do we preserve knowledge learned through doing?","What has been lost in your landscape in your lifetime?"],
   x:30,y:72,size:103,lat:-3.119,lng:-60.0217},
  {id:8,label:"Unsent Letters",emoji:"✉️",p:7,likes:44,
   title:"The Letters My Grandfather Wrote and Never Sent",person:"James Takahashi",place:"Manzanar, California",culture:"Japanese-American",
   type:"Family History",themes:["history","resilience","identity","memory","family"],
   quote:"He wrote every week to his parents in Japan. He never sent a single letter. After the war, he burned them. But he had told my grandmother what was in them.",
   story:"My grandfather was 19 when he was sent to Manzanar. He had been born in California. He had never been to Japan. This did not matter.\n\nDuring three years there, he wrote letters to his parents — explaining where he was, what the desert looked like, that he was trying to understand his country. He burned them before he came home. My grandmother said he stood at the edge of the road with a coffee can, and when it was done, said: 'Now we start.'\n\nThey never discussed the camp in public. My grandmother kept their story in her memory like a jewel in a fist. She told my mother everything when my mother was 40. My mother told me everything last year. I am the first person in our family to write it down.",
   significance:"The Japanese American incarceration is documented history, but the inner lives of those who experienced it remain largely unrecorded.",
   reflections:["What difficult history in your family has been kept in silence?","When is the right time to speak about painful things?","What family stories are waiting to be written down?"],
   x:55,y:76,size:122,lat:36.7285,lng:-118.0729},
];

const THEMES_ALL=["migration","family","memory","tradition","resilience","food","language","celebration","nature","mythology","identity","history"];
const LOAD_MSGS=["Reading your story…","Finding its heartbeat…","Weaving the narrative…","Composing the archive entry…","Adding to the constellation…"];
const TYPE_OPTS=["Family Memory","Migration Story","Village Legend","Recipe & Ritual","Celebration Memory","Song & Language","Craft & Knowledge","Wedding Memory","Family History","Oral Tradition"];
const mkTime=m=>{const d=new Date();d.setMinutes(d.getMinutes()-m);return d;};

function escHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Rough coordinates when the model omits them — matches common place names in the archive. */
function inferCoords(place) {
  const p = (place || "").toLowerCase();
  const table = [
    ["vancouver", 49.2827, -123.1207], ["chengdu", 30.67, 104.07],
    ["berlin", 52.52, 13.405], ["aleppo", 36.2021, 37.1343],
    ["kerala", 9.9312, 76.2673], ["periyar", 9.9312, 76.2673],
    ["accra", 5.6037, -0.187], ["ghana", 5.6037, -0.187],
    ["hokkaido", 43.0642, 141.3469], ["sapporo", 43.0642, 141.3469], ["japan", 35.68, 139.76],
    ["paris", 48.8566, 2.3522], ["marrakech", 31.6295, -7.9811], ["morocco", 31.6295, -7.9811],
    ["amazon", -3.119, -60.0217], ["manaus", -3.119, -60.0217], ["brazil", -14.235, -51.9253],
    ["manzanar", 36.7285, -118.0729], ["california", 36.7783, -119.4179],
    ["london", 51.5074, -0.1278], ["lahore", 31.5204, 74.3587],
  ];
  for (const [key, lat, lng] of table) {
    if (p.includes(key)) return { lat, lng };
  }
  let h = 0;
  for (let i = 0; i < p.length; i++) h = ((h << 5) - h) + p.charCodeAt(i) | 0;
  const lat = ((h % 1000) / 1000) * 110 - 55;
  const lng = (((h >> 10) % 1000) / 1000) * 340 - 170;
  return { lat: Math.max(-55, Math.min(72, lat)), lng: Math.max(-175, Math.min(175, lng)) };
}

function StoryMap({ entries, filter, search, searchResults, onPick, chatOpen }) {
  const wrapRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || mapRef.current) return;
    const map = L.map(el, { worldCopyJump: true, scrollWheelZoom: true });
    mapRef.current = map;
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OSM</a> &copy; <a href=\"https://carto.com/attributions\">CARTO</a>",
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);
    const fg = L.layerGroup().addTo(map);
    layerRef.current = fg;
    map.setView([18, 12], 2);
    const onR = () => { map.invalidateSize({ animate: false }); };
    window.addEventListener("resize", onR);
    const fitLater = () => {
      requestAnimationFrame(() => {
        map.invalidateSize({ animate: false });
        requestAnimationFrame(() => map.invalidateSize({ animate: false }));
      });
    };
    fitLater();
    return () => {
      window.removeEventListener("resize", onR);
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    mapRef.current?.invalidateSize({ animate: false });
  }, [chatOpen]);

  useEffect(() => {
    const map = mapRef.current;
    const fg = layerRef.current;
    if (!map || !fg) return;
    fg.clearLayers();
    const dimmedFor = e =>
      (filter !== null && !e.themes.includes(filter)) ||
      (search.trim().length > 1 && !searchResults.find(r => r.id === e.id));
    const pts = [];
    for (const entry of entries) {
      const la = Number(entry.lat);
      const ln = Number(entry.lng);
      if (!Number.isFinite(la) || !Number.isFinite(ln)) continue;
      const dim = dimmedFor(entry);
      const pal = PALETTES[entry.p % PALETTES.length];
      const sz = Math.round(Math.min(78, Math.max(44, (entry.size || 100) * 0.52)));
      const fs = (entry.size || 100) > 118 ? 11 : 9;
      const shortName = escHtml((entry.person || "").split(" ").slice(0, 2).join(" "));
      const html = `<div class="map-bubble${dim ? " dim" : ""}" style="width:${sz}px;height:${sz}px;background:radial-gradient(circle at 35% 28%, ${pal.bg}cc, ${pal.bg}aa);box-shadow:0 8px 22px ${pal.bg}44,0 2px 6px ${pal.bg}28,inset 0 1px 1px rgba(255,255,255,.14)">
        <div class="map-bub-inner">
          <span class="map-bub-emoji" style="font-size:${sz > 56 ? 17 : 14}px">${escHtml(entry.emoji)}</span>
          <span class="map-bub-label" style="font-size:${fs}px;max-width:${Math.round(sz * 0.72)}px">${escHtml(entry.label)}</span>
          ${sz > 52 ? `<span class="map-bub-person">${shortName}</span>` : ""}
        </div>
      </div>`;
      const icon = L.divIcon({
        className: "map-bubble-wrap",
        html,
        iconSize: [sz, sz],
        iconAnchor: [sz / 2, sz / 2],
        popupAnchor: [0, -Math.round(sz / 2)],
      });
      L.marker([la, ln], { icon })
        .on("click", () => { onPick(entry); })
        .addTo(fg);
      pts.push(L.latLng(la, ln));
    }
    if (pts.length === 1) {
      map.setView(pts[0], 5, { animate: true });
    } else if (pts.length > 1) {
      map.fitBounds(L.latLngBounds(pts), { padding: [36, 36], maxZoom: 6, animate: false });
    }
  }, [entries, filter, search, searchResults, onPick]);

  return (
    <div className="map-shell map-shell--geo">
      <div className="map-legend">Where stories happened</div>
      <div ref={wrapRef} style={{ position: "absolute", inset: 0 }} />
    </div>
  );
}

const SEED_MSGS=[
  {id:1,author:"Mei-Ling",color:"#d4845a",text:"Just shared my grandmother's dumpling story. It feels strange and wonderful to have it out in the world.",time:mkTime(48),storyRef:{label:"Nana's Dumplings",id:1}},
  {id:2,author:"Yusuf",color:"#4a9e8a",text:"Welcome Mei-Ling. Your story made me think of crossing borders with only what fits in your hands.",time:mkTime(45)},
  {id:3,author:"Priya",color:"#c46898",text:"The image of sealing love into the fold — that stayed with me all morning.",time:mkTime(42)},
  {id:4,author:"Amara",color:"#c9a030",text:"I've been thinking about how much knowledge lives in hands and not in books. My uncle knows how to read clouds but never taught anyone.",time:mkTime(30)},
  {id:5,author:"Haruko",color:"#5a82c4",text:"That's exactly why I recorded my grandmother. I was terrified I'd waited too long.",time:mkTime(28)},
  {id:6,author:"Yusuf",color:"#4a9e8a",text:"You hadn't. The recording exists. That's everything.",time:mkTime(25)},
  {id:7,author:"Carlos",color:"#5aaa78",text:"Just added my story. My father's relationship with the Amazon was a whole language I don't know enough of.",time:mkTime(12),storyRef:{label:"River Father",id:7}},
  {id:8,author:"Priya",color:"#c46898",text:"Carlos — your father sounds like someone who could read the world.",time:mkTime(8)},
  {id:9,author:"Fatima",color:"#a0724a",text:"Reading all of these stories and feeling less alone in the work of remembering.",time:mkTime(3)},
];

function fmtTime(d){const diff=Math.floor((new Date()-d)/60000);if(diff<1)return"just now";if(diff<60)return`${diff}m ago`;const h=Math.floor(diff/60);if(h<24)return`${h}h ago`;return`${Math.floor(h/24)}d ago`;}
function initials(n){return n.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();}

// ── Particle canvas (ambient floating dots) ───────────────────────────────────
function ParticleCanvas() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    const particles = Array.from({length:35}, () => ({
      x: Math.random()*window.innerWidth, y: Math.random()*window.innerHeight,
      r: Math.random()*2.5+.5, vx:(Math.random()-.5)*.18, vy:(Math.random()-.5)*.18,
      o: Math.random()*.3+.05, ot:0, od:Math.random()*Math.PI*2
    }));
    let raf;
    const draw = () => {
      ctx.clearRect(0,0,canvas.width,canvas.height);
      const t = Date.now()/1000;
      particles.forEach(p => {
        p.x+=p.vx; p.y+=p.vy;
        if(p.x<0)p.x=canvas.width; if(p.x>canvas.width)p.x=0;
        if(p.y<0)p.y=canvas.height; if(p.y>canvas.height)p.y=0;
        const alpha = p.o*(0.5+0.5*Math.sin(t*0.8+p.od));
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle = `rgba(160,100,60,${alpha})`; ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={canvasRef} className="particle-canvas" />;
}

// ── Burst effect ──────────────────────────────────────────────────────────────
function Burst({ x, y, color, onDone }) {
  const count = 10;
  useEffect(() => { const t = setTimeout(onDone, 900); return () => clearTimeout(t); }, []);
  return (
    <div className="burst" style={{left:x,top:y}}>
      {Array.from({length:count}).map((_,i) => {
        const angle = (i/count)*Math.PI*2;
        const dist = 40+Math.random()*30;
        return (
          <div key={i} className="burst-particle" style={{
            background:color,
            '--tx':`${Math.cos(angle)*dist}px`,
            '--ty':`${Math.sin(angle)*dist}px`,
            '--dur':`${0.5+Math.random()*.4}s`,
            animationDelay:`${i*0.02}s`,
          }}/>
        );
      })}
    </div>
  );
}

// ── Floating quotes ───────────────────────────────────────────────────────────
const QUOTE_SNIPPETS = [
  "sealing in the love…",
  "the photograph I could not replace",
  "older than the nation we lived in",
  "you carry more than light",
  "the river was watching",
  "some things are for the woman you will become",
  "his clock, his calendar, his library",
  "now we start",
  "the knowledge lived in her hands",
  "a jewel in a fist",
  "the star bride who chose water over heaven",
  "it was the end of moving",
  "she sang it twice",
];

function FloatQuotes({ entries }) {
  const [quotes, setQuotes] = useState([]);
  const counterRef = useRef(0);

  useEffect(() => {
    // seed a few immediately
    const seedCount = 4;
    const initial = Array.from({length: seedCount}, (_, i) => ({
      id: i,
      text: QUOTE_SNIPPETS[i % QUOTE_SNIPPETS.length],
      x: 8 + (i / seedCount) * 75 + Math.random() * 8,
      y: 18 + Math.random() * 55,
      size: 10 + Math.floor(Math.random() * 3),
      delay: i * 1.2,
    }));
    setQuotes(initial);
    counterRef.current = seedCount;

    const iv = setInterval(() => {
      const id = counterRef.current++;
      const snippet = QUOTE_SNIPPETS[id % QUOTE_SNIPPETS.length];
      setQuotes(q => {
        const next = [...q.slice(-6), {
          id,
          text: snippet,
          x: 5 + Math.random() * 78,
          y: 18 + Math.random() * 58,
          size: 10 + Math.floor(Math.random() * 3),
          delay: 0,
        }];
        return next;
      });
    }, 5000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="float-quotes">
      {quotes.map(q => (
        <div key={q.id} className="fquote"
          style={{
            left: `${q.x}%`,
            top: `${q.y}%`,
            fontSize: q.size,
            '--dur': `${10 + Math.random() * 6}s`,
            animationDelay: `${q.delay}s`,
          }}>
          "{q.text}"
        </div>
      ))}
    </div>
  );
}

// ── Connections (animated) ────────────────────────────────────────────────────
function Connections({ entries, bubbleRefs }) {
  const [lines, setLines] = useState([]);
  const phase = useRef(0);
  useEffect(() => {
    const update = () => {
      phase.current += 0.01;
      const nl = [];
      for(let i=0;i<entries.length;i++) for(let j=i+1;j<entries.length;j++){
        const a=entries[i],b=entries[j];
        if(a.themes.filter(t=>b.themes.includes(t)).length<2) continue;
        const ra=bubbleRefs.current[a.id],rb=bubbleRefs.current[b.id];
        if(!ra||!rb) continue;
        const m=s=>s.style.transform.match(/translate\(([^,]+),([^)]+)\)/);
        const ma=m(ra),mb=m(rb);
        if(!ma||!mb) continue;
        nl.push({
          ax:+ma[1]+a.size/2, ay:+ma[2]+a.size/2,
          bx:+mb[1]+b.size/2, by:+mb[2]+b.size/2,
          key:`${a.id}-${b.id}`,
          opacity: 0.12 + 0.08*Math.sin(phase.current+a.id)
        });
      }
      setLines(nl);
    };
    const iv = setInterval(update, 80);
    return () => clearInterval(iv);
  }, [entries]);
  return (
    <svg className="conn">
      <defs>
        <marker id="dot" markerWidth="3" markerHeight="3" refX="1.5" refY="1.5">
          <circle cx="1.5" cy="1.5" r="1.5" fill="rgba(140,100,60,.3)"/>
        </marker>
      </defs>
      {lines.map(l => (
        <line key={l.key} x1={l.ax} y1={l.ay} x2={l.bx} y2={l.by}
          stroke={`rgba(140,100,60,${l.opacity})`} strokeWidth="1"
          strokeDasharray="3 9" markerEnd="url(#dot)"/>
      ))}
    </svg>
  );
}

// ── Bubble ────────────────────────────────────────────────────────────────────
function Bubble({ entry, onClick, onHover, dimmed, index, chatOpen, bottomPad }) {
  const el = useRef(null);
  const state = useRef({
    x:(entry.x/100)*window.innerWidth,
    y:(entry.y/100)*(window.innerHeight-bottomPad),
    vx:(Math.random()-.5)*.18, vy:(Math.random()-.5)*.18, ax:0, ay:0
  });
  const hovering = useRef(false);
  const raf = useRef(null);
  const pal = PALETTES[entry.p%PALETTES.length];
  const ix = ((entry.x/100)*window.innerWidth) + "px";
  const iy = ((entry.y/100)*(window.innerHeight-bottomPad)) + "px";

  useEffect(() => {
    const s=entry.size;
    const onMove=e=>{
      if(hovering.current) return;
      const p=state.current;
      const dx=p.x+s/2-e.clientX, dy=p.y+s/2-e.clientY;
      const dist=Math.sqrt(dx*dx+dy*dy);
      if(dist<140){const f=(140-dist)/140*.04;p.ax+=(dx/dist)*f;p.ay+=(dy/dist)*f;}
    };
    window.addEventListener("mousemove",onMove);
    const tick=()=>{
      const p=state.current;
      if(hovering.current){
        raf.current=requestAnimationFrame(tick);
        return;
      }
      const vw=window.innerWidth-(chatOpen?320:0), vh=window.innerHeight-bottomPad;
      p.vx+=p.ax;p.vy+=p.ay;p.ax=0;p.ay=0;
      p.vx*=.992;p.vy*=.992;
      const spd=Math.sqrt(p.vx*p.vx+p.vy*p.vy);
      if(spd>.45){p.vx=p.vx/spd*.45;p.vy=p.vy/spd*.45;}
      if(spd<.02){p.vx+=(Math.random()-.5)*.02;p.vy+=(Math.random()-.5)*.02;}
      p.x+=p.vx;p.y+=p.vy;
      const minY=100;
      if(p.x<0){p.x=0;p.vx=Math.abs(p.vx);}
      if(p.x>vw-s){p.x=vw-s;p.vx=-Math.abs(p.vx);}
      if(p.y<minY){p.y=minY;p.vy=Math.abs(p.vy);}
      if(p.y>vh-s-28){p.y=vh-s-28;p.vy=-Math.abs(p.vy);}
      if(el.current) el.current.style.transform=`translate(${p.x}px,${p.y}px)`;
      raf.current=requestAnimationFrame(tick);
    };
    const delay=setTimeout(()=>{raf.current=requestAnimationFrame(tick);},index*100);
    return()=>{clearTimeout(delay);cancelAnimationFrame(raf.current);window.removeEventListener("mousemove",onMove);};
  },[entry.size,index,chatOpen,bottomPad]);

  const fs=entry.size>118?13:11;
  return (
    <div ref={el} className="bub-wrap"
      style={{'--ix':ix,'--iy':iy,animationDelay:`${index*0.12}s`,position:"absolute",left:0,top:0}}>
      <div className="bub"
        onClick={()=>!dimmed&&onClick(entry)}
        onMouseEnter={e=>{hovering.current=true;!dimmed&&onHover(entry,e);}}
        onMouseLeave={()=>{hovering.current=false;onHover(null,null);}}
        style={{
          width:entry.size, height:entry.size,
          background:`radial-gradient(circle at 35% 28%, ${pal.bg}cc, ${pal.bg}aa)`,
          boxShadow:`0 10px 30px ${pal.bg}48, 0 2px 8px ${pal.bg}30, inset 0 1px 1px rgba(255,255,255,.14)`,
          opacity:dimmed?.12:1,
          filter:dimmed?"saturate(0.15) blur(1px)":"none",
          cursor:dimmed?"default":"pointer",
          zIndex:dimmed?1:3,
        }}>
        <div className="bub-ring" style={{borderColor:pal.ring}}/>
        <div className="bub-inner">
          <span className="bub-emoji" style={{fontSize:entry.size>115?22:17}}>{entry.emoji}</span>
          <span className="bub-label" style={{fontSize:fs,maxWidth:entry.size*.72}}>{entry.label}</span>
          {entry.size>105&&<span className="bub-person">{entry.person.split(" ").slice(0,2).join(" ")}</span>}
        </div>
        {!dimmed&&<div className="bub-likes">❤ {entry.likes}</div>}
      </div>
    </div>
  );
}

// ── Tooltip ───────────────────────────────────────────────────────────────────
function Tooltip({ entry, pos }) {
  if(!entry||!pos) return null;
  const x=Math.min(pos.x+18, window.innerWidth-248);
  const y=Math.min(pos.y-16, window.innerHeight-145);
  return (
    <div className="tooltip" style={{left:x,top:y}}>
      <div className="tooltip-type">{entry.type}</div>
      <div className="tooltip-quote">"{entry.quote.slice(0,85)}{entry.quote.length>85?"…":""}"</div>
      <div className="tooltip-meta">{entry.person} · {entry.culture}</div>
      <div className="tooltip-hint">click to read →</div>
    </div>
  );
}

// ── Local scrapbook (TypeScript: ../lib/scrapbookGenerator + sceneImageGenerator) ──

const SB_GEN_STEPS = [
  "Reading this archive entry…",
  "Extracting people, places, objects…",
  "Ordering five real moments…",
  "Painting scene 1…",
  "Painting scene 2…",
  "Painting scene 3…",
  "Painting scene 4…",
  "Painting scene 5…",
];

const EMOTION_COLORS = {
  warmth:"#d4845a", joy:"#c9a030", wonder:"#4a9e8a", longing:"#5a82c4",
  grief:"#8a8aaa", pride:"#5aaa78", tenderness:"#c46898", resilience:"#8a6a3a",
  gratitude:"#6a9a6a", love:"#c46898", nostalgia:"#a07850", hope:"#5aaa78", bittersweet:"#a07868",
  fear:"#8a7a90", loss:"#9a9490"
};

function scrapbookEntryFromBubble(entry) {
  return {
    title: entry.title,
    story: entry.story,
    person: entry.person,
    place: entry.place,
    culture: entry.culture,
  };
}

/** Hardcoded art for the 8 seed bubbles (ids 1–8). User-submitted entries use canvas fallback. */
function getSeedStoryScrapbookImageUrl(entryId) {
  if (entryId >= 1 && entryId <= 8) return `/stories/story-${entryId}.svg`;
  return null;
}

function formatScrapbookVisualBlock(vd) {
  if (!vd || typeof vd !== "object") return null;
  const lines = [
    vd.characters?.length ? `Who: ${vd.characters.join(", ")}` : null,
    vd.setting ? `Where: ${vd.setting}` : null,
    vd.importantObjects?.length ? `Objects: ${vd.importantObjects.join(", ")}` : null,
    vd.lighting ? `Light: ${vd.lighting}` : null,
    vd.colorPalette ? `Palette: ${vd.colorPalette}` : null,
  ].filter(Boolean);
  return lines.length ? lines.join(" · ") : null;
}

// ── Scrapbook Component (100% local — ../lib/scrapbookGenerator.ts) ───────────
function Scrapbook({ entry, onClose }) {
  const [pages, setPages] = useState([]);
  const [signalsLine, setSignalsLine] = useState("");
  const [current, setCurrent] = useState(0);
  const [genStep, setGenStep] = useState(0);
  const [done, setDone] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const autoRef = useRef(null);
  const pal = PALETTES[entry.p % PALETTES.length];

  useEffect(() => {
    setPages([]);
    setDone(false);
    setGenStep(0);
    const id = requestAnimationFrame(() => {
      try {
        const arc = scrapbookEntryFromBubble(entry);
        setSignalsLine(formatSignalsLine(extractStorySignals(arc)));
        const plan = generateScrapbookPages(arc);
        setGenStep(8);
        const seedArt = getSeedStoryScrapbookImageUrl(entry.id);
        const built = plan.map((p) => ({
          ...p,
          imageUrl: seedArt || generateSceneImageDataUrl(p, arc),
        }));
        setPages(built);
        setDone(true);
        setCurrent(0);
        setTimeout(() => setAutoPlay(true), 500);
      } catch (e) {
        console.error("Scrapbook:", e);
        setDone(true);
      }
    });
    return () => cancelAnimationFrame(id);
  }, [entry.id]);

  useEffect(() => {
    if (autoPlay && done && pages.length > 0) {
      autoRef.current = setInterval(() => {
        setCurrent(c => {
          if (c >= pages.length - 1) { setAutoPlay(false); return c; }
          return c + 1;
        });
      }, 4200);
    }
    return () => clearInterval(autoRef.current);
  }, [autoPlay, done, pages.length]);

  const goTo = i => { setCurrent(i); setAutoPlay(false); };
  const page = pages[current];
  const emoKey = page?.visualDetails?.emotion ? String(page.visualDetails.emotion).toLowerCase() : "";
  const emoColor = page ? (EMOTION_COLORS[emoKey] || pal.bg) : pal.bg;
  const progressPct = done ? 100 : pages.length ? 85 : 40;

  return (
    <div className="sb-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sb-modal">

        <div className="sb-head" style={{ background:`linear-gradient(135deg,${pal.bg}15,transparent)` }}>
          <div className="sb-head-left">
            <div className="sb-title">✦ Memory Scrapbook</div>
            <div className="sb-sub">{entry.title} · {entry.person}</div>
          </div>
          <button type="button" className="sb-close" onClick={onClose}>✕</button>
        </div>

        {signalsLine && (
          <div className="sb-analysis">{signalsLine}</div>
        )}
        <div className="sb-analysis" style={{background:"rgba(90,130,196,.06)",borderBottom:"1px solid var(--border)"}}>
          {getSeedStoryScrapbookImageUrl(entry.id)
            ? "Art is fixed for this archive story; captions are parsed from your text on-device."
            : "Generated on your device from this story&apos;s text — no AI API calls."}
        </div>

        <div style={{height:2,background:"var(--border)",position:"relative"}}>
          <div style={{position:"absolute",left:0,top:0,height:"100%",background:pal.bg,
            width:`${Math.min(100, progressPct)}%`,transition:"width .6s ease"}}/>
        </div>

        {pages.length === 0 ? (
          <div className="sb-generating">
            <div className="sb-gen-ring" style={{borderTopColor:pal.bg}}/>
            <div className="sb-gen-title" style={{fontStyle:"italic"}}>
              Weaving {entry.person.split(" ")[0]}&apos;s story into five scenes…
            </div>
            <div className="sb-gen-sub">
              {getSeedStoryScrapbookImageUrl(entry.id)
                ? "Loading story art and parsing five moments from the text…"
                : "Parsing sentences, scoring moments, and painting canvas frames locally."}
            </div>
            <div className="sb-gen-steps">
              {SB_GEN_STEPS.map((s, i) => (
                <div key={s} className={`sb-gen-step ${i < genStep ? "ok":""}`} style={{animationDelay:`${i*.2}s`}}>
                  <div className="sb-gen-step-d"/>
                  <span style={{opacity: i < genStep ? 1 : 0.2}}>{s}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="sb-book" style={{background:`linear-gradient(180deg,${emoColor}0e,transparent)`}}>
              <div className="sb-pages" style={{transform:`translateX(-${current*100}%)`}}>
                {pages.map((pg, i) => (
                  <div key={i} className="sb-page">
                    <div className="sb-scene-art" style={{background:`linear-gradient(160deg,${pal.bg}12,#f5ede008)`}}>
                      {pg.imageUrl ? (
                        <img
                          alt=""
                          src={pg.imageUrl}
                          style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}
                        />
                      ) : (
                        <div className="sb-scene-fallback">
                          <div className="sb-fallback-frame">
                            <div className="sb-fallback-label">Scene</div>
                            <p className="sb-fallback-details">{formatScrapbookVisualBlock(pg.visualDetails) || pg.caption}</p>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="sb-page-caption">
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6,flexWrap:"wrap",gap:6}}>
                        <span className="sb-page-num">Page {i+1} of {pages.length}</span>
                        <span style={{fontSize:9,letterSpacing:".12em",textTransform:"uppercase",color:pal.bg}}>{pg.sceneType}</span>
                        {pg.visualDetails?.emotion && (
                          <span style={{
                            fontSize:9,letterSpacing:".1em",textTransform:"uppercase",
                            color:EMOTION_COLORS[String(pg.visualDetails.emotion).toLowerCase()]||pal.bg,
                            background:(EMOTION_COLORS[String(pg.visualDetails.emotion).toLowerCase()]||pal.bg)+"1a",
                            border:`1px solid ${(EMOTION_COLORS[String(pg.visualDetails.emotion).toLowerCase()]||pal.bg)}35`,
                            padding:"2px 8px",borderRadius:100
                          }}>{pg.visualDetails.emotion}</span>
                        )}
                      </div>
                      <div className="sb-page-moment">{pg.sceneTitle}</div>
                      <div className="sb-page-detail">{pg.caption}</div>
                      {formatScrapbookVisualBlock(pg.visualDetails) && (
                        <div className="sb-page-visual">{formatScrapbookVisualBlock(pg.visualDetails)}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="sb-controls">
              <button type="button" className="sb-nav-btn" onClick={()=>goTo(Math.max(0,current-1))} disabled={current===0}>←</button>
              <div className="sb-dots">
                {pages.map((_,i)=>(
                  <div key={i} className={`sb-dot ${i===current?"on":""}`}
                    onClick={()=>goTo(i)}
                    style={i===current?{background:emoColor}:{opacity:1}}/>
                ))}
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                {done && (
                  <button type="button" className={`sb-auto-btn ${autoPlay?"playing":""}`}
                    onClick={()=>setAutoPlay(a=>!a)} style={autoPlay?{color:emoColor}:{}}>
                    {autoPlay?"⏸ Pause":"▶ Play"}
                  </button>
                )}
                <button type="button" className="sb-nav-btn"
                  onClick={()=>goTo(Math.min(pages.length-1,current+1))}
                  disabled={current>=pages.length-1}>→</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}



// ── Story Modal ───────────────────────────────────────────────────────────────
function StoryModal({ entry, entries, likes, onLike, onClose, onShareInChat, onOpenRelated }) {
  if(!entry) return null;
  const pal=PALETTES[entry.p%PALETTES.length];
  const liked=likes[entry.id];
  const total=(entry.likes||0)+(liked?1:0);
  const related=entries.filter(e=>e.id!==entry.id&&e.themes.some(t=>entry.themes.includes(t))).slice(0,4);
  const [showScrapbook, setShowScrapbook] = useState(false);
  // SVG pattern for hero
  const pat=`<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'><circle cx='20' cy='20' r='1.5' fill='${pal.bg}'/><circle cx='0' cy='0' r='1' fill='${pal.bg}'/><circle cx='40' cy='40' r='1' fill='${pal.bg}'/></svg>`;
  return (
    <>
    {showScrapbook && <Scrapbook entry={entry} onClose={() => setShowScrapbook(false)} />}
    <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="smodal">
        <div className="smhero" style={{background:`linear-gradient(135deg,${pal.bg}28,${pal.bg}12)`}}>
          <div className="smhero-pattern" style={{backgroundImage:`url("data:image/svg+xml,${encodeURIComponent(pat)}")`,backgroundSize:"40px"}}/>
          <div className="smhero-ov"/>
          <button className="sm-close" onClick={onClose}>✕</button>
          <div className="smhero-content">
            <span className="sm-chip" style={{background:pal.bg+"14",color:pal.bg,border:`1px solid ${pal.bg}30`}}>{entry.emoji} {entry.type}</span>
            <h2 className="sm-title">{entry.title}</h2>
            <div className="sm-meta">{entry.person} · {entry.place} · {entry.culture}</div>
          </div>
        </div>
        <div className="sm-actions">
          <button className={`sm-act-btn ${liked?"liked":""}`} onClick={()=>onLike(entry.id)}>
            <span className="h-icon">{liked?"❤️":"🤍"}</span>{total} hearts
          </button>
          <button className="sm-act-btn" style={{background:"#f5f0e8",border:"1px solid #e0d8cc",color:"#3a3530",fontWeight:500}} onClick={() => setShowScrapbook(true)}>✦ AI Scrapbook</button>
          <button className="sm-act-btn" onClick={()=>{onShareInChat(entry);onClose();}}>💬 Community</button>
          <button className="sm-act-btn" onClick={()=>navigator.clipboard?.writeText(entry.quote)}>📋 Quote</button>
        </div>
        <div className="smbody">
          {entry.videoUrl && (
            <>
              <div className="sm-sec">Preserved video</div>
              <div className="sm-video-wrap">
                <video className="sm-video" controls playsInline src={entry.videoUrl}/>
              </div>
              <p className="sm-video-note">Saved with this entry in your browser for this session. Re-upload anytime you preserve a new story.</p>
            </>
          )}
          <blockquote className="sm-quote">"{entry.quote}"</blockquote>
          <div className="sm-sec">The Story</div>
          <div className="sm-text">{entry.story.split("\n\n").map((p,i)=><p key={i}>{p}</p>)}</div>
          <div className="sm-sec">Themes</div>
          <div className="tags">{entry.themes.map(t=><span key={t} className="tag" style={tagStyle(t)}>{t}</span>)}</div>
          <div className="sm-sec">Why This Story Matters</div>
          <p className="sm-sig">{entry.significance}</p>
          <div className="sm-sec">Reflect</div>
          <ul className="sm-rq">{entry.reflections.map((q,i)=><li key={i}>{q}</li>)}</ul>
          {related.length>0&&(<>
            <div className="sm-sec">Related Stories</div>
            <div className="sm-related-row">
              {related.map(r=>(
                <div key={r.id} className="sm-rel-card" onClick={()=>onOpenRelated(r)}>
                  <div className="sm-rel-emoji">{r.emoji}</div>
                  <div className="sm-rel-label">{r.label}</div>
                  <div className="sm-rel-person">{r.person.split(" ")[0]}</div>
                </div>
              ))}
            </div>
          </>)}
        </div>
      </div>
    </div>
    </>
  );
}

const MIN_STORY_CHARS = 30;

// ── Add Modal ─────────────────────────────────────────────────────────────────
function AddModal({ onClose, onSubmit }) {
  const [f,setF]=useState({name:"",culture:"",place:"",type:"Family Memory",story:""});
  const [videoPreviewUrl, setVideoPreviewUrl] = useState(null);
  const s=(k,v)=>setF(p=>({...p,[k]:v}));

  const revokeVideo = () => {
    setVideoPreviewUrl(u => {
      if (u) URL.revokeObjectURL(u);
      return null;
    });
  };

  useEffect(() => () => {
    setVideoPreviewUrl(u => {
      if (u) URL.revokeObjectURL(u);
      return null;
    });
  }, []);

  const onVideoPick = e => {
    const file = e.target.files?.[0];
    revokeVideo();
    if (file && file.type.startsWith("video/")) {
      const url = URL.createObjectURL(file);
      setVideoPreviewUrl(url);
      setF(p => ({ ...p, videoFile: file, videoName: file.name }));
    } else {
      setF(p => {
        const next = { ...p };
        delete next.videoFile;
        delete next.videoName;
        return next;
      });
    }
    e.target.value = "";
  };

  const clearVideo = () => {
    revokeVideo();
    setF(p => {
      const next = { ...p };
      delete next.videoFile;
      delete next.videoName;
      return next;
    });
  };

  const storyLen = f.story.trim().length;
  const ok = Boolean(f.name.trim()) && storyLen >= MIN_STORY_CHARS;
  const handlePreserve = () => {
    onSubmit({ ...f, videoUrl: videoPreviewUrl || undefined });
    setVideoPreviewUrl(null);
  };

  const handleClose = () => {
    revokeVideo();
    onClose();
  };

  return (
    <div className="overlay" onClick={e=>e.target===e.currentTarget&&handleClose()}>
      <div className="amodal">
        <div className="ahead"><h2 className="a-title">Preserve a Story</h2><p className="a-sub">Your words become a living part of this archive.</p></div>
        <div className="abody">
          <div className="agrid">
            <div className="afield"><label className="alabel">Storyteller *</label><input className="ainput" value={f.name} onChange={e=>s("name",e.target.value)} placeholder="e.g. Maria Santos" autoFocus/></div>
            <div className="afield"><label className="alabel">Story Type</label><select className="aselect" value={f.type} onChange={e=>s("type",e.target.value)}>{TYPE_OPTS.map(t=><option key={t}>{t}</option>)}</select></div>
            <div className="afield"><label className="alabel">Culture / Heritage</label><input className="ainput" value={f.culture} onChange={e=>s("culture",e.target.value)} placeholder="e.g. Sichuan Chinese"/></div>
            <div className="afield"><label className="alabel">Place</label><input className="ainput" value={f.place} onChange={e=>s("place",e.target.value)} placeholder="e.g. Lahore → London"/></div>
          </div>
          <div className="afield"><label className="alabel">The Story *</label><textarea className="atextarea" value={f.story} onChange={e=>s("story",e.target.value)} placeholder="Write it exactly as you remember it. Raw is beautiful. There is no wrong way to tell a true story..."/>
            <div className="astory-meta">
              <span className="alabel" style={{margin:0}}>Name + story required</span>
              <span className={`astory-count ${storyLen < MIN_STORY_CHARS ? "warn" : ""}`}>{storyLen} / {MIN_STORY_CHARS} characters</span>
            </div>
          </div>
          <div className="afield">
            <label className="alabel">Preserve a video (optional)</label>
            <input type="file" accept="video/*" className="ainput avideo-file" onChange={onVideoPick}/>
            <p className="avideo-hint">Attach a short clip — a gathering, a place, a voice memo with visuals. Stored in this browser session only.</p>
            {videoPreviewUrl && (
              <div>
                <video className="avideo-preview" controls playsInline src={videoPreviewUrl}/>
                <button type="button" className="abtn" style={{marginTop:8}} onClick={clearVideo}>Remove video</button>
              </div>
            )}
          </div>
          <div className="abtnrow">
            <button type="button" className="abtn" onClick={handleClose}>Cancel</button>
            <button type="button" className="abtn go" disabled={!ok} onClick={handlePreserve}>Preserve this story ✦</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadModal({ step }) {
  return (
    <div className="overlay"><div className="lmodal">
      <div className="lring"/>
      <div className="l-title">The archive is listening…</div>
      <p className="l-sub">Your story is being woven into the constellation.</p>
      <div className="lsteps">{LOAD_MSGS.map((m,i)=>(
        <div key={i} className={`lstep ${i<step?"ok":""}`} style={{animationDelay:`${i*.8}s`}}>
          <div className="lstep-d"/><span style={{opacity:i<step?1:.25}}>{m}</span>
        </div>
      ))}</div>
    </div></div>
  );
}

// ── Chat Panel ────────────────────────────────────────────────────────────────
const MEMBERS=[
  {name:"Mei-Ling",color:"#d4845a",online:true},{name:"Yusuf",color:"#4a9e8a",online:true},
  {name:"Priya",color:"#c46898",online:false},{name:"Amara",color:"#c9a030",online:true},
  {name:"Haruko",color:"#5a82c4",online:false},{name:"Carlos",color:"#5aaa78",online:true},
  {name:"Fatima",color:"#a0724a",online:false},{name:"James",color:"#8a68c4",online:false},
];

function ChatPanel({ open, onClose, msgs, onSend, unlocked, onUnlock, onOpenStory, myName, myColor }) {
  const [draft,setDraft]=useState("");
  const bottomRef=useRef(null);
  useEffect(()=>{if(open)bottomRef.current?.scrollIntoView({behavior:"smooth"});},[msgs,open]);
  const send=()=>{const t=draft.trim();if(!t)return;onSend(t);setDraft("");};
  const onKey=e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}};
  return (
    <div className={`chat-panel ${open?"open":""}`}>
      <div className="chat-head">
        <div className="chat-head-left">
          <div className="chat-head-title">Community</div>
          <div className="chat-head-sub">{MEMBERS.filter(m=>m.online).length} online · {msgs.length} messages</div>
        </div>
        <button className="chat-close" onClick={onClose}>✕</button>
      </div>
      {!unlocked?(
        <div className="chat-locked">
          <div className="lock-icon">🔒</div>
          <div className="lock-title">Community Chat</div>
          <p className="lock-sub">Preserve a story to join the conversation. The chat unlocks for everyone who has contributed to the archive.</p>
          <button className="lock-btn" onClick={onUnlock}>Preserve a Story to Join</button>
        </div>
      ):(
        <>
          <div className="members-bar">
            {MEMBERS.map(m=><div key={m.name} className="member-av" data-online={m.online||undefined} style={{background:m.color}} title={m.name}>{initials(m.name)}</div>)}
            <span className="members-more">+{msgs.length} msgs</span>
          </div>
          <div className="chat-messages">
            {msgs.map(msg=>{
              const mine=msg.author===myName;
              return (
                <div key={msg.id} className={`msg ${mine?"mine":""}`}>
                  {!mine&&<div className="msg-av" style={{background:msg.color}}>{initials(msg.author)}</div>}
                  <div className="msg-body">
                    {!mine&&<span className="msg-name">{msg.author}</span>}
                    <div className="msg-bubble">{msg.text}</div>
                    {msg.storyRef&&<div className="msg-story-ref" onClick={()=>onOpenStory(msg.storyRef.id)}>📖 {msg.storyRef.label}</div>}
                    <span className="msg-time">{fmtTime(msg.time)}</span>
                  </div>
                  {mine&&<div className="msg-av" style={{background:myColor}}>{initials(myName)}</div>}
                </div>
              );
            })}
            <div ref={bottomRef}/>
          </div>
          <div className="chat-input-wrap">
            <textarea className="chat-input" rows={1} value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={onKey} placeholder="Share a thought…"/>
            <button className="chat-send" disabled={!draft.trim()} onClick={send}>↑</button>
          </div>
        </>
      )}
    </div>
  );
}

// ── AI (optional) + local fallback when no API key / network error ────────────
const STOP_LABEL = new Set(["the","a","an","i","we","it","my","our","your","this","that","these","those","and","or","but","in","on","at","to","for","of","is","was","were","are","be","been","have","has","had","not","no","so","if","when","than","then","into","as","by","with","from","there","here","they","he","she","me","us","them","what","which","who"]);

function inferThemesFromText(text) {
  const t = text.toLowerCase();
  const out = [];
  const add = x => { if (!out.includes(x)) out.push(x); };
  if (/food|cook|eat|recipe|kitchen|meal|bread|soup|dumpling|rice|oil|ginger|flour/.test(t)) add("food");
  if (/leave|left|border|journey|train|walk|migration|country|road|suitcase|factory|night|fled|arriv/.test(t)) add("migration");
  if (/grandmother|grandfather|mother|father|parent|child|daughter|son|family|uncle|aunt|cousin|wedding|bride/.test(t)) add("family");
  if (/remember|memory|forgot|childhood|young|age eight|years ago|when i was/.test(t)) add("memory");
  if (/song|sing|language|word|voice|record|lullaby|speak/.test(t)) add("language");
  if (/festival|celebrat|lantern|drum|dance|feast|homowo/.test(t)) add("celebration");
  if (/river|water|forest|sky|sea|ocean|village|nature|earth|tree|amazon|dam|fish/.test(t)) add("nature");
  if (/temple|ritual|pray|ancestor|legend|spirit|tradition|ceremon/.test(t)) add("tradition");
  if (/die|died|death|loss|lost|gone|grief|last time|never again/.test(t)) add("loss");
  if (/hard|survive|endure|still here|carry on|resilien|despite/.test(t)) add("resilience");
  if (/who i am|identity|belong|name|heritage|culture|home meant/.test(t)) add("identity");
  if (/history|war|camp|year \d{4}|letter/.test(t)) add("history");
  if (/myth|legend|elder|told us|story passed/.test(t)) add("mythology");
  for (const fb of ["memory","family","tradition","identity"]) {
    if (out.length >= 4) break;
    add(fb);
  }
  return out.slice(0, 4);
}

function pickEmojiForStory(text, storyType) {
  const t = text.toLowerCase();
  const ty = (storyType || "").toLowerCase();
  if (/food|recipe|cook|kitchen|meal|eat|dumpling|soup|rice|bread/.test(t) || /recipe|food/.test(ty)) return "🍲";
  if (/river|water|ocean|sea|rain|fish|boat|amazon|dam/.test(t)) return "🌊";
  if (/train|journey|walk|road|leave|border|migration|suitcase/.test(t) || /migration/.test(ty)) return "🚶";
  if (/wedding|marry|bride|trunk|dress|vow/.test(t)) return "💒";
  if (/festival|lantern|drum|dance|celebrat|light/.test(t) || /celebration/.test(ty)) return "🪔";
  if (/song|sing|music|voice|record|language|lullaby|word/.test(t) || /language|song/.test(ty)) return "🎵";
  if (/letter|write|burn|unsent|paper|mail/.test(t)) return "✉️";
  if (/legend|star|sky|night|spirit|temple/.test(t) || /legend|myth|village/.test(ty)) return "✨";
  return "📖";
}

/** Same JSON shape as `transformStory` — works fully offline. */
function buildArchiveEntryFromForm(form) {
  const raw = (form.story || "").trim();
  const first = raw.split(/(?<=[.!?])\s+/)[0] || raw;
  const words = raw.toLowerCase().replace(/[^a-z\s']/g, " ").split(/\s+/).filter(w => w.length > 2 && !STOP_LABEL.has(w));
  const label = words.slice(0, 3).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") || "New story";
  const tw = raw.replace(/\s+/g, " ").trim().split(/\s+/).slice(0, 9);
  const title = tw.join(" ") + (raw.split(/\s+/).filter(Boolean).length > 9 ? "…" : "");
  const quote = first.length > 160 ? first.slice(0, 157) + "…" : first;
  const firstName = (form.name || "They").split(/\s+/)[0];
  return {
    label: label.length > 32 ? label.slice(0, 29) + "…" : label,
    emoji: pickEmojiForStory(raw, form.type),
    title: title.replace(/[.,;:]+$/, "") || "A story worth keeping",
    quote,
    story: raw,
    themes: inferThemesFromText(raw),
    significance: `A memory offered by ${form.name}${form.culture ? ` (${form.culture})` : ""}${form.place ? `, rooted in ${form.place}` : ""}. It joins the archive as lived history.`,
    reflections: [
      `What detail from ${firstName}'s story stays with you the longest?`,
      `Who else in your life would understand this story without explanation?`,
      `What would you preserve in the same way, if you could?`,
    ],
  };
}

async function transformStory(form) {
  const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,messages:[{role:"user",content:`You are the archivist of "Living Archive." Transform this raw submission into a rich archive entry.\nSTORYTELLER: ${form.name}\nHERITAGE: ${form.culture||"Not specified"}\nPLACE: ${form.place||"Not specified"}\nTYPE: ${form.type}\nRAW STORY:\n${form.story}\nRespond ONLY with valid JSON (no markdown):\n{"label":"Short 2-3 word bubble label","emoji":"One relevant emoji","title":"Poetic title (6-10 words)","quote":"Most powerful line (max 28 words)","story":"Rich 3-paragraph literary retelling. Paragraphs separated by \\n\\n.","themes":["theme1","theme2","theme3","theme4"],"significance":"2-3 sentences on cultural importance.","reflections":["Question 1?","Question 2?","Question 3?"],"lat":0,"lng":0}\n\nInclude "lat" and "lng" as decimal degrees for the PRIMARY geographic anchor of the story (one representative point — city, village, or region center). If the place is ambiguous, infer the most likely coordinates from context.`}]})});
  if(!r.ok) throw new Error("API error");
  const d=await r.json();
  const text = (d.content||[]).map(b=>b.text||"").join("").replace(/```json|```/g,"").trim();
  return JSON.parse(text);
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [entries,setEntries]=useState(SEED);
  const [selected,setSelected]=useState(null);
  const [showAdd,setShowAdd]=useState(false);
  const [loading,setLoading]=useState(false);
  const [loadStep,setLoadStep]=useState(0);
  const [filter,setFilter]=useState(null);
  const [toast,setToast]=useState(null);
  const [chatOpen,setChatOpen]=useState(false);
  const [chatUnlocked,setChatUnlocked]=useState(false);
  const [msgs,setMsgs]=useState(SEED_MSGS);
  const [myName,setMyName]=useState("");
  const [myColor,setMyColor]=useState("#3a1e7a");
  const [newMsgCount,setNewMsgCount]=useState(0);
  const [likes,setLikes]=useState({});
  const [search,setSearch]=useState("");
  const [tooltip,setTooltip]=useState({entry:null,pos:null});
  const [totalHearts,setTotalHearts]=useState(()=>SEED.reduce((s,e)=>s+e.likes,0));
  const [heartsBumped,setHeartsBumped]=useState(false);
  const [bursts,setBursts]=useState([]);
  const bubbleRefs=useRef({});
  const [geoMapView,setGeoMapView]=useState(false);

  useEffect(()=>{
    document.body.classList.toggle("geo-map-on",geoMapView);
    return()=>document.body.classList.remove("geo-map-on");
  },[geoMapView]);

  const canvasBottomPad=28;

  const showToast=msg=>{setToast(msg);setTimeout(()=>setToast(null),3200);};

  // Live heart ticker
  useEffect(()=>{
    const iv=setInterval(()=>{if(Math.random()<.25){setTotalHearts(n=>n+1);setHeartsBumped(true);setTimeout(()=>setHeartsBumped(false),350);}},7000);
    return()=>clearInterval(iv);
  },[]);

  useEffect(()=>{
    if(!loading)return;
    setLoadStep(0);
    const ts=LOAD_MSGS.map((_,i)=>setTimeout(()=>setLoadStep(i+1),i*950));
    return()=>ts.forEach(clearTimeout);
  },[loading]);

  useEffect(()=>{if(!chatOpen&&chatUnlocked)setNewMsgCount(c=>c+1);},[msgs.length]);

  const searchResults=search.trim().length>1?entries.filter(e=>
    e.label.toLowerCase().includes(search.toLowerCase())||
    e.person.toLowerCase().includes(search.toLowerCase())||
    e.culture.toLowerCase().includes(search.toLowerCase())||
    e.themes.some(t=>t.includes(search.toLowerCase()))
  ):[];

  const handleSubmit=async form=>{
    setShowAdd(false);setLoading(true);
    try{
      let parsed;
      try {
        parsed = await transformStory(form);
      } catch (err) {
        console.warn("Archive API unavailable — building entry locally:", err);
        parsed = buildArchiveEntryFromForm(form);
      }
      const idx=entries.length%PALETTES.length;
      let lat = Number(parsed.lat ?? parsed.latitude);
      let lng = Number(parsed.lng ?? parsed.longitude ?? parsed.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        const g = inferCoords(form.place);
        lat = g.lat;
        lng = g.lng;
      }
      const entry={
        ...parsed,id:Date.now(),p:idx,likes:0,person:form.name,place:form.place||"Unknown",culture:form.culture||"Unknown",type:form.type,
        x:8+Math.random()*74,y:15+Math.random()*62,size:100+Math.floor(Math.random()*26),lat,lng,
        ...(form.videoUrl ? { videoUrl: form.videoUrl } : {}),
      };
      await new Promise(r=>setTimeout(r,500));
      setEntries(e=>[...e,entry]);
      setLoading(false);
      // Burst at center
      setBursts(b=>[...b,{id:Date.now(),x:window.innerWidth/2,y:window.innerHeight/2,color:PALETTES[idx].bg}]);
      if(!chatUnlocked){
        setChatUnlocked(true);
        const name=form.name.split(" ")[0];
        setMyName(name);setMyColor(PALETTES[idx].bg);
        setMsgs(m=>[...m,{id:Date.now(),author:name,color:PALETTES[idx].bg,text:`Just shared "${parsed.label}" — glad to be here.`,time:new Date(),storyRef:{label:parsed.label,id:entry.id}}]);
        setChatOpen(true);
      }
      showToast("Story preserved and added to the archive ✦");
    }catch(e){console.error(e);setLoading(false);showToast("Something went wrong — please try again");}
  };

  const handleLike=id=>{
    const wasLiked=likes[id];
    setLikes(l=>({...l,[id]:!wasLiked}));
    setTotalHearts(n=>wasLiked?n-1:n+1);
    if(!wasLiked) setBursts(b=>[...b,{id:Date.now(),x:window.innerWidth/2,y:window.innerHeight/2,color:"#c8623e"}]);
  };

  const pickRandom=()=>{
    const pool=filter?entries.filter(e=>e.themes.includes(filter)):entries;
    setSelected(pool[Math.floor(Math.random()*pool.length)]);
  };

  const sendMsg=text=>setMsgs(m=>[...m,{id:Date.now(),author:myName,color:myColor,text,time:new Date()}]);
  const shareInChat=entry=>{
    if(!chatUnlocked)return;
    setMsgs(m=>[...m,{id:Date.now(),author:myName,color:myColor,text:"I wanted to share this story from the archive:",time:new Date(),storyRef:{label:entry.label,id:entry.id}}]);
    setChatOpen(true);
  };
  const openStoryById=id=>{const e=entries.find(e=>e.id===id);if(e)setSelected(e);};
  const openChat=()=>{setChatOpen(true);setNewMsgCount(0);};
  const refCallback=useCallback(id=>el=>{if(el)bubbleRefs.current[id]=el;},[]);

  // Ticker content
  const tickerItems=[...entries,...entries].map((e,i)=>(
    <span key={i} className="ticker-item">
      {e.emoji} {e.label} <span className="ticker-sep">·</span>
    </span>
  ));

  return (
    <>
      <style>{CSS}</style>
      <ParticleCanvas/>
      <FloatQuotes entries={entries}/>

      <div className={`center-title ${chatOpen?"shifted":""}`}>
        <h1>Living Archive</h1>
        <p>Every bubble is a story. Every story, a life.</p>
        <div><span className="live-tag"><span className="live-pip"/>Live · {entries.length} stories</span></div>
      </div>

      <div className="canvas">
        <Connections entries={entries} bubbleRefs={bubbleRefs}/>
        {entries.map((e,i)=>{
          const dimmed=(filter!==null&&!e.themes.includes(filter))||(search.trim().length>1&&!searchResults.find(r=>r.id===e.id));
          return (
            <div key={e.id} ref={refCallback(e.id)} style={{position:"absolute",left:0,top:0}}>
              <Bubble entry={e} onClick={setSelected}
                onHover={(entry,ev)=>setTooltip(entry?{entry,pos:{x:ev.clientX,y:ev.clientY}}:{entry:null,pos:null})}
                dimmed={dimmed} index={i} chatOpen={chatOpen} bottomPad={canvasBottomPad}/>
            </div>
          );
        })}
      </div>

      {/* Burst effects */}
      {bursts.map(b=><Burst key={b.id} x={b.x} y={b.y} color={b.color} onDone={()=>setBursts(bs=>bs.filter(bx=>bx.id!==b.id))}/>)}

      <nav className="nav">
        <div className="nav-left">
          <div className="nav-pip"/>
          <span className="nav-count">{entries.length} stories · {totalHearts} hearts</span>
        </div>
        <div className="nav-center">
          <span className="search-icon">🔍</span>
          <input className="search-box" value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search stories, cultures, themes…" onBlur={()=>setTimeout(()=>setSearch(""),200)}/>
        </div>
        <div className="nav-right">
          {filter&&<button className="btn" onClick={()=>setFilter(null)}>✕ {filter}</button>}
          <button type="button" className={`btn ${geoMapView?"on":""}`} onClick={()=>setGeoMapView(v=>!v)} title={geoMapView?"Return to the sky view":"Show stories on a world map"}>
            {geoMapView?"🌌 Sky":"🗺️ Map"}
          </button>
          <button className="btn" onClick={pickRandom}>🎲 Random</button>
          <button className="btn primary" onClick={()=>setShowAdd(true)}>+ Preserve</button>
          <button className="btn chat-toggle" onClick={openChat}>
            💬 Community
            {newMsgCount>0&&!chatOpen&&<span className="chat-badge">{newMsgCount>9?"9+":newMsgCount}</span>}
          </button>
        </div>
      </nav>

      <div className="filter">
        <button className={`fpill ${!filter?"on":""}`} onClick={()=>setFilter(null)}>All</button>
        {THEMES_ALL.map(t=>(
          <button key={t} className={`fpill ${filter===t?"on":""}`}
            onClick={()=>setFilter(filter===t?null:t)}
            style={filter===t?{background:TAG_COLORS[t]||"#0f0d0a"}:{}}>{t}</button>
        ))}
      </div>

      {search.trim().length>1&&(
        <div className="search-results">
          {searchResults.length===0?<div className="sr-empty">No stories found for "{search}"</div>
            :searchResults.map(e=>(
              <div key={e.id} className="sr-item" onMouseDown={()=>{setSelected(e);setSearch("");}}>
                <span className="sr-emoji">{e.emoji}</span>
                <div className="sr-info"><div className="sr-label">{e.label}</div><div className="sr-meta">{e.person} · {e.culture}</div></div>
              </div>
            ))}
        </div>
      )}

      <div className="stats-bar">
        <div className="stat-pill">
          <div className="stat-dot"/>
          <span className="stat-text">Hearts</span>
          <span className={`stat-num ${heartsBumped?"bump":""}`}>{totalHearts.toLocaleString()}</span>
        </div>
        <div className="stat-pill">
          <div className="stat-dot" style={{background:"#1e3e7a"}}/>
          <span className="stat-text">Stories</span>
          <span className="stat-num">{entries.length}</span>
        </div>
        <div className="stat-pill">
          <div className="stat-dot" style={{background:"#1a5e38"}}/>
          <span className="stat-text">Online</span>
          <span className="stat-num">{MEMBERS.filter(m=>m.online).length}</span>
        </div>
      </div>

      <div className="hint">
        {geoMapView?(
          <>
            <p>Drag to pan · Scroll to zoom</p>
            <p>Click a bubble to read its story</p>
          </>
        ):(
          <>
            <p>Hover to preview · Click to read</p>
            <p>Move mouse to push bubbles · Map shows where stories belong</p>
          </>
        )}
      </div>

      {geoMapView&&(
        <StoryMap entries={entries} filter={filter} search={search} searchResults={searchResults}
          onPick={setSelected} chatOpen={chatOpen}/>
      )}

      <Tooltip entry={tooltip.entry} pos={tooltip.pos}/>

      {/* Scroll ticker */}
      <div className="ticker" style={{background:"rgba(245,240,232,.92)",backdropFilter:"blur(12px)"}}>
        <div className="ticker-inner">{tickerItems}{tickerItems}</div>
      </div>

      <ChatPanel open={chatOpen} onClose={()=>setChatOpen(false)}
        msgs={msgs} onSend={sendMsg} unlocked={chatUnlocked}
        onUnlock={()=>{setShowAdd(true);setChatOpen(false);}}
        onOpenStory={openStoryById} myName={myName} myColor={myColor}/>

      {selected&&<StoryModal entry={selected} entries={entries} likes={likes}
        onLike={handleLike} onClose={()=>setSelected(null)}
        onShareInChat={shareInChat} onOpenRelated={e=>setSelected(e)}/>}
      {showAdd&&<AddModal onClose={()=>setShowAdd(false)} onSubmit={handleSubmit}/>}
      {loading&&<LoadModal step={loadStep}/>}
      {toast&&<div className="toast"><div className="t-pip"/>{toast}</div>}
    </>
  );
}
