/* ═══════════════════════════════════════
   FEATURE 1: REVISÃO DE QUESTÕES ERRADAS
   FEATURE 2: AUDIOBOOK (Web Speech API)
   Auto-injects into Combatente Aprovado SPA
═══════════════════════════════════════ */

(function(){
'use strict';

/* ── REVISÃO: Storage ── */
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

/* ── REVISÃO: Inject menu card ── */
function injectRevisaoCard(){
  const menu=document.querySelector('#home .menu');
  if(!menu||document.getElementById('mc-revisao'))return;
  const card=document.createElement('div');
  card.className='mc';card.id='mc-revisao';
  card.onclick=()=>window.goTo('revisao');
  card.innerHTML=`<div class="mc-accent"></div><div class="mc-ico">❌</div><div class="mc-lbl">Revisão</div><div class="mc-dsc">Questões que você errou</div><div class="mc-badge" id="badge-revisao" style="display:none">0</div>`;
  menu.appendChild(card);
  updateBadgeRevisao();
}

/* ── REVISÃO: Inject screen ── */
function injectRevisaoScreen(){
  if(document.getElementById('revisao'))return;
  const screen=document.createElement('div');
  screen.id='revisao';screen.className='screen';
  screen.innerHTML=`
    <div class="tb"><button class="bk" onclick="goTo('home')">← VOLTAR</button><span class="stitle">REVISÃO DE ERROS</span>
      <div class="tb-right"><span class="tb-streak" id="rev-count"></span></div>
    </div>
    <div class="pad">
      <div id="rev-overview"></div>
      <div id="rev-list"></div>
      <div id="rev-q" style="display:none"></div>
      <div id="rev-score" style="display:none"></div>
    </div>`;
  document.body.insertBefore(screen,document.querySelector('script'));
}

/* ── REVISÃO: Render overview ── */
let revQs=[],revIdx=0,revResults=[];
function renderRevisaoOverview(){
  const erros=getErrosRevisao();
  document.getElementById('rev-count').textContent=erros.length>0?erros.length+' pendentes':'';
  const overview=document.getElementById('rev-overview');
  const list=document.getElementById('rev-list');

  if(!erros.length){
    overview.innerHTML=`<div style="text-align:center;padding:40px 0">
      <div style="font-size:40px;margin-bottom:16px">✅</div>
      <div style="font-family:'Bebas Neue',sans-serif;font-size:24px;color:var(--kh);letter-spacing:2px;margin-bottom:8px">NENHUM ERRO PENDENTE</div>
      <div style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--cr3);line-height:1.7">Continue praticando no Quiz ou Simulado.<br>Questões erradas aparecerão aqui automaticamente.</div>
    </div>`;
    list.innerHTML='';return;
  }

  // Group by matéria
  const byMat={};
  erros.forEach(q=>{const mat=q.materia||q.subtema||'Geral';if(!byMat[mat])byMat[mat]=[];byMat[mat].push(q);});
  const matEntries=Object.entries(byMat).sort((a,b)=>b[1].length-a[1].length);

  overview.innerHTML=`
    <div class="hist-overview" style="grid-template-columns:repeat(2,1fr);margin-bottom:20px">
      <div class="ho-card"><div class="ho-num" style="color:var(--red)">${erros.length}</div><div class="ho-lbl">ERROS PENDENTES</div></div>
      <div class="ho-card"><div class="ho-num">${matEntries.length}</div><div class="ho-lbl">MATÉRIAS</div></div>
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:20px">
      <button class="sbtn" onclick="startRevisao()">REVISAR TUDO (${erros.length})</button>
      <button class="sbtn ghost" onclick="startRevisao(10)">REVISAR 10</button>
      <button class="sbtn ghost" onclick="if(confirm('Limpar todas as questões erradas?')){localStorage.removeItem('ca_erros_revisao');goTo('revisao');}">LIMPAR TUDO</button>
    </div>
    <div class="section-label">ERROS POR MATÉRIA</div>`;

  list.innerHTML=matEntries.map(([mat,qs])=>`
    <div class="mh-row" style="cursor:pointer" onclick="startRevisaoMat('${mat.replace(/'/g,"\\'")}')">
      <div class="mh-top">
        <span class="mh-name">${mat}</span>
        <span class="mh-pct" style="color:var(--red)">${qs.length}</span>
      </div>
      <div class="mh-counts">Clique para revisar apenas ${mat}</div>
    </div>`).join('');
}

/* ── REVISÃO: Start quiz from errors ── */
window.startRevisao=function(limit){
  const erros=getErrosRevisao();
  if(!erros.length){alert('Nenhuma questão para revisar!');return;}
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
  document.getElementById('rev-q').innerHTML=`
    <div class="qprog"><span>REVISÃO ${revIdx+1} / ${revQs.length}</span><span style="color:var(--red)">ERRO ANTERIOR</span></div>
    <div class="qbar"><div class="qfill" style="width:${pct}%;background:var(--red)"></div></div>
    ${q.subtema?`<div class="q-materia-tag">${q.subtema}</div>`:''}
    <div class="qtxt">${q.q}</div>
    <div class="opts">${q.opts.map((o,i)=>`<button class="opt" onclick="ansRevQ(${i})" id="ro${i}"><span class="olet">${'ABCD'[i]}</span><span>${o.replace(/^[A-D]\)\s*/,'')}</span></button>`).join('')}</div>
    <div class="fbk" id="revfbk"><div class="fbk-lei">GABARITO COMENTADO</div>${q.exp}</div>
    <button class="nxt" id="revnxt" onclick="revIdx++;renderRevQ()">PRÓXIMA →</button>`;
}
window.renderRevQ=renderRevQ;

window.ansRevQ=function(i){
  const q=revQs[revIdx];
  document.querySelectorAll('#rev-q .opt').forEach((b,j)=>{
    b.disabled=true;
    if(j===q.correct)b.classList.add('ok');
    else if(j===i)b.classList.add('no');
  });
  const ok=i===q.correct;
  revResults.push({ok,materia:q.materia||q.subtema||'Revisão'});
  if(ok)removerErroRevisao(q); // Acertou -> remove da lista de erros
  document.getElementById('revfbk').style.display='block';
  document.getElementById('revnxt').style.display='inline-block';
};

function showRevScore(){
  const tot=revResults.length,c=revResults.filter(r=>r.ok).length,pct=Math.round(c/tot*100);
  // Record in main history
  if(typeof recordSession==='function')recordSession(revResults,'Revisão de Erros');
  if(typeof updateHomeStats==='function')updateHomeStats();
  document.getElementById('rev-q').style.display='none';
  document.getElementById('rev-score').style.display='block';
  document.getElementById('rev-score').innerHTML=`
    <div class="score-wrap">
      <div class="score-verdict" style="color:${pct>=70?'#8ef5b4':'#f5a0a0'}">${pct>=70?'ERROS CORRIGIDOS':'CONTINUE REVISANDO'}</div>
      <div class="score-num">${pct}%</div>
      <div class="score-sub">${c} DE ${tot} CORRETAS • ${tot-c>0?(tot-c)+' AINDA PENDENTES':'TODOS CORRIGIDOS!'}</div>
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:16px">
        <button class="sbtn" onclick="resetRevisao()">VOLTAR À LISTA</button>
        <button class="sbtn ghost" onclick="goTo('historico')">VER HISTÓRICO</button>
      </div>
    </div>`;
}
window.resetRevisao=function(){
  document.getElementById('rev-score').style.display='none';
  document.getElementById('rev-q').style.display='none';
  document.getElementById('rev-overview').style.display='block';
  document.getElementById('rev-list').style.display='block';
  renderRevisaoOverview();
};

/* ── Hook into existing answer functions to capture errors ── */
function hookAnswerFunctions(){
  // Hook Quiz
  const origAnsQ=window.ansQ;
  if(origAnsQ){
    window.ansQ=function(i){
      origAnsQ(i);
      const q=window.qzQs&&window.qzQs[window.qzIdx-0];
      // qzResults was just pushed, check last entry
      const last=window.qzResults&&window.qzResults[window.qzResults.length-1];
      if(last&&!last.ok&&q)addErroRevisao(q);
    };
  }
  // Hook Simulado
  const origAnsSim=window.ansSimQ;
  if(origAnsSim){
    window.ansSimQ=function(i){
      origAnsSim(i);
      const q=window.simQs&&window.simQs[window.simIdx];
      const last=window.simResults&&window.simResults[window.simResults.length-1];
      if(last&&!last.ok&&q)addErroRevisao(q);
    };
  }
  // Hook Fixação
  const origAnsFix=window.ansFixQ;
  if(origAnsFix){
    window.ansFixQ=function(i){
      origAnsFix(i);
      const q=window.fixQs&&window.fixQs[window.fixIdx];
      const last=window.fixResults&&window.fixResults[window.fixResults.length-1];
      if(last&&!last.ok&&q)addErroRevisao(q);
    };
  }
}

/* ── Hook goTo for revisão screen ── */
function hookNavigation(){
  const origGoTo=window.goTo;
  window.goTo=function(s){
    origGoTo(s);
    if(s==='revisao'){
      document.querySelectorAll('.screen').forEach(x=>x.classList.remove('active'));
      document.getElementById('revisao').classList.add('active');
      renderRevisaoOverview();
    }
    if(s==='home')updateBadgeRevisao();
  };
}

/* ═══════════════════════════════════════
   FEATURE 2: AUDIOBOOK (Web Speech API)
═══════════════════════════════════════ */
let ttsActive=false;

function injectAudioCSS(){
  const style=document.createElement('style');
  style.textContent=`
    .audio-player{display:flex;align-items:center;gap:8px;padding:10px 14px;border:1px solid var(--bd);background:var(--cb2);margin-top:14px;}
    .audio-btn{font-family:'IBM Plex Mono',monospace;font-size:10px;padding:5px 12px;border:1px solid var(--bd);background:transparent;color:var(--cr3);cursor:pointer;transition:.2s;letter-spacing:1px;}
    .audio-btn:hover{border-color:var(--kh);background:rgba(201,184,106,.1);color:var(--kh);}
    .audio-btn.active{border-color:var(--kh);color:var(--kh);background:rgba(201,184,106,.15);}
    .audio-status{font-family:'IBM Plex Mono',monospace;font-size:9px;color:var(--kh3);letter-spacing:1px;flex:1;}
  `;
  document.head.appendChild(style);
}

window.lerEmVozAlta=function(texto){
  if(!window.speechSynthesis){alert('Seu navegador não suporta leitura em voz alta.');return;}
  speechSynthesis.cancel();
  if(!texto||!texto.trim()){alert('Nenhum conteúdo para ler.');return;}
  // Break into chunks for long texts (Chrome has a bug with >~300 chars)
  const chunks=splitTextForTTS(texto);
  ttsActive=true;
  speakChunks(chunks,0);
  updateAudioUI('playing');
};
window.pausarLeitura=function(){speechSynthesis.pause();updateAudioUI('paused');};
window.retomarLeitura=function(){speechSynthesis.resume();updateAudioUI('playing');};
window.pararLeitura=function(){speechSynthesis.cancel();ttsActive=false;updateAudioUI('stopped');};

function splitTextForTTS(text){
  const maxLen=200;
  const sentences=text.replace(/\n/g,'. ').split(/(?<=[.!?])\s+/);
  const chunks=[];let current='';
  sentences.forEach(s=>{
    if((current+' '+s).length>maxLen&&current){chunks.push(current.trim());current=s;}
    else current+=' '+s;
  });
  if(current.trim())chunks.push(current.trim());
  return chunks;
}
function speakChunks(chunks,idx){
  if(idx>=chunks.length||!ttsActive){ttsActive=false;updateAudioUI('stopped');return;}
  const utter=new SpeechSynthesisUtterance(chunks[idx]);
  utter.lang='pt-BR';utter.rate=1.0;
  const voices=speechSynthesis.getVoices().filter(v=>v.lang.startsWith('pt'));
  if(voices.length)utter.voice=voices[0];
  utter.onend=()=>speakChunks(chunks,idx+1);
  utter.onerror=()=>{ttsActive=false;updateAudioUI('stopped');};
  speechSynthesis.speak(utter);
}
function updateAudioUI(state){
  const el=document.getElementById('audio-status');
  if(!el)return;
  const labels={playing:'🔊 REPRODUZINDO...',paused:'⏸️ PAUSADO',stopped:'⏹️ PARADO'};
  el.textContent=labels[state]||'';
}

/* ── Audiobook: Inject player into fixação ── */
function injectAudiobookPlayer(){
  const fixSetup=document.getElementById('fix-setup');
  if(!fixSetup||document.getElementById('audiobook-section'))return;
  const btnGroup=fixSetup.querySelector('button.sbtn');
  if(!btnGroup)return;

  const section=document.createElement('div');
  section.id='audiobook-section';
  section.style.cssText='margin-top:14px;';
  section.innerHTML=`
    <div style="font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:2px;color:var(--kh3);margin-bottom:8px;">AUDIOBOOK</div>
    <button class="sbtn ghost" type="button" style="display:inline-flex;align-items:center;gap:8px;margin-bottom:8px"
      onclick="lerFixacaoEmVoz()">
      🔊 OUVIR MATERIAL EM VOZ ALTA
    </button>
    <div class="audio-player" id="audio-player-fix" style="display:none">
      <button class="audio-btn" onclick="pausarLeitura()">⏸️ PAUSAR</button>
      <button class="audio-btn" onclick="retomarLeitura()">▶️ RETOMAR</button>
      <button class="audio-btn" onclick="pararLeitura()">⏹️ PARAR</button>
      <span class="audio-status" id="audio-status"></span>
    </div>`;
  btnGroup.parentNode.insertBefore(section,btnGroup.nextSibling);
}

window.lerFixacaoEmVoz=function(){
  let texto='';
  if(window.fixTipo==='texto')texto=document.getElementById('fix-texto').value;
  else if(window.fixTipo==='video')texto=document.getElementById('fix-video-texto').value;
  else{alert('Audiobook disponível apenas para conteúdo em texto ou transcrição de vídeo.');return;}
  if(!texto.trim()){alert('Cole o conteúdo primeiro.');return;}
  document.getElementById('audio-player-fix').style.display='flex';
  lerEmVozAlta(texto);
};

/* ── Also inject audio button on quiz/sim feedback ── */
function injectFeedbackAudioBtn(){
  // Add "Ouvir explicação" to feedback boxes when they appear
  const observer=new MutationObserver(()=>{
    document.querySelectorAll('.fbk').forEach(fbk=>{
      if(fbk.style.display!=='none'&&fbk.style.display!==''&&!fbk.querySelector('.audio-fbk-btn')){
        // Only add if visible and not already added
        if(fbk.offsetParent!==null){
          const btn=document.createElement('button');
          btn.className='audio-btn audio-fbk-btn';
          btn.style.cssText='margin-top:10px;';
          btn.textContent='🔊 Ouvir explicação';
          btn.onclick=()=>lerEmVozAlta(fbk.textContent.replace('GABARITO COMENTADO','').replace('🔊 Ouvir explicação',''));
          fbk.appendChild(btn);
        }
      }
    });
  });
  observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['style']});
}

/* ── INIT ── */
function init(){
  // Wait for DOM and existing scripts
  injectAudioCSS();
  injectRevisaoScreen();
  injectRevisaoCard();
  injectAudiobookPlayer();
  hookAnswerFunctions();
  hookNavigation();
  injectFeedbackAudioBtn();
  // Preload voices
  if(window.speechSynthesis)speechSynthesis.getVoices();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
else init();

})();
