-- ============================================================
-- sql/demo-seed.sql — données de démo (« Tes amis adorent » + Fil)
-- Version SQL simple (sans bloc DO/PL-pgSQL) → robuste au copier-coller.
-- Remplace 'william' par ton @pseudo si besoin, puis lance TOUT le fichier.
-- Idempotent. Bloc de nettoyage tout en bas.
--
-- Ajoute des favoris/visites/activité à tes 3 premiers amis acceptés, sur de
-- vrais restos du Marais → avatars sur les cartes + Fil rempli.
-- ============================================================

-- 1) FAVORIS (feed « Tes amis adorent »)
INSERT INTO favorites (user_id, osm_id, name, lat, lon, snapshot)
SELECT fr.fid, d.osm_id, d.name, d.lat, d.lon, d.snapshot::jsonb
FROM (
  SELECT CASE WHEN f.requester_id = me.id THEN f.addressee_id ELSE f.requester_id END AS fid
  FROM friendships f, (SELECT id FROM profiles WHERE username = lower('william')) me
  WHERE f.status = 'accepted' AND (f.requester_id = me.id OR f.addressee_id = me.id)
  LIMIT 3
) fr
CROSS JOIN (VALUES
  ('node/251043133', 'Manteigaria - Fábrica de Pastéis de Nata Rambuteau', 48.860997, 2.3544354,
   '{"osm_id":"node/251043133","osm_type":"node","name":"Manteigaria - Fábrica de Pastéis de Nata Rambuteau","lat":48.860997,"lon":2.3544354,"tags":{},"cuisine":"portuguese"}'),
  ('node/247455924', 'La Robe et le Palais', 48.8586437, 2.3458501,
   '{"osm_id":"node/247455924","osm_type":"node","name":"La Robe et le Palais","lat":48.8586437,"lon":2.3458501,"tags":{},"cuisine":"bistro"}'),
  ('node/247696096', '404', 48.864464, 2.3543053,
   '{"osm_id":"node/247696096","osm_type":"node","name":"404","lat":48.864464,"lon":2.3543053,"tags":{},"cuisine":"moroccan"}')
) AS d(osm_id, name, lat, lon, snapshot)
ON CONFLICT (user_id, osm_id) DO NOTHING;

-- 2) VISITE (visits.user_id est en `text` sur cette base → fid::text)
DELETE FROM visits
WHERE note = 'Démo Forkmap'
  AND user_id IN (
    SELECT (CASE WHEN f.requester_id = me.id THEN f.addressee_id ELSE f.requester_id END)::text
    FROM friendships f, (SELECT id FROM profiles WHERE username = lower('william')) me
    WHERE f.status = 'accepted' AND (f.requester_id = me.id OR f.addressee_id = me.id)
    LIMIT 3
  );

INSERT INTO visits (user_id, osm_id, name, lat, lon, visited_at, people_count, personal_rating, mood, note, snapshot)
SELECT fr.fid::text, 'node/250861679', 'O''Scià', 48.864878, 2.3475212, current_date - 2, 2, 5, 'friends', 'Démo Forkmap',
  '{"osm_id":"node/250861679","osm_type":"node","name":"O'' Scià","lat":48.864878,"lon":2.3475212,"tags":{},"cuisine":"pizza"}'::jsonb
FROM (
  SELECT CASE WHEN f.requester_id = me.id THEN f.addressee_id ELSE f.requester_id END AS fid
  FROM friendships f, (SELECT id FROM profiles WHERE username = lower('william')) me
  WHERE f.status = 'accepted' AND (f.requester_id = me.id OR f.addressee_id = me.id)
  LIMIT 3
) fr;

-- 3) ACTIVITÉ (le Fil) — on retire les lignes démo puis on réinsère (idempotent)
DELETE FROM activity_events
WHERE osm_id IN ('node/251043133', 'node/250861679')
  AND user_id IN (
    SELECT CASE WHEN f.requester_id = me.id THEN f.addressee_id ELSE f.requester_id END
    FROM friendships f, (SELECT id FROM profiles WHERE username = lower('william')) me
    WHERE f.status = 'accepted' AND (f.requester_id = me.id OR f.addressee_id = me.id)
    LIMIT 3
  );

INSERT INTO activity_events (user_id, type, osm_id, place_name, cuisine, rating)
SELECT fr.fid, 'favorite', 'node/251043133', 'Manteigaria', 'portuguese', NULL FROM (
  SELECT CASE WHEN f.requester_id = me.id THEN f.addressee_id ELSE f.requester_id END AS fid
  FROM friendships f, (SELECT id FROM profiles WHERE username = lower('william')) me
  WHERE f.status = 'accepted' AND (f.requester_id = me.id OR f.addressee_id = me.id)
  LIMIT 3
) fr
UNION ALL
SELECT fr.fid, 'visit', 'node/250861679', 'O''Scià', 'pizza', 5 FROM (
  SELECT CASE WHEN f.requester_id = me.id THEN f.addressee_id ELSE f.requester_id END AS fid
  FROM friendships f, (SELECT id FROM profiles WHERE username = lower('william')) me
  WHERE f.status = 'accepted' AND (f.requester_id = me.id OR f.addressee_id = me.id)
  LIMIT 3
) fr;

-- ============================================================
-- NETTOYAGE (lance ces 3 lignes pour tout retirer) :
-- DELETE FROM favorites WHERE osm_id IN ('node/251043133','node/247455924','node/247696096') AND user_id IN (SELECT CASE WHEN f.requester_id=me.id THEN f.addressee_id ELSE f.requester_id END FROM friendships f,(SELECT id FROM profiles WHERE username=lower('william')) me WHERE f.status='accepted' AND (f.requester_id=me.id OR f.addressee_id=me.id) LIMIT 3);
-- DELETE FROM visits WHERE note='Démo Forkmap';
-- DELETE FROM activity_events WHERE osm_id IN ('node/251043133','node/250861679') AND user_id IN (SELECT CASE WHEN f.requester_id=me.id THEN f.addressee_id ELSE f.requester_id END FROM friendships f,(SELECT id FROM profiles WHERE username=lower('william')) me WHERE f.status='accepted' AND (f.requester_id=me.id OR f.addressee_id=me.id) LIMIT 3);
