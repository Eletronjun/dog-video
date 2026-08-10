# 🐾 DogVideo — Guia Completo de Lives (Raspberry Pi + YouTube OAuth2)

> Siga esta ordem exatamente. Cada etapa depende da anterior.

---

## 📋 Visão Geral do Fluxo

```
[Windows - 1x por canal]         [Raspberry Pi - automático]
         |                                   |
  gerar_token.js          --->     live_rasp.py
  (abre navegador,                 (autentica com refresh_token,
   salva token JSON)                cria live, envia POST /api/lives/start,
                                    inicia FFmpeg)
         |                                   |
  link_live.js (backend)   <---    POST /api/lives/start
  (monitora e sincroniza           { modulo, youtube_id }
   lives no banco de dados)
```

---

## 🔵 PARTE 1 — Pré-requisitos no Google Cloud (feito uma vez)

### 1.1 — Criar o Projeto no Google Cloud

1. Acesse [console.cloud.google.com](https://console.cloud.google.com)
2. Clique em **"Selecionar projeto"** → **"Novo Projeto"**
3. Nome sugerido: `DogVideo`
4. Clique em **"Criar"**

### 1.2 — Ativar a YouTube Data API v3

1. No menu lateral: **"APIs e Serviços"** → **"Biblioteca"**
2. Pesquise por `YouTube Data API v3`
3. Clique nela → **"Ativar"**

### 1.3 — Criar as Credenciais OAuth2

1. **"APIs e Serviços"** → **"Credenciais"** → **"+ Criar Credenciais"** → **"ID do cliente OAuth"**
2. Tipo de aplicativo: **"Aplicativo da Web"**
3. Nome: `DogVideo App`
4. Em **"URIs de redirecionamento autorizados"** adicione:
   - `http://localhost:3000`
5. Clique em **"Criar"**
6. Copie o **Client ID** e o **Client Secret**

### 1.4 — Configurar a Tela de Consentimento

1. **"APIs e Serviços"** → **"Tela de Consentimento OAuth"**
2. Tipo: **"Externo"**
3. Preencha nome do app (`DogVideo`), email de suporte e contato do desenvolvedor
4. Em **"Escopos"**: adicione `https://www.googleapis.com/auth/youtube`
5. Em **"Usuários de teste"**: adicione o e-mail do canal do YouTube de cada módulo (ex: `modulo1@gmail.com`)
6. Salve.

> ⚠️ **IMPORTANTE:** Enquanto o app estiver em modo "Teste", apenas os e-mails adicionados como usuários de teste poderão autenticar. Você precisa adicionar o e-mail de cada canal da Raspberry aqui.

---

## 🟡 PARTE 2 — Configurar o `.env` do Backend (Windows)

Abra o arquivo `.env` na raiz do projeto e preencha:

```env
GOOGLE_CLIENT_ID=cole_aqui_o_client_id
GOOGLE_CLIENT_SECRET=cole_aqui_o_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3001/oauth2callback

# Esses campos abaixo serão preenchidos depois:
GOOGLE_REFRESH_TOKEN=
YOUTUBE_STREAM_ID_MODULO1=
```

---

## 🟢 PARTE 3 — Gerar o Token (feito 1x por canal do YouTube)

Este passo é feito **no seu computador Windows**, não na Raspberry.

### 3.1 — Rodar o script de geração de token

No terminal, dentro da pasta `backend/`:

```powershell
cd backend
node gerar_token.js
```

O que acontece:
1. O script abre o **navegador automaticamente**
2. Você faz login com a **conta Google do canal do módulo** (ex: a conta que a Raspberry vai usar)
3. Autoriza o acesso à conta do YouTube
4. O navegador mostra "Autenticação bem-sucedida!"
5. Na pasta `backend/tokens/` é criado um arquivo como:
   `token_Modulo DogVideo 01.json`

### 3.2 — Verificar o token gerado

O arquivo gerado tem este formato:

```json
{
  "access_token": "ya29.xxx...",
  "refresh_token": "1//0hXXXXXXX",
  "scope": "https://www.googleapis.com/auth/youtube",
  "token_type": "Bearer",
  "expiry_date": 1756087936203
}
```

> 📌 O `refresh_token` é a **"chave mestra"** — ele não expira. O `access_token` expira em 1 hora, mas é renovado automaticamente pelos scripts.

### 3.3 — Repetir para cada módulo

Se você tiver mais de um módulo (Módulo 1, Módulo 2...), cada um tem um canal do YouTube separado. Repita o passo 3.1 logando com cada conta diferente. O script nomeia o arquivo automaticamente com o nome do canal.

---

## 🔴 PARTE 4 — Obter o Stream ID permanente do canal

O Stream ID é uma **chave de transmissão permanente** criada pelo YouTube para cada canal. Você a obtém assim:

### Opção A — Pelo YouTube Studio (mais simples)

1. Acesse [studio.youtube.com](https://studio.youtube.com) com a conta do módulo
2. Menu lateral: **"Transmissões ao vivo"** → **"Transmissão ao vivo"**
3. Na tela de transmissão ao vivo, clique em **"Editar"** → **"Usar chave de stream permanente"**
4. Copie o valor do campo **"Nome/chave de stream"** — parece com: `xxxx-xxxx-xxxx-xxxx-xxxx`

### Opção B — Via API (script) 

Se preferir via script, rode no terminal (com o token já gerado):

```powershell
node -e "
const { google } = require('googleapis');
const fs = require('fs');
const token = JSON.parse(fs.readFileSync('tokens/token_Modulo DogVideo 01.json'));
const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
auth.setCredentials(token);
const yt = google.youtube({ version: 'v3', auth });
yt.liveStreams.list({ part: ['id','snippet'], mine: true }).then(r => r.data.items.forEach(s => console.log(s.id, s.snippet.title)));
"
```

### 4.1 — Salvar o Stream ID no `.env`

```env
YOUTUBE_STREAM_ID_MODULO1=xxxx-xxxx-xxxx-xxxx-xxxx
```

---

## 🟣 PARTE 5 — Configurar a Raspberry Pi

### 5.1 — Dependências necessárias na Raspberry

```bash
sudo apt-get update
sudo apt-get install -y ffmpeg python3-pip
pip3 install google-auth google-auth-oauthlib google-api-python-client requests
```

### 5.2 — Estrutura de arquivos na Raspberry

```
/home/pi/dogvideo/
├── live_rasp.py       ← script principal de transmissão
└── config.json        ← configurações e credenciais
```

### 5.3 — O arquivo `config.json` da Raspberry

Crie o arquivo `/home/pi/dogvideo/config.json` com os valores dos passos anteriores:

```json
{
  "client_id": "cole_aqui_o_mesmo_GOOGLE_CLIENT_ID_do_.env",
  "client_secret": "cole_aqui_o_mesmo_GOOGLE_CLIENT_SECRET_do_.env",
  "refresh_token": "cole_aqui_o_refresh_token_do_arquivo_token_*.json",
  "stream_id": "cole_aqui_o_YOUTUBE_STREAM_ID_MODULO1",
  "modulo": 1,
  "backend_url": "http://SEU_IP_DO_SERVIDOR:3001"
}
```

> 🔑 O `refresh_token` você encontra dentro do arquivo `backend/tokens/token_Modulo DogVideo 01.json` gerado no Passo 3.

### 5.4 — O script `live_rasp.py`

```python
import json
import subprocess
import requests
import time
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

# --- Carrega configurações ---
with open('/home/pi/dogvideo/config.json') as f:
    config = json.load(f)

BACKEND_URL = config['backend_url']
MODULO = config['modulo']

def autenticar():
    """Autentica com o Google usando o Refresh Token. Totalmente automático."""
    creds = Credentials(
        token=None,
        refresh_token=config['refresh_token'],
        token_uri='https://oauth2.googleapis.com/token',
        client_id=config['client_id'],
        client_secret=config['client_secret'],
        scopes=['https://www.googleapis.com/auth/youtube']
    )
    # Renova o access_token automaticamente
    creds.refresh(Request())
    print(f"✅ Autenticado com sucesso!")
    return creds

def criar_live(youtube, titulo="DogVideo - Passeio ao Vivo"):
    """Cria o agendamento da live e retorna o ID."""
    from datetime import datetime, timezone, timedelta
    
    agora = datetime.now(timezone.utc)
    inicio = agora + timedelta(seconds=30)
    
    broadcast = youtube.liveBroadcasts().insert(
        part='snippet,status',
        body={
            'snippet': {
                'title': titulo,
                'scheduledStartTime': inicio.strftime('%Y-%m-%dT%H:%M:%SZ'),
            },
            'status': {
                'privacyStatus': 'unlisted',  # Não listado — apenas quem tem o link vê
                'selfDeclaredMadeForKids': False
            }
        }
    ).execute()
    
    broadcast_id = broadcast['id']
    print(f"📺 Live criada! ID: {broadcast_id}")
    return broadcast_id

def vincular_stream(youtube, broadcast_id):
    """Vincula o broadcast à Stream Key permanente."""
    stream_id = config['stream_id']
    
    youtube.liveBroadcasts().bind(
        part='id,contentDetails',
        id=broadcast_id,
        streamId=stream_id
    ).execute()
    print(f"🔗 Broadcast vinculado à stream permanente.")

def transicionar_live(youtube, broadcast_id, status):
    """Muda o status da live (testing → live → complete)."""
    youtube.liveBroadcasts().transition(
        broadcastStatus=status,
        id=broadcast_id,
        part='id,status'
    ).execute()
    print(f"🔄 Status alterado para: {status}")

def avisar_backend(broadcast_id, evento):
    """Avisa o backend que a live iniciou ou encerrou."""
    try:
        if evento == 'start':
            requests.post(f"{BACKEND_URL}/api/lives/start", json={
                'modulo': MODULO,
                'youtube_id': broadcast_id,
                'title': 'DogVideo - Passeio ao Vivo'
            }, timeout=10)
            print(f"📡 Backend avisado: live iniciada (módulo {MODULO})")
        elif evento == 'end':
            requests.post(f"{BACKEND_URL}/api/lives/end", json={
                'modulo': MODULO
            }, timeout=10)
            print(f"📡 Backend avisado: live encerrada (módulo {MODULO})")
    except Exception as e:
        print(f"⚠️ Erro ao avisar backend: {e}")

def iniciar_ffmpeg(stream_key):
    """Inicia o FFmpeg para enviar vídeo da câmera para o YouTube."""
    rtmp_url = f"rtmp://a.rtmp.youtube.com/live2/{stream_key}"
    
    comando = [
        'ffmpeg',
        '-f', 'v4l2',              # Captura da câmera USB/CSI
        '-framerate', '30',
        '-video_size', '1280x720',
        '-i', '/dev/video0',        # Dispositivo da câmera
        '-f', 'alsa',              # Captura de áudio
        '-i', 'hw:0',
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-maxrate', '2500k',
        '-bufsize', '5000k',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-ar', '44100',
        '-f', 'flv',
        rtmp_url
    ]
    
    print(f"🎥 Iniciando transmissão FFmpeg...")
    processo = subprocess.Popen(comando)
    return processo

def main():
    try:
        # 1. Autenticação automática
        creds = autenticar()
        youtube = build('youtube', 'v3', credentials=creds)
        
        # 2. Criar a live e vincular à stream permanente
        broadcast_id = criar_live(youtube)
        vincular_stream(youtube, broadcast_id)
        
        # 3. Aguardar um momento antes de iniciar
        print("⏳ Aguardando 10 segundos antes de iniciar a transmissão...")
        time.sleep(10)
        
        # 4. Transicionar para "testing" e depois "live"
        transicionar_live(youtube, broadcast_id, 'testing')
        time.sleep(5)
        transicionar_live(youtube, broadcast_id, 'live')
        
        # 5. Avisar o backend que a live começou
        avisar_backend(broadcast_id, 'start')
        
        # 6. Iniciar o FFmpeg (transmissão de vídeo)
        # Você precisa da stream key — ela fica nas configurações do canal
        # Aqui usamos o stream_id como chave (para streams via RTMP)
        processo_ffmpeg = iniciar_ffmpeg(config['stream_id'])
        
        print("✅ Transmissão ativa! Pressione Ctrl+C para encerrar.")
        processo_ffmpeg.wait()  # Aguarda até o FFmpeg encerrar
        
    except KeyboardInterrupt:
        print("\n🛑 Encerrando transmissão...")
    finally:
        # Sempre avisa o backend ao encerrar
        avisar_backend(broadcast_id if 'broadcast_id' in dir() else '', 'end')
        if 'processo_ffmpeg' in dir() and processo_ffmpeg.poll() is None:
            processo_ffmpeg.terminate()
        print("✅ Transmissão encerrada com sucesso.")

if __name__ == '__main__':
    main()
```

### 5.5 — Iniciar automaticamente na inicialização da Raspberry

Para que o script rode automaticamente quando a Raspberry ligar:

```bash
# Abrir o crontab
crontab -e

# Adicionar esta linha no final:
@reboot sleep 30 && python3 /home/pi/dogvideo/live_rasp.py >> /home/pi/dogvideo/live.log 2>&1
```

---

## 🟤 PARTE 6 — Iniciar o Backend com o Monitorador de Lives

Na sua máquina (ou servidor), o `link_live.js` precisa estar rodando junto com o backend. Ele verifica a cada 60 segundos se as lives estão ativas e sincroniza com o banco.

O arquivo `package.json` já deve ter um script para isso. Se não, adicione:

```json
"scripts": {
  "start:links": "node link_live.js"
}
```

E rode separadamente:

```powershell
# Terminal 1 — Backend principal
cd backend
node app.js

# Terminal 2 — Monitorador de lives
cd backend
node link_live.js
```

---

## ✅ Resumo Final — O que é feito uma vez vs. automático

| Tarefa | Frequência | Onde |
|---|---|---|
| Criar projeto no Google Cloud | **Uma vez** | Console Google |
| Configurar tela de consentimento | **Uma vez** | Console Google |
| Rodar `gerar_token.js` | **Uma vez por canal** | Windows (sua máquina) |
| Copiar `refresh_token` para `config.json` da Rasp | **Uma vez por canal** | Raspberry Pi |
| Pegar o `stream_id` no YouTube Studio | **Uma vez por canal** | YouTube Studio |
| Rodar `live_rasp.py` na inicialização | **Automático** | Raspberry Pi |
| Backend + `link_live.js` | **Automático (servidor)** | Servidor |

---

## 🚨 Problemas Comuns

| Erro | Causa | Solução |
|---|---|---|
| `invalid_grant` | Refresh token expirado ou revogado | Rodar `gerar_token.js` novamente |
| `quotaExceeded` | Limite da API atingido (10.000 unidades/dia) | Aguardar reset às 00h PST ou solicitar aumento de cota |
| `The caller does not have permission` | E-mail não está na lista de usuários de teste | Adicionar o e-mail no Google Cloud → Tela de consentimento |
| FFmpeg erro no `/dev/video0` | Câmera não reconhecida | Verificar com `ls /dev/video*` na Raspberry |
| Backend não recebe o POST | IP incorreto no `config.json` | Verificar `backend_url` e firewall |


## Documentação Produzida Por

| Nome | Data |
|---|---|
| Bruno Dornelas | 10/08/2026 |