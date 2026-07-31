-- Fotos do carrossel da revelação.
--
-- Guardamos só as URLs públicas do Vercel Blob; os binários vivem lá. Um array
-- de texto em vez de tabela própria porque a ordem importa (é a ordem em que os
-- cards aparecem) e não há nada a consultar por foto.
--
-- Em um passo só, diferente da migration do revealLink: com DEFAULT as linhas
-- existentes já nascem com array vazio, então NOT NULL não conflita com elas.
ALTER TABLE "Event" ADD COLUMN "photos" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
