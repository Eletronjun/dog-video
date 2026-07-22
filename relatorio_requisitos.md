# Auditoria de Requisitos: Dogvideo

Este relatório analisa a conclusão dos requisitos funcionais (RF) e não-funcionais (NF) listados na documentação original, comparando-os com o código-fonte atual do projeto.

---

## 📊 1. Resumo
A aplicação possui **Autenticação, Gestão de Usuários (Clientes/Passeadores), Estrutura de Banco de Dados, Transmissão de Vídeo via YouTube e o Chat**. Restam apenas ajustes no Mapa e Notificações Firebase.

## 📋 2. Requisitos Funcionais (RF)

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

---

## 🛠️ 3. Requisitos Não-Funcionais (NF)

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

---

## 🚀 4. Próximos Passos

As seguintes ações devem ser priorizadas pelo próximo time de desenvolvimento:

> [!CAUTION]
> **1. Habilitar o Google Maps:** Gerar uma chave de API no Google Cloud Console e preencher no arquivo `.env` para que o mapa em `Cameras/Map.js` volte a funcionar.

> [!IMPORTANT]
> **2. Definir Padrão de Chaves YouTube:** Como a funcionalidade de Lives foi integrada, o próximo passo essencial é gerar a documentação de infraestrutura sobre como a Empresa Júnior criará as credenciais do YouTube (arquivo `token_Modulo DogVideo 01.json`) para os novos passeadores.

> [!TIP]
> **3. Reavaliar Escopo (Chat):** Reavaliar se o chat ao vivo é estritamente necessário para o MVP.
