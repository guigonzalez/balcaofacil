# Balcão

MVP de gestão de vendas para pequenos negócios: painel, frente de caixa, produtos, estoque, vendas e clientes.

## Protótipo local

Abra `index.html` em um navegador moderno. O primeiro acesso carrega dados de demonstração; **Configurações da loja → Restaurar demonstração** os repõe. O pagamento é registrado manualmente, sem processamento.

## Base de implantação

O projeto também contém a estrutura inicial para Vercel e Supabase:

- `supabase/migrations/20261014200000_initial_schema.sql`: esquema PostgreSQL, isolamento de dados por loja com RLS, papéis e operações transacionais de venda/cancelamento/estoque.
- `api/invite.js`: função de servidor Vercel para convidar usuários como administrador ou atendente. Usa a chave `service_role` somente no servidor e só permite convite por um administrador autenticado da loja.
- `.env.example`: nomes das variáveis necessárias; não preencha nem publique valores secretos no repositório.
- `vercel.json` e `package.json`: configuração de hospedagem e comandos de build.

**Importante:** a interface atual continua sendo o protótipo local; ela ainda não está conectada ao banco nem ao login. A camada cloud é uma base de implementação, não um serviço publicado ou pronto para receber dados de clientes. Não use informações reais até a integração e a validação de segurança.

### Preparar serviços para desenvolvimento

1. Crie um projeto Supabase e um projeto Vercel nas suas próprias contas. Configure um domínio e HTTPS quando estiver pronto para publicar.
2. No Supabase, execute a migração no SQL Editor ou com Supabase CLI: `supabase db push`.
3. Desative o cadastro público em **Authentication → Settings → User Signups**. Configure SMTP de produção e a URL de redirecionamento da aplicação em **Authentication → URL Configuration**.
4. Convide o primeiro proprietário pelo painel do Supabase. Depois que essa conta aceitar o convite e fizer login, a aplicação integrada chamará `bootstrap_store(nome)` para criar a primeira loja. Esta interface de integração ainda precisa ser implementada.
5. Adicione ao projeto Vercel as variáveis de servidor de `.env.example`, incluindo `APP_URL`. `SUPABASE_SERVICE_ROLE_KEY` deve existir **somente** nas variáveis privadas do servidor Vercel; nunca em variáveis `VITE_*`, no navegador ou no Git.
6. Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no frontend quando a tela de autenticação e o acesso ao banco forem integrados. A chave publishable/anon pode ser usada no navegador com RLS ativo; ela não substitui as políticas.
7. Vincule o repositório à Vercel e publique um preview antes de produção. O endpoint `/api/invite` depende das variáveis privadas e de uma sessão válida de proprietário/administrador.

Instalação local e build:

```sh
npm install
npm run dev
npm run build
```

Para desenvolver a função de API no ambiente Vercel (incluindo `/api/invite`), use Vercel CLI autenticada e `vercel dev`; `npm run dev` serve apenas a interface Vite.

## O que falta para produção

- Integrar login por convite, redefinição/definição de senha e bootstrap inicial da loja à interface.
- Trocar a persistência do protótipo por consultas ao Supabase e ligar vendas/cancelamentos aos RPCs transacionais.
- Aplicar e validar a migração num projeto Supabase de desenvolvimento; configurar e ensaiar backups e restauração.
- Testar isolamento entre lojas, permissões por papel, convites, erros de rede, operações concorrentes e migração dos dados de demonstração.
- Definir política de privacidade, retenção/exclusão de dados e suporte conforme a LGPD antes de usar informações reais.

O projeto não processa pagamentos, emite documento fiscal ou implementa autenticação na interface atual. A experiência, a marca e os textos são independentes e não copiam o produto Kyte.
