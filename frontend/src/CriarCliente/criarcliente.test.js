import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import CriarCliente from './criarcliente';

jest.mock('axios');

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

window.alert = jest.fn();

describe('CriarCliente Component', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    axios.get.mockClear();
    axios.post.mockClear();
    window.alert.mockClear();
  });

  test('Renderiza os campos do formulário', async () => {
    axios.get.mockResolvedValueOnce({ data: { success: true, passeadores: [] } });

    render(<CriarCliente />, { wrapper: MemoryRouter });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Nome do cliente')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('CPF')).toBeInTheDocument();
    });
  });

  test('Trata erro de passeadores invalido ou falha de rede', async () => {
    axios.get.mockResolvedValueOnce({ data: { success: false } });
    render(<CriarCliente />, { wrapper: MemoryRouter });
    await waitFor(() => expect(screen.getByPlaceholderText('Nome do cliente')).toBeInTheDocument());

    axios.get.mockRejectedValueOnce(new Error('Erro backend'));
    render(<CriarCliente />, { wrapper: MemoryRouter });
    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(2));
  });

  test('Exibe alerta se o nome do cão estiver em branco ou sem passeador', async () => {
    axios.get.mockResolvedValueOnce({ data: { success: true, passeadores: [{ id: 1, nome: 'Passeador Z' }] } });

    render(<CriarCliente />, { wrapper: MemoryRouter });

    await waitFor(() => screen.getByPlaceholderText('Nome do cliente'));

    // Cão em branco
    fireEvent.click(screen.getByRole('button', { name: /criar/i }));
    expect(window.alert).toHaveBeenCalledWith('Por favor, digite o nome de pelo menos um cachorrinho.');

    // Preenche cão, mas sem passeador
    fireEvent.change(screen.getByPlaceholderText('Cães (separados por vírgula)'), { target: { value: 'Rex' } });
    fireEvent.click(screen.getByRole('button', { name: /criar/i }));
    expect(window.alert).toHaveBeenCalledWith('Por favor, selecione um passeador.');
  });

  test('Valida pacote Temporario sem dias de teste validos', async () => {
    axios.get.mockResolvedValueOnce({ data: { success: true, passeadores: [{ id: 1, nome: 'Passeador Z' }] } });

    render(<CriarCliente />, { wrapper: MemoryRouter });

    await waitFor(() => screen.getByPlaceholderText('Nome do cliente'));

    await waitFor(() => {
      fireEvent.click(screen.getByText('Selecione o Passeador'));
      expect(screen.getByText('Passeador Z')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Passeador Z'));

    // Seleciona o pacote Temporario via CustomSelect
    fireEvent.click(screen.getByText('Selecione o Pacote'));
    fireEvent.click(screen.getByText('Temporário'));

    fireEvent.change(screen.getByPlaceholderText('Cães (separados por vírgula)'), { target: { value: 'Rex' } });

    fireEvent.click(screen.getByRole('button', { name: /criar/i }));

    expect(window.alert).toHaveBeenCalledWith('Para pacote temporário, informe um número válido de dias de teste (maior que 0)');

    // Preenche dias de teste
    const inputDias = screen.getByPlaceholderText('Dias');
    fireEvent.change(inputDias, { target: { value: '15' } });
    expect(inputDias.value).toBe('15');
  });

  test('Exibe alertas de erros de validação antes do envio', async () => {
    axios.get.mockResolvedValueOnce({ data: { success: true, passeadores: [{ id: 1, nome: 'Passeador Z' }] } });

    render(<CriarCliente />, { wrapper: MemoryRouter });

    await waitFor(() => screen.getByPlaceholderText('Nome do cliente'));

    await waitFor(() => {
      fireEvent.click(screen.getByText('Selecione o Passeador'));
      expect(screen.getByText('Passeador Z')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Passeador Z'));

    fireEvent.change(screen.getByPlaceholderText('Nome do cliente'), { target: { value: 'a' } });
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'invalid' } });
    fireEvent.change(screen.getByPlaceholderText('CPF'), { target: { value: '123' } });
    fireEvent.change(screen.getByPlaceholderText('Telefone'), { target: { value: '123' } });
    fireEvent.change(screen.getByPlaceholderText('Horário de passeio (HH:MM)'), { target: { value: '9999' } });
    fireEvent.change(screen.getByPlaceholderText('Cães (separados por vírgula)'), { target: { value: 'Rex' } });

    fireEvent.click(screen.getByRole('button', { name: /criar/i }));

    expect(window.alert).toHaveBeenCalledWith('Por favor, corrija os erros destacados antes de enviar.');
  });

  test('Cria um cliente e passeio com sucesso e navega', async () => {
    axios.get.mockResolvedValueOnce({ 
      data: { success: true, passeadores: [{ id: 1, nome: 'Passeador Z' }] } 
    });
    axios.post.mockResolvedValueOnce({ data: { success: true, id_cliente: 10 } });
    axios.post.mockResolvedValueOnce({ data: { success: true } });

    render(<CriarCliente />, { wrapper: MemoryRouter });

    await waitFor(() => screen.getByPlaceholderText('Nome do cliente'));

    await waitFor(() => {
      fireEvent.click(screen.getByText('Selecione o Passeador'));
      expect(screen.getByText('Passeador Z')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Passeador Z'));

    // Preenche todos os dados corretos
    fireEvent.change(screen.getByPlaceholderText('Nome do cliente'), { target: { value: 'João Silva' } });
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'joao@teste.com' } });
    fireEvent.change(screen.getByPlaceholderText('CPF'), { target: { value: '111.444.777-35' } });
    fireEvent.change(screen.getByPlaceholderText('Telefone'), { target: { value: '(61) 99999-9999' } });
    fireEvent.change(screen.getByPlaceholderText('Horário de passeio (HH:MM)'), { target: { value: '14:30' } });
    fireEvent.change(screen.getByPlaceholderText('Cães (separados por vírgula)'), { target: { value: 'Rex, Bob' } });
    fireEvent.change(screen.getByPlaceholderText('Endereço'), { target: { value: 'Rua Teste' } });
    fireEvent.change(screen.getByPlaceholderText('Anotações'), { target: { value: 'Nenhuma' } });

    fireEvent.click(screen.getByRole('button', { name: /criar/i }));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledTimes(2);
      expect(window.alert).toHaveBeenCalledWith('Cliente criado com sucesso!');
      expect(mockNavigate).toHaveBeenCalledWith('/clientes');
    });
  });

  test('Trata resposta de falha da API ao criar cliente', async () => {
    axios.get.mockResolvedValueOnce({ 
      data: { success: true, passeadores: [{ id: 1, nome: 'Passeador Z' }] } 
    });
    axios.post.mockResolvedValueOnce({ data: { success: false, message: 'CPF existente' } });

    render(<CriarCliente />, { wrapper: MemoryRouter });

    await waitFor(() => screen.getByPlaceholderText('Nome do cliente'));

    await waitFor(() => {
      fireEvent.click(screen.getByText('Selecione o Passeador'));
      expect(screen.getByText('Passeador Z')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Passeador Z'));

    fireEvent.change(screen.getByPlaceholderText('Nome do cliente'), { target: { value: 'João Silva' } });
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'joao@teste.com' } });
    fireEvent.change(screen.getByPlaceholderText('CPF'), { target: { value: '111.444.777-35' } });
    fireEvent.change(screen.getByPlaceholderText('Telefone'), { target: { value: '(61) 99999-9999' } });
    fireEvent.change(screen.getByPlaceholderText('Horário de passeio (HH:MM)'), { target: { value: '14:30' } });
    fireEvent.change(screen.getByPlaceholderText('Cães (separados por vírgula)'), { target: { value: 'Rex' } });

    fireEvent.click(screen.getByRole('button', { name: /criar/i }));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Erro ao criar cliente: CPF existente');
    });
  });

  test('Trata exceção com error.response ao criar cliente', async () => {
    axios.get.mockResolvedValueOnce({ 
      data: { success: true, passeadores: [{ id: 1, nome: 'Passeador Z' }] } 
    });
    axios.post.mockRejectedValueOnce({
      response: { data: { message: 'Erro servidor' } }
    });

    render(<CriarCliente />, { wrapper: MemoryRouter });

    await waitFor(() => screen.getByPlaceholderText('Nome do cliente'));

    await waitFor(() => {
      fireEvent.click(screen.getByText('Selecione o Passeador'));
      expect(screen.getByText('Passeador Z')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Passeador Z'));

    fireEvent.change(screen.getByPlaceholderText('Nome do cliente'), { target: { value: 'João Silva' } });
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'joao@teste.com' } });
    fireEvent.change(screen.getByPlaceholderText('CPF'), { target: { value: '111.444.777-35' } });
    fireEvent.change(screen.getByPlaceholderText('Telefone'), { target: { value: '(61) 99999-9999' } });
    fireEvent.change(screen.getByPlaceholderText('Horário de passeio (HH:MM)'), { target: { value: '14:30' } });
    fireEvent.change(screen.getByPlaceholderText('Cães (separados por vírgula)'), { target: { value: 'Rex' } });

    fireEvent.click(screen.getByRole('button', { name: /criar/i }));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Erro: Erro servidor');
    });
  });

  test('Navega ao clicar no botão Cancelar', async () => {
    axios.get.mockResolvedValueOnce({ data: { success: true, passeadores: [] } });

    render(<CriarCliente />, { wrapper: MemoryRouter });

    await waitFor(() => screen.getByPlaceholderText('Nome do cliente'));

    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/clientes');
  });
});
