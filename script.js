'use strict';
// ローカルファイルからも動くよう、fetch やモジュールを使わない構成です。
const $ = id => document.getElementById(id);
const wheels = '<g fill="#40535d"><circle cx="30" cy="76" r="12"/><circle cx="94" cy="76" r="12"/></g><g fill="#fff9ed"><circle cx="30" cy="76" r="5"/><circle cx="94" cy="76" r="5"/></g>';
const carBody = color => `<path d="M17 48 30 22Q33 17 40 17H70Q76 17 80 24L96 48Z" fill="${color}"/><path d="M36 24H49V45H26Z M56 24H70L84 45H56Z" fill="#e4f6fc"/><rect x="8" y="44" width="111" height="32" rx="12" fill="${color}"/><rect x="104" y="50" width="13" height="9" rx="4" fill="#fff1bc"/>`;
const svg = body => `<svg viewBox="0 0 130 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><ellipse cx="65" cy="89" rx="58" ry="5" fill="#4b6a6920"/>${body}</svg>`;
const stages = [
 { name: 'きいろいくるま', art: svg(carBody('#f5c44f') + wheels) },
 { name: 'ショベルカー', art: svg('<rect x="9" y="66" width="77" height="23" rx="11" fill="#52616a"/><rect x="16" y="72" width="63" height="11" rx="5" fill="#aab5b5"/><path d="M60 53 81 18 106 34 116 69" fill="none" stroke="#eebc43" stroke-width="11" stroke-linejoin="round"/><path d="M100 66H125L119 82H103Z" fill="#e1a83a"/><rect x="9" y="49" width="71" height="20" rx="5" fill="#f7ca53"/><path d="M24 49V19H54L64 49Z" fill="#f7ca53"/><path d="M30 25H49L56 45H30Z" fill="#dff4fb"/><path d="M16 56H29" stroke="#c29028" stroke-width="3"/>') },
 { name: 'パトカー', art: svg(carBody('#fffdf6') + '<path d="M9 59H118V68Q118 76 109 76H18Q9 76 9 68Z" fill="#40535d"/><rect x="46" y="9" width="26" height="10" rx="4" fill="#f07879"/><path d="m66 46 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z" fill="#e9bd57"/>' + wheels) },
 { name: 'しょうぼうしゃ', art: svg('<rect x="6" y="35" width="69" height="40" rx="5" fill="#eb7770"/><path d="M78 31H98L119 51V75H78Z" fill="#eb7770"/><path d="M84 37H95L108 51H84Z" fill="#e1f4fa"/><rect x="80" y="23" width="20" height="8" rx="3" fill="#d85857"/><rect x="14" y="46" width="53" height="23" rx="3" fill="#ffe2ca"/><path d="M10 22H73M10 30H73M17 22V30M29 22V30M41 22V30M53 22V30M65 22V30" stroke="#697e83" stroke-width="4" stroke-linecap="round"/><circle cx="40" cy="57" r="8" fill="none" stroke="#ba8071" stroke-width="4"/><rect x="110" y="56" width="9" height="8" rx="3" fill="#fff0af"/>' + wheels) }
];
const audioFiles = {
 correct: ['audio/correct_zundamon.mp3', '正解なのだ！'],
 stage: ['audio/stage_clear_zundamon.mp3', 'ステージクリアなのだ！'],
 final: ['audio/final_clear_zundamon.mp3', 'ぜんぶクリア！すごいのだ！']
};
const clips = {};
Object.entries(audioFiles).forEach(([key, [path]]) => {
 const audio = new Audio();
 clips[key] = { audio, unavailable: false };
 audio.preload = 'auto';
 audio.addEventListener('error', () => { clips[key].unavailable = true; });
 audio.src = path;
});
let stage = 0, score = 0, locked = false, soundOn = true, voiceToken = 0;
let currentUtterance;
// 同じ音声要素を使い続け、Safariでも最初のタップ後にクリア音声を再生する。
const voicePlayer = new Audio(audioFiles.correct[0]);
voicePlayer.preload = 'auto';
function stopVoice() {
 voiceToken++;
 voicePlayer.pause();
 if (voicePlayer.readyState > 0) voicePlayer.currentTime = 0;
 Object.values(clips).forEach(({ audio }) => { audio.pause(); if (audio.readyState > 0) audio.currentTime = 0; });
 if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}
