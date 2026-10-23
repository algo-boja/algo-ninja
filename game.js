import { MODES, rnd } from './modes.js?v=3';
import * as rank from './rank.js?v=3';

const $ = id => document.getElementById(id);
const app = $('app'), field = $('field'), drop = $('drop');
const BASE = 0.30, STEP = 0.012, MAX = 1.05;  // 낙하 속도: 필드 높이/초
const MODE_PAUSE = 1100;
const WHY_PAUSE = 900;  // 틀렸을 때 이유 보여주는 시간

// 효과음 (겹쳐 울리게 매번 복제)
const SFX = { ok: ['bbok', .45], bad: ['swap', .7], combo: ['ding', .5], mode: ['whoosh', .2] };
const audio = Object.fromEntries(Object.entries(SFX).map(([k, [f, v]]) => { const a = new Audio(`sfx/${f}.mp3`); a.volume = v; return [k, a]; }));
let muted = load('mute') === '1';
function sfx(k) { if (muted) return; const a = audio[k].cloneNode(); a.volume = audio[k].volume; a.play().catch(() => {}); }
function load(k) { try { return localStorage.getItem('algoninja.' + k); } catch { return null; } }
function save(k, v) { try { localStorage.setItem('algoninja.' + k, v); } catch { /* 사생활 모드 등 */ } }

let S = null, raf = 0, last = 0;

function hud() {
  $('score').textContent = S.score;
  $('combo').textContent = S.combo;
  $('speed').textContent = 'x' + (S.speed / BASE).toFixed(1);
  $('lives').innerHTML = [0, 1, 2].map(i => `<span class="${i < S.lives ? '' : 'dead'}"></span>`).join('');
}

function setMode() {
  const fixed = practice;
  if (fixed && S.key === fixed) { S.left = Infinity; return spawn(); }  // 연습은 소개 화면 한 번만
  const keys = fixed ? [fixed] : Object.keys(MODES).filter(k => k !== S.key);
  S.key = keys[rnd(0, keys.length - 1)];
  S.m = MODES[S.key]; S.ms = S.m.init(); S.left = rnd(6, 9); S.seen.add(S.key);
  app.style.setProperty('--acc', S.m.color[1]);
  $('modeName').textContent = S.m.name; $('rule').textContent = S.m.rule;
  $('keyL').textContent = S.m.keys[0]; $('keyR').textContent = S.m.keys[1];
  $('introName').textContent = S.m.name; $('introRule').textContent = S.m.rule;
  $('intro').classList.add('show'); sfx('mode');
  S.pauseUntil = performance.now() + MODE_PAUSE;
  spawn();
}

function spawn() {
  drop.innerHTML = S.m.next(S.ms);
  $('view').innerHTML = S.m.view(S.ms);
  S.y = 0; drop.style.top = '0px';
}

function miss(late) {
  S.lives--; S.combo = 0;
  app.classList.remove('shake'); void app.offsetWidth; app.classList.add('shake');
  sfx('bad'); nanaMove('tilt');
  hud();
  // 이유를 보여주고 정답대로 한 칸 진행한 뒤 이어간다 (멈춘 동안은 낙하·입력 없음)
  const ans = S.m.answer(S.ms);
  $('why').textContent = (late ? '늦었다 · ' : '') + S.m.why(S.ms);
  $('why').classList.add('show');
  const hint = ans < 0 ? $('padL') : $('padR');
  hint.classList.add('hint');
  S.m.apply(S.ms, ans);
  $('view').innerHTML = S.m.view(S.ms);
  S.waiting = true;
  setTimeout(() => {
    $('why').classList.remove('show'); hint.classList.remove('hint');
    S.waiting = false;
    if (S.lives <= 0) return gameOver();
    spawn();
  }, WHY_PAUSE);
}

// 타일 자리에서 점수가 떠오른다. 보너스는 금색으로 크게, 한 칸 위에
function pop(text, bonus = false) {
  const el = document.createElement('div');
  el.className = 'pop' + (bonus ? ' bonus' : '');
  el.textContent = text;
  el.style.top = Math.max(bonus ? 34 : 70, S.y - (bonus ? 96 : 40)) + 'px';
  el.addEventListener('animationend', () => el.remove());
  field.appendChild(el);
}
function bump() { const s = $('score'); s.classList.remove('bump'); void s.offsetWidth; s.classList.add('bump'); }

