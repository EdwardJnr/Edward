// Shared helpers, ambient blobs and the logo end card. A reel defines window.REEL={D,E,scene(t)} before this loads.
const cl=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const seg=(t,a,b)=>cl((t-a)/(b-a));
const eo=x=>1-Math.pow(1-x,3), eo5=x=>1-Math.pow(1-x,5), ei=x=>x*x*x;
const eio=x=>x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;
const back=x=>{const c=1.70158,c3=c+1;return 1+c3*Math.pow(x-1,3)+c*Math.pow(x-1,2)};
const $=id=>document.getElementById(id);
const $$=s=>[...document.querySelectorAll(s)];
function show(el,o){if(typeof el==='string')el=$(el);el.style.opacity=o;el.style.visibility=o<=0.001?'hidden':'visible'}
// split text of every [data-words] element into masked words
$$('[data-words]').forEach(el=>{
  const out=[];
  el.childNodes.forEach(n=>{
    if(n.nodeType===3){n.textContent.split(/(\s+)/).forEach(p=>{if(!p)return;out.push(/^\s+$/.test(p)?' ':`<span class="mask"><span class="w">${p}</span></span>`)});}
    else if(n.nodeName==='BR')out.push('<br>');
    else{n.classList.add('w');out.push(`<span class="mask">${n.outerHTML}</span>`);}
  });
  el.innerHTML=out.join('');
});
// words in: start time, stagger, dur, optional out time
function wordsIn(sel,t,start,stagger=0.07,dur=0.5,out=null){
  const ws=typeof sel==='string'?$$(sel+' .w'):sel;
  ws.forEach((w,i)=>{const p=eo5(seg(t,start+i*stagger,start+i*stagger+dur));let y=(1-p)*110,o=p;
    if(out!=null){const q=ei(seg(t,out+i*0.03,out+i*0.03+0.28));y-=q*110;o*=1-q;}
    w.style.transform=`translateY(${y}%)`;w.style.opacity=o;});
}
function fadeUp(id,t,a,b,out=null,dist=30){const el=typeof id==='string'?$(id):id;const p=eo(seg(t,a,b));let o=p,y=(1-p)*dist;
  if(out!=null){const q=seg(t,out,out+0.25);o*=1-q;y-=q*dist}el.style.opacity=o;el.style.transform=`translateY(${y}px)`;}
// ambient blobs + end card markup
document.body.insertAdjacentHTML('afterbegin',`
<div id="b1" class="blob" style="width:1300px;height:1300px;background:radial-gradient(circle,rgba(47,215,154,.5),rgba(47,215,154,0) 65%)"></div>
<div id="b2" class="blob" style="width:1200px;height:1200px;background:radial-gradient(circle,rgba(15,76,58,.28),rgba(15,76,58,0) 65%)"></div>
<div id="b3" class="blob" style="width:900px;height:900px;background:radial-gradient(circle,rgba(160,240,210,.7),rgba(160,240,210,0) 65%)"></div>`);
document.body.insertAdjacentHTML('beforeend',`
<div id="wipe" class="abs" style="left:540px;top:960px;width:10px;height:10px;border-radius:50%;background:#0F4C3A;transform:translate(-50%,-50%);visibility:hidden"></div>
<div id="END" class="scene" style="visibility:hidden">
  <div id="Dglow" class="blob" style="left:40px;top:560px;width:1000px;height:1000px;background:radial-gradient(circle,rgba(47,215,154,.35),rgba(47,215,154,0) 65%)"></div>
  <div id="Dlogo" class="abs" style="left:70px;top:820px;width:940px;height:226px">
    <img id="Dicon" src="logo_icon.png" class="abs" style="left:0;top:0;width:227px;height:226px">
    <img id="Dword" src="logo_word.png" class="abs" style="left:244px;top:0;width:696px;height:226px">
  </div>
  <div class="abs center" style="top:1150px">
    <div id="Dline" style="margin:0 auto;height:4px;width:0;background:#2FD79A"></div>
    <div id="Dtag" style="margin-top:44px;font-size:60px;font-weight:700;color:#fff;letter-spacing:-.02em">Story to scale.</div>
  </div>
</div>`);
window.seek=function(t){
  const R=window.REEL,c=t*0.6;
  $('b1').style.transform=`translate(${-110+Math.sin(c)*120}px,${300+Math.cos(c*0.8)*140}px)`;
  $('b2').style.transform=`translate(${-60+Math.cos(c*0.7)*140}px,${420+Math.sin(c*0.9)*120}px)`;
  $('b3').style.transform=`translate(${300+Math.sin(c*1.1)*160}px,${1100+Math.cos(c)*120}px)`;
  R.scene(t);
  const E=R.E,wp=eio(seg(t,E-0.3,E+0.15));$('wipe').style.width=$('wipe').style.height=(10+wp*2400)+'px';show('wipe',wp>0?1:0);
  const du=t-E;show('END',du>0?1:0);
  if(du>0){const ic=back(seg(du,0,0.45));$('Dicon').style.transform=`scale(${ic}) rotate(${(1-eo(seg(du,0,0.6)))*-90}deg)`;$('Dicon').style.opacity=seg(du,0,0.12);
    const w=eo5(seg(du,0.25,0.85));$('Dword').style.clipPath=`inset(0 ${(1-w)*100}% 0 0)`;$('Dword').style.transform=`translateX(${(1-w)*-40}px)`;
    $('Dlogo').style.transform=`scale(${1.04-0.04*eo(seg(du,0,R.D-E))})`;
    $('Dline').style.width=(eio(seg(du,0.65,1.05))*300)+'px';fadeUp('Dtag',du,0.8,1.15);
    $('Dglow').style.transform=`scale(${0.9+0.15*seg(du,0,R.D-E)})`;}
};
window.seek(0);
