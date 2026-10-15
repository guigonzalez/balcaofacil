# Balcão

MVP de gestão de vendas para pequenos negócios: painel, frente de caixa, produtos, estoque, vendas e clientes.

## Execução local

Execute `npm install` e `npm run dev`. Sem variáveis Supabase, o servidor local usa dados de demonstração no navegador; **Configurações da loja → Restaurar demonstração** os repõe. O pagamento é registrado manualmente, sem processamento. Não abra `index.html` diretamente: o app usa módulos carregados pelo Vite.

## Base de implantação

O projeto suporta execução local em demonstração e modo conectado à Vercel/Supabase:

- `supabase/migrations/20261014200000_initial_schema.sql`: esquema PostgreSQL, isolamento de dados por loja com RLS, papéis e operações transacionais de venda/cancelamento/estoque.
- `supabase/migrations/20261015120000_product_categories.sql`: categorias por loja, permissões RLS e proteção contra exclusão de categorias ainda usadas por produtos.
- `supabase/migrations/20261015130000_kyte_import.sql`: importação idempotente de produtos e vendas históricas do Kyte para lojas existentes.
- `kyte-import.js`: leitor CSV com validação e conversão dos formatos de produto e venda exportados pelo Kyte.
- `cloud-store.js`: leitura e escrita da loja autenticada; checkout, cancelamento e ajustes de estoque usam funções transacionais do banco.
- `api/invite.js`: função de servidor Vercel para convidar usuários como administrador ou atendente. Usa a chave `service_role` somente no servidor e só permite convite por um administrador autenticado da loja.
- `vite.config.js`: aceita `SUPABASE_URL`/`SUPABASE_ANON_KEY` (padrão das integrações Vercel/Supabase), `NEXT_PUBLIC_SUPABASE_*` ou `VITE_SUPABASE_*`. Somente a URL e a chave publishable/anon são incorporadas no bundle do navegador.
- `.env.example`: nomes das variáveis necessárias; não preencha nem publique valores secretos no repositório.
- `vercel.json` e `package.json`: configuração de hospedagem e comandos de build.

Quando a URL e a chave anon do Supabase estiverem disponíveis durante o build, a aplicação exige login e usa o banco. Sem essas duas variáveis, roda em modo de demonstração durante desenvolvimento local. Em build de produção, a aplicação falha de forma segura e não abre dados de demonstração se o Supabase não estiver configurado. A chave `service_role` nunca é incorporada ao bundle público.

### Preparar serviços para desenvolvimento

1. Confirme no painel Vercel que a integração associou `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` aos ambientes usados. A chave publishable/anon é pública; a `service_role` deve permanecer privada.
2. No projeto Supabase associado, aplique as migrações em ordem usando **SQL Editor** ou Supabase CLI. Se as migrações iniciais e de categorias já foram aplicadas, execute `supabase/migrations/20261015130000_kyte_import.sql` antes de usar o importador conectado. Revise as políticas de segurança na conta antes de usar dados reais.
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

`npm run dev` serve a interface Vite; para testar a função `/api/invite`, use Vercel CLI autenticada e `vercel dev`.

Em **Configurações da loja → Importar produtos e vendas do Kyte**, selecione um ou os dois CSVs, revise a prévia e confirme. Produtos trazem nome, categoria, preço, custo, estoque atual e estoque mínimo; linhas sem categoria recebem “Sem categoria”. Vendas preservam referência, data, cliente textual, pagamento, total, lucro informado e descrição original dos itens; são importadas como histórico e **não alteram o estoque**. Novos registros não sobrescrevem cadastros existentes e reimportar a mesma exportação não duplica produtos ou vendas.

## Limites antes de produção

- Aplicar e validar a migração no Supabase associado; a publicação do código, sozinha, não cria as tabelas.
- Confirmar que os três nomes de variável foram criados pela integração Vercel/Supabase e que `SUPABASE_SERVICE_ROLE_KEY` está disponível somente à função de servidor.
- Testar isolamento entre lojas, convite, aceite, recuperação de senha, erros de rede e concorrência de estoque numa conta Supabase de teste.
- Configurar e ensaiar backups e restauração.
- Definir política de privacidade, retenção/exclusão de dados e suporte conforme a LGPD antes de usar informações reais.

O projeto não processa pagamentos nem emite documento fiscal. A experiência, a marca e os textos são independentes e não copiam o produto Kyte.
