// 랭킹 모듈 점검: 가짜 fetch로 요청 모양만 확인 (실제 Supabase 안 부름).  node web/test_rank.mjs
import assert from 'node:assert/strict';

const calls = [];
globalThis.fetch = async (url, opt = {}) => {
  calls.push({ url, opt });
  return { ok: true, json: async () => [{ name: 'a', score: 10 }], headers: new Map([['content-range', '0-0/4']]) };
};
// config 대신 값을 넣은 복사본을 불러온다
const fs = await import('node:fs');
const src = fs.readFileSync(new URL('./rank.js', import.meta.url), 'utf8')
  .replace(/from '\.\/config\.js[^']*'/,"from 'data:text/javascript,export const SUPABASE_URL=\"https://x.supabase.co\";export const SUPABASE_KEY=\"pk\";'");
const rank = await import('data:text/javascript,' + encodeURIComponent(src));

assert.equal(rank.enabled, true);
await rank.submit('나나', 120, 4567.8);
assert.equal(calls[0].url, 'https://x.supabase.co/rest/v1/scores');
assert.deepEqual(JSON.parse(calls[0].opt.body), { name: '나나', score: 120, played_ms: 4568 });
assert.equal(calls[0].opt.headers.apikey, 'pk');
assert(!('Authorization' in calls[0].opt.headers));

await rank.top('today');
assert.match(calls[1].url, /order=score\.desc.*&limit=10&created_at=gte\.\d{4}-\d\d-\d\dT15:00:00\.000Z$/);  // 한국 0시 = UTC 15시
await rank.top('all');
assert(!calls[2].url.includes('created_at=gte'));

assert.equal(await rank.rankOf(120, 'all'), 5);  // 더 높은 기록 4개 → 5위
assert.match(calls[3].url, /score=gt\.120/);
// 금지어: 우회 표기도 잡고, 평범한 닉네임은 통과
for (const bad of ['시발', '시 1발', 'ㅅㅂ', '병신123', 'FuCk', 'f.u.c.k', '관리자', '개새끼야']) assert(!rank.isClean(bad), bad);
for (const ok of ['나나', 'algo_kim', '정렬장인', 'bubble', '코딩하는앵무새', '퀵소트99']) assert(rank.isClean(ok), ok);
// SQL과 JS 목록이 같은지
const sql = fs.readFileSync(new URL('./supabase.sql', import.meta.url), 'utf8');
assert.equal(sql.match(/!~ '([^']+)'/)[1], rank.BANNED, 'supabase.sql 금지어 목록이 rank.js와 다름');
console.log('ok rank');
