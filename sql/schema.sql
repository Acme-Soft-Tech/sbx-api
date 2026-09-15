-- Three tables. Two feed the monitoring bands, one is the SMS stub.

create table if not exists test_runs (
  id           bigserial primary key,
  run_id       text not null,
  suite        text not null,
  markers      text,
  base_url     text,
  started_at   timestamptz not null default now(),
  finished_at  timestamptz,
  passed       int not null default 0,
  failed       int not null default 0,
  skipped      int not null default 0,
  pass_rate    numeric generated always as (
                 case when (passed + failed) = 0 then null
                 else round(passed::numeric / (passed + failed), 4) end) stored
);

create table if not exists test_results (
  id        bigserial primary key,
  run_id    text not null references test_runs(run_id) on delete cascade,
  nodeid    text not null,
  outcome   text not null,
  duration  numeric,
  message   text,
  trace_url text
);

-- The SMS stub. In the real system this row would be a text message to a person.
-- Probe P3 asserts this count is unchanged.
create table if not exists sent_messages (
  id         bigserial primary key,
  to_number  text not null,
  body       text not null,
  sent_at    timestamptz not null default now(),
  run_id     text
);

create index if not exists test_runs_started_idx  on test_runs (started_at desc);
create index if not exists test_results_run_idx   on test_results (run_id);
