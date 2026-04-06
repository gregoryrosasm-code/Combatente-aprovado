/* ═══════════════════════════════════════
   FEATURE 1: REVISAO DE QUESTOES ERRADAS
   FEATURE 2: AUDIOBOOK (Web Speech API)
   Auto-injects into Combatente Aprovado SPA
═══════════════════════════════════════ */

(function(){
'use strict';

/* -- REVISAO: Storage -- */
function getErrosRevisao(){
  try{return JSON.parse(localStorage.getItem('ca_erros_revisao')||'[]');}
  catch(e){return [];}
}
function saveErrosRevisao(arr){
  try{localStorage.setItem('ca_erros_revisao',JSON.stringify(arr));}catch(e){}
}
function addErroRevisao(questao){
  const revisao=getErrosRevisao();
  const hash=hashQRevisao(questao.q);
  if(revisao.some(q=>hashQRevisao(q.q)===hash))return;
  revisao.unshift({...questao,addedAt:Date.now()});
  if(revisao.length>150)revisao.length=150;
  saveErrosRevisao(revisao);
  updateBadgeRevisao();
}
function removerErroRevisao(questao){
  let revisao=getErrosRevisao();
  const hash=hashQRevisao(questao.q);
  revisao=revisao.filter(q=>hashQRevisao(q.q)!==hash);
  saveErrosRevisao(revisao);
  updateBadgeRevisao();
}
function hashQRevisao(q){let h=0;for(let i=0;i<Math.min(q.length,80);i++){h=(h<<5)-h+q.charCodeAt(i);h|=0;}return h;}
function updateBadgeRevisao(){
  const badge=document.getElementById('badge-revisao');
  if(badge){const count=getErrosRevisao().length;badge.textContent=count;badge.style.display=count>0?'block':'none';}
}

/* -- REVISAO: Inject menu card into PROGRESSO tab -- */
function injectRevisaoCard(){
  const menu=document.querySelector('#tab-progresso .menu');
  if(!menu||document.getElementById('mc-revisao'))return;
  const card=document.createElement('div');
  card.className='mc';card.id='mc-revisao';
  card.onclick=()=>window.goTo('revisao');
  card.innerHTML='<div class="mc-accent"></div><div class="mc-lbl">Revisao</div><div class="mc-dsc">Questoes que voce errou</div><div class="mc-badge" id="badge-revisao" style="display:none">0</div>';
  menu.appendChild(card);
  updateBadgeRevisao();
}

/* -- REVISAO: Inject screen -- */
function injectRevisaoScreen(){
  if(document.getElementById('revisao'))return;
  const screen=document.createElement('div');
  screen.id='revisao';screen.className='screen';
  screen.innerHTML=
    '<div class="tb"><button class="bk" onclick="goTo(\'home\')">← VOLTAR</button><span class="stitle">REVISAO DE ERROS</span>'+
    '<div class="tb-right"><span class="tb-streak" id="rev-count"></span></div></div>'+
    '<div class="pad"><div id="rev-overview"></div><div id="rev-list"></div>'+
    '<div id="rev-q" style="display:none"></div><div id="rev-score" style="display:none"></div></div>';
  document.body.insertBefore(screen,document.querySelector('script'));
}

/* -- REVISAO: Render overview -- */
let revQs=[],revIdx=0,revResults=[];
function renderRevisaoOverview(){
  const erros=getErrosRevisao();
  document.getElementById('rev-count').textContent=erros.length>0?erros.length+' pendentes':'';
  const overview=document.getElementById('rev-overview');
  const list=document.getElementById('rev-list');

  if(!erros.length){
    overview.innerHTML='<div style="text-align:center;padding:40px 0">'+
      '<div style="font-family:\'Bebas Neue\',sans-serif;font-size:24px;color:var(--kh);letter-spacing:2px;margin-bottom:8px">NENHUM ERRO PENDENTE</div>'+
      '<div style="font-family:\'IBM Plex Mono\',monospace;font-size:11px;color:var(--cr3);line-height:1.7">Continue praticando no Quiz ou Simulado.<br>Questoes erradas aparecerao aqui automaticamente.</div></div>';
    list.innerHTML='';return;
  }

  const byMat={};
  erros.forEach(q=>{const mat=q.materia||q.subtema||'Geral';if(!byMat[mat])byMat[mat]=[];byMat[mat].push(q);});
  const matEntries=Object.entries(byMat).sort((a,b)=>b[1].length-a[1].length);

  overview.innerHTML=
    '<div class="hist-overview" style="grid-template-columns:repeat(2,1fr);margin-bottom:20px">'+
    '<div class="ho-card"><div class="ho-num" style="color:var(--red)">'+erros.length+'</div><div class="ho-lbl">ERROS PENDENTES</div></div>'+
    '<div class="ho-card"><div class="ho-num">'+matEntries.length+'</div><div class="ho-lbl">MATERIAS</div></div></div>'+
    '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:20px">'+
    '<button class="sbtn" onclick="startRevisao()">REVISAR TUDO ('+erros.length+')</button>'+
    '<button class="sbtn ghost" onclick="startRevisao(10)">REVISAR 10</button>'+
    '<button class="sbtn ghost" onclick="if(confirm(\'Limpar todas as questoes erradas?\')){localStorage.removeItem(\'ca_erros_revisao\');goTo(\'revisao\');}">LIMPAR TUDO</button></div>'+
    '<div class="section-label">ERROS POR MATERIA</div>';

  list.innerHTML=matEntries.map(function(entry){
    var mat=entry[0],qs=entry[1];
    return '<div class="mh-row" style="cursor:pointer" onclick="startRevisaoMat(\''+mat.replace(/'/g,"\\'")+'\')">' +
      '<div class="mh-top"><span class="mh-name">'+mat+'</span><span class="mh-pct" style="color:var(--red)">'+qs.length+'</span></div>'+
      '<div class="mh-counts">Clique para revisar apenas '+mat+'</div></div>';
  }).join('');
}

/* -- REVISAO: Start quiz from errors -- */
window.startRevisao=function(limit){
  const erros=getErrosRevisao();
  if(!erros.length){alert('Nenhuma questao para revisar!');return;}
  revQs=limit?erros.slice(0,limit):[...erros];
  revIdx=0;revResults=[];
  document.getElementById('rev-overview').style.display='none';
  document.getElementById('rev-list').style.display='none';
  document.getElementById('rev-q').style.display='block';
  renderRevQ();
};
window.startRevisaoMat=function(mat){
  const erros=getErrosRevisao().filter(q=>(q.materia||q.subtema||'Geral')===mat);
  if(!erros.length)return;
  revQs=[...erros];revIdx=0;revResults=[];
  document.getElementById('rev-overview').style.display='none';
  document.getElementById('rev-list').style.display='none';
  document.getElementById('rev-q').style.display='block';
  renderRevQ();
};

function renderRevQ(){
  if(revIdx>=revQs.length){showRevScore();return;}
  const q=revQs[revIdx],pct=Math.round(revIdx/revQs.length*100);
  document.getElementById('rev-q').innerHTML=
    '<div class="qprog"><span>REVISAO '+( revIdx+1)+' / '+revQs.length+'</span><span style="color:var(--red)">ERRO ANTERIOR</span></div>'+
    '<div class="qbar"><div class="qfill" style="width:'+pct+'%;background:var(--red)"></div></div>'+
    (q.subtema?'<div class="q-materia-tag">'+q.subtema+'</div>':'')+
    '<div class="qtxt">'+q.q+'</div>'+
    '<div class="opts">'+q.opts.map(function(o,i){return '<button class="opt" onclick="ansRevQ('+i+')" id="ro'+i+'"><span class="olet">'+'ABCD'[i]+'</span><span>'+o.replace(/^[A-D]\)\s*/,'')+'</span></button>';}).join('')+'</div>'+
    '<div class="fbk" id="revfbk"><div class="fbk-lei">GABARITO COMENTADO</div>'+q.exp+'</div>'+
    '<button class="nxt" id="revnxt" onclick="revIdx++;renderRevQ()">PROXIMA →</button>';
}
window.renderRevQ=renderRevQ;

window.ansRevQ=function(i){
  const q=revQs[revIdx];
  document.querySelectorAll('#rev-q .opt').forEach(function(b,j){
    b.disabled=true;
    if(j===q.correct)b.classList.add('ok');
    else if(j===i)b.classList.add('no');
  });
  const ok=i===q.correct;
  revResults.push({ok:ok,materia:q.materia||q.subtema||'Revisao'});
  if(ok)removerErroRevisao(q);
  document.getElementById('revfbk').style.display='block';
  document.getElementById('revnxt').style.display='inline-block';
};

function showRevScore(){
  const tot=revResults.length,c=revResults.filter(function(r){return r.ok;}).length,pct=Math.round(c/tot*100);
  if(typeof recordSession==='function')recordSession(revResults,'Revisao de Erros');
  if(typeof updateHomeStats==='function')updateHomeStats();
  document.getElementById('rev-q').style.display='none';
  document.getElementById('rev-score').style.display='block';
  document.getElementById('rev-score').innerHTML=
    '<div class="score-wrap">'+
    '<div class="score-verdict" style="color:'+(pct>=70?'#8ef5b4':'#f5a0a0')+'">'+(pct>=70?'ERROS CORRIGIDOS':'CONTINUE REVISANDO')+'</div>'+
    '<div class="score-num">'+pct+'%</div>'+
    '<div class="score-sub">'+c+' DE '+tot+' CORRETAS - '+(tot-c>0?(tot-c)+' AINDA PENDENTES':'TODOS CORRIGIDOS!')+'</div>'+
    '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:16px">'+
    '<button class="sbtn" onclick="resetRevisao()">VOLTAR A LISTA</button>'+
    '<button class="sbtn ghost" onclick="goTo(\'historico\')">VER HISTORICO</button></div></div>';
}
window.resetRevisao=function(){
  document.getElementById('rev-score').style.display='none';
  document.getElementById('rev-q').style.display='none';
  document.getElementById('rev-overview').style.display='block';
  document.getElementById('rev-list').style.display='block';
  renderRevisaoOverview();
};

/* -- Hook into existing answer functions to capture errors -- */
function hookAnswerFunctions(){
  var origAnsQ=window.ansQ;
  if(origAnsQ){
    window.ansQ=function(i){
      origAnsQ(i);
      var q=window.qzQs&&window.qzQs[window.qzIdx];
      var last=window.qzResults&&window.qzResults[window.qzResults.length-1];
      if(last&&!last.ok&&q)addErroRevisao(q);
    };
  }
  var origAnsSim=window.ansSimQ;
  if(origAnsSim){
    window.ansSimQ=function(i){
      origAnsSim(i);
      var q=window.simQs&&window.simQs[window.simIdx];
      var last=window.simResults&&window.simResults[window.simResults.length-1];
      if(last&&!last.ok&&q)addErroRevisao(q);
    };
  }
  var origAnsFix=window.ansFixQ;
  if(origAnsFix){
    window.ansFixQ=function(i){
      origAnsFix(i);
      var q=window.fixQs&&window.fixQs[window.fixIdx];
      var last=window.fixResults&&window.fixResults[window.fixResults.length-1];
      if(last&&!last.ok&&q)addErroRevisao(q);
    };
  }
}

/* -- Hook goTo for revisao screen + nav-bar visibility -- */
function hookNavigation(){
  var origGoTo=window.goTo;
  window.goTo=function(s){
    origGoTo(s);
    // Show/hide nav-bar
    var nav=document.getElementById('nav-bar');
    if(nav)nav.style.display=s==='home'?'flex':'none';
    if(s==='revisao'){
      document.querySelectorAll('.screen').forEach(function(x){x.classList.remove('active');});
      document.getElementById('revisao').classList.add('active');
      renderRevisaoOverview();
    }
    if(s==='home')updateBadgeRevisao();
  };
}

/* ═══════════════════════════════════════
   FEATURE 2: AUDIOBOOK (Web Speech API)
═══════════════════════════════════════ */
var ttsActive=false;

function injectAudioCSS(){
  var style=document.createElement('style');
  style.textContent=
    '.audio-player{display:flex;align-items:center;gap:8px;padding:10px 14px;border:1px solid var(--bd);background:var(--cb2);margin-top:14px;}'+
    '.audio-btn{font-family:"IBM Plex Mono",monospace;font-size:10px;padding:5px 12px;border:1px solid var(--bd);background:transparent;color:var(--cr3);cursor:pointer;transition:.2s;letter-spacing:1px;}'+
    '.audio-btn:hover{border-color:var(--kh);background:rgba(201,184,106,.1);color:var(--kh);}'+
    '.audio-btn.active{border-color:var(--kh);color:var(--kh);background:rgba(201,184,106,.15);}'+
    '.audio-status{font-family:"IBM Plex Mono",monospace;font-size:9px;color:var(--kh3);letter-spacing:1px;flex:1;}';
  document.head.appendChild(style);
}

window.lerEmVozAlta=function(texto){
  if(!window.speechSynthesis){alert('Seu navegador nao suporta leitura em voz alta.');return;}
  speechSynthesis.cancel();
  if(!texto||!texto.trim()){alert('Nenhum conteudo para ler.');return;}
  var chunks=splitTextForTTS(texto);
  ttsActive=true;
  speakChunks(chunks,0);
  updateAudioUI('playing');
};
window.pausarLeitura=function(){speechSynthesis.pause();updateAudioUI('paused');};
window.retomarLeitura=function(){speechSynthesis.resume();updateAudioUI('playing');};
window.pararLeitura=function(){speechSynthesis.cancel();ttsActive=false;updateAudioUI('stopped');};

function splitTextForTTS(text){
  var maxLen=200;
  var sentences=text.replace(/\n/g,'. ').split(/(?<=[.!?])\s+/);
  var chunks=[],current='';
  sentences.forEach(function(s){
    if((current+' '+s).length>maxLen&&current){chunks.push(current.trim());current=s;}
    else current+=' '+s;
  });
  if(current.trim())chunks.push(current.trim());
  return chunks;
}
function speakChunks(chunks,idx){
  if(idx>=chunks.length||!ttsActive){ttsActive=false;updateAudioUI('stopped');return;}
  var utter=new SpeechSynthesisUtterance(chunks[idx]);
  utter.lang='pt-BR';utter.rate=1.0;
  var voices=speechSynthesis.getVoices().filter(function(v){return v.lang.startsWith('pt');});
  if(voices.length)utter.voice=voices[0];
  utter.onend=function(){speakChunks(chunks,idx+1);};
  utter.onerror=function(){ttsActive=false;updateAudioUI('stopped');};
  speechSynthesis.speak(utter);
}
function updateAudioUI(state){
  var el=document.getElementById('audio-status');
  if(!el)return;
  var labels={playing:'REPRODUZINDO...',paused:'PAUSADO',stopped:'PARADO'};
  el.textContent=labels[state]||'';
}

/* -- Audiobook: Inject player into fixacao -- */
function injectAudiobookPlayer(){
  var fixSetup=document.getElementById('fix-setup');
  if(!fixSetup||document.getElementById('audiobook-section'))return;
  var btnGroup=fixSetup.querySelector('button.sbtn');
  if(!btnGroup)return;

  var section=document.createElement('div');
  section.id='audiobook-section';
  section.style.cssText='margin-top:14px;';
  section.innerHTML=
    '<div style="font-family:\'IBM Plex Mono\',monospace;font-size:10px;letter-spacing:2px;color:var(--kh3);margin-bottom:8px;">AUDIOBOOK</div>'+
    '<button class="sbtn ghost" type="button" style="display:inline-flex;align-items:center;gap:8px;margin-bottom:8px" onclick="lerFixacaoEmVoz()">OUVIR MATERIAL EM VOZ ALTA</button>'+
    '<div class="audio-player" id="audio-player-fix" style="display:none">'+
    '<button class="audio-btn" onclick="pausarLeitura()">PAUSAR</button>'+
    '<button class="audio-btn" onclick="retomarLeitura()">RETOMAR</button>'+
    '<button class="audio-btn" onclick="pararLeitura()">PARAR</button>'+
    '<span class="audio-status" id="audio-status"></span></div>';
  btnGroup.parentNode.insertBefore(section,btnGroup.nextSibling);
}

window.lerFixacaoEmVoz=function(){
  var texto='';
  if(window.fixTipo==='texto')texto=document.getElementById('fix-texto').value;
  else if(window.fixTipo==='video')texto=document.getElementById('fix-video-texto').value;
  else{alert('Audiobook disponivel apenas para conteudo em texto ou transcricao de video.');return;}
  if(!texto.trim()){alert('Cole o conteudo primeiro.');return;}
  document.getElementById('audio-player-fix').style.display='flex';
  lerEmVozAlta(texto);
};

/* -- Also inject audio button on quiz/sim feedback -- */
function injectFeedbackAudioBtn(){
  var observer=new MutationObserver(function(){
    document.querySelectorAll('.fbk').forEach(function(fbk){
      if(fbk.style.display!=='none'&&fbk.style.display!==''&&!fbk.querySelector('.audio-fbk-btn')){
        if(fbk.offsetParent!==null){
          var btn=document.createElement('button');
          btn.className='audio-btn audio-fbk-btn';
          btn.style.cssText='margin-top:10px;';
          btn.textContent='Ouvir explicacao';
          btn.onclick=function(){lerEmVozAlta(fbk.textContent.replace('GABARITO COMENTADO','').replace('Ouvir explicacao',''));};
          fbk.appendChild(btn);
        }
      }
    });
  });
  observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['style']});
}

/* -- INIT -- */
function init(){
  injectAudioCSS();
  injectRevisaoScreen();
  injectRevisaoCard();
  injectAudiobookPlayer();
  hookAnswerFunctions();
  hookNavigation();
  injectFeedbackAudioBtn();
  if(window.speechSynthesis)speechSynthesis.getVoices();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
else init();

})();
