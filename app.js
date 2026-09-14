const app = document.querySelector('#app');

const steps = [
  {
    "title": "Retirez les lunettes",
    "text": "Si elle en porte, retirez doucement ses lunettes. Sinon, passez à l’étape suivante.",
    "tip": "Uniquement si la personne porte des lunettes",
    "kind": "glasses"
  },
  {
    "title": "Alignez les jambes",
    "text": "Rapprochez doucement ses jambes dans l’axe du corps.",
    "tip": "Les deux jambes restent allongées",
    "kind": "align"
  },
  {
    "title": "Placez le bras proche",
    "text": "Placez le bras de votre côté à angle droit, le coude plié et la paume vers le haut.",
    "tip": "La paume regarde le plafond",
    "kind": "nearArm"
  },
  {
    "title": "Placez la main opposée",
    "text": "Amenez le dos de l’autre main contre l’oreille de votre côté. Maintenez ce contact, paume contre paume.",
    "tip": "Cette main sera entre la joue et le sol",
    "kind": "farArm"
  },
  {
    "title": "Relevez le genou opposé",
    "text": "Avec votre main libre, relevez le genou éloigné en le saisissant par-dessous.",
    "tip": "Le pied reste posé au sol ; la main reste contre l’oreille",
    "kind": "knee"
  },
  {
    "title": "Faites rouler vers vous",
    "text": "Tirez doucement le genou vers vous pour tourner la personne sur le côté. Accompagnez la tête avec la main déjà maintenue.",
    "tip": "La main de la victime passe sous sa joue",
    "kind": "roll"
  },
  {
    "title": "Retirez votre main",
    "text": "Retirez doucement votre main sous la tête en maintenant le coude avec votre autre main.",
    "tip": "La main de la victime reste entre sa joue et le sol",
    "kind": "withdraw"
  },
  {
    "title": "Réglez la jambe du dessus",
    "text": "Ajustez la jambe du dessus pour former un angle droit à la hanche et au genou.",
    "tip": "La jambe du dessus stabilise le corps",
    "kind": "leg"
  },
  {
    "title": "Inclinez doucement la tête",
    "text": "Inclinez doucement la tête en arrière pour garder les voies aériennes dégagées.",
    "tip": "La joue reste soutenue par la main",
    "kind": "head"
  },
  {
    "title": "Ouvrez la bouche",
    "text": "Ouvrez doucement la bouche avec le pouce et l’index, sans déplacer la tête.",
    "tip": "La bouche permet aux liquides de s’écouler vers le sol",
    "kind": "mouth"
  },
  {
    "title": "Appelez les secours",
    "text": "Si l’alerte n’a pas encore été donnée, appelez le 112 sur haut-parleur.",
    "tip": "Restez auprès de la personne",
    "kind": "call"
  },
  {
    "title": "Surveillez la respiration",
    "text": "Vérifiez sans interruption que la personne respire normalement.",
    "tip": "Respiration anormale ou absente : passez à la réanimation",
    "kind": "monitor"
  }
];

let stepIndex = 0;
let side = 'gauche';
let voiceEnabled = true;
let timerId = null;
let seconds = 10;

const icon = (name) => ({
  speaker: '🔊', muted: '🔇', person: '●', phone: '☎'
}[name] || '');

function stopSpeech() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

function speak(text) {
  stopSpeech();
  if (!voiceEnabled || !('speechSynthesis' in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'fr-FR';
  utterance.rate = 0.92;
  window.speechSynthesis.speak(utterance);
}

function setScreen(html) {
  stopTimer();
  stopSpeech();
  app.innerHTML = `<section class="screen">${html}</section>`;
  requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'auto' }));
}

function renderStart() {
  setScreen(`
    <p class="eyebrow">Agissez sans attendre</p>
    <h1>La personne réagit-elle&nbsp;?</h1>
    <div class="card">
      <p>Vérifiez que les lieux sont sûrs. Parlez-lui clairement et secouez doucement ses épaules.</p>
      <p class="question">Réagit-elle quand vous lui parlez ou la touchez&nbsp;?</p>
      <div class="actions two">
        <button class="button secondary" data-action="responsive">OUI, ELLE RÉAGIT</button>
        <button class="button danger" data-action="unresponsive">NON, AUCUNE RÉACTION</button>
      </div>
    </div>
    <div class="card warning">
      <strong>Danger immédiat&nbsp;:</strong> appelez le 112. Ne déplacez la personne que si elle est exposée à un danger réel.
    </div>
  `);
}

