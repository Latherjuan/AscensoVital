-- Pega esto en Supabase (proyecto vjfgshondpbcbwqgucqd) > SQL Editor > New query > Run,
-- DESPUES de haber subido las 12 carpetas de _subir_a_supabase_3/ al bucket "boss-sprites".

insert into public.boss_templates (id, boss_name, pillars, example, states, sprite_base_url, sort_order) values
  -- Social
  ('break_wall', 'Muro del Rechazo', array['social'], 'Enviar el mensaje que llevas posponiendo',
    array['Sano','Primera grieta','Ladrillos sueltos','A punto de caer','Derribado'],
    'https://vjfgshondpbcbwqgucqd.supabase.co/storage/v1/object/public/boss-sprites/break_wall', 21),

  ('ghoster', 'El Ghostero', array['social'], 'Responder un mensaje pendiente',
    array['Sano','Desvaneciéndose','Casi transparente','Apenas visible','Esfumado'],
    'https://vjfgshondpbcbwqgucqd.supabase.co/storage/v1/object/public/boss-sprites/ghoster', 22),

  ('happy_masked', 'Máscara de Sonrisa Falsa', array['social'], 'Decir cómo te sientes de verdad a alguien',
    array['Sano','Grieta en la máscara','Máscara floja','Cayéndose','Sin máscara'],
    'https://vjfgshondpbcbwqgucqd.supabase.co/storage/v1/object/public/boss-sprites/happy_masked', 23),

  ('isolated_gargoyle', 'Gárgola del Aislamiento', array['social'], 'Salir de casa a ver a alguien',
    array['Sano','Alas plegadas','Piedra agrietada','A punto de romperse','Hecha pedazos'],
    'https://vjfgshondpbcbwqgucqd.supabase.co/storage/v1/object/public/boss-sprites/isolated_gargoyle', 24),

  ('multifaced', 'Camaleón Social', array['social'], 'Ser tú mismo/a con alguien de confianza',
    array['Sano','Reflejo dudoso','Reflejo roto','Sin reflejo claro','Rostro propio'],
    'https://vjfgshondpbcbwqgucqd.supabase.co/storage/v1/object/public/boss-sprites/multifaced', 25),

  ('never_crow', 'Cuervo del Silencio', array['social'], 'Retomar el contacto con alguien',
    array['Sano','Graznido débil','Sin respuesta','Alejándose','Se fue volando'],
    'https://vjfgshondpbcbwqgucqd.supabase.co/storage/v1/object/public/boss-sprites/never_crow', 26),

  -- Fisiológica
  ('sleepy_gargoyle', 'Gárgola del Desvelo', array['fisiologica'], 'Dormir tus horas completas hoy',
    array['Sano','Bostezando','Párpados pesados','A punto de dormirse','Rendida'],
    'https://vjfgshondpbcbwqgucqd.supabase.co/storage/v1/object/public/boss-sprites/sleepy_gargoyle', 27),

  ('hydra', 'Hidra de la Deshidratación', array['fisiologica'], 'Tomar un vaso de agua ahora mismo',
    array['Sano','Una cabeza débil','Dos cabezas débiles','Casi sin fuego','Apagada'],
    'https://vjfgshondpbcbwqgucqd.supabase.co/storage/v1/object/public/boss-sprites/hydra', 28),

  ('lazy_elf', 'Duende de la Trasnochada', array['fisiologica'], 'Apagar la luz a tu hora',
    array['Sano','Vela chisporroteando','Ojeras marcadas','A punto de apagarse','Dormido'],
    'https://vjfgshondpbcbwqgucqd.supabase.co/storage/v1/object/public/boss-sprites/lazy_elf', 29),

  ('mummy', 'Momia del Ayuno Involuntario', array['fisiologica'], 'No saltarte una comida hoy',
    array['Sano','Vendas sueltas','Paso tambaleante','Deshaciéndose','Desenvuelta'],
    'https://vjfgshondpbcbwqgucqd.supabase.co/storage/v1/object/public/boss-sprites/mummy', 30),

  ('scary_lazy', 'Espectro de la Pantalla Nocturna', array['fisiologica'], 'Dejar el celular fuera del cuarto',
    array['Sano','Alterado','Gritando','Perdiendo forma','Silenciado'],
    'https://vjfgshondpbcbwqgucqd.supabase.co/storage/v1/object/public/boss-sprites/scary_lazy', 31),

  ('sugar_blob', 'Bola de Azúcar', array['fisiologica'], 'Elegir algo más saludable en tu próxima comida',
    array['Sano','Perdiendo brillo','Desinflándose','Casi plana','Disuelta'],
    'https://vjfgshondpbcbwqgucqd.supabase.co/storage/v1/object/public/boss-sprites/sugar_blob', 32)
on conflict (id) do nothing;
