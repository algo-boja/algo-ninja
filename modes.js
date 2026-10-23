// 미니게임 7종. 화면과 상관없는 순수 로직이라 node로 점검할 수 있다 (test_modes.mjs).
// 모드마다: init() → 상태, next(s) → 떨어지는 타일 글자, answer(s) → 정답 방향(-1 ← / 1 →),
//          apply(s, d) → 정답을 반영, view(s) → 아래 줄 HTML
export const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const uniq = (n, a, b) => { const s = new Set(); while (s.size < n) s.add(rnd(a, b)); return [...s]; };
const up = (x, y) => x - y;
const swap = (a, i, j) => { [a[i], a[j]] = [a[j], a[i]]; };
const cell = (v, c = '') => `<div class="c ${c}">${v}</div>`;
const pair = (a, b) => `${a}<i class="sep"></i>${b}`;
const tag = (t, v) => `<span class="tag"><small>${t}</small>${v}</span>`;

export const MODES = {
  quick: {
    name: '퀵정렬', color: ['#c4b5fd', '#7c3aed'],
    rule: '피벗보다 작으면 ←, 크면 →', keys: ['작다', '크다'],
    sum: '기준(피벗) 하나로 작은 쪽·큰 쪽을 가른다',
    init: () => ({ p: rnd(30, 70), L: [], R: [] }),
    next(s) { do s.n = rnd(1, 99); while (s.n === s.p); return s.n; },
    answer: s => (s.n < s.p ? -1 : 1),
    apply(s, d) { (d < 0 ? s.L : s.R).push(s.n); },
    view: s => `<div class="row split"><div class="row pile l">${s.L.slice(-3).map(v => cell(v, 'L')).join('')}</div>`
      + cell(s.p, 'key big') + `<div class="row pile r">${s.R.slice(-3).map(v => cell(v, 'R')).join('')}</div></div>`,
  },
  bubble: {
    name: '버블정렬', color: ['#fcc440', '#f97316'],
    rule: '앞이 더 크면 → 바꿔, 아니면 ← 그대로', keys: ['그대로', '바꿔'],
    sum: '옆끼리 바꾸다 보면 큰 수가 뒤로 떠오른다',
    init: () => ({ a: uniq(6, 1, 99), i: 0, done: 0 }),
    next(s) {
      if (s.i >= s.a.length - 1 - s.done) { s.done++; s.i = 0; if (s.done >= 3) { s.a = uniq(6, 1, 99); s.done = 0; } }
      return pair(s.a[s.i], s.a[s.i + 1]);
    },
    answer: s => (s.a[s.i] > s.a[s.i + 1] ? 1 : -1),
    apply(s, d) { if (d > 0) swap(s.a, s.i, s.i + 1); s.i++; },
    view: s => `<div class="row">${s.a.map((v, k) => cell(v,
      k >= s.a.length - s.done ? 'ok' : (k === s.i || k === s.i + 1) ? 'hi' : '')).join('')}</div>`,
  },
  select: {
    name: '선택정렬', color: ['#67e8f9', '#0891b2'],
    rule: '최솟값보다 작으면 → 새 최솟값, 아니면 ← 패스', keys: ['패스', '새 최솟값'],
    sum: '한 바퀴 돌며 최솟값을 찾아 맨 앞으로 보낸다',
    init: () => ({ a: uniq(6, 1, 99), i: 0, mi: 0, j: 1 }),
    next(s) {
      if (s.j >= s.a.length) {
        swap(s.a, s.i, s.mi); s.i++;
        if (s.i >= s.a.length - 1) { s.a = uniq(6, 1, 99); s.i = 0; }
        s.mi = s.i; s.j = s.i + 1;
      }
      return s.a[s.j];
    },
    answer: s => (s.a[s.j] < s.a[s.mi] ? 1 : -1),
    apply(s, d) { if (d > 0) s.mi = s.j; s.j++; },
    view: s => `<div class="row">${s.a.map((v, k) => cell(v,
      k < s.i ? 'ok' : k === s.mi ? 'key' : k === s.j ? 'hi' : '')).join('')}</div>`
      + '<div class="note">최솟값 = 테두리 칸 · 한 바퀴 끝나면 맨 앞으로</div>',
  },
  insert: {
    name: '삽입정렬', color: ['#93c5fd', '#3b5bdb'],
    rule: '노란 칸보다 작으면 ← 더 왼쪽, 아니면 → 여기 꽂기', keys: ['더 왼쪽', '여기 꽂기'],
    sum: '이미 정렬된 줄에 한 장씩 끼워 넣는다',
    init: () => ({ a: uniq(6, 1, 99), j: 1, need: true }),
    next(s) {
      if (s.need) { if (s.j >= s.a.length) { s.a = uniq(6, 1, 99); s.j = 1; } s.key = s.a[s.j]; s.p = s.j; s.need = false; }
      return s.key;
    },
    answer: s => (s.key < s.a[s.p - 1] ? -1 : 1),
    apply(s, d) {
      if (d < 0) s.p--;
      if (d > 0 || s.p === 0) { s.a.splice(s.j, 1); s.a.splice(s.p, 0, s.key); s.j++; s.need = true; }
    },
    view(s) {
      let h = '';
      for (let k = 0; k < s.j; k++) { if (k === s.p) h += cell('?', 'gap'); h += cell(s.a[k], k === s.p - 1 ? 'hi' : 'ok'); }
      if (s.p === s.j) h += cell('?', 'gap');
      for (let k = s.j + 1; k < s.a.length; k++) h += cell(s.a[k], 'off');
      return `<div class="row">${h}</div>`;
    },
  },
  merge: {
    name: '병합정렬', color: ['#f9a8d4', '#db2777'],
    rule: '두 줄 맨 앞 중 더 작은 쪽: 윗줄 ←, 아랫줄 →', keys: ['윗줄', '아랫줄'],
    sum: '정렬된 두 줄은 맨 앞끼리만 비교해도 합쳐진다',
    init() { const s = {}; this.fresh(s); return s; },
    fresh(s) { const v = uniq(8, 1, 99); s.A = v.slice(0, 4).sort(up); s.B = v.slice(4).sort(up); s.out = []; },
    next(s) { if (!s.A.length || !s.B.length) this.fresh(s); return pair(s.A[0], s.B[0]); },
    answer: s => (s.A[0] < s.B[0] ? -1 : 1),
    apply(s, d) { s.out.push((d < 0 ? s.A : s.B).shift()); },
    view(s) {
      const r = (lab, a, c) => `<div class="row"><span class="lab">${lab}</span>${a.map((v, k) => cell(v, k === 0 ? c : '')).join('')}</div>`;
      return r('윗줄', s.A, 'L') + r('아랫줄', s.B, 'R')
        + `<div class="row"><span class="lab">결과</span>${s.out.map(v => cell(v, 'ok')).join('')}</div>`;
    },
  },
  heap: {
    name: '힙정렬', color: ['#fda4af', '#e11d48'],
    rule: '테두리 수를 더 큰 자식 쪽으로: 왼쪽 ←, 오른쪽 →', keys: ['왼쪽 자식', '오른쪽 자식'],
    sum: '맨 위(최댓값)를 빼고, 새 맨 위를 더 큰 자식 쪽으로 가라앉힌다',
    init() { return { a: this.heapify(uniq(7, 1, 99)), n: 7, cur: -1 }; },
    heapify(a) {  // 아래에서부터 내려보내기 → 랜덤한 최대 힙
      for (let i = (a.length >> 1) - 1; i >= 0; i--) {
        for (let k = i; ;) {
          const l = 2 * k + 1, r = l + 1; let m = k;
          if (l < a.length && a[l] > a[m]) m = l;
          if (r < a.length && a[r] > a[m]) m = r;
          if (m === k) break;
          swap(a, k, m); k = m;
        }
      }
      return a;
    },
    extract(s) {
      if (s.n <= 2) { s.a = this.heapify(uniq(7, 1, 99)); s.n = 7; }
      swap(s.a, 0, s.n - 1); s.n--; s.cur = 0; s.fresh = true;
    },
    next(s) {
      // 내려갈 자식이 없거나 두 자식보다 이미 크면 알아서 멈추고 다음 빼기로
      for (;;) {
        if (s.cur < 0) this.extract(s);
        const l = 2 * s.cur + 1, r = l + 1;
        if (l < s.n) {
          s.c = r < s.n && s.a[r] > s.a[l] ? r : l;
          if (s.a[s.c] > s.a[s.cur]) break;
        }
        s.cur = -1;
      }
      return tag('내려가는 수', s.a[s.cur]);
    },
    answer: s => (s.c === 2 * s.cur + 1 ? -1 : 1),
    apply(s) { s.fresh = false; swap(s.a, s.cur, s.c); s.cur = s.c; },
    view(s) {
      // 노드 자리 (트리 상자 260x128 안의 중심 좌표)
      const P = [[130, 18], [65, 64], [195, 64], [30, 110], [100, 110], [160, 110], [230, 110]];
      let lines = '', nodes = '';
      for (let k = 1; k < s.n; k++) { const p = (k - 1) >> 1; lines += `<line x1="${P[p][0]}" y1="${P[p][1]}" x2="${P[k][0]}" y2="${P[k][1]}"/>`; }
      for (let k = 0; k < s.n; k++) {
        const c = (k === s.cur ? 'key' : '') + (k === 0 && s.fresh ? ' new' : '');  // 큰 자식은 칠하지 않는다 (직접 비교)
        nodes += `<div class="c ${c}" style="left:${P[k][0]}px;top:${P[k][1]}px">${s.a[k]}</div>`;
      }
      const done = s.a.slice(s.n).map((v, i) => cell(v, 'ok' + (i === 0 && s.fresh ? ' new' : ''))).join('');
      return `<div class="heap"><svg viewBox="0 0 260 128">${lines}</svg>${nodes}</div>`
        + `<div class="row"><span class="lab">정렬 끝</span>${done || '<span class="note">아직 없음</span>'}</div>`;
    },
  },
  bsearch: {
    name: '이진 탐색', color: ['#5eead4', '#0d9488'],
    rule: '노란 칸보다 작으면 ←, 크면 →', keys: ['작다', '크다'],
    sum: '정렬된 줄에서 반씩 버리면 금방 찾는다',
    init() { const s = {}; this.fresh(s); return s; },
    fresh(s) {
      s.a = uniq(11, 1, 99).sort(up);
      let k; do k = rnd(0, 10); while (k === 5);
      s.t = s.a[k]; s.lo = 0; s.hi = 10;
    },
    mid: s => (s.lo + s.hi) >> 1,
    found(s) { return s.a[this.mid(s)] === s.t; },
    next(s) { if (this.found(s)) this.fresh(s); return s.t; },
    answer(s) { return s.t < s.a[this.mid(s)] ? -1 : 1; },
    apply(s, d) { const m = this.mid(s); if (d < 0) s.hi = m - 1; else s.lo = m + 1; },
    view(s) {
      const m = this.mid(s), f = this.found(s);
      return `<div class="row tight">${s.a.map((v, k) => cell(v,
        k < s.lo || k > s.hi ? 'off' : k === m ? (f ? 'ok' : 'hi') : '')).join('')}</div>`
        + '<div class="note">떨어지는 수 = 찾는 수</div>';
    },
  },
};