function renderResponsive() {
  setScreen(`
    <p class="eyebrow">Pas de PLS</p>
    <h1>La personne réagit</h1>
    <div class="card">
      <p>Laissez-la dans la position où elle se sent le mieux. Interrogez-la, surveillez son état et appelez le 15 ou le 112 si nécessaire.</p>
      <button class="button secondary" data-action="restart">RECOMMENCER L’EXAMEN</button>
    </div>
  `);
}

function renderBreathing() {
  seconds = 10;
  setScreen(`
    <p class="eyebrow">Voies aériennes</p>
    <h1>Respire-t-elle normalement&nbsp;?</h1>
    <div class="card">
      <p>Inclinez doucement sa tête en arrière et soulevez son menton. Pendant 10 secondes au maximum&nbsp;: regardez le thorax, écoutez et sentez la respiration.</p>
      <div class="timer" id="timer" aria-live="assertive">10</div>
      <button class="button blue" data-action="timer">LANCER LES 10 SECONDES</button>
      <p class="tiny">Un halètement irrégulier n’est pas une respiration normale.</p>
    </div>
    <p class="question">Au maximum dix secondes. La personne respire-t-elle normalement&nbsp;?</p>
    <div class="actions two">
      <button class="button" data-action="breathing">OUI, ELLE RESPIRE</button>
      <button class="button danger" data-action="not-breathing">NON / JE NE SAIS PAS</button>
    </div>
  `);
}

function startTimer() {
  if (timerId) return;
  const timer = document.querySelector('#timer');
  const button = document.querySelector('[data-action="timer"]');
  timer.classList.add('running');
  button.disabled = true;
  speak('Pendant dix secondes, regardez le thorax, écoutez et sentez la respiration.');
  timerId = setInterval(() => {
    seconds -= 1;
    timer.textContent = seconds;
    if (seconds <= 0) {
      stopTimer();
      timer.classList.remove('running');
      button.textContent = '10 SECONDES ÉCOULÉES';
      speak('Dix secondes. La personne respire-t-elle normalement ?');
    }
  }, 1000);
}

function stopTimer() {
  if (timerId) clearInterval(timerId);
  timerId = null;
}

function renderCPR() {
  setScreen(`
    <p class="eyebrow">Pas de PLS</p>
    <h1>Commencez la réanimation</h1>
    <div class="card warning">
      <p><strong>Appelez immédiatement le 112 sur haut-parleur.</strong></p>
      <ol class="status-list">
        <li>Allongez la personne sur une surface dure.</li>
        <li>Placez vos mains au centre de la poitrine.</li>
        <li>Comprimez fort et vite, en suivant les instructions du 112.</li>
        <li>Demandez qu’on apporte un défibrillateur.</li>
      </ol>
      <a class="button danger" href="tel:112" style="display:grid;place-items:center;text-decoration:none;margin-top:1rem">APPELER LE 112</a>
    </div>
    <button class="button secondary" data-action="restart">RECOMMENCER L’EXAMEN</button>
  `);
  speak('Ne la mettez pas en PLS. Appelez immédiatement le 112 sur haut-parleur et commencez la réanimation.');
}

function diagram(kind, chosenSide = side) {
  const label = steps.find(step => step.kind === kind)?.title || 'Position de départ';
  return `<div class="scene ${chosenSide === 'droite' ? 'mirror' : ''}"><img src="images/${kind}.svg" width="600" height="800" alt="${label} — corps entier et sauveteur vus de dessus"></div>`;
}

function renderSideChoice() {
  setScreen(`<p class="eyebrow">Avant la PLS</p><h1>De quel côté êtes-vous ?</h1>
    <p>Choisissez le côté le plus accessible. Repère : <strong>tête en haut de l’image</strong>.</p>
    <div class="side-choices">
      <button class="side-choice" data-action="choose-left">${diagram('supine','gauche')}<strong>À GAUCHE DE L’IMAGE</strong><span>À droite de la victime</span></button>
      <button class="side-choice" data-action="choose-right">${diagram('supine','droite')}<strong>À DROITE DE L’IMAGE</strong><span>À gauche de la victime</span></button>
    </div><p class="tiny">Le sauveteur porte du bleu. Le même côté sera conservé pendant toute la séquence.</p>`);
}

