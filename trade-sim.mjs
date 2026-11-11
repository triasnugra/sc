// Penilaian trade pada candle tertutup SETELAH sinyal. Konservatif: jika SL dan TP kena di candle yang sama, SL dihitung lebih dulu.
export function gradeTrade(sig,bars,cfg){
 const s=sig.arah==='LONG'?1:-1,risk=Math.abs(sig.entry-sig.sl);let filled=false,k0=-1;
 for(let i=0;i<bars.length;i++){const q=bars[i];
  if(!filled){
   if(i>=cfg.fillBars)return{hasil:'tidak terisi',R:0,tx:q.t};
   if(s==1?q.l<=sig.entry:q.h>=sig.entry){filled=true;k0=i;if(s==1?q.l<=sig.sl:q.h>=sig.sl)return{hasil:'SL',R:-1,tx:q.t}}
   continue}
  if(s==1?q.l<=sig.sl:q.h>=sig.sl)return{hasil:'SL',R:-1,tx:q.t};
  if(s==1?q.h>=sig.tp:q.l<=sig.tp)return{hasil:'TP',R:Math.abs(sig.tp-sig.entry)/risk,tx:q.t};
  if(i-k0>=cfg.holdBars)return{hasil:'kedaluwarsa',R:s*(q.c-sig.entry)/risk,tx:q.t}}
 return{hasil:'menunggu',R:0,tx:null}}
