// 정답만 누르는 봇으로 모드마다 수천 번 돌리며 알고리즘 성질이 지켜지는지 확인.  node web/test_modes.mjs
import assert from 'node:assert/strict';
import { MODES } from './modes.js';

const sorted = a => a.every((v, i) => i === 0 || a[i - 1] <= v);
const checks = {
  quick: s => assert(s.L.every(v => v < s.p) && s.R.every(v => v > s.p)),
  bubble: s => { const t = s.a.slice(s.a.length - s.done); assert(sorted(t)); assert(s.a.slice(0, s.a.length - s.done).every(v => v <= (t[0] ?? 999))); },
  select: s => { const h = s.a.slice(0, s.i); assert(sorted(h)); assert(s.a.slice(s.i).every(v => v >= (h.at(-1) ?? 0))); },
  insert: s => { if (s.need) assert(sorted(s.a.slice(0, s.j))); },
  merge: s => assert(sorted(s.out)),
  heap: s => {
    const t = s.a.slice(s.n); assert(sorted(t)); assert(s.a.slice(0, s.n).every(v => v <= (t[0] ?? 999)));
    // 내려가는 중인 칸(cur)과 그 자식 사이만 빼고는 힙 성질이 지켜져야 한다
    for (let k = 1; k < s.n; k++) { const p = (k - 1) >> 1; if (p !== s.cur) assert(s.a[p] >= s.a[k], 'heap property'); }
  },
  bsearch: s => { const k = s.a.indexOf(s.t); assert(k >= s.lo && k <= s.hi); },
};

// 이유 문구 끝 단어 = 정답 방향 ([←, →])
const LABELS = {
  quick: ['왼쪽', '오른쪽'], bubble: ['그대로', '바꾸기'], select: ['패스', '새 최솟값'], insert: ['더 왼쪽', '여기 꽂기'],
  merge: ['윗줄', '아랫줄'], heap: ['왼쪽으로', '오른쪽으로'], bsearch: ['왼쪽', '오른쪽'],
};

for (const [key, m] of Object.entries(MODES)) {
  for (let game = 0; game < 300; game++) {
    const s = m.init();
    for (let step = 0; step < 40; step++) {
      m.next(s);
      if (key === 'insert') assert(sorted(s.a.slice(0, s.j)), 'insert prefix');
      const d = m.answer(s);
      assert(d === 1 || d === -1);
      const w = m.why(s);
      assert(!/undefined|NaN/.test(w), `${key}: ${w}`);
      assert.equal(w.split(' → ')[1], LABELS[key][d < 0 ? 0 : 1], `${key}: ${w}`);
      m.apply(s, d);
      checks[key](s);
    }
  }
  console.log('ok', key);
}
