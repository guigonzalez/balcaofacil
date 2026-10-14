# Especificação inicial do MVP

**Produto:** sistema independente de gestão de vendas para pequenos negócios
**Status:** proposta inicial baseada na página pública do Kyte; não validada pelo REA
**Data da análise:** 14/10/2026

## 1. Objetivo

Permitir que o proprietário de uma pequena loja registre vendas e acompanhe produtos, estoque, clientes e resultados em um único lugar, com uma experiência simples em computador, tablet e celular.

O produto deve se inspirar nas categorias de funcionalidade observadas no Kyte, mas ter identidade visual, textos, fluxos e implementação próprios. Não usar a marca nem copiar telas ou conteúdo do Kyte.

## 2. Público e necessidade

- **Proprietário/gerente:** precisa saber o que vendeu, o que está acabando e quanto faturou.
- **Atendente/caixa:** precisa registrar uma venda com poucos passos e localizar produtos rapidamente.
- **Operação inicial:** uma loja, uma moeda (BRL) e usuários autorizados da própria loja.

## 3. Escopo priorizado

### P0 — Essencial para o primeiro uso

1. **Produtos e estoque**
   - Cadastrar, editar, ativar e arquivar produtos.
   - Guardar nome, código/SKU opcional, preço, custo opcional e quantidade disponível.
   - Registrar entradas e ajustes de estoque com data e motivo.
   - Sinalizar produtos abaixo de um limite de estoque configurável.

2. **PDV e vendas**
   - Buscar e adicionar produtos ao carrinho, ajustar quantidades e remover itens.
   - Associar opcionalmente um cliente; permitir venda sem cadastro.
   - Concluir a venda com um método de pagamento registrado manualmente: dinheiro, Pix, cartão ou outro.
   - Exibir confirmação/recibo simples e manter histórico de vendas.
   - Cancelar uma venda concluída com motivo e devolver as quantidades ao estoque.

3. **Clientes**
   - Cadastrar nome e telefone opcionais.
   - Consultar histórico de compras.
   - Buscar clientes pelo nome ou telefone.

4. **Resumo e relatórios básicos**
   - Mostrar vendas e faturamento do dia.
   - Filtrar vendas por período e consultar total vendido, quantidade de vendas e itens mais vendidos.
   - Mostrar lucro bruto estimado apenas quando houver custo informado para os itens.

5. **Acesso**
   - Proteger os dados da loja com autenticação.
   - No primeiro MVP, usar um perfil de proprietário/administrador; permissões granulares ficam para depois.

### Fora do primeiro MVP

- Processar pagamentos ou integrar com adquirentes, bancos, Pix ou carteiras digitais.
- Catálogo público, checkout online, delivery ou sincronização com redes sociais e marketplaces.
- Fiado/contas a receber e cobrança de saldos de clientes.
- Múltiplas lojas, múltiplas moedas, gestão de equipe com permissões detalhadas.
- Emissão fiscal, integração contábil, impressão específica por modelo de impressora.
- Operação offline e sincronização posterior entre dispositivos.
- Previsões, recomendações por IA ou relatórios avançados.

Esses itens podem ser avaliados depois que os fluxos de venda e estoque estiverem validados.

## 4. Fluxos principais

### Registrar uma venda

1. O atendente abre o PDV e busca ou seleciona produtos.
2. Ajusta quantidades e, se necessário, associa um cliente.
3. Confere subtotal e total.
4. Registra o método de pagamento e confirma.
5. O sistema salva a venda, reduz o estoque e mostra a confirmação.

### Cadastrar produto e repor estoque

1. O proprietário cadastra nome, preço e quantidade inicial.
2. Ao receber mercadoria, registra uma entrada com quantidade e motivo.
3. O saldo e o alerta de estoque baixo são atualizados.

### Consultar o desempenho

1. O proprietário abre o resumo.
2. Seleciona um período.
3. Consulta faturamento, quantidade de vendas, itens mais vendidos e, quando os custos estiverem preenchidos, estimativa de lucro bruto.

## 5. Regras de negócio iniciais

- Valores monetários devem ser armazenados em centavos de BRL, sem usar ponto flutuante para cálculos.
- Uma venda concluída guarda descrição, preço unitário, custo unitário disponível e quantidade de cada item no momento da venda; alterações futuras no cadastro não reescrevem o histórico.
- A conclusão de uma venda e a baixa de estoque devem ocorrer juntas. Se uma falhar, nenhuma das duas deve ser considerada concluída.
- Por padrão, não permitir concluir uma venda que exceda o estoque disponível. A política para venda com estoque negativo precisa ser confirmada antes da implementação.
- Cancelar uma venda deve preservar o registro original, guardar motivo e responsável e gerar a devolução correspondente ao estoque.
- “Faturamento” é a soma dos valores de vendas concluídas menos cancelamentos no período. O cálculo de lucro exibido deve ser identificado como estimativa e considerar somente custos cadastrados; taxas, impostos e despesas não fazem parte do primeiro cálculo.
- Produtos e clientes associados a vendas não devem ser apagados fisicamente de forma a invalidar o histórico; devem ser arquivados.

## 6. Critérios de aceite do MVP

- Um usuário autenticado consegue criar e arquivar um produto e registrar uma entrada de estoque.
- Uma venda com mais de um item pode ser concluída e aparece no histórico com total, horário, método de pagamento e cliente, quando informado.
- Concluir uma venda reduz corretamente o estoque; cancelar essa venda registra o motivo e restaura o saldo.
- O sistema impede a venda acima do estoque disponível segundo a política inicial.
- O resumo por período corresponde às vendas concluídas e aos cancelamentos do mesmo período.
- A estimativa de lucro não é apresentada como completa quando faltam custos de produtos.
- Os fluxos de cadastro e venda são utilizáveis em telas de computador e celular, sem exigir recursos exclusivos de uma plataforma específica.

## 7. Entidades mínimas

- **Loja/conta:** proprietária dos dados e configurações.
- **Usuário:** credenciais e papel de acesso.
- **Produto:** identificação, preço, custo opcional, saldo e limite de alerta.
- **Movimento de estoque:** produto, variação de quantidade, tipo, motivo, data e usuário responsável.
- **Cliente:** nome e telefone opcionais.
- **Venda:** itens, totais, método de pagamento, cliente opcional, estado, data e usuário responsável.
- **Item da venda:** produto referenciado e cópia dos dados comerciais no momento da venda.

## 8. Diretrizes de experiência e qualidade

- Interface em português do Brasil, moeda BRL e datas no formato local.
- Priorizar busca rápida, poucos passos no caixa e retorno claro após salvar ou falhar uma operação.
- Não descartar carrinho nem formulário silenciosamente diante de erro.
- Validar entradas no cliente e no servidor e manter o histórico de operações financeiras e de estoque.
- Coletar apenas dados de clientes necessários ao fluxo; definir retenção, exportação e exclusão conforme a LGPD antes do lançamento.
- A especificação não fixa framework, banco de dados ou arquitetura; essas escolhas dependem do ambiente de implementação.

## 9. Etapas sugeridas

1. Confirmar plataforma e regras comerciais; implementar cadastro de produtos e estoque.
2. Implementar PDV, vendas, cancelamento e histórico.
3. Implementar clientes e resumo/relatórios básicos.
4. Validar com pequenos comerciantes e decidir se catálogo online, fiado e pagamentos integrados entram na próxima etapa.

## 10. Base e limitações da análise

Esta proposta usa somente conteúdo público da página do Kyte em português, que descreve PDV, gestão de estoque, clientes, fluxo de caixa, pedidos online e relatórios. A análise foi feita pela página pública e por suas descrições textuais; **o REA não foi executado**. Portanto, não houve inspeção de DOM, scripts, fluxos autenticados ou comportamento do aplicativo, e esta especificação não deve ser tratada como documentação interna ou confirmação de todos os recursos do Kyte.

Referências consultadas:

- [Página pública do Kyte em português](https://www.kyteapp.com/pt)
- [Página do sistema de PDV](https://www.kyteapp.com/pt/sistema-pdv)
- [Página de controle de estoque](https://www.kyteapp.com/pt/controle-de-estoque)
- [Página do site de pedidos](https://www.kyteapp.com/pt/site-de-pedidos)
