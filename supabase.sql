-- 알고 닌자 랭킹 테이블. Supabase 대시보드 → SQL Editor에 통째로 붙여 넣고 Run.
-- 공개 키(anon/publishable)로는 "추가"와 "조회"만 된다. 수정·삭제 정책이 없어서 남의 기록은 못 건드린다.

create table if not exists public.scores (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 1 and 12),
  score int not null check (score >= 0),
  played_ms int not null check (played_ms between 1000 and 3600000),
  created_at timestamptz not null default now(),
  -- 플레이 시간에 비해 말이 안 되는 점수는 거부 (1초에 600점 넘게는 못 번다)
  constraint plausible_score check (score <= 50 + played_ms * 0.6)
);

create index if not exists scores_score_idx on public.scores (score desc);
create index if not exists scores_created_idx on public.scores (created_at);

alter table public.scores enable row level security;

drop policy if exists "anyone can read" on public.scores;
create policy "anyone can read" on public.scores for select to anon using (true);

drop policy if exists "anyone can add" on public.scores;
create policy "anyone can add" on public.scores for insert to anon with check (true);

-- 닉네임 금지어 (rank.js의 BANNED와 같은 목록). 공백·숫자·기호를 빼고 비교한다.
create or replace function public.clean_name(n text) returns boolean
language sql immutable as $$
  select lower(regexp_replace(n, '[^가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z]', '', 'g')) !~ '시발|씨발|씨바|씨빨|씨팔|시팔|ㅅㅂ|ㅆㅂ|병신|븅신|빙신|ㅂㅅ|좆|존나|졸라|ㅈㄴ|지랄|ㅈㄹ|개새|새끼|ㅅㄲ|섹스|보지|자지|니애미|느금|엠창|애미|애비|꺼져|닥쳐|등신|한남|김치녀|메갈|일베|홍어|틀딱|fuck|fuk|shit|bitch|sex|porn|cunt|dick|pussy|nigg|asshole|운영자|관리자'
$$;
delete from public.scores where not public.clean_name(name);
alter table public.scores drop constraint if exists clean_name;
alter table public.scores add constraint clean_name check (public.clean_name(name));

-- 공개 키는 이름·점수·플레이 시간만 넣을 수 있다 (id·created_at은 서버가 정함)
revoke all on public.scores from anon;
grant select on public.scores to anon;
grant insert (name, score, played_ms) on public.scores to anon;
