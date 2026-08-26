-- Rode este arquivo INTEIRO no SQL Editor.
-- Libera INSERT + UPDATE para o site gravar cliques e respostas.

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
  on public.experiencias for insert to anon, authenticated with check (true);

create policy experiencias_update_anon
  on public.experiencias for update to anon, authenticated using (true) with check (true);

create policy experiencia_perguntas_insert_anon
  on public.experiencia_perguntas for insert to anon, authenticated with check (true);

create policy experiencia_perguntas_update_anon
  on public.experiencia_perguntas for update to anon, authenticated using (true) with check (true);

create policy experiencia_opcoes_insert_anon
  on public.experiencia_opcoes for insert to anon, authenticated with check (true);

create policy experiencia_opcoes_update_anon
  on public.experiencia_opcoes for update to anon, authenticated using (true) with check (true);

create policy experiencia_eventos_insert_anon
  on public.experiencia_eventos for insert to anon, authenticated with check (true);

grant usage on schema public to anon, authenticated;
grant insert, update on public.experiencias to anon, authenticated;
grant insert, update on public.experiencia_perguntas to anon, authenticated;
grant insert, update on public.experiencia_opcoes to anon, authenticated;
grant insert on public.experiencia_eventos to anon, authenticated;

notify pgrst, 'reload schema';
