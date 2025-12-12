# 🔥 Guia Completo: Como Obter as Configurações do Firebase

## 📍 Passo a Passo no Firebase Console

### 1. Acesse o Firebase Console
- Vá para: **https://console.firebase.google.com/**
- Faça login com sua conta Google

### 2. Selecione ou Crie um Projeto
- Se já tiver um projeto, clique nele
- Se não tiver, clique em **"Adicionar projeto"** e siga o assistente

### 3. Encontre as Configurações do App Web

#### Opção A: Se você JÁ TEM um app web configurado
1. No menu lateral esquerdo, clique no **ícone de engrenagem (⚙️)** ao lado de "Project Overview"
2. Clique em **"Project settings"**
3. Role a página até a seção **"Your apps"**
4. Procure pelo ícone **`</>`** (Web app)
5. Clique no app web
6. Você verá um objeto JavaScript com todas as configurações:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "seu-projeto.firebaseapp.com",
     projectId: "seu-projeto-id",
     storageBucket: "seu-projeto-id.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abc123",
     measurementId: "G-XXXXXXXXXX"
   };
   ```

#### Opção B: Se você NÃO TEM um app web ainda
1. No menu lateral esquerdo, clique no **ícone de engrenagem (⚙️)** ao lado de "Project Overview"
2. Clique em **"Project settings"**
3. Role até **"Your apps"**
4. Clique no ícone **`</>`** (ou "Add app" > "Web")
5. Dê um nome ao app (ex: "Assistente de Consulta")
6. **NÃO** marque a opção "Also set up Firebase Hosting" (a menos que queira)
7. Clique em **"Register app"**
8. As configurações aparecerão na tela - copie cada valor

### 4. Mapeamento dos Valores

Copie cada valor do objeto `firebaseConfig` para o arquivo `.env.local`:

| Campo no Firebase | Variável no .env.local | Exemplo |
|-------------------|------------------------|---------|
| `apiKey` | `VITE_FIREBASE_API_KEY` | `AIzaSyBppj3f6TJT01Xjn_cWXhqOvpccge-g6ds` |
| `authDomain` | `VITE_FIREBASE_AUTH_DOMAIN` | `meu-projeto.firebaseapp.com` |
| `projectId` | `VITE_FIREBASE_PROJECT_ID` | `meu-projeto-id` |
| `storageBucket` | `VITE_FIREBASE_STORAGE_BUCKET` | `meu-projeto-id.appspot.com` |
| `messagingSenderId` | `VITE_FIREBASE_MESSAGING_SENDER_ID` | `913448523577` (apenas o número) |
| `appId` | `VITE_FIREBASE_APP_ID` | `1:913448523577:web:66f6d72cd4d8492870bae8` |
| `measurementId` | `VITE_FIREBASE_MEASUREMENT_ID` | `G-XF46PB6S49` (opcional) |

### 5. Configurar Autenticação Google

Para que o login funcione:

1. No menu lateral, vá em **"Authentication"**
2. Se for a primeira vez, clique em **"Get started"**
3. Clique na aba **"Sign-in method"**
4. Clique em **"Google"**
5. Ative o toggle **"Enable"**
6. Selecione um email de suporte (pode ser o seu)
7. Clique em **"Save"**

### 6. Configurar Firestore Database

Para salvar as sessões:

1. No menu lateral, vá em **"Firestore Database"**
2. Se for a primeira vez, clique em **"Create database"**
3. Escolha **"Start in production mode"** (ou teste, se preferir)
4. Selecione uma localização (escolha a mais próxima de você)
5. Clique em **"Enable"**

### 7. Adicionar Domínio Autorizado (se necessário)

Se você estiver rodando em um domínio específico (não localhost):

1. No menu lateral, vá em **"Authentication"**
2. Clique na aba **"Settings"**
3. Role até **"Authorized domains"**
4. Clique em **"Add domain"**
5. Adicione seu domínio (ex: `meusite.com`)

**Nota:** `localhost` já está autorizado por padrão.

## ✅ Verificação Final

Após configurar o `.env.local`:

1. **Reinicie o servidor de desenvolvimento** (pare com `Ctrl+C` e rode `npm run dev` novamente)
2. Recarregue a página no navegador
3. Tente fazer login com Google
4. Se ainda houver erro, verifique o console do navegador (F12) para mais detalhes

## 🆘 Problemas Comuns

### Erro: "API key not valid"
- Verifique se copiou a `apiKey` completa (começa com "AIza")
- Certifique-se de que não há espaços extras no `.env.local`

### Erro: "auth/unauthorized-domain"
- Adicione seu domínio em Authentication > Settings > Authorized domains
- `localhost` já está autorizado por padrão

### Erro: "Firestore permission denied"
- Verifique se criou o banco de dados Firestore
- Se estiver em modo produção, configure as regras de segurança

## 📝 Exemplo Completo de .env.local

```env
# GEMINI API KEY
VITE_GEMINI_API_KEY=AIzaSyA9UGOqpmxLs2cTqifyciFQAZYqGCcSbRo

# FIREBASE CONFIGURATION
VITE_FIREBASE_API_KEY=AIzaSyBppj3f6TJT01Xjn_cWXhqOvpccge-g6ds
VITE_FIREBASE_AUTH_DOMAIN=assistente-de-atendiment-d5d1a.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=assistente-de-atendiment-d5d1a
VITE_FIREBASE_STORAGE_BUCKET=assistente-de-atendiment-d5d1a.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=913448523577
VITE_FIREBASE_APP_ID=1:913448523577:web:66f6d72cd4d8492870bae8
VITE_FIREBASE_MEASUREMENT_ID=G-XF46PB6S49
```

