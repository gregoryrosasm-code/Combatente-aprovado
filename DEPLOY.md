# 🚀 Guia de Deploy — Combatente Aprovado

## O que está nesta pasta

```
combatente-aprovado/
├── index.html       ← O app (com proxy configurado)
├── api/
│   └── chat.js     ← Proxy seguro da API (chave fica aqui no servidor)
├── vercel.json      ← Configurações do Vercel
└── DEPLOY.md        ← Este arquivo
```

---

## Passo 1 — Criar conta no GitHub (gratuito)

1. Acesse https://github.com e clique em **Sign up**
2. Crie uma conta com seu e-mail
3. Confirme o e-mail

---

## Passo 2 — Criar um repositório e subir os arquivos

1. No GitHub, clique no botão **+** (canto superior direito) → **New repository**
2. Nome: `combatente-aprovado`
3. Deixe como **Public**
4. Clique em **Create repository**
5. Na próxima tela, clique em **uploading an existing file**
6. **Arraste os 3 arquivos** desta pasta: `index.html`, `vercel.json` e a pasta `api/`
   - Para a pasta `api/`, você precisa navegar até ela e fazer upload do `chat.js` com o caminho `api/chat.js`
7. Clique em **Commit changes**

---

## Passo 3 — Criar conta no Vercel e conectar ao GitHub

1. Acesse https://vercel.com e clique em **Sign Up**
2. Escolha **Continue with GitHub** (usa a mesma conta que você criou)
3. Autorize o Vercel a acessar seus repositórios

---

## Passo 4 — Fazer o deploy

1. No Vercel, clique em **Add New Project**
2. Selecione o repositório `combatente-aprovado`
3. Clique em **Deploy** (não mude nenhuma configuração)
4. Aguarde ~1 minuto — o Vercel vai gerar um link como:
   `https://combatente-aprovado.vercel.app`

---

## Passo 5 — Configurar sua chave de API da Anthropic ⚠️ OBRIGATÓRIO

Sem isso, o app ainda não vai funcionar. A chave fica **segura no servidor**, nunca aparece para os usuários.

1. Acesse https://console.anthropic.com
2. Vá em **API Keys** → clique em **Create Key**
3. Copie a chave (começa com `sk-ant-...`)
4. No Vercel, vá em seu projeto → **Settings** → **Environment Variables**
5. Adicione:
   - **Name:** `ANTHROPIC_API_KEY`
   - **Value:** sua chave `sk-ant-...`
   - Clique em **Save**
6. Vá em **Deployments** → clique nos 3 pontinhos do deploy mais recente → **Redeploy**

✅ Pronto! Agora o app funciona de verdade.

---

## Passo 6 — Testar

1. Acesse seu link `https://combatente-aprovado.vercel.app`
2. Entre no **Quiz Diário**, selecione uma matéria e clique em **Iniciar Quiz**
3. As questões devem aparecer em ~5-10 segundos

---

## Como funciona o plano gratuito vs pago

Por padrão, cada visitante tem direito a **15 chamadas por dia** sem pagar.

Quando o limite é atingido, aparece um modal pedindo para assinar.

Para liberar acesso ilimitado para um usuário pago:
1. Configure no Vercel a variável `PAID_SECRET` com um valor secreto (ex: `token-pro-2026`)
2. Após o pagamento, salve esse valor no navegador do usuário:
   ```javascript
   localStorage.setItem('ca_user_token', 'token-pro-2026')
   ```
   (Isso será automatizado quando integrarmos o Kiwify/Hotmart)

---

## Custos estimados

| Item | Custo |
|------|-------|
| Vercel (hospedagem) | Gratuito até 100GB/mês |
| Anthropic API | ~R$0,05 por sessão de quiz (20 questões) |
| 100 usuários pagos usando 1x/dia | ~R$150/mês de API |
| Receita com 100 assinantes a R$29 | R$2.900/mês |

---

## Próximos passos após o deploy

- [ ] Registrar domínio `combatenteaprovado.com.br` (~R$40/ano no Registro.br)
- [ ] Criar página de vendas (landing page)
- [ ] Criar conta no Kiwify e configurar o produto
- [ ] Atualizar o link de compra no arquivo `index.html`

---

## Dúvidas?

Se travar em qualquer etapa, tire um print da tela de erro e me mostre. 💪
