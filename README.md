# 🏥 Assistente de Consulta em Tempo Real

> Aplicativo inteligente para transcrição e documentação automática de consultas médicas usando IA

[![React](https://img.shields.io/badge/React-19-61dafb?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?logo=tailwind-css)](https://tailwindcss.com)
[![Gemini](https://img.shields.io/badge/Gemini-2.0_Flash-4285F4?logo=google)](https://ai.google.dev)

## 📋 Sobre o Projeto

Sistema completo de assistência médica que utiliza inteligência artificial para:
- **Transcrever consultas** em tempo real com alta precisão
- **Gerar anamneses** automaticamente estruturadas
- **Fornecer insights** inteligentes durante a consulta
- **Salvar sessões** de forma segura e organizada
- **Exportar dados** para Google Drive ou arquivos locais

## ✨ Funcionalidades

### 🎤 Transcrição em Tempo Real
- Captura de áudio com múltiplos buffers para redundância
- Correção automática de transcrições usando Gemini Flash
- Visualização de forma de onda em tempo real
- Suporte a múltiplos dispositivos de áudio

### 📝 Geração Automática de Anamnese
- Preenchimento estruturado completo de anamnese médica
- Modo ao vivo (atualização contínua) ou manual
- Aprendizado com padrões de consultas anteriores
- Integração com conhecimento médico especializado

### 💡 Insights Inteligentes
- Sugestões contextuais durante a consulta
- Conexões entre sintomas e possíveis diagnósticos
- Próximos passos sugeridos
- Histórico de insights para referência

### 🎨 Interface Moderna
- Design baseado no Tailadmin
- Múltiplos temas (Default, Matrix, Dusk, Light)
- Totalmente responsivo
- Animações suaves e transições

### 🔒 Segurança e Privacidade
- Autenticação via Firebase
- Modo convidado (sem login necessário)
- Dados salvos localmente como backup
- Exportação segura de dados

## 🚀 Início Rápido

### Pré-requisitos

- Node.js 18 ou superior
- NPM ou Yarn
- Conta Google (para API do Gemini)

### Instalação

1. **Clone o repositório** (ou navegue até a pasta do projeto)

```bash
cd ASSISTENTE-DE-CONSULTA-1
```

2. **Instale as dependências**

```bash
npm install
```

3. **Configure as variáveis de ambiente**

Crie um arquivo `.env.local` na raiz do projeto:

```env
# OBRIGATÓRIO: Chave da API do Gemini
VITE_GEMINI_API_KEY=sua_chave_aqui

# OPCIONAL: Configurações do Firebase (para autenticação)
VITE_FIREBASE_API_KEY=sua_api_key
VITE_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu-projeto-id
VITE_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=seu_messaging_sender_id
VITE_FIREBASE_APP_ID=seu_app_id
VITE_FIREBASE_MEASUREMENT_ID=seu_measurement_id
```

4. **Obtenha sua chave da API do Gemini**

   - Acesse: https://aistudio.google.com/apikey
   - Clique em "Get API Key" ou "Criar chave de API"
   - Copie a chave e adicione ao `.env.local`

   📖 **Guia completo**: Veja [SETUP.md](./SETUP.md) para instruções detalhadas

5. **Execute o projeto**

```bash
npm run dev
```

O aplicativo estará disponível em `http://localhost:3000`

## 📖 Documentação Completa

Para instruções detalhadas de setup, configuração do Google Cloud, Firebase e troubleshooting, consulte:
- **[SETUP.md](./SETUP.md)** - Guia completo de instalação e configuração

## 🛠️ Tecnologias Utilizadas

### Frontend
- **React 19** - Biblioteca UI moderna
- **TypeScript** - Tipagem estática
- **Vite** - Build tool rápida
- **Tailwind CSS** - Framework CSS utility-first (estilo Tailadmin)
- **Radix UI** - Componentes acessíveis e não-estilizados

### Backend & Serviços
- **Firebase** - Autenticação e banco de dados
- **Google Gemini 2.0 Flash** - Modelo de IA para transcrição e análise
- **Web Speech API** - Captura de áudio do navegador

### Utilitários
- **Google Drive API** - Exportação de arquivos (opcional)
- **Geolocation API** - Registro de localização das consultas

## 📁 Estrutura do Projeto

```
ASSISTENTE-DE-CONSULTA-1/
├── components/          # Componentes React reutilizáveis
│   ├── Dashboard.tsx
│   ├── TranscriptionPanel.tsx
│   ├── ControlsPanel.tsx
│   ├── InsightsPanel.tsx
│   └── ...
├── services/           # Serviços e lógica de negócio
│   ├── geminiService.ts      # Integração com Gemini Flash
│   ├── firebaseService.ts    # Autenticação e banco
│   ├── googleDriveService.ts # Exportação Google Drive
│   └── ...
├── hooks/              # Custom React hooks
├── utils/              # Funções utilitárias
├── src/
│   └── index.css      # Estilos globais e Tailwind
├── docs/              # Documentação e backup
├── tailwind.config.js # Configuração Tailwind
├── vite.config.ts     # Configuração Vite
└── package.json       # Dependências do projeto
```

## 🎯 Como Usar

1. **Inicie uma Sessão**
   - Clique em "Iniciar Nova Sessão"
   - Permita acesso ao microfone quando solicitado

2. **Configure o Áudio**
   - Selecione o dispositivo de microfone
   - Ajuste o volume conforme necessário

3. **Inicie a Transcrição**
   - Clique no botão de microfone grande
   - Comece a falar normalmente
   - A transcrição aparecerá em tempo real

4. **Monitore a Anamnese**
   - A anamnese será gerada automaticamente (modo ao vivo)
   - Ou clique em "Gerar Anamnese" no modo manual
   - Veja insights sugeridos no painel lateral

5. **Salve e Exporte**
   - Clique em "Encerrar Sessão" quando terminar
   - A sessão será salva automaticamente (se estiver logado)
   - Exporte transcrições ou anamneses usando o botão "Exportar"

## 🔧 Scripts Disponíveis

```bash
npm run dev      # Inicia servidor de desenvolvimento
npm run build    # Cria build de produção
npm run preview  # Preview do build de produção
npm run lint     # Executa linter
```

## 🌐 Deploy

### Vercel (Recomendado)

1. Instale a CLI da Vercel: `npm i -g vercel`
2. Execute: `vercel`
3. Configure as variáveis de ambiente no dashboard da Vercel

### Outros Plataformas

O projeto pode ser deployado em qualquer plataforma que suporte aplicações Node.js:
- Netlify
- Railway
- Render
- AWS Amplify

**Importante**: Configure todas as variáveis de ambiente `VITE_*` na plataforma de deploy.

## 📝 Licença

Este projeto é privado e confidencial.

## 🤝 Contribuindo

Este é um projeto privado. Para sugestões ou problemas, entre em contato com o mantenedor.

## 🆘 Suporte

- 📖 Consulte [SETUP.md](./SETUP.md) para problemas comuns
- 🔍 Verifique os logs no console do navegador (F12)
- 📚 Documentação das tecnologias utilizadas

---

**Desenvolvido com ❤️ para melhorar a documentação médica**

**Última atualização**: Novembro 2025
