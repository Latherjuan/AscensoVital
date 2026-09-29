-- Pega esto en Supabase (proyecto vjfgshondpbcbwqgucqd) > SQL Editor > New query > Run,
-- DESPUES de haber subido las 6 carpetas de _subir_a_supabase_2/ al bucket "boss-sprites".

insert into public.boss_templates (id, boss_name, pillars, example, states, sprite_base_url, sort_order) values
  ('bot', 'Autómata del Sedentarismo', array['fisica'], 'Levantarte a moverte cada hora',
    array['Sano','Engranajes flojos','Chispas y humo','Piezas sueltas','Desarmado'],
    'https://vjfgshondpbcbwqgucqd.supabase.co/storage/v1/object/public/boss-sprites/bot', 15),

  ('lazy_golem', 'Gólem de la Pereza', array['fisica'], 'Salir a caminar aunque no tengas ganas',
    array['Sano','Grietas en la piedra','Musgo desprendido','A punto de derrumbarse','Derrumbado'],
    'https://vjfgshondpbcbwqgucqd.supabase.co/storage/v1/object/public/boss-sprites/lazy_golem', 16),

  ('rhino_task', 'Rinoceronte Encadenado', array['fisica'], 'Terminar esa rutina de ejercicio pendiente',
    array['Sano','Cadenas tensas','Cadenas rotas','Exhausto','Rendido'],
    'https://vjfgshondpbcbwqgucqd.supabase.co/storage/v1/object/public/boss-sprites/rhino_task', 17),

  ('comfort_blob', 'Bolita de la Comodidad', array['fisica'], 'Cambiar el sofá por 10 minutos de movimiento',
    array['Sano','Tambaleante','Derritiéndose','Casi disuelta','Disuelta'],
    'https://vjfgshondpbcbwqgucqd.supabase.co/storage/v1/object/public/boss-sprites/comfort_blob', 18),

  ('fatigue_ghost', 'Fantasma del Cansancio', array['fisica'], 'Dormir temprano una noche',
    array['Sano','Parpadeando','Desvaneciéndose','Casi transparente','Disipado'],
    'https://vjfgshondpbcbwqgucqd.supabase.co/storage/v1/object/public/boss-sprites/fatigue_ghost', 19),

  ('couch_drain', 'El Sillón Devorador', array['fisica'], 'Apagar la pantalla y salir a moverte',
    array['Sano','Cojines sueltos','Costuras rotas','Colapsando','Consumido en el vacío'],
    'https://vjfgshondpbcbwqgucqd.supabase.co/storage/v1/object/public/boss-sprites/couch_drain', 20)
on conflict (id) do nothing;
