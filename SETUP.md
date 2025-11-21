# 🚀 Guia de Setup Completo - Assistente de Consulta em Tempo Real

## 📋 Pré-requisitos

- Node.js 18+ instalado
- NPM ou Yarn
- Conta Google (para Gemini API e Firebase)

## 🔧 Instalação Passo a Passo

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto com as seguintes variáveis:

```env
# GEMINI API KEY (OBRIGATÓRIO)
VITE_GEMINI_API_KEY=sua_chave_gemini_aqui

# FIREBASE CONFIGURATION (OPCIONAL - para autenticação e salvamento)
VITE_FIREBASE_API_KEY=sua_api_key
VITE_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu-projeto-id
VITE_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=seu_messaging_sender_id
VITE_FIREBASE_APP_ID=seu_app_id
VITE_FIREBASE_MEASUREMENT_ID=seu_measurement_id
```

## 🔑 Obter Chave da API Gemini (Método 1 - Recomendado)

### Opção A: Google AI Studio (Mais Rápido)

1. Acesse: https://aistudio.google.com/apikey
2. Clique em "Get API Key" ou "Criar chave de API"
3. Selecione ou crie um projeto Google Cloud
4. Copie a chave gerada
5. Cole no arquivo `.env.local` como `VITE_GEMINI_API_KEY`

### Opção B: Google Cloud Console (Mais Configurável)

1. **Criar Projeto no Google Cloud**
   - Acesse: https://console.cloud.google.com/
   - Clique em "Criar Projeto" ou selecione um existente
   - Dê um nome ao projeto (ex: "assistente-medico")

2. **Habilitar API do Gemini**
   - No menu lateral, vá em "APIs e Serviços" > "Biblioteca"
   - Pesquise por "Gemini API" ou "Generative Language API"
   - Clique em "Ativar"

3. **Criar Chave de API**
   - Vá em "APIs e Serviços" > "Credenciais"
   - Clique em "Criar credenciais" > "Chave de API"
   - Copie a chave gerada
   - **IMPORTANTE**: Configure restrições de API para segurança

4. **Configurar Contas de Serviço (Opcional - para produção)**
   - Crie uma conta de serviço
   - Baixe o arquivo JSON de credenciais
   - Use `GOOGLE_APPLICATION_CREDENTIALS` no backend se necessário

## 🔥 Configurar Firebase (Opcional)

Se você quiser salvar sessões e autenticação:

1. **Criar Projeto Firebase**
   - Acesse: https://console.firebase.google.com/
   - Clique em "Adicionar projeto"
   - Siga o assistente

2. **Configurar Autenticação**
   - No menu lateral, vá em "Authentication"
   - Clique em "Get Started"
   - Habilite "Google" como provedor de login

3. **Criar App Web**
   - Clique no ícone `</>`
   - Dê um nome ao app
   - Copie as configurações exibidas

4. **Configurar Firestore**
   - No menu lateral, vá em "Firestore Database"
   - Clique em "Create database"
   - Escolha modo de produção ou teste
   - Selecione uma localização

5. **Adicionar Configurações ao .env.local**
   - Cole todas as configurações copiadas no Firebase Console

## 🎨 Tecnologias Utilizadas

- **React 19** - Framework UI
- **TypeScript** - Tipagem estática
- **Vite** - Build tool e dev server
- **Tailwind CSS** - Framework CSS (estilo Tailadmin)
- **Firebase** - Autenticação e banco de dados
- **Gemini 2.0 Flash** - Modelo de IA para transcrição e anamnese
- **Radix UI** - Componentes acessíveis

## 🚀 Executar o Projeto

### Modo Desenvolvimento

```bash
npm run dev
```

O app estará disponível em: `http://localhost:3000`

### Build para Produção

```bash
npm run build
```

### Preview do Build

```bash
npm run preview
```

## 📱 Funcionalidades Principais

- ✅ Transcrição de áudio em tempo real
- ✅ Geração automática de anamnese médica
- ✅ Insights inteligentes durante a consulta
- ✅ Salvar sessões no Firebase
- ✅ Exportar transcrições e anamneses
- ✅ Múltiplos temas (Default, Matrix, Dusk, Light)
- ✅ Integração com Google Drive (opcional)

## 🐛 Solução de Problemas

### Erro: "API Key for Gemini not found"

- Verifique se o arquivo `.env.local` existe
- Certifique-se de que a variável `VITE_GEMINI_API_KEY` está configurada
- Reinicie o servidor de desenvolvimento após adicionar variáveis de ambiente

### Erro: "Firebase not initialized"

- O Firebase é opcional. O app funciona sem ele (modo convidado)
- Se quiser usar Firebase, configure todas as variáveis `VITE_FIREBASE_*`

### Erro de permissão de microfone

- Verifique as permissões do navegador
- Use HTTPS ou localhost (requerido para API de áudio do navegador)

### Modelo Gemini não encontrado

- Certifique-se de usar `gemini-2.0-flash-exp` ou modelo compatível
- Verifique se sua conta tem acesso à API do Gemini
- Alguns modelos podem ter restrições regionais

## 📚 Recursos Adicionais

- [Documentação Gemini API](https://ai.google.dev/docs)
- [Documentação Firebase](https://firebase.google.com/docs)
- [Documentação Tailwind CSS](https://tailwindcss.com/docs)
- [Documentação React](https://react.dev)

## 🔐 Segurança

- ⚠️ **NUNCA** commit o arquivo `.env.local` no Git
- Use variáveis de ambiente em produção
- Configure restrições de API no Google Cloud Console
- Use HTTPS em produção

## 📝 Notas

- O backup do projeto está na pasta `docs/`
- Todos os componentes estão mantendo a funcionalidade original
- O design foi atualizado para usar Tailadmin como base

## 🆘 Suporte

Em caso de dúvidas:
1. Verifique este guia
2. Consulte a documentação das tecnologias utilizadas
3. Verifique os logs no console do navegador (F12)

---

**Última atualização**: Novembro 2025

