import fs from 'node:fs';import crypto from 'node:crypto';
import {regime,detect,allowNew,mkRow} from '../core.mjs';import {gradeTrade} from '../trade-sim.mjs';import {kl,closed,universe} from './net.mjs';
const cfg=JSON.parse(fs.readFileSync('config.json','utf8')),DD=process.env.DATA_DIR||'data',jp=DD+'/journal.json',now=Date.now();
const J=JSON.parse(fs.readFileSync(jp,'utf8')),log=[];
// 1) nilai sinyal yang masih terbuka
for(const r of J.filter(r=>r.hasil==='menunggu')){
 const bars=closed(await kl(r.aset+'USDT','5m',{start:r.t0,limit:500}),now).filter(q=>q.t>=r.t0-1),g=gradeTrade(r,bars,cfg);
 if(g.hasil!=='menunggu'){r.hasil=g.hasil;r.R=+g.R.toFixed(3);r.tx=g.tx;log.push(`${r.aset} ${r.arah}: ${g.hasil} ${g.R.toFixed(2)}R`)}}
// 2) rezim BTC dan sinyal baru
const h1=closed(await kl('BTCUSDT','1h',{limit:100}),now),reg=regime(h1,cfg),cand=[];
for(const a of await universe(cfg.topN)){
 try{const b=closed(await kl(a+'USDT','15m',{limit:150}),now),L=b.at(-1);
  if(!L||now-L.ct>cfg.maxSignalAgeMin*6e4)continue;
  for(const s of detect(b,reg,cfg))cand.push({a,s,L})}catch(e){log.push(`gagal ${a}: ${e.message}`)}}
cand.sort((x,y)=>y.s.skor-x.s.skor);
const have=new Set(J.map(r=>r.id)),last={};for(const r of J)last[r.aset]=Math.max(last[r.aset]||0,r.t0||0);
let added=0;
for(const {a,s,L} of cand){
 const ok=allowNew(J,now,cfg);if(!ok.ok){log.push('tidak ada sinyal baru: '+ok.why);break}
 const row=mkRow(s,a,L,reg,cfg);
 if(have.has(row.id)||row.t0-(last[a]||0)<cfg.dedupBars*9e5)continue;
 J.push(row);have.add(row.id);last[a]=row.t0;added++;log.push(`SINYAL ${a} ${s.arah} ${s.setup} entry ${s.entry} SL ${s.sl} TP ${s.tp} (${s.riskPct}%)`)}
fs.writeFileSync(jp,JSON.stringify(J));
// 3) laporan
const fin=J.filter(r=>['TP','SL','kedaluwarsa'].includes(r.hasil)),net=r=>+r.R-(cfg.costPct/100)/(Math.abs(r.entry-r.sl)/r.entry);
const tp=fin.filter(r=>r.hasil==='TP').length,sl=fin.filter(r=>r.hasil==='SL').length,m=fin.length?fin.reduce((s,r)=>s+net(r),0)/fin.length:null;
const h=x=>crypto.createHash('sha256').update(fs.readFileSync(x)).digest('hex').slice(0,12);
fs.writeFileSync(DD+'/report.md',`# Mesin scalp ${new Date(now).toISOString()}\n\nRezim BTC: ${reg.st} (spread ${reg.spread.toFixed(2)}%, range24 ${reg.range24.toFixed(1)}%, ATR1h ${reg.atrp.toFixed(2)}%)\nTrade selesai: ${fin.length} (TP ${tp} / SL ${sl}); R/trade bersih ${m==null?'-':m.toFixed(3)}\nTerbuka: ${J.filter(r=>r.hasil==='menunggu').length}; kandidat siklus ini: ${cand.length}; ditambahkan: ${added}\nHash kode: core ${h('core.mjs')} · sim ${h('trade-sim.mjs')} · config ${h('config.json')}\n\n## Log\n${log.map(x=>'- '+x).join('\n')||'- tidak ada kejadian'}\n`);
console.log(`OK rezim=${reg.st} kandidat=${cand.length} baru=${added}`);
