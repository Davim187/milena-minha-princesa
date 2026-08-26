-- Preenche as tabelas com as 3 perguntas da experiência.
-- Cole o arquivo INTEIRO no SQL Editor e rode uma vez.

delete from public.experiencias where sessao_id = 'seed-catalogo';

with exp as (
  insert into public.experiencias (id, sessao_id, inicio, finalizada)
  values (gen_random_uuid(), 'seed-catalogo', now(), false)
  returning id
),
perguntas as (
  insert into public.experiencia_perguntas (id, experiencia_id, pergunta_id, pergunta, opcoes)
  select gen_random_uuid(), exp.id, v.pergunta_id, v.pergunta, v.opcoes::jsonb
  from exp
  cross join (
    values
      (
        'pergunta_1',
        'Você pretende continuar falando com esse programador?',
        '["Não","Talvez","Sim 👀"]'
      ),
      (
        'pergunta_2',
        'Você toparia um segundo encontro?',
        '["NÃO","CLARO"]'
      ),
      (
        'pergunta_3',
        'Qual dessas opções parece mais perigosa?',
        '["❤️ Continuar conversando","😏 Sair novamente","🔥 Repetir o beijo","😂 Todas as anteriores"]'
      )
  ) as v(pergunta_id, pergunta, opcoes)
  returning id, pergunta_id, experiencia_id
),
opcoes as (
  insert into public.experiencia_opcoes (pergunta_id, opcao, quantidade_cliques)
  select p.id, o.opcao, 0
  from perguntas p
  join (
    values
      ('pergunta_1', 'Não'),
      ('pergunta_1', 'Talvez'),
      ('pergunta_1', 'Sim 👀'),
      ('pergunta_2', 'NÃO'),
      ('pergunta_2', 'CLARO'),
      ('pergunta_3', '❤️ Continuar conversando'),
      ('pergunta_3', '😏 Sair novamente'),
      ('pergunta_3', '🔥 Repetir o beijo'),
      ('pergunta_3', '😂 Todas as anteriores')
  ) as o(pergunta_id, opcao)
    on o.pergunta_id = p.pergunta_id
  returning id
)
insert into public.experiencia_eventos (experiencia_id, tipo, dados, timestamp)
select exp.id, e.tipo, e.dados::jsonb, now()
from exp
cross join (
  values
    ('inicio_experiencia', '{"origem":"seed"}'),
    ('pergunta_registrada', '{"pergunta_id":"pergunta_1"}'),
    ('pergunta_registrada', '{"pergunta_id":"pergunta_2"}'),
    ('pergunta_registrada', '{"pergunta_id":"pergunta_3"}')
) as e(tipo, dados);
