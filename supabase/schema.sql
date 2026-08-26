-- Projeto: Ela — schema Supabase
-- Cole este arquivo em: SQL Editor → New query → Run

create extension if not exists "pgcrypto";

create table if not exists public.experiencias (
  id uuid primary key default gen_random_uuid(),
  sessao_id text unique not null,
  inicio timestamptz not null,
  fim timestamptz,
  finalizada boolean not null default false,
  duracao_segundos integer,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.experiencia_perguntas (
  id uuid primary key default gen_random_uuid(),
  experiencia_id uuid not null references public.experiencias (id) on delete cascade,
  pergunta_id text not null,
  pergunta text not null,
  opcoes jsonb not null,
  resposta_final text,
  timestamp_resposta timestamptz,
  criado_em timestamptz not null default now(),
  unique (experiencia_id, pergunta_id)
);

create table if not exists public.experiencia_opcoes (
  id uuid primary key default gen_random_uuid(),
  pergunta_id uuid not null references public.experiencia_perguntas (id) on delete cascade,
  opcao text not null,
  quantidade_cliques integer not null default 0,
  criado_em timestamptz not null default now(),
  unique (pergunta_id, opcao)
);

create table if not exists public.experiencia_eventos (
  id uuid primary key default gen_random_uuid(),
  experiencia_id uuid not null references public.experiencias (id) on delete cascade,
  pergunta_id uuid references public.experiencia_perguntas (id) on delete set null,
  tipo text not null,
  opcao text,
  dados jsonb,
  timestamp timestamptz not null default now()
);

create index if not exists experiencias_sessao_id_idx on public.experiencias (sessao_id);
create index if not exists experiencias_criado_em_idx on public.experiencias (criado_em);
create index if not exists experiencia_perguntas_experiencia_id_idx on public.experiencia_perguntas (experiencia_id);
create index if not exists experiencia_opcoes_pergunta_id_idx on public.experiencia_opcoes (pergunta_id);
create index if not exists experiencia_eventos_experiencia_id_idx on public.experiencia_eventos (experiencia_id);
create index if not exists experiencia_eventos_timestamp_idx on public.experiencia_eventos (timestamp);
create index if not exists experiencia_eventos_tipo_idx on public.experiencia_eventos (tipo);

create or replace function public.set_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists experiencias_set_atualizado_em on public.experiencias;
create trigger experiencias_set_atualizado_em
before update on public.experiencias
for each row
execute function public.set_atualizado_em();

create or replace function public.registrar_clique(
  p_evento_id uuid,
  p_experiencia_id uuid,
  p_pergunta_id uuid,
  p_opcao text,
  p_timestamp timestamptz,
  p_dados jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted integer;
begin
  insert into public.experiencia_eventos (id, experiencia_id, pergunta_id, tipo, opcao, dados, timestamp)
  values (p_evento_id, p_experiencia_id, p_pergunta_id, 'clique_opcao', p_opcao, p_dados, p_timestamp)
  on conflict (id) do nothing;

  get diagnostics inserted = row_count;

  if inserted > 0 then
    insert into public.experiencia_opcoes (pergunta_id, opcao, quantidade_cliques)
    values (p_pergunta_id, p_opcao, 1)
    on conflict (pergunta_id, opcao)
    do update set quantidade_cliques = public.experiencia_opcoes.quantidade_cliques + 1;
  end if;
end;
$$;

create or replace function public.definir_resposta_final(
  p_evento_id uuid,
  p_experiencia_id uuid,
  p_pergunta_id uuid,
  p_resposta text,
  p_timestamp timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted integer;
begin
  insert into public.experiencia_eventos (id, experiencia_id, pergunta_id, tipo, opcao, dados, timestamp)
  values (
    p_evento_id,
    p_experiencia_id,
    p_pergunta_id,
    'resposta_final',
    p_resposta,
    jsonb_build_object('resposta', p_resposta),
    p_timestamp
  )
  on conflict (id) do nothing;

  get diagnostics inserted = row_count;

  if inserted > 0 then
    update public.experiencia_perguntas
    set
      resposta_final = p_resposta,
      timestamp_resposta = p_timestamp
    where id = p_pergunta_id;
  end if;
end;
$$;

create or replace function public.finalizar_experiencia(
  p_evento_id uuid,
  p_sessao_id text,
  p_fim timestamptz,
  p_duracao_segundos integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  exp_id uuid;
  inserted integer;
begin
  select id into exp_id
  from public.experiencias
  where sessao_id = p_sessao_id;

  if exp_id is null then
    return;
  end if;

  insert into public.experiencia_eventos (id, experiencia_id, tipo, timestamp)
  values (p_evento_id, exp_id, 'experiencia_finalizada', p_fim)
  on conflict (id) do nothing;

  get diagnostics inserted = row_count;

  if inserted > 0 then
    update public.experiencias
    set
      fim = p_fim,
      finalizada = true,
      duracao_segundos = p_duracao_segundos
    where id = exp_id;
  end if;
end;
$$;

create or replace function public.garantir_pergunta(
  p_id uuid,
  p_experiencia_id uuid,
  p_pergunta_id text,
  p_pergunta text,
  p_opcoes jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_opcao text;
begin
  select ep.id
    into v_id
  from public.experiencia_perguntas ep
  where ep.experiencia_id = p_experiencia_id
    and ep.pergunta_id = p_pergunta_id
  limit 1;

  if v_id is null then
    insert into public.experiencia_perguntas (id, experiencia_id, pergunta_id, pergunta, opcoes)
    values (p_id, p_experiencia_id, p_pergunta_id, p_pergunta, coalesce(p_opcoes, '[]'::jsonb))
    on conflict (experiencia_id, pergunta_id) do nothing
    returning id into v_id;

    if v_id is null then
      select ep.id
        into v_id
      from public.experiencia_perguntas ep
      where ep.experiencia_id = p_experiencia_id
        and ep.pergunta_id = p_pergunta_id
      limit 1;
    end if;
  end if;

  if v_id is null then
    v_id := p_id;
  end if;

  if jsonb_typeof(p_opcoes) = 'array' then
    for v_opcao in
      select jsonb_array_elements_text(p_opcoes)
    loop
      insert into public.experiencia_opcoes (pergunta_id, opcao, quantidade_cliques)
      values (v_id, v_opcao, 0)
      on conflict (pergunta_id, opcao) do nothing;
    end loop;
  end if;

  return v_id;
end;
$$;

create or replace function public.salvar_evento(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_experiencia_id uuid;
  v_desired_id uuid;
  v_sessao_id text;
  v_inicio timestamptz;
  v_pergunta_uuid uuid;
  v_evento_id uuid;
  v_tipo text;
  v_catalogo text;
  v_opcao text;
  v_item jsonb;
  v_opcao_texto text;
  v_lista jsonb;
  v_opcoes jsonb;
begin
  v_tipo := coalesce(nullif(p->>'tipo', ''), 'evento');
  v_sessao_id := coalesce(nullif(p->>'sessao_id', ''), nullif(p->>'experiencia_id', ''));
  if v_sessao_id is null then
    raise exception 'sessao_id ausente';
  end if;

  begin
    v_desired_id := coalesce((p->>'experiencia_id')::uuid, v_sessao_id::uuid);
  exception when invalid_text_representation then
    v_desired_id := gen_random_uuid();
  end;

  begin
    v_evento_id := coalesce((p->>'id')::uuid, gen_random_uuid());
  exception when invalid_text_representation then
    v_evento_id := gen_random_uuid();
  end;

  v_inicio := coalesce((p->>'inicio')::timestamptz, (p->>'timestamp')::timestamptz, now());
  v_catalogo := nullif(p->>'pergunta_catalogo_id', '');
  v_opcao := coalesce(nullif(p->>'opcao', ''), nullif(p->>'resposta', ''));

  insert into public.experiencias (id, sessao_id, inicio)
  values (v_desired_id, v_sessao_id, v_inicio)
  on conflict (sessao_id) do nothing;

  select e.id into v_experiencia_id
  from public.experiencias e
  where e.sessao_id = v_sessao_id
  limit 1;

  if v_experiencia_id is null then
    insert into public.experiencias (id, sessao_id, inicio)
    values (v_desired_id, v_sessao_id, v_inicio)
    on conflict (id) do nothing
    returning id into v_experiencia_id;

    if v_experiencia_id is null then
      select e.id into v_experiencia_id
      from public.experiencias e
      where e.id = v_desired_id
      limit 1;
    end if;
  end if;

  v_lista := coalesce(p->'perguntas', '[]'::jsonb);
  if jsonb_typeof(v_lista) <> 'array' then
    v_lista := '[]'::jsonb;
  end if;
  if v_catalogo is not null then
    v_lista := v_lista || jsonb_build_array(
      jsonb_build_object(
        'id', v_catalogo,
        'uuid', p->>'pergunta_uuid',
        'pergunta', coalesce(p->>'pergunta', ''),
        'opcoes', coalesce(p->'opcoes', '[]'::jsonb)
      )
    );
  end if;

  for v_item in
    select value from jsonb_array_elements(v_lista)
  loop
    v_opcoes := case
      when jsonb_typeof(v_item->'opcoes') = 'array' then v_item->'opcoes'
      else '[]'::jsonb
    end;

    insert into public.experiencia_perguntas (id, experiencia_id, pergunta_id, pergunta, opcoes)
    values (
      coalesce(nullif(v_item->>'uuid', '')::uuid, gen_random_uuid()),
      v_experiencia_id,
      v_item->>'id',
      coalesce(v_item->>'pergunta', ''),
      v_opcoes
    )
    on conflict (experiencia_id, pergunta_id) do update
      set pergunta = excluded.pergunta,
          opcoes = excluded.opcoes
    returning id into v_pergunta_uuid;

    if jsonb_typeof(v_opcoes) = 'array' then
      for v_opcao_texto in
        select jsonb_array_elements_text(v_opcoes)
      loop
        insert into public.experiencia_opcoes (pergunta_id, opcao, quantidade_cliques)
        values (v_pergunta_uuid, v_opcao_texto, 0)
        on conflict (pergunta_id, opcao) do nothing;
      end loop;
    end if;
  end loop;

  if v_catalogo is not null then
    select ep.id into v_pergunta_uuid
    from public.experiencia_perguntas ep
    where ep.experiencia_id = v_experiencia_id
      and ep.pergunta_id = v_catalogo
    limit 1;

    if v_opcao is not null and v_pergunta_uuid is not null then
      insert into public.experiencia_opcoes (pergunta_id, opcao, quantidade_cliques)
      values (v_pergunta_uuid, v_opcao, 0)
      on conflict (pergunta_id, opcao) do nothing;
    end if;
  else
    v_pergunta_uuid := null;
  end if;

  if v_tipo <> 'pergunta_pronta' then
    insert into public.experiencia_eventos (
      id, experiencia_id, pergunta_id, tipo, opcao, dados, timestamp
    )
    values (
      v_evento_id,
      v_experiencia_id,
      v_pergunta_uuid,
      v_tipo,
      v_opcao,
      coalesce(p->'dados', '{}'::jsonb),
      coalesce((p->>'timestamp')::timestamptz, now())
    )
    on conflict (id) do nothing;
  end if;

  if v_tipo = 'clique_opcao' and v_pergunta_uuid is not null and v_opcao is not null then
    if p ? 'quantidade_cliques' and (p->>'quantidade_cliques') is not null then
      update public.experiencia_opcoes
      set quantidade_cliques = greatest(coalesce((p->>'quantidade_cliques')::integer, 0), quantidade_cliques)
      where pergunta_id = v_pergunta_uuid
        and opcao = v_opcao;
    else
      update public.experiencia_opcoes
      set quantidade_cliques = quantidade_cliques + 1
      where pergunta_id = v_pergunta_uuid
        and opcao = v_opcao;
    end if;
  end if;

  if v_tipo = 'resposta_final' and v_pergunta_uuid is not null then
    update public.experiencia_perguntas
    set
      resposta_final = coalesce(p->>'resposta', v_opcao),
      timestamp_resposta = coalesce((p->>'timestamp')::timestamptz, now())
    where id = v_pergunta_uuid;
  end if;

  if v_tipo = 'experiencia_finalizada' then
    update public.experiencias
    set
      fim = coalesce((p->>'fim')::timestamptz, now()),
      finalizada = true,
      duracao_segundos = (p->>'duracao_segundos')::integer
    where id = v_experiencia_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'experiencia_id', v_experiencia_id,
    'evento_id', v_evento_id,
    'pergunta_id', v_pergunta_uuid
  );
end;
$$;

revoke all on function public.registrar_clique(uuid, uuid, uuid, text, timestamptz, jsonb) from public;
revoke all on function public.definir_resposta_final(uuid, uuid, uuid, text, timestamptz) from public;
revoke all on function public.finalizar_experiencia(uuid, text, timestamptz, integer) from public;
revoke all on function public.garantir_pergunta(uuid, uuid, text, text, jsonb) from public;

revoke all on function public.salvar_evento(jsonb) from public;

grant execute on function public.registrar_clique(uuid, uuid, uuid, text, timestamptz, jsonb) to anon, authenticated;
grant execute on function public.definir_resposta_final(uuid, uuid, uuid, text, timestamptz) to anon, authenticated;
grant execute on function public.finalizar_experiencia(uuid, text, timestamptz, integer) to anon, authenticated;
grant execute on function public.garantir_pergunta(uuid, uuid, text, text, jsonb) to anon, authenticated;
grant execute on function public.salvar_evento(jsonb) to anon, authenticated;

alter table public.experiencias enable row level security;
alter table public.experiencia_perguntas enable row level security;
alter table public.experiencia_opcoes enable row level security;
alter table public.experiencia_eventos enable row level security;

drop policy if exists experiencias_insert_anon on public.experiencias;
drop policy if exists experiencias_update_anon on public.experiencias;
drop policy if exists experiencia_perguntas_insert_anon on public.experiencia_perguntas;
drop policy if exists experiencia_perguntas_update_anon on public.experiencia_perguntas;
drop policy if exists experiencia_opcoes_insert_anon on public.experiencia_opcoes;
drop policy if exists experiencia_opcoes_update_anon on public.experiencia_opcoes;
drop policy if exists experiencia_eventos_insert_anon on public.experiencia_eventos;

create policy experiencias_insert_anon
  on public.experiencias
  for insert
  to anon, authenticated
  with check (true);

create policy experiencias_update_anon
  on public.experiencias
  for update
  to anon, authenticated
  using (true)
  with check (true);

create policy experiencia_perguntas_insert_anon
  on public.experiencia_perguntas
  for insert
  to anon, authenticated
  with check (true);

create policy experiencia_perguntas_update_anon
  on public.experiencia_perguntas
  for update
  to anon, authenticated
  using (true)
  with check (true);

create policy experiencia_opcoes_insert_anon
  on public.experiencia_opcoes
  for insert
  to anon, authenticated
  with check (true);

create policy experiencia_opcoes_update_anon
  on public.experiencia_opcoes
  for update
  to anon, authenticated
  using (true)
  with check (true);

create policy experiencia_eventos_insert_anon
  on public.experiencia_eventos
  for insert
  to anon, authenticated
  with check (true);

grant usage on schema public to anon, authenticated;
grant insert, update on public.experiencias to anon, authenticated;
grant insert, update on public.experiencia_perguntas to anon, authenticated;
grant insert, update on public.experiencia_opcoes to anon, authenticated;
grant insert on public.experiencia_eventos to anon, authenticated;