function say(key) {
 stopVoice();
 if (!soundOn) return;
 const token = voiceToken;
 function fallback() {
  if (!soundOn || token !== voiceToken || !('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return;
  // 端末の仮音声。特定キャラクターの声を合成するものではありません。
  currentUtterance = new SpeechSynthesisUtterance(audioFiles[key][1]);
  currentUtterance.lang = 'ja-JP'; currentUtterance.rate = .9; currentUtterance.pitch = 1.15;
  const voice = window.speechSynthesis.getVoices().find(v => v.lang.toLowerCase().startsWith('ja') && v.localService);
  if (voice) currentUtterance.voice = voice;
  window.speechSynthesis.speak(currentUtterance);
 }
 // Safariが事前読み込みを省略していても、タップ内で再生を試す。
 if (clips[key].unavailable) { fallback(); return; }
 try {
  if (voicePlayer.getAttribute('src') !== audioFiles[key][0]) voicePlayer.src = audioFiles[key][0];
  const playing = voicePlayer.play(); if (playing) playing.catch(fallback);
 } catch (_) { fallback(); }
}
let drifting = [], lastFrame = 0, holdUntil = 0;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
function placeBalloons() {
 const area = $('balloons');
 drifting = [...area.children].map((button, i) => {
  const w = button.offsetWidth, h = button.offsetHeight;
  const x = (area.clientWidth / 2 - w) / 2 + (i % 2) * area.clientWidth / 2;
  const y = 5 + Math.floor(i / 2) * (area.clientHeight - h - 20) / 2;
  const direction = Math.random() * Math.PI * 2;
  const balloon = { button, x, y, w, h, vx: Math.cos(direction) * 14, vy: Math.sin(direction) * 14 };
  paintBalloon(balloon); return balloon;
 });
}
function paintBalloon(b) { b.button.style.left = `${b.x}px`; b.button.style.top = `${b.y}px`; }
function drift(now) {
 const dt = Math.min((now - lastFrame) / 1000 || 0, .035); lastFrame = now;
 if (!locked && !document.hidden && !reducedMotion.matches && now > holdUntil) {
  const area = $('balloons');
  drifting.forEach(b => { b.x += b.vx * dt; b.y += b.vy * dt; });
  // 楕円の間隔を確保し、文字同士が重なりにくいようにゆっくり押し合う。
  for (let i = 0; i < drifting.length; i++) for (let j = i + 1; j < drifting.length; j++) {
   const a = drifting[i], b = drifting[j];
   const rx = (a.w + b.w) / 2 + 7, ry = (a.h + b.h) / 2 + 11;
   const dx = (b.x - a.x) / rx, dy = (b.y - a.y) / ry;
   const d = Math.hypot(dx, dy);
   if (d < 1) {
    const nx = d > .001 ? dx / d : 1, ny = d > .001 ? dy / d : 0;
    a.x -= nx * (1 - d) * rx / 2; b.x += nx * (1 - d) * rx / 2;
    a.y -= ny * (1 - d) * ry / 2; b.y += ny * (1 - d) * ry / 2;
    a.vx = -nx * 14; a.vy = -ny * 14; b.vx = nx * 14; b.vy = ny * 14;
   }
  }
  drifting.forEach(b => {
   const right = Math.max(5, area.clientWidth - b.w - 5), bottom = Math.max(5, area.clientHeight - b.h - 15);
   if (b.x <= 5 || b.x >= right) b.vx = Math.abs(b.vx || 8) * (b.x <= 5 ? 1 : -1);
   if (b.y <= 5 || b.y >= bottom) b.vy = Math.abs(b.vy || 8) * (b.y <= 5 ? 1 : -1);
   b.x = Math.max(5, Math.min(right, b.x)); b.y = Math.max(5, Math.min(bottom, b.y));
   paintBalloon(b);
  });
 }
 requestAnimationFrame(drift);
}
// 指が触れた瞬間は全体を止め、動いている風船でもタップしやすくする。
$('balloons').addEventListener('pointerdown', () => { holdUntil = performance.now() + 450; });
window.addEventListener('resize', placeBalloons);
requestAnimationFrame(drift);
function shuffled(items) {
 for (let i = items.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [items[i], items[j]] = [items[j], items[i]];
 }
 return items;
}
function progress() {
 $('vehicle').style.left = `calc(${score * 20}% - ${score / 5 * 104}px)`;
 $('progress').setAttribute('aria-valuenow', String(score));
 [...$('progress').children].forEach((dot, i) => dot.classList.toggle('done', i < score));
 $('scene').setAttribute('aria-label', `${stages[stage].name}、5問中${score}問正解`);
}
function newQuestion() {
 const options = shuffled(['あ', 'い', 'う', 'え', 'お', 'る', 'め', 'か']).slice(0, 5);
 options.push('の');
 $('balloons').replaceChildren();
 shuffled(options).forEach((letter, i) => {
  const button = document.createElement('button');
  button.className = 'balloon'; button.textContent = letter;
  button.style.setProperty('--balloon', ['#ffdfab', '#d6ead0', '#f8d6dc', '#d6e8f6', '#e6daf4', '#f9e9aa'][i]);
  button.style.setProperty('--delay', `${-i * .6}s`);
  button.addEventListener('click', () => choose(letter, button));
  $('balloons').appendChild(button);
 });
 $('hint').textContent = 'の は どこかな？';
 placeBalloons();
}
function sparkle(x, y) {
 if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
 for (let i = 0; i < 20; i++) {
  const piece = document.createElement('i'); piece.className = 'particle';
  const angle = Math.random() * Math.PI * 2;
  const distance = 50 + Math.random() * 110;
  Object.entries({ '--x': `${x}px`, '--y': `${y}px`, '--dx': `${Math.cos(angle) * distance}px`, '--dy': `${Math.sin(angle) * distance + 65}px`, '--turn': `${Math.random() * 400}deg`, '--color': ['#eebd51', '#efa4ac', '#91c5b1', '#9ebfe4'][i % 4] }).forEach(([key, value]) => piece.style.setProperty(key, value));
  $('particles').appendChild(piece);
  setTimeout(() => piece.remove(), 1100);
 }
}
function choose(letter, button) {
 if (locked) return;
 if (letter !== 'の') {
  $('hint').textContent = 'もういちど';
  button.classList.remove('gentle'); void button.offsetWidth; button.classList.add('gentle');
  return;
 }
 locked = true; score++;
 [...$('balloons').children].forEach(b => { b.disabled = true; });
 button.classList.add('pop');
 const rect = button.getBoundingClientRect();
 sparkle(rect.left + rect.width / 2, rect.top + rect.height / 2);
 $('correct-display').hidden = false;
 $('hint').textContent = 'せいかい！';
 say('correct'); progress();
 setTimeout(() => {
  $('correct-display').hidden = true;
  if (score === 5) showClear();
  else { newQuestion(); locked = false; }
 }, 1900);
}
function showClear() {
 const final = stage === stages.length - 1;
 $('clear-title').textContent = final ? 'ぜんぶクリア！' : 'ステージクリア！';
 $('clear-message').textContent = final ? 'すごいのだ！' : 'やったね！';
 $('clear-vehicle').innerHTML = stages[stage].art;
 $('next').textContent = final ? 'もういっかい' : 'つぎへ →';
 $('clear').hidden = false; $('game').inert = true; $('next').focus({ preventScroll: true });
 sparkle(window.innerWidth / 2, window.innerHeight * .3);
 say(final ? 'final' : 'stage');
}
function startStage() {
 score = 0; locked = false;
 $('clear').hidden = true; $('game').inert = false;
 $('stage-name').textContent = `ステージ${stage + 1}　${stages[stage].name}`;
 $('vehicle').innerHTML = stages[stage].art;
 // 新しい乗り物をスタート地点に即座に配置。
 $('vehicle').style.transition = 'none'; progress();
 void $('vehicle').offsetWidth; $('vehicle').style.transition = '';
 newQuestion();
}
$('next').addEventListener('click', () => {
 stopVoice(); stage = (stage + 1) % stages.length; startStage();
 $('balloons').firstElementChild.focus({ preventScroll: true });
});
$('sound').addEventListener('click', () => {
 soundOn = !soundOn; stopVoice();
 $('sound').textContent = soundOn ? '🔊' : '🔇';
 $('sound').setAttribute('aria-pressed', String(soundOn));
 $('sound').setAttribute('aria-label', soundOn ? '音声をオフにする' : '音声をオンにする');
});
document.addEventListener('visibilitychange', () => { if (document.hidden) stopVoice(); });
startStage();
