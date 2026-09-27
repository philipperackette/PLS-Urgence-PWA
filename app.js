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
let voiceEnabled = readVoicePreference();
let timerId = null;
let seconds = 10;
let currentScreen = 'start';

const icon = (name) => ({
  speaker: '🔊', muted: '🔇'
}[name] || '');

/* Préférence vocale conservée d’une utilisation à l’autre. */
function readVoicePreference() {
  try { return localStorage.getItem('pls-voice') !== 'off'; } catch (e) { return true; }
}
function saveVoicePreference() {
  try { localStorage.setItem('pls-voice', voiceEnabled ? 'on' : 'off'); } catch (e) { /* stockage indisponible */ }
}

/* Écran en cours conservé pendant la session : un rechargement accidentel
   ramène au même écran au lieu de repartir du début. */
function saveState() {
  try { sessionStorage.setItem('pls-state', JSON.stringify({ screen: currentScreen, stepIndex, side })); } catch (e) { /* stockage indisponible */ }
}
function readState() {
  try { return JSON.parse(sessionStorage.getItem('pls-state')) || null; } catch (e) { return null; }
}

/* Garde l’écran allumé pendant l’intervention (mains occupées). */
let wakeLock = null;
let wakeLockWanted = false;
async function requestWakeLock() {
  wakeLockWanted = true;
  if (!('wakeLock' in navigator) || wakeLock || document.visibilityState !== 'visible') return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => { wakeLock = null; });
  } catch (e) { wakeLock = null; }
}
document.addEventListener('visibilitychange', () => {
  if (wakeLockWanted && document.visibilityState === 'visible') requestWakeLock();
});

/* ---------- Lecture vocale ----------
   Safari (iPhone) ignore souvent une lecture lancée juste après cancel() :
   on n'annule que si une lecture est en cours, et on attend un court instant
   après une annulation. L'énoncé en cours est conservé dans une variable, sinon
   Safari peut le libérer et couper la voix. Une voix française est choisie
   explicitement quand l'appareil en propose une. */
const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
let frenchVoice = null;
let currentUtterance = null;
let lastCancel = 0;
let speechToken = 0;

function pickFrenchVoice() {
  const voices = synth ? synth.getVoices() : [];
  const fr = voices.filter(v => (v.lang || '').toLowerCase().replace('_', '-').startsWith('fr'));
  frenchVoice = fr.find(v => v.lang.replace('_', '-') === 'fr-FR' && v.localService)
    || fr.find(v => v.lang.replace('_', '-') === 'fr-FR')
    || fr[0] || null;
}
if (synth) {
  pickFrenchVoice();
  if (synth.addEventListener) synth.addEventListener('voiceschanged', pickFrenchVoice);
  else synth.onvoiceschanged = pickFrenchVoice;
}

function stopSpeech() {
  speechToken += 1; // annule une lecture différée pas encore lancée
  if (synth && (synth.speaking || synth.pending)) {
    synth.cancel();
    lastCancel = Date.now();
  }
}

function speak(text) {
  stopSpeech();
  if (!voiceEnabled || !synth) return;
  const token = speechToken;
  const say = () => {
    if (token !== speechToken) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = frenchVoice ? frenchVoice.lang : 'fr-FR';
    if (frenchVoice) utterance.voice = frenchVoice;
    utterance.rate = 0.92;
    utterance.onend = utterance.onerror = () => { if (currentUtterance === utterance) currentUtterance = null; };
    currentUtterance = utterance;
    if (synth.paused) synth.resume();
    synth.speak(utterance);
  };
  // Premier appel : immédiat, pendant le geste de l'utilisateur (exigé par iPhone).
  const wait = 250 - (Date.now() - lastCancel);
  if (wait > 0) setTimeout(say, wait); else say();
}

function setScreen(name, html) {
  stopTimer();
  stopSpeech();
  currentScreen = name;
  saveState();
  app.innerHTML = `<section class="screen">${html}</section>`;
  // Le focus passe au titre du nouvel écran : les lecteurs d’écran l’annoncent
  // et la navigation au clavier repart du haut de l’écran.
  const heading = app.querySelector('h1');
  if (heading) {
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }
  requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'auto' }));
}

