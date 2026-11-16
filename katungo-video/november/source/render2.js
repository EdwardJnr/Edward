// node render2.js page.html outdir D [test t1,t2,...]
const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const [,,html,out,D,test]=process.argv;
const b=await chromium.launch();const p=await b.newPage({viewport:{width:1080,height:1920}});
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+html);await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(400);
fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});
const times=test?test.split(',').map(Number):[...Array(Math.round(D*30)).keys()].map(i=>i/30);
for(let i=0;i<times.length;i++){await p.evaluate(t=>window.seek(t),times[i]);
 await p.screenshot({path:`${out}/f${String(i).padStart(4,'0')}.${test?'png':'jpg'}`,type:test?'png':'jpeg',quality:test?undefined:94});}
if(errs.length)console.log('ERR',errs);await b.close();})();
