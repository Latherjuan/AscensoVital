-- Pega esto en Supabase > SQL Editor > New query > Run, DESPUES de haber subido las 12
-- carpetas de _subir_a_supabase/ al bucket "boss-sprites" (una carpeta = un jefe, cada una
-- con 0.png..4.png). Si cambias algun texto/estado, edita aqui antes de correrlo.

-- 1) Actualiza el dragon existente para que use el sprite nuevo (conserva su texto y pilares).
update public.boss_templates
set sprite_base_url = 'https://vjfgshondpbcbwqgucqd.supabase.co/storage/v1/object/public/boss-sprites/dragon'
where id = 'dragon';

-- 2) Jefes nuevos.
insert into public.boss_templates (id, boss_name, pillars, example, states, sprite_base_url, sort_order) values
  ('demon', 'Demonio de la Autoexigencia', array['autoestima'], 'Dejar de autoexigirte tanto',
    array['Sano','Cuernos astillados','Postura tensa','Ceniza y humo','Reducido a cenizas'],
    'https://vjfgshondpbcbwqgucqd.supabase.co/storage/v1/object/public/boss-sprites/demon', 4),

  ('mirror', 'Espejo Cruel', array['autoestima'], 'Aceptar tu reflejo tal como es',
    array['Sano','Grietas leves','Reflejo distorsionado','Espejo roto','Hecho añicos'],
    'https://vjfgshondpbcbwqgucqd.supabase.co/storage/v1/object/public/boss-sprites/mirror', 5),

  ('death', 'La Parca del Perfeccionismo', array['autoestima'], 'Perdonarte un error',
    array['Sano','Guadaña mellada','Capucha rasgada','Desvaneciéndose','Disuelta'],
    'https://vjfgshondpbcbwqgucqd.supabase.co/storage/v1/object/public/boss-sprites/death', 6),

  ('snake', 'Serpiente de la Comparación', array['autoestima'], 'Callar la voz que te compara con otros',
    array['Sano','Escamas sueltas','Piel desprendida','Enroscada y débil','Inerte'],
    'https://vjfgshondpbcbwqgucqd.supabase.co/storage/v1/object/public/boss-sprites/snake', 7),

  ('armor_ae', 'Armadura del Orgullo Herido', array['autoestima'], 'Bajar la guardia y pedir ayuda',
    array['Sano','Abolladuras','Placas sueltas','Armadura resquebrajada','Hecha pedazos'],
    'https://vjfgshondpbcbwqgucqd.supabase.co/storage/v1/object/public/boss-sprites/armor_ae', 8),

  ('blacknight', 'Caballero Negro del Autosabotaje', array['autoestima'], 'Vencer un hábito autodestructivo',
    array['Sano','Yelmo abollado','Espada rota','Armadura caída','Derrotado'],
    'https://vjfgshondpbcbwqgucqd.supabase.co/storage/v1/object/public/boss-sprites/blacknight', 9),

  ('overtink', 'Espiral de Overthinking', array['consciencia'], 'Frenar un pensamiento en bucle',
    array['Sano','Espiral tambaleante','Pensamientos dispersos','Casi disuelto','Silenciado'],
    'https://vjfgshondpbcbwqgucqd.supabase.co/storage/v1/object/public/boss-sprites/overtink', 10),

  ('memory_fog', 'Niebla Mental', array['consciencia'], 'Aclarar la mente con una pausa',
    array['Sano','Niebla ligera','Niebla espesa','Disipándose','Despejada'],
    'https://vjfgshondpbcbwqgucqd.supabase.co/storage/v1/object/public/boss-sprites/memory_fog', 11),

  ('doubt', 'La Duda', array['consciencia'], 'Tomar una decisión pendiente',
    array['Sano','Vacilante','Fracturada','Desvaneciéndose','Resuelta'],
    'https://vjfgshondpbcbwqgucqd.supabase.co/storage/v1/object/public/boss-sprites/doubt', 12),

  ('distraction_siren', 'Sirena de la Distracción', array['consciencia'], 'Completar un bloque de enfoque sin distraerte',
    array['Sano','Canto débil','Alas rotas','Silenciándose','Silenciada'],
    'https://vjfgshondpbcbwqgucqd.supabase.co/storage/v1/object/public/boss-sprites/distraction_siren', 13),

  ('rigid_dogma', 'Dogma Rígido', array['consciencia'], 'Cuestionar una creencia limitante',
    array['Sano','Grietas en el dogma','Estructura tambaleante','Desmoronándose','Derrumbado'],
    'https://vjfgshondpbcbwqgucqd.supabase.co/storage/v1/object/public/boss-sprites/rigid_dogma', 14)
on conflict (id) do nothing;
