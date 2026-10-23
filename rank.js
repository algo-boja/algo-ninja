// 랭킹: Supabase REST를 fetch로 바로 부른다 (라이브러리 없음). 공개 키는 apikey 헤더로만 보낸다.
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

export const enabled = Boolean(SUPABASE_URL && SUPABASE_KEY);

// 닉네임 금지어. supabase.sql의 clean_name()과 같은 목록이어야 한다 (test_rank.mjs가 비교).
// 공백·숫자·기호를 빼고 비교해서 "시 1발" 같은 우회도 잡는다.
export const BANNED = '시발|씨발|씨바|씨빨|씨팔|시팔|ㅅㅂ|ㅆㅂ|병신|븅신|빙신|ㅂㅅ|좆|존나|졸라|ㅈㄴ|지랄|ㅈㄹ|개새|새끼|ㅅㄲ|섹스|보지|자지|니애미|느금|엠창|애미|애비|꺼져|닥쳐|등신|한남|김치녀|메갈|일베|홍어|틀딱|fuck|fuk|shit|bitch|sex|porn|cunt|dick|pussy|nigg|asshole|운영자|관리자';
const banned = new RegExp(BANNED);
export const isClean = name => !banned.test(name.replace(/[^가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z]/g, '').toLowerCase());
const api = `${SUPABASE_URL}/rest/v1/scores`;
const headers = { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' };

// 오늘 0시(한국 시간)를 UTC ISO로
function todayStartIso() {
  const kst = new Date(Date.now() + 9 * 3600e3);
  return new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()) - 9 * 3600e3).toISOString();
}

export async function submit(name, score, playedMs) {
  const r = await fetch(api, {
    method: 'POST', headers: { ...headers, Prefer: 'return=minimal' },
    body: JSON.stringify({ name, score, played_ms: Math.round(playedMs) }),
  });
  if (!r.ok) throw new Error(`등록 실패 (${r.status})`);
}

export async function top(period, limit = 10) {
  const since = period === 'today' ? `&created_at=gte.${todayStartIso()}` : '';
  const r = await fetch(`${api}?select=name,score&order=score.desc,created_at.asc&limit=${limit}${since}`, { headers });
  if (!r.ok) throw new Error(`불러오기 실패 (${r.status})`);
  return r.json();
}

// 이 점수보다 높은 기록 수 + 1
export async function rankOf(score, period) {
  const since = period === 'today' ? `&created_at=gte.${todayStartIso()}` : '';
  const r = await fetch(`${api}?select=id&score=gt.${score}${since}`, { method: 'HEAD', headers: { ...headers, Prefer: 'count=exact' } });
  if (!r.ok) throw new Error(`순위 실패 (${r.status})`);
  return Number((r.headers.get('content-range') || '*/0').split('/')[1]) + 1;
}
