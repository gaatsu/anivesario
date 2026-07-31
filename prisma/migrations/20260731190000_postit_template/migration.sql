-- Estilo do postit escolhido por quem escreve o recado.
--
-- String vazia = automático, que é o padrão e continua sendo o comportamento de
-- todos os recados já gravados: formato e fonte saem do hash do nome do autor.
-- Só um valor escolhido no formulário chega aqui preenchido.
--
-- Mesmo formato de "sentinela vazia" já usado em Postit.color, de propósito: um
-- NULL exigiria que toda leitura tratasse dois casos de ausência.
ALTER TABLE "Postit" ADD COLUMN "template" TEXT NOT NULL DEFAULT '';
