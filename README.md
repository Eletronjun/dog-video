# DogVideo
Repositorio com propósito de documentação, acompanhamento e versionamento de código para o projeto Dogvideo (2024), realizado pela equipe de software da Empresa Júnior EletronJun.

## Tecnologias utilizadas
[![My Skills](https://skillicons.dev/icons?i=html,css,js,nodejs,react,mysql,php,docker&perline=8)](https://skillicons.dev)

## Como Contribuir
#### [Diretrizes e Política de Contribuição](https://github.com/wChrstphr/dog-video/blob/a2263781d4e4bfe6c3dcadd85ea403fe0c5acee3/CONTRIBUTING.md)

---

## Documentação de Desenvolvimento

Este documento contém o resumo da estrutura da aplicação, configurações de ambiente e processos de deploy.

### 1. Estrutura do Projeto
O projeto está dividido em duas partes principais:
* `frontend/`: Contém a aplicação web React (UI, páginas de CRUD, painel de admin e player do Google Maps).
* `backend/`: Contém a API REST em Express (Rotas de Clientes, Passeadores, Middlewares JWT, Conexão com banco Neon).

### 2. Ambientes e Banco de Dados (NeonDB)

Toda a mudança de ambiente é controlada por uma única variável no arquivo `.env` raiz.

Os bancos de dados estão hospedados no **Neon DB** e estão divididos em branches (`dev`, `hom`, `prod`).

#### Arquivo `.env` Raiz
Na pasta raiz do projeto, copie o arquivo `.env` armazenado na documentação do projeto (consulte o Gerente). Antes de rodar, verifique se a estrutura está condizente com o arquivo `.env.example`, se tiver uma nova variável, avise ao gerente, mude o arquivo e deixe o arquivo `.env` atualizado armazenado na documentação.

> ⚠️ **Atenção:** O Node.js está configurado no arquivo `backend/config/db.js` para ler a variável `APP_ENV` e conectar automaticamente na URL de banco de dados correspondente.


### 3. Senhas e Acessos Padrão

- **Senha Padrão para Novos Clientes:** `dog123` (O sistema define automaticamente ao criar o cadastro).
- **Senha do Administrador de Testes:**
  - Ambiente **Dev/Hom**: `dog123`
  - Ambiente **Prod**: `dog123.`
- **Redefinição Obrigatória:** O middleware obriga o usuário a redefinir a senha provisória em seu primeiro acesso antes de liberar as funcionalidades completas do sistema.
- **Script Utilitário:** Caso precise resetar a senha do admin em todos os ambientes via banco de dados diretamente, utilize o script de segurança rodando o comando:
  `docker-compose exec app node backend/scripts/reset_admin.js`

### 4. Como Rodar o Projeto Localmente

Devido à conteinerização, o setup do projeto é bastante direto:
1. Preencha os arquivos `.env` na raiz e no `frontend/` (caso necessário para APIs externas).
2. Na raiz do projeto, execute:
   ```bash
   docker compose up --build
   ```
3. O Backend iniciará na porta `3001`.
4. O Frontend iniciará na porta `3000`.

### 5. Procedimentos de Deploy em VPS

Este projeto foi estruturado para ser implantado usando arquivos Docker separados para cada ambiente (`Dockerfile.dev`, `Dockerfile.hom`, `Dockerfile.prod`).

#### Deploy de Produção
No servidor de VPS, crie uma pasta, clone o projeto, adicione o arquivo `.env` configurado com `APP_ENV=prod` e use os comandos docker:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

*(Certifique-se de configurar o proxy reverso do Nginx para mapear a porta externa 80/443 para os contêineres locais).*

> Para mais detalhes, verifique os detalhes na documentação que consta no Drive do projeto.

### 6. Estrutura de Rotas e Endpoints

A API do backend está isolada na pasta `backend/routes/`. As principais rotas incluem:
- `/login`: Retorna o Token JWT. Se for o primeiro acesso, retorna flag indicando a necessidade de alteração de senha.
- `/clientes`: CRUD completo de clientes (Protegido via JWT).
- `/passeadores`: CRUD de passeadores e atualização de status de bateria/localização (se ativado).

## 7. Auditoria de Requisitos

Este relatório analisa a conclusão dos requisitos funcionais (RF) e não-funcionais (NF) listados na documentação original, comparando-os com o código-fonte atual do projeto.

### 1. Resumo
A aplicação possui **Autenticação, Gestão de Usuários (Clientes/Passeadores), Estrutura de Banco de Dados, Transmissão de Vídeo via YouTube e o Chat**. Restam apenas ajustes no Mapa e Notificações Firebase.

### 2. Requisitos Funcionais (RF)

| ID | Requisito | Status | Observações |
|:---|:---|:---:|:---|
| **RF01** | Sistema de Localização | ⚠️ Parcial | O componente `Map.js` existe e usa a API do Google Maps, porém a `googleMapsApiKey` está vazia. O mapa não renderiza em produção. |
| **RF02** | Sistema de Sensoriamento (Áudio/Vídeo) | ✅ Concluído | Iframe do YouTube implementado no frontend (`cameras.js`), exibindo vídeo nativamente. |
| **RF03** | Sistema de Autenticação | ✅ Concluído | JWT e criptografia `bcrypt` implementados com sucesso. Senhas de reset e permissões ativas. |
| **RF04** | Sistema de Transmissão (Web) | ✅ Concluído | Backend possui script `link_live.js` que monitora transmissões do YouTube em tempo real via Google API e atualiza o banco NeonDB. |
| **RF05** | Sistema de Notificação (Pet) | ❌ Ausente | Não há bibliotecas ou chamadas para Firebase Cloud Messaging (FCM) no código. |
| **RF06** | Sistema de Notificação (Passeador) | ❌ Ausente | Mesma situação do RF05. |
| **RF07** | Sistema de Backup (Gravações) | ⚠️ Parcial | Sendo transmitido via YouTube, a gravação (VOD) fica salva na própria plataforma de acordo com o Módulo, porém não há um menu no App para visualizar transmissões antigas. |
| **RF08** | Sistema de Comunicação (Chat) | ✅ Concluído | Código Socket.io reativado e integrado ao player de vídeo (`chat.js`). |

### 3. Requisitos Não-Funcionais (NF)

| ID | Requisito | Status | Observações |
|:---|:---|:---:|:---|
| **NF01** | Intuitividade | ✅ Concluído | A interface atual de CRUDs e Login é limpa e funcional (feita em React). |
| **NF02** | Responsividade | ✅ Concluído | CSS modular adaptado para diversas telas. |
| **NF03** | Segurança | ✅ Concluído | Rotas protegidas, bloqueio de múltiplas tentativas (10 min lockout) e senhas criptografadas. |
| **NF04** | Desempenho (Baixa Latência) | ✅ Concluído | Delega a transmissão de vídeo para o player nativo do YouTube, removendo a carga dos servidores da aplicação. |
| **NF05** | Suporte a Multiusuários | ✅ Concluído | Arquitetura Node.js + PostgreSQL suporta conexões simultâneas via *pooler* no NeonDB. |
| **NF06** | Disponibilidade de Backup (1 sem) | ⚠️ Parcial | O YouTube retém o backup automático (VOD), mas falta UI para os clientes assistirem novamente. |
| **NF07** | Comunicação Pop-up direta | ✅ Concluído | Chat habilitado via Socket.io no momento da transmissão. |
| **NF08** | Interatividade (Mapa) | ⚠️ Parcial | O mapa permite zoom e arrasto (`streetViewControl: false`), mas requer a API Key para funcionar. |

### 4. Próximos Passos

As seguintes ações devem ser priorizadas pelo próximo time de desenvolvimento:

> [!CAUTION]
> **1. Habilitar o Google Maps:** Gerar uma chave de API no Google Cloud Console e preencher no arquivo `.env` para que o mapa em `Cameras/Map.js` volte a funcionar.

> [!IMPORTANT]
> **2. Definir Padrão de Chaves YouTube:** Como a funcionalidade de Lives foi integrada, o próximo passo essencial é gerar a documentação de infraestrutura sobre como a Empresa Júnior criará as credenciais do YouTube (arquivo `token_Modulo DogVideo 01.json`) para os novos passeadores.

> [!TIP]
> **3. Reavaliar Escopo (Chat):** Reavaliar se o chat ao vivo é estritamente necessário para o MVP.

---

<p align="center">Copyright (©) 2025 Thiago Walisson Almeida Rodrigues</p>
