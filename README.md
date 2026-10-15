# BalcãoFácil

MVP de gestão para pequenos negócios: painel, frente de caixa, produtos, estoque, vendas, clientes e fluxo de caixa.

## Execução local

Execute `npm install` e `npm run dev`. Sem variáveis Supabase, o servidor local usa dados de demonstração no navegador; **Configurações da loja → Restaurar demonstração** os repõe. O pagamento é registrado manualmente, sem processamento. Não abra `index.html` diretamente: o app usa módulos carregados pelo Vite.

## Base de implantação

O projeto suporta execução local em demonstração e modo conectado à Vercel/Supabase:

- `supabase/migrations/20261014200000_initial_schema.sql`: esquema PostgreSQL, isolamento de dados por loja com RLS, papéis e operações transacionais de venda/cancelamento/estoque.
- `supabase/migrations/20261015120000_product_categories.sql`: categorias por loja, permissões RLS e proteção contra exclusão de categorias ainda usadas por produtos.
- `supabase/migrations/20261015130000_kyte_import.sql`: importação idempotente de produtos e vendas históricas do Kyte para lojas existentes.
- `supabase/migrations/20261015140000_product_images.sql`: fotos de produto no Supabase Storage, com upload restrito aos membros da loja.
- `supabase/migrations/20261017150000_card_payment_fees.sql`: diferencia cartões de débito/crédito e adiciona taxas estimadas editáveis por loja.
- `supabase/migrations/20261017160000_cash_flow.sql`: cria contas a pagar e receber com acesso restrito a proprietários e administradores.
- `supabase/migrations/20261018120000_data_deletion.sql`: prepara a exclusão de contas, anonimiza referências de auditoria e transfere a propriedade da loja quando necessário.
- `kyte-import.js`: leitor CSV com validação e conversão dos formatos de produto e venda exportados pelo Kyte.
- `cloud-store.js`: leitura e escrita da loja autenticada; checkout, cancelamento e ajustes de estoque usam funções transacionais do banco.
- `sales-analytics.js`: cálculos de faturamento bruto, taxas de cartão estimadas, líquido estimado, ticket médio, lucro bruto e tendências por período.
- `api/invite.js`: função de servidor Vercel para convidar usuários como administrador ou atendente. Usa a chave `service_role` somente no servidor e só permite convite por um administrador autenticado da loja.
- `api/delete-account.js`: função de servidor Vercel para apagar lojas e contas com confirmação, verificação de propriedade e limpeza das fotos.
- `vite.config.js`: aceita `SUPABASE_URL`/`SUPABASE_ANON_KEY` (padrão das integrações Vercel/Supabase), `NEXT_PUBLIC_SUPABASE_*` ou `VITE_SUPABASE_*`. Somente a URL e a chave publishable/anon são incorporadas no bundle do navegador.
- `.env.example`: nomes das variáveis necessárias; não preencha nem publique valores secretos no repositório.
- `vercel.json` e `package.json`: configuração de hospedagem e comandos de build.

Quando a URL e a chave anon do Supabase estiverem disponíveis durante o build, a aplicação exige login e usa o banco. Sem essas duas variáveis, roda em modo de demonstração durante desenvolvimento local. Em build de produção, a aplicação falha de forma segura e não abre dados de demonstração se o Supabase não estiver configurado. A chave `service_role` nunca é incorporada ao bundle público.

### Preparar serviços para desenvolvimento

1. Confirme no painel Vercel que a integração associou `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` aos ambientes usados. A chave publishable/anon é pública; a `service_role` deve permanecer privada.
2. No projeto Supabase associado, aplique as migrações em ordem usando **SQL Editor** ou Supabase CLI. Se as migrações anteriores já foram aplicadas, execute `supabase/migrations/20261015130000_kyte_import.sql` antes de usar o importador, `supabase/migrations/20261015140000_product_images.sql` para habilitar fotos, `supabase/migrations/20261017150000_card_payment_fees.sql` para habilitar as estimativas de taxas, `supabase/migrations/20261017160000_cash_flow.sql` para habilitar o fluxo de caixa e `supabase/migrations/20261018120000_data_deletion.sql` para habilitar a exclusão de lojas e contas.
3. Em **Authentication → Settings → User Signups**, desative cadastro público. Configure o SMTP de produção e acrescente o domínio de produção e os domínios preview autorizados em **Authentication → URL Configuration → Redirect URLs**.
4. Convide o primeiro proprietário pelo painel de Auth do Supabase. O dono entra pelo link recebido, define uma senha e cria o nome da primeira loja. Os membros seguintes entram apenas por convite enviado em **Configurações da loja**.
5. Depois de qualquer alteração de variáveis, aplique-as aos ambientes Production/Preview necessários e faça um novo deploy; as variáveis `SUPABASE_URL` e `SUPABASE_ANON_KEY` são lidas no build do frontend.
6. Verifique o deployment de preview: login, primeiro acesso, isolamento RLS, venda, cancelamento e convite. Só depois promova a versão para produção.