function renderGuide(announce = true) {
  const step = steps[stepIndex];
  setScreen(`
    <div class="step-head">
      <p class="step-label">Étape ${stepIndex + 1} sur ${steps.length}</p>
      <button class="icon-button" data-action="voice" aria-label="${voiceEnabled ? 'Désactiver' : 'Activer'} la lecture vocale">${icon(voiceEnabled ? 'speaker' : 'muted')}</button>
    </div>
    <div class="progress" aria-label="Progression"><div style="width:${((stepIndex + 1) / steps.length) * 100}%"></div></div>
    <div class="side-bar">
      <span>Sauveteur à ${side} de l’image</span>
      <button data-action="side" aria-label="Inverser le côté du secouriste">↔ Inverser la vue</button>
    </div>
    <h1 class="instruction-title">${step.title}</h1>
    <div class="card diagram-card">${diagram(step.kind)}</div>
    <p class="tip">${step.tip}</p>
    <div class="card"><p class="instruction">${step.text}</p></div>
    <nav class="guide-nav" aria-label="Navigation entre les étapes">
      <button class="button secondary back" data-action="back" aria-label="Étape précédente" ${stepIndex === 0 ? 'disabled' : ''}>‹</button>
      <button class="button" data-action="next">${stepIndex === steps.length - 1 ? 'RESTER EN SURVEILLANCE' : 'ÉTAPE SUIVANTE ›'}</button>
    </nav>
    <button class="button danger breathing-alert" data-action="not-breathing">RESPIRATION ABSENTE OU ANORMALE</button>
  `);
  if (announce) speak(`${step.title}. ${step.text}`);
}

function renderDone() {
  setScreen(`
    <p class="eyebrow">PLS réalisée</p>
    <h1>Surveillez sa respiration</h1><div class="card diagram-card">${diagram("monitor")}</div>
    <div class="card">
      <ul class="status-list">
        <li>Maintenez la bouche orientée vers le sol.</li>
        <li>Protégez-la du froid ou de la chaleur.</li>
        <li>Contrôlez régulièrement sa respiration.</li>
        <li>Suivez les consignes des secours.</li>
      </ul>
      <a class="button danger" href="tel:112" style="display:grid;place-items:center;text-decoration:none;margin-top:1rem">APPELER LE 112</a>
    </div>
    <button class="button danger" data-action="not-breathing">RESPIRATION ABSENTE OU ANORMALE</button><button class="button secondary" data-action="restart">RECOMMENCER</button>
  `);
  speak('Restez près de la victime et surveillez sa respiration jusqu’à l’arrivée des secours.');
}

app.addEventListener('click', event => {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const action = target.dataset.action;
  if (action === 'responsive') renderResponsive();
  if (action === 'unresponsive') renderBreathing();
  if (action === 'timer') startTimer();
  if (action === 'breathing') { stepIndex = 0; renderSideChoice(); }
  if (action === 'choose-left' || action === 'choose-right') { side = action === 'choose-left' ? 'gauche' : 'droite'; renderGuide(); }
  if (action === 'not-breathing') renderCPR();
  if (action === 'restart') { stepIndex = 0; renderStart(); }
  if (action === 'back' && stepIndex > 0) { stepIndex -= 1; renderGuide(); }
  if (action === 'next') {
    if (stepIndex < steps.length - 1) { stepIndex += 1; renderGuide(); }
    else renderDone();
  }
  if (action === 'side') { side = side === 'gauche' ? 'droite' : 'gauche'; renderGuide(false); }
  if (action === 'voice') { voiceEnabled = !voiceEnabled; renderGuide(false); if (voiceEnabled) speak(`${steps[stepIndex].title}. ${steps[stepIndex].text}`); }
});

if (location.protocol === 'file:') document.querySelector('#offline-status').textContent = 'Consultation locale · installation PWA sur HTTPS';
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js').then(() => navigator.serviceWorker.ready).then(() => { document.querySelector('#offline-status').textContent = 'Guide disponible hors ligne'; }).catch(() => { document.querySelector('#offline-status').textContent = 'Mode en ligne · cache hors ligne indisponible'; }));
}

renderStart();
