.PHONY: help build up down restart logs clean clean-all test test-backend test-frontend shell-backend shell-frontend ps stop prune

# Cores para output
YELLOW := \033[1;33m
GREEN := \033[1;32m
RED := \033[1;31m
RESET := \033[0m

# Variáveis
COMPOSE := docker compose
CONTAINER_APP := dog-video-app-1
BACKEND_PATH := /app/backend
FRONTEND_PATH := /app/frontend

##@ Ajuda

help: ## Mostra esta mensagem de ajuda
	@echo "$(GREEN)Comandos disponiveis:$(RESET)"
	@awk 'BEGIN {FS = ":.*##"; printf "\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  $(YELLOW)%-20s$(RESET) %s\n", $$1, $$2 } /^##@/ { printf "\n$(GREEN)%s$(RESET)\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##@ Docker - Gerenciamento

up: ## Inicia os containers em background (docker compose up -d)
	@echo "$(YELLOW)Iniciando containers...$(RESET)"
	$(COMPOSE) up -d
	@echo "$(GREEN)Containers iniciados!$(RESET)"

up-build: ## Reconstroi e inicia os containers (docker compose up --build)
	@echo "$(YELLOW)Reconstruindo e iniciando containers...$(RESET)"
	$(COMPOSE) up --build -d
	@echo "$(GREEN)Containers reconstruidos e iniciados!$(RESET)"

down: ## Para e remove os containers (docker compose down)
	@echo "$(YELLOW)Parando containers...$(RESET)"
	$(COMPOSE) down
	@echo "$(GREEN)Containers parados e removidos!$(RESET)"

restart: ## Reinicia os containers
	@echo "$(YELLOW)Reiniciando containers...$(RESET)"
	$(COMPOSE) restart
	@echo "$(GREEN)Containers reiniciados!$(RESET)"

ps: ## Lista os containers em execucao
	@echo "$(YELLOW)Containers em execucao:$(RESET)"
	$(COMPOSE) ps

logs: ## Mostra logs dos containers (use CTRL+C para sair)
	@echo "$(YELLOW)Exibindo logs...$(RESET)"
	$(COMPOSE) logs -f

logs-backend: ## Mostra apenas logs do backend
	@echo "$(YELLOW)Logs do backend:$(RESET)"
	$(COMPOSE) logs -f app | grep backend

##@ Docker - Limpeza

clean-cache: ## Limpa cache do Docker builder
	@echo "$(YELLOW)Limpando cache do Docker...$(RESET)"
	docker builder prune -f
	@echo "$(GREEN)Cache limpo!$(RESET)"

clean-all: ## Limpeza completa: containers, volumes, imagens e cache
	@echo "$(RED)ATENCAO: Isso removera TODOS containers, volumes e imagens do projeto!$(RESET)"
	@echo "$(YELLOW)Aguarde 3 segundos para cancelar (CTRL+C)...$(RESET)"
	@sleep 3
	@echo "$(YELLOW)Iniciando limpeza completa...$(RESET)"
	$(COMPOSE) down -v --rmi all
	docker builder prune -af
	@echo "$(GREEN)Limpeza completa finalizada!$(RESET)"

prune: ## Remove todos recursos Docker nao utilizados (containers, redes, imagens)
	@echo "$(YELLOW)Removendo recursos nao utilizados...$(RESET)"
	docker system prune -af --volumes
	@echo "$(GREEN)Recursos removidos!$(RESET)"

##@ Testes

test: ## Roda todos os testes (backend e frontend) dentro do container
	@echo "$(YELLOW)Rodando testes do backend...$(RESET)"
	docker exec -it $(CONTAINER_APP) sh -c "cd $(BACKEND_PATH) && npm test"
	@echo "$(YELLOW)Rodando testes do frontend...$(RESET)"
	docker exec -it $(CONTAINER_APP) sh -c "cd $(FRONTEND_PATH) && npm test -- --coverage --watchAll=false"

test-backend: ## Roda os testes do backend dentro do container
	@echo "$(YELLOW)Rodando testes do backend...$(RESET)"
	docker exec -it $(CONTAINER_APP) sh -c "cd $(BACKEND_PATH) && npm test"

test-watch: ## Roda os testes em modo watch (auto-reload)
	@echo "$(YELLOW)Rodando testes em modo watch...$(RESET)"
	docker exec -it $(CONTAINER_APP) sh -c "cd $(BACKEND_PATH) && npm test -- --watch"

test-coverage: ## Roda os testes com relatorio de cobertura
	@echo "$(YELLOW)Gerando relatorio de cobertura...$(RESET)"
	@mkdir -p backend/coverage
	@chmod 777 backend/coverage
	@docker exec -it $(CONTAINER_APP) sh -c "cd $(BACKEND_PATH) && npm test -- --coverage --watchAll=false" || true
	@echo "$(GREEN)Relatorio de cobertura gerado em backend/coverage$(RESET)"

test-frontend: ## Roda os testes do frontend dentro do container
	@echo "$(YELLOW)Rodando testes do frontend...$(RESET)"
	docker exec -it $(CONTAINER_APP) sh -c "cd $(FRONTEND_PATH) && npm test -- --watchAll=false"

test-frontend-coverage: ## Roda os testes do frontend com relatorio de cobertura
	@echo "$(YELLOW)Gerando relatorio de cobertura do frontend...$(RESET)"
	@mkdir -p frontend/coverage
	@chmod 777 frontend/coverage
	@docker exec -it $(CONTAINER_APP) sh -c "cd $(FRONTEND_PATH) && npm test -- --coverage --watchAll=false" || true
	@echo "$(GREEN)Relatorio de cobertura gerado em frontend/coverage$(RESET)"

##@ Acesso aos Containers

shell: ## Acessa o shell do container principal
	@echo "$(YELLOW)Acessando shell do container...$(RESET)"
	docker exec -it $(CONTAINER_APP) sh

shell-backend: ## Acessa o diretorio backend no container
	@echo "$(YELLOW)Acessando backend no container...$(RESET)"
	docker exec -it $(CONTAINER_APP) sh -c "cd $(BACKEND_PATH) && sh"

shell-frontend: ## Acessa o diretorio frontend no container
	@echo "$(YELLOW)Acessando frontend no container...$(RESET)"
	docker exec -it $(CONTAINER_APP) sh -c "cd $(FRONTEND_PATH) && sh"

##@ Desenvolvimento

install-backend: ## Instala dependencias do backend dentro do container
	@echo "$(YELLOW)Instalando dependencias do backend...$(RESET)"
	docker exec -it $(CONTAINER_APP) sh -c "cd $(BACKEND_PATH) && npm install"

install-frontend: ## Instala dependencias do frontend dentro do container
	@echo "$(YELLOW)Instalando dependencias do frontend...$(RESET)"
	docker exec -it $(CONTAINER_APP) sh -c "cd $(FRONTEND_PATH) && npm install"

install-all: ## Instala todas as dependencias (backend e frontend)
	@echo "$(YELLOW)Instalando todas as dependencias...$(RESET)"
	@$(MAKE) install-backend
	@$(MAKE) install-frontend
	@echo "$(GREEN)Todas as dependencias instaladas!$(RESET)"

##@ Atalhos Uteis

dev: up logs ## Inicia os containers e mostra os logs

rebuild: clean-cache up-build ## Limpa cache e reconstroi tudo

status: ps ## Alias para 'ps' - mostra status dos containers
