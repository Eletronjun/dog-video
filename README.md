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

---

<p align="center">Copyright (©) 2025 Thiago Walisson Almeida Rodrigues</p>