Instalação local e build:

```sh
npm install
npm run dev
npm run build
```

`npm run dev` serve a interface Vite; para testar as funções `/api/*`, use Vercel CLI autenticada e `vercel dev`.

Em **Configurações da loja → Importar produtos e vendas do Kyte**, selecione um ou os dois CSVs, revise a prévia e confirme. Produtos trazem nome, categoria, preço, custo, estoque atual e estoque mínimo; linhas sem categoria recebem “Sem categoria”. Vendas preservam referência, data, cliente textual, pagamento, total, lucro informado e descrição original dos itens; são importadas como histórico e **não alteram o estoque**. Novos registros não sobrescrevem cadastros existentes e reimportar a mesma exportação não duplica produtos ou vendas.

Em **Configurações da loja**, administradores podem editar os percentuais médios estimados de débito e crédito (ambos começam em 0%). São parâmetros informativos, não taxas reais da adquirente; o sistema não processa pagamentos nem altera o valor original das vendas. Em **Análises**, consulte faturamento bruto, taxas estimadas e líquido estimado junto às demais métricas. Vendas antigas registradas apenas como “Cartão” permanecem no histórico e no faturamento bruto, mas não são classificadas arbitrariamente como débito ou crédito nem entram no cálculo da taxa. Cancelamentos não entram nos totais. O lucro é parcial quando faltam custos; vendas históricas importadas do Kyte entram nos totais, mas não no ranking de produtos porque o CSV não relaciona cada item ao seu preço.

Em **Fluxo de caixa**, proprietários e administradores registram manualmente contas a pagar e receber, com descrição, pessoa/empresa, categoria, valor, vencimento e forma de pagamento opcional. É possível filtrar lançamentos, dar baixa integral e apagar contas ainda em aberto. A visão geral resume valores em aberto, vencidos, saldo projetado das contas não quitadas e movimentação quitada no mês; não é integração bancária nem saldo bancário real.

Em **Configurações da loja**, o proprietário pode apagar permanentemente a loja e todos os dados, confirmando o nome exato; os logins dos demais membros são preservados, mas perdem acesso à loja. Cada membro também pode apagar a própria conta confirmando o e-mail. Se houver outras pessoas, a propriedade passa ao administrador mais antigo ou, na falta deles, ao atendente mais antigo; se o proprietário for o único membro, a loja e seus dados também são apagados. A exclusão é irreversível.

O cadastro de produto aceita uma foto JPG, PNG ou WebP de até 5 MB. No Supabase, as imagens são guardadas no bucket público `product-images`, com upload e alteração de arquivos restritos a membros da loja; a URL da imagem pode ser acessada publicamente. Na demonstração local, a imagem é reduzida antes de ser salva no armazenamento do navegador.

## Limites antes de produção

- Aplicar e validar a migração no Supabase associado; a publicação do código, sozinha, não cria as tabelas.
- Confirmar que os três nomes de variável foram criados pela integração Vercel/Supabase e que `SUPABASE_SERVICE_ROLE_KEY` está disponível somente à função de servidor.
- Testar isolamento entre lojas, convite, aceite, recuperação de senha, erros de rede e concorrência de estoque numa conta Supabase de teste.
- Configurar e ensaiar backups e restauração.
- Definir política de privacidade, retenção/exclusão de dados e suporte conforme a LGPD antes de usar informações reais.

O projeto não processa pagamentos nem emite documento fiscal. A experiência, a marca e os textos são independentes e não copiam o produto Kyte.
