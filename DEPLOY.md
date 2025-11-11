# Guia de Deploy - Assistente de Consulta Médica

## ✅ Build Concluído

O build de produção foi gerado com sucesso na pasta `dist/`.

## 📦 Arquivos Gerados

```
dist/
├── index.html
└── assets/
    └── index-DAB9X13V.js (955.21 kB)
```

## 🚀 Opções de Deploy

### 1. Vercel (Recomendado - Mais Fácil)

1. **Instalar Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Fazer login:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   vercel --prod
   ```

**Ou via Web:**
- Acesse [vercel.com](https://vercel.com)
- Conecte seu repositório GitHub
- Configure:
  - **Build Command**: `npm run build`
  - **Output Directory**: `dist`
  - **Install Command**: `npm install`

### 2. Netlify

1. **Instalar Netlify CLI:**
   ```bash
   npm install -g netlify-cli
   ```

2. **Deploy:**
   ```bash
   netlify deploy --prod --dir=dist
   ```

**Ou via Web:**
- Acesse [netlify.com](https://netlify.com)
- Arraste a pasta `dist` para o site
- Configure:
  - **Build command**: `npm run build`
  - **Publish directory**: `dist`

### 3. GitHub Pages

1. **Instalar gh-pages:**
   ```bash
   npm install --save-dev gh-pages
   ```

2. **Adicionar script ao package.json:**
   ```json
   "scripts": {
     "deploy": "npm run build && gh-pages -d dist"
   }
   ```

3. **Deploy:**
   ```bash
   npm run deploy
   ```

**Configurar GitHub Pages:**
- No repositório GitHub, vá em Settings > Pages
- Source: `gh-pages` branch
- Folder: `/ (root)`

### 4. Firebase Hosting

1. **Instalar Firebase CLI:**
   ```bash
   npm install -g firebase-tools
   ```

2. **Login e inicializar:**
   ```bash
   firebase login
   firebase init hosting
   ```

3. **Configurar:**
   - **Public directory**: `dist`
   - **Single-page app**: `Yes`
   - **Set up automatic builds**: `No`

4. **Deploy:**
   ```bash
   firebase deploy --only hosting
   ```

### 5. Cloudflare Pages

1. Acesse [cloudflare.com/pages](https://pages.cloudflare.com)
2. Conecte seu repositório
3. Configure:
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `/`

### 6. Deploy Manual (Servidor Próprio)

1. **Copiar arquivos:**
   ```bash
   scp -r dist/* usuario@servidor:/caminho/para/app/
   ```

2. **Configurar servidor web (Nginx):**
   ```nginx
   server {
       listen 80;
       server_name seu-dominio.com;
       
       root /caminho/para/app;
       index index.html;
       
       location / {
           try_files $uri $uri/ /index.html;
       }
   }
   ```

## 🔧 Variáveis de Ambiente

Antes do deploy, certifique-se de configurar as variáveis de ambiente na plataforma:

### Variáveis Necessárias:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID` (opcional)
- `VITE_GOOGLE_API_KEY` (opcional, para Google Drive)

### Como Configurar:

**Vercel/Netlify:**
- Settings > Environment Variables
- Adicione cada variável

**Firebase:**
- As variáveis podem ser configuradas no código ou via Firebase Functions

**Outros:**
- Consulte a documentação da plataforma para variáveis de ambiente

## 📝 Configurações Adicionais

### Redirecionamento para SPA (Single Page App)

A maioria das plataformas requer configuração para redirecionar todas as rotas para `index.html`:

**Nginx:**
```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

**Apache (.htaccess):**
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

## 🧪 Testar Localmente (Preview)

Após o build, você pode testar localmente:

```bash
npm run preview
```

Isso iniciará um servidor local na porta padrão (geralmente 4173) para testar o build de produção.

## ⚠️ Notas Importantes

1. **Chunk Size Warning**: O build gera um chunk grande (955 kB). Para produção, considere:
   - Code splitting
   - Lazy loading de componentes
   - Otimização de dependências

2. **CORS**: Se você usar APIs externas, configure CORS adequadamente

3. **HTTPS**: Para uso de microfone e localização, HTTPS é obrigatório em produção

4. **Firebase**: Certifique-se de que as regras de segurança do Firestore estão configuradas

## 🎯 Checklist de Deploy

- [ ] Build concluído sem erros
- [ ] Variáveis de ambiente configuradas
- [ ] Firebase configurado corretamente
- [ ] Testado localmente com `npm run preview`
- [ ] Domínio/configuração de CORS ajustada
- [ ] HTTPS habilitado (obrigatório para APIs de áudio/geolocalização)
- [ ] Regras de segurança do Firestore configuradas

## 📚 Links Úteis

- [Vite Deploy Guide](https://vitejs.dev/guide/static-deploy.html)
- [Vercel Documentation](https://vercel.com/docs)
- [Netlify Documentation](https://docs.netlify.com)
- [Firebase Hosting](https://firebase.google.com/docs/hosting)

---

**Status Atual**: ✅ Build gerado com sucesso em `dist/`
**Tamanho Total**: ~962 KB (comprimido: ~238 KB)