function renderStart() {
  setScreen('start', `
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
  setScreen('responsive', `
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
  setScreen('breathing', `
    <p class="eyebrow">Voies aériennes</p>
    <h1>Respire-t-elle normalement&nbsp;?</h1>
    <div class="card">
      <p>Inclinez doucement sa tête en arrière et soulevez son menton. Pendant 10 secondes au maximum&nbsp;: regardez le thorax, écoutez et sentez la respiration.</p>
      <div class="timer" id="timer" aria-hidden="true">10</div>
      <p class="visually-hidden" id="timer-status" role="status"></p>
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
  const status = document.querySelector('#timer-status');
  timer.classList.add('running');
  button.disabled = true;
  status.textContent = 'Décompte de 10 secondes lancé.';
  speak('Pendant dix secondes, regardez le thorax, écoutez et sentez la respiration.');
  timerId = setInterval(() => {
    seconds -= 1;
    timer.textContent = seconds;
    if (seconds <= 0) {
      stopTimer();
      timer.classList.remove('running');
      button.textContent = '10 SECONDES ÉCOULÉES';
      status.textContent = 'Dix secondes écoulées. La personne respire-t-elle normalement ?';
      if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
      speak('Dix secondes. La personne respire-t-elle normalement ?');
    }
  }, 1000);
}

function stopTimer() {
  if (timerId) clearInterval(timerId);
  timerId = null;
}

function renderCPR() {
  setScreen('cpr', `
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
  setScreen('side', `<p class="eyebrow">Avant la PLS</p><h1>De quel côté êtes-vous ?</h1>
    <p>Choisissez le côté le plus accessible. Repère : <strong>tête en haut de l’image</strong>.</p>
    <div class="side-choices">
      <button class="side-choice" data-action="choose-left">${diagram('supine','gauche')}<strong>À GAUCHE DE L’IMAGE</strong><span>À droite de la victime</span></button>
      <button class="side-choice" data-action="choose-right">${diagram('supine','droite')}<strong>À DROITE DE L’IMAGE</strong><span>À gauche de la victime</span></button>
    </div><p class="tiny">Le sauveteur porte du bleu. Le même côté sera conservé pendant toute la séquence.</p>
    ${isIOS() ? '<p class="tiny">Lecture vocale&nbsp;: sur iPhone, désactivez le mode silencieux (bouton sur le côté du téléphone) et montez le volume.</p>' : ''}`);
}

function renderGuide(announce = true) {
  const step = steps[stepIndex];
  setScreen('guide', `
    <div class="step-head">
      <p class="step-label">Étape ${stepIndex + 1} sur ${steps.length}</p>
      <button class="icon-button" data-action="voice" aria-label="${voiceEnabled ? 'Désactiver' : 'Activer'} la lecture vocale">${icon(voiceEnabled ? 'speaker' : 'muted')}</button>
    </div>
    <div class="progress" aria-label="Progression"><div style="width:${((stepIndex + 1) / steps.length) * 100}%"></div></div>
    <div class="side-bar">
      <span>Sauveteur à ${side} de l’image</span>
      <button data-action="side" aria-label="Inverser le côté du secouriste">↔ Inverser</button>
    </div>
    <h1 class="instruction-title">${step.title}</h1>
    <p class="instruction">${step.text}</p>
    <div class="card diagram-card">${diagram(step.kind)}</div>
    <p class="tip">${step.tip}</p>
    <button class="button danger breathing-alert" data-action="not-breathing">RESPIRATION ABSENTE OU ANORMALE</button>
    <nav class="guide-nav" aria-label="Navigation entre les étapes">
      <button class="button secondary back" data-action="back" aria-label="Étape précédente" ${stepIndex === 0 ? 'disabled' : ''}>‹</button>
      <button class="button" data-action="next">${stepIndex === steps.length - 1 ? 'RESTER EN SURVEILLANCE' : 'ÉTAPE SUIVANTE ›'}</button>
    </nav>
  `);
  if (announce) speak(`${step.title}. ${step.text}`);
}

function renderDone() {
  setScreen('done', `
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

/* ---------- Installation sur téléphone ---------- */
let installPrompt = null;
const isInstalled = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

window.addEventListener('beforeinstallprompt', event => {
  // Android / Chrome : on garde l'invite pour la proposer dans l'écran d'installation.
  event.preventDefault();
  installPrompt = event;
  if (currentScreen === 'install') renderInstall();
});
window.addEventListener('appinstalled', () => {
  installPrompt = null;
  updateInstallLink();
  if (currentScreen === 'install') renderInstall();
});

function updateInstallLink() {
  const link = document.querySelector('#install-link');
  if (link) link.hidden = isInstalled();
}

function renderInstall() {
  const installed = isInstalled();
  const ios = isIOS();
  const iosSteps = `
    <h2 class="install-os">iPhone / iPad</h2>
    <ol class="status-list">
      <li>Ouvrez ce site dans <strong>Safari</strong>.</li>
      <li>Touchez le bouton <strong>Partager</strong> <span aria-hidden="true">(carré avec une flèche vers le haut)</span>.</li>
      <li>Choisissez <strong>« Sur l’écran d’accueil »</strong> <span class="tiny">(faites défiler la liste si besoin)</span>, puis <strong>Ajouter</strong>.</li>
      <li>L’icône « PLS Urgence » apparaît sur l’écran d’accueil.</li>
    </ol>`;
  const androidSteps = `
    <h2 class="install-os">Android</h2>
    <ol class="status-list">
      <li>Ouvrez ce site dans <strong>Chrome</strong>.</li>
      <li>Touchez le menu <strong>⋮</strong> en haut à droite.</li>
      <li>Choisissez <strong>« Ajouter à l’écran d’accueil »</strong> ou <strong>« Installer l’application »</strong>, puis confirmez.</li>
      <li>L’icône « PLS Urgence » apparaît sur l’écran d’accueil.</li>
    </ol>`;
  setScreen('install', `
    <p class="eyebrow">À faire une seule fois, à l’avance</p>
    <h1>Mettre une icône sur le téléphone</h1>
    ${installed ? `<div class="card"><p><strong>C’est fait&nbsp;: l’icône est sur votre écran d’accueil.</strong> Il n’y a rien d’autre à faire. En cas d’urgence, touchez l’icône « PLS Urgence ».</p></div>` : `
    <div class="card">
      <p>La page est enregistrée sur le téléphone et une icône <strong>« PLS Urgence »</strong> apparaît sur l’écran d’accueil. Il suffit de le faire <strong>une seule fois</strong>&nbsp;: ensuite, le guide s’ouvre d’un geste, <strong>même sans connexion internet</strong>.</p>
      ${installPrompt ? `<button class="button blue" data-action="install">AJOUTER L’ICÔNE MAINTENANT</button>` : ''}
      ${ios ? iosSteps + androidSteps : androidSteps + iosSteps}
    </div>`}
    <div class="card">
      <p><strong>Pour vérifier&nbsp;:</strong> touchez la nouvelle icône une première fois avec une connexion internet et attendez le message « Guide disponible hors ligne » en bas de l’écran. Le guide fonctionnera ensuite sans internet.</p>
      <p class="tiny">L’appel au 112 passe par le téléphone et fonctionne sans internet. La lecture vocale utilise les voix installées sur l’appareil&nbsp;; sur iPhone, elle est coupée en mode silencieux.</p>
    </div>
    <button class="button secondary" data-action="restart">RETOUR</button>
  `);
}

document.addEventListener('click', event => {
  if (event.target.closest('#install-link')) { event.preventDefault(); renderInstall(); }
});

app.addEventListener('click', event => {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const action = target.dataset.action;
  requestWakeLock();
  if (action === 'responsive') renderResponsive();
  if (action === 'unresponsive') renderBreathing();
  if (action === 'timer') startTimer();
  if (action === 'breathing') { stepIndex = 0; renderSideChoice(); }
  if (action === 'choose-left' || action === 'choose-right') { side = action === 'choose-left' ? 'gauche' : 'droite'; renderGuide(); }
  if (action === 'not-breathing') renderCPR();
  if (action === 'restart') { stepIndex = 0; renderStart(); }
  if (action === 'install' && installPrompt) {
    installPrompt.prompt();
    installPrompt.userChoice.finally(() => { installPrompt = null; renderInstall(); });
  }
  if (action === 'back' && stepIndex > 0) { stepIndex -= 1; renderGuide(); }
  if (action === 'next') {
    if (stepIndex < steps.length - 1) { stepIndex += 1; renderGuide(); }
    else renderDone();
  }
  if (action === 'side') { side = side === 'gauche' ? 'droite' : 'gauche'; renderGuide(false); }
  if (action === 'voice') { voiceEnabled = !voiceEnabled; saveVoicePreference(); renderGuide(false); if (voiceEnabled) speak(`${steps[stepIndex].title}. ${steps[stepIndex].text}`); }
});

if (location.protocol === 'file:') document.querySelector('#offline-status').textContent = 'Consultation locale · installation PWA sur HTTPS';
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js').then(() => navigator.serviceWorker.ready).then(() => { document.querySelector('#offline-status').textContent = 'Guide disponible hors ligne'; }).catch(() => { document.querySelector('#offline-status').textContent = 'Mode en ligne · cache hors ligne indisponible'; }));
}

/* Clavier : flèches gauche / droite pour changer d’étape. */
document.addEventListener('keydown', event => {
  if (currentScreen !== 'guide' || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  if (event.key === 'ArrowRight') app.querySelector('[data-action="next"]')?.click();
  if (event.key === 'ArrowLeft') app.querySelector('[data-action="back"]:not(:disabled)')?.click();
});

function restore() {
  const state = readState();
  if (!state) return renderStart();
  side = state.side === 'droite' ? 'droite' : 'gauche';
  stepIndex = Math.min(Math.max(Number(state.stepIndex) || 0, 0), steps.length - 1);
  const screens = {
    start: renderStart,
    responsive: renderResponsive,
    breathing: renderBreathing,
    side: renderSideChoice,
    guide: () => renderGuide(false),
    done: renderDone,
    cpr: renderCPR,
    install: renderInstall
  };
  (screens[state.screen] || renderStart)();
}

updateInstallLink();
restore();
