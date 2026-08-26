-- Rode este arquivo INTEIRO no SQL Editor.
-- Garante a pergunta antes do evento, mesmo se o UUID local estiver desatualizado.

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

revoke all on function public.garantir_pergunta(uuid, uuid, text, text, jsonb) from public;
grant execute on function public.garantir_pergunta(uuid, uuid, text, text, jsonb) to anon, authenticated;

notify pgrst, 'reload schema';
