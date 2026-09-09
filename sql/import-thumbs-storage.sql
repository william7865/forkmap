-- sql/import-thumbs-storage.sql — à exécuter dans l'éditeur SQL de Supabase.
--
-- Bucket des vignettes de vidéos importées.
--
-- POURQUOI : TikTok et Instagram servent leurs vignettes derrière des URL
-- SIGNÉES qui expirent. Mesuré sur la base : 39 vignettes stockées, 39 en
-- erreur 403. Stocker l'adresse revenait à stocker une promesse que le CDN ne
-- tient pas — le rail « Vus sur les réseaux » affichait des images cassées,
-- retombées sur le dégradé de repli. On copie donc l'image chez nous pendant
-- qu'elle est encore accessible.
--
-- Lecture publique : ces vignettes s'affichent dans des listes publiques et
-- dans l'app sans session. Écriture réservée au propriétaire, via le premier
-- segment du chemin `{user_id}/{import_id}.{ext}` — même motif que le bucket
-- des avatars (voir sql/avatars-storage.sql).

INSERT INTO storage.buckets (id, name, public)
VALUES ('import-thumbs', 'import-thumbs', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "import_thumbs_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'import-thumbs');

CREATE POLICY "import_thumbs_write_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'import-thumbs' AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "import_thumbs_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'import-thumbs' AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "import_thumbs_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'import-thumbs' AND auth.uid()::text = (storage.foldername(name))[1]
  );