function pick(d) {
  if (!S || !S.run || S.waiting || performance.now() < S.pauseUntil) return;
  press(d);
  if (S.m.answer(S.ms) !== d) return miss(false);
  S.m.apply(S.ms, d);
  S.combo++;
  const mult = 1 + Math.floor(S.combo / 5), gain = 10 * mult;
  S.score += gain; pop(`+${gain}`);
  if (S.combo % 5 === 0) pop(`콤보 x${mult}`, true);  // 배수가 오른 순간
  S.speed = Math.min(MAX, S.speed + STEP);
  if (S.m.found && S.m.found(S.ms)) { S.score += 20; pop('찾았다 +20', true); }
  if (S.combo % 10 === 0) { sfx('combo'); nanaMove('fly'); } else sfx('ok');
  hud(); bump();
  if (--S.left <= 0) return setMode();
  spawn();
}

function loop(now) {
  if (!S.run) return;
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (now >= S.pauseUntil && !S.waiting) {
    $('intro').classList.remove('show');
    const h = field.clientHeight;
    S.y += S.speed * h * dt;
    drop.style.top = S.y + 'px';
    if (S.y > h) miss(true);  // 타일 아래 끝이 바닥선에 닿음 (transform -100%라 top = 아래 끝)
  }
  if (S.run) raf = requestAnimationFrame(loop);
}

function start() {
  S = { score: 0, combo: 0, lives: 3, speed: BASE, run: true, key: '', seen: new Set(),
        t0: performance.now(), fixed: Boolean(practice) };
  $('start').classList.add('hidden'); $('over').classList.add('hidden');
  hud(); setMode();
  last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
}

function gameOver() {
  S.run = false; cancelAnimationFrame(raf);
  const best = Math.max(S.score, +(load('best') || 0)); save('best', best);
  $('finalScore').textContent = S.score;
  $('best').textContent = S.score >= best && S.score > 0 ? '내 최고 기록!' : `내 최고 ${best}점`;
  $('sums').innerHTML = [...S.seen].map(k => `<li><b>${MODES[k].name}</b>${MODES[k].sum}</li>`).join('');
  $('over').classList.remove('hidden');
  S.playedMs = performance.now() - S.t0; S.sent = false;
  showRank();
}

// ── 랭킹 ──
let period = 'today';
function rankMsg(text, err = false) { const m = $('rankMsg'); m.textContent = text; m.classList.toggle('err', err); }
function showRank() {
  $('rank').classList.toggle('hidden', !rank.enabled);
  if (!rank.enabled) return;
  $('nick').value = load('nick') || '';
  const blocked = S.fixed ? '연습 모드는 랭킹 등록 안 돼. 랭킹 모드로 도전해봐' : S.score === 0 ? '0점은 등록 안 돼' : '';
  $('rankForm').classList.toggle('hidden', Boolean(blocked));
  rankMsg(blocked);
  loadBoard();
}
async function loadBoard(me) {
  const board = $('board');
  try {
    const rows = await rank.top(period);
    board.replaceChildren(...rows.map((r, i) => {
      const li = document.createElement('li');
      if (me && r.name === me.name && r.score === me.score) li.className = 'me';
      li.innerHTML = '<span class="n"></span><span class="nm"></span><span></span>';
      li.children[0].textContent = i + 1;
      li.children[1].textContent = r.name;  // 닉네임은 남이 쓴 글자라 textContent로만
      li.children[2].textContent = r.score;
      return li;
    }));
    if (!rows.length) board.innerHTML = '<li class="empty">아직 기록이 없어. 첫 번째가 돼봐</li>';
  } catch (e) { board.innerHTML = '<li class="empty">랭킹을 못 불러왔어</li>'; }
}
$('rankForm').addEventListener('submit', async e => {
  e.preventDefault();
  if (S.sent) return;
  const name = $('nick').value.trim();
  if (!name) return rankMsg('닉네임을 적어줘', true);
  if (name.length > 12) return rankMsg('닉네임은 12자까지', true);
  if (!rank.isClean(name)) return rankMsg('쓸 수 없는 닉네임이야. 다른 걸로 해줘', true);
  S.sent = true; $('rankBtn').disabled = true; rankMsg('등록 중…');
  try {
    await rank.submit(name, S.score, S.playedMs);
    save('nick', name);
    $('rankForm').classList.add('hidden');
    const [today, all] = await Promise.all([rank.rankOf(S.score, 'today'), rank.rankOf(S.score, 'all')]);
    rankMsg(`오늘 ${today}위 · 전체 ${all}위`);
    loadBoard({ name, score: S.score });
  } catch (err) {
    S.sent = false; rankMsg(err.message + ' — 다시 눌러봐', true);
  } finally { $('rankBtn').disabled = false; }
});
$('nick').addEventListener('input', () => rankMsg(''));
document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => {
  period = b.dataset.p;
  document.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('on', x === b));
  loadBoard();
}));

function press(d) {
  const p = d < 0 ? $('padL') : $('padR');
  p.classList.add('press'); setTimeout(() => p.classList.remove('press'), 90);
}

// 화면 왼쪽 절반 = ←, 오른쪽 절반 = → (버튼·안내 화면 위 터치는 제외)
app.addEventListener('pointerdown', e => {
  if (!S || !S.run || e.target.closest('button, .overlay')) return;
  e.preventDefault();
  const r = app.getBoundingClientRect();
  pick(e.clientX < r.left + r.width / 2 ? -1 : 1);
});

// 나나: 콤보 = 날갯짓하며 날아올랐다 내려옴, 오답 = 날개 펼치고 휘청
// 더블탭 확대 막기 (iOS Safari는 viewport·touch-action을 무시할 때가 있다): 350ms 안의 두 번째 터치를 막는다.
// 판정은 pointerdown으로 받아서 막아도 입력은 안 빠진다
let lastTouch = 0;
document.addEventListener('touchend', e => {
  if (e.timeStamp - lastTouch < 350 && !e.target.closest('input')) e.preventDefault();
  lastTouch = e.timeStamp;
}, { passive: false });
document.addEventListener('dblclick', e => e.preventDefault());

const nana = $('nana');
const IMG = { perch: 'img/nana_perch.png', up: 'img/nana_fly_up.png', down: 'img/nana_fly_down.png' };
Object.values(IMG).forEach(src => { new Image().src = src; });
let flapT;
function nanaMove(kind) {
  clearInterval(flapT);
  nana.classList.remove('fly', 'tilt'); void nana.offsetWidth; nana.classList.add(kind);
  if (kind === 'fly') {
    let up = true;
    flapT = setInterval(() => { nana.src = up ? IMG.up : IMG.down; up = !up; }, 85);
  } else nana.src = IMG.up;
}
nana.addEventListener('animationend', () => {
  clearInterval(flapT); nana.src = IMG.perch; nana.classList.remove('fly', 'tilt');
});
document.addEventListener('keydown', e => {
  if (e.repeat || e.target.tagName === 'INPUT') return;
  if (e.key === 'ArrowLeft') { e.preventDefault(); pick(-1); }
  else if (e.key === 'ArrowRight') { e.preventDefault(); pick(1); }
  else if ((e.key === 'Enter' || e.key === ' ') && (!S || !S.run)) { e.preventDefault(); start(); }
});
const muteBtn = $('mute');
const muteLabel = () => { muteBtn.textContent = muted ? '소리 끔' : '소리 켬'; };
muteBtn.onclick = () => { muted = !muted; save('mute', muted ? '1' : '0'); muteLabel(); };
muteLabel();

// 시작 화면: 랭킹 모드(랜덤) / 연습(한 모드만, 랭킹 등록 안 됨)
let practice = '';
function begin(mode) { practice = mode; start(); }
$('chips').innerHTML = Object.entries(MODES).map(([k, m]) => `<button data-k="${k}">${m.name}</button>`).join('');
$('chips').addEventListener('click', e => { const b = e.target.closest('button'); if (b) begin(b.dataset.k); });
$('go').onclick = () => begin('');
$('again').onclick = start;
$('menu').onclick = () => { $('over').classList.add('hidden'); $('start').classList.remove('hidden'); };
