-- Link de revelação: o que vai para o homenageado, separado do link de coleta
-- de recados.
--
-- Em três passos porque a tabela já tem linhas: adicionar uma coluna NOT NULL
-- sem default falharia. Cria-se nula, preenche-se, e só então torna-se
-- obrigatória.
ALTER TABLE "Event" ADD COLUMN "revealLink" TEXT;

UPDATE "Event" SET "revealLink" = gen_random_uuid()::text WHERE "revealLink" IS NULL;

ALTER TABLE "Event" ALTER COLUMN "revealLink" SET NOT NULL;

CREATE UNIQUE INDEX "Event_revealLink_key" ON "Event"("revealLink");
