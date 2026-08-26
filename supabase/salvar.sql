-- Rode este arquivo INTEIRO no SQL Editor.
-- Uma função só: cria experiência, pergunta, opção e evento na ordem certa.

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

    if (v_item->>'id') = v_catalogo or v_catalogo is null then
      null;
    end if;

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

    if v_opcao is not null then
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

revoke all on function public.salvar_evento(jsonb) from public;
grant execute on function public.salvar_evento(jsonb) to anon, authenticated;

notify pgrst, 'reload schema';
