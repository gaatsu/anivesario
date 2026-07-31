-- Sobra da era NextAuth: a tabela existe no banco mas nunca esteve no
-- schema.prisma. Nenhuma foreign key aponta para ela.
DROP TABLE "Session";

-- Credenciais voltam a morar no Prisma. A coluna já existia desde a migration
-- inicial; passa a guardar um hash scrypt (ver lib/auth.ts).
ALTER TABLE "User" RENAME COLUMN "password" TO "passwordHash";

-- Convite por email dá lugar a convite por link aleatório. Dropar delegateEmail
-- derruba junto o índice Delegate_creatorId_delegateEmail_key.
ALTER TABLE "Delegate" DROP COLUMN "delegateEmail";
ALTER TABLE "Delegate" ADD COLUMN "token" TEXT NOT NULL;
ALTER TABLE "Delegate" ADD COLUMN "label" TEXT;
ALTER TABLE "Delegate" ADD COLUMN "expiresAt" TIMESTAMP(3) NOT NULL;

CREATE UNIQUE INDEX "Delegate_token_key" ON "Delegate"("token");
CREATE UNIQUE INDEX "Delegate_delegateId_key" ON "Delegate"("delegateId");
