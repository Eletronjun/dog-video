import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EditarCliente from './editarcliente';

global.fetch = jest.fn();

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useParams: () => ({ id: '1' }),
}));

window.alert = jest.fn();

describe('EditarCliente Component', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    fetch.mockClear();
    window.alert.mockClear();
    localStorage.clear();
  });

  const mockClienteData = {
    success: true,
    cliente: {
      nome: 'Ana',
      email: 'ana@teste.com',
      cpf: '12345678909',
      telefone: '11999999999',
      caes: ['Rex'],
      horario_passeio: '10:00',
      pacote: 'Mensal',
      anotacoes: 'Obs',
      endereco: 'Rua A',
      passeador: 'Passeador Z'
    }
  };

  const mockPasseadoresData = {
    success: true,
    passeadores: [{ id: 1, nome: 'Passeador Z' }]
  };

  test('Renderiza os dados do cliente e passeadores carregados', async () => {
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue(mockClienteData)
    });
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue(mockPasseadoresData)
    });

    render(<EditarCliente />, { wrapper: MemoryRouter });

    await waitFor(() => {
      expect(screen.getByDisplayValue('Ana')).toBeInTheDocument();
      expect(screen.getByDisplayValue('ana@teste.com')).toBeInTheDocument();
    });
  });

  test('Trata respostas de erro e exceções no fetchData de clientes e passeadores', async () => {
    // 1. clienteData success false
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue({ success: false })
    });
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue({ success: false })
    });

    render(<EditarCliente />, { wrapper: MemoryRouter });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    // 2. Exceção no fetchData
    fetch.mockRejectedValueOnce(new Error('Erro no fetch inicial'));

    render(<EditarCliente />, { wrapper: MemoryRouter });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(3);
    });
  });

  test('Valida entradas de formatação e exibe mensagens de erro', async () => {
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue(mockClienteData)
    });
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue(mockPasseadoresData)
    });

    render(<EditarCliente />, { wrapper: MemoryRouter });

    await waitFor(() => screen.getByDisplayValue('Ana'));

    // Nome invalido
    fireEvent.change(screen.getByDisplayValue('Ana'), { target: { name: 'nome', value: 'a' } });
    expect(screen.getByText('O nome deve começar com letra maiúscula e ter pelo menos 2 caracteres')).toBeInTheDocument();

    // Email invalido
    fireEvent.change(screen.getByDisplayValue('ana@teste.com'), { target: { name: 'email', value: 'invalid' } });
    expect(screen.getByText('Email inválido')).toBeInTheDocument();

    // CPF invalido
    fireEvent.change(screen.getByPlaceholderText('CPF'), { target: { name: 'cpf', value: '111' } });
    expect(screen.getByText('CPF inválido')).toBeInTheDocument();

    // Telefone invalido
    fireEvent.change(screen.getByPlaceholderText('Telefone'), { target: { name: 'telefone', value: '123' } });
    expect(screen.getByText('Telefone deve ter DDD e 9 dígitos')).toBeInTheDocument();

    // Horario invalido
    fireEvent.change(screen.getByPlaceholderText('Horário de passeio'), { target: { name: 'horario_passeio', value: '99:99' } });
    expect(screen.getByText('Horário inválido (use o formato HH:MM)')).toBeInTheDocument();

    // Tenta salvar com erros
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));
    expect(window.alert).toHaveBeenCalledWith('Por favor, corrija os erros destacados antes de salvar.');
  });

  test('Trata pacote Temporario e input de dias de teste', async () => {
    const tempClienteData = {
      ...mockClienteData,
      cliente: { ...mockClienteData.cliente, pacote: 'Temporario', dias_teste: '5' }
    };

    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue(tempClienteData)
    });
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue(mockPasseadoresData)
    });

    render(<EditarCliente />, { wrapper: MemoryRouter });

    await waitFor(() => screen.getByDisplayValue('Ana'));

    const diasInput = screen.getByPlaceholderText('Dias de teste');
    expect(diasInput).toBeInTheDocument();

    fireEvent.change(diasInput, { target: { value: '150' } });
    expect(diasInput.value).toBe('99');
  });

  test('Trata reset de senha sem token e com token', async () => {
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue(mockClienteData)
    });
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue(mockPasseadoresData)
    });

    render(<EditarCliente />, { wrapper: MemoryRouter });

    await waitFor(() => screen.getByDisplayValue('Ana'));

    // Reset sem token
    fireEvent.click(screen.getByRole('button', { name: /resetar senha/i }));
    expect(window.alert).toHaveBeenCalledWith('Usuário não autenticado. Faça login novamente.');

    // Reset com token com sucesso
    localStorage.setItem('token', 'fake-token');
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue({ success: true })
    });

    fireEvent.click(screen.getByRole('button', { name: /resetar senha/i }));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Senha redefinida com sucesso!');
    });
  });

  test('Trata falha e exceção no reset de senha', async () => {
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue(mockClienteData)
    });
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue(mockPasseadoresData)
    });

    render(<EditarCliente />, { wrapper: MemoryRouter });

    await waitFor(() => screen.getByDisplayValue('Ana'));

    localStorage.setItem('token', 'fake-token');

    // Falha retornando success false
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue({ success: false, message: 'Erro token expirado' })
    });

    fireEvent.click(screen.getByRole('button', { name: /resetar senha/i }));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Erro token expirado');
    });

    // Exceção de rede
    fetch.mockRejectedValueOnce(new Error('Falha na rede'));
    fireEvent.click(screen.getByRole('button', { name: /resetar senha/i }));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Erro ao processar reset de senha.');
    });
  });

  test('Trata erro sem mensagem e exceção de conexão ao salvar cliente', async () => {
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue(mockClienteData)
    });
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue(mockPasseadoresData)
    });

    render(<EditarCliente />, { wrapper: MemoryRouter });

    await waitFor(() => screen.getByDisplayValue('Ana'));

    // 1. Resposta ok false sem mensagem
    fetch.mockResolvedValueOnce({
      ok: false,
      json: jest.fn().mockResolvedValue({})
    });

    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Erro ao atualizar cliente: Erro desconhecido');
    });

    // 2. Exceção ao salvar
    fetch.mockRejectedValueOnce(new Error('Erro no servidor ao salvar'));

    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Erro ao conectar com o servidor. Tente novamente mais tarde.');
    });
  });

  test('Cancela e navega para visualizarcliente', async () => {
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue(mockClienteData)
    });
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue(mockPasseadoresData)
    });

    render(<EditarCliente />, { wrapper: MemoryRouter });

    await waitFor(() => screen.getByDisplayValue('Ana'));

    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/visualizarcliente/1');
  });

  test('Salva alterações com sucesso', async () => {
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue(mockClienteData)
    });
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue(mockPasseadoresData)
    });

    render(<EditarCliente />, { wrapper: MemoryRouter });

    await waitFor(() => screen.getByDisplayValue('Ana'));

    fetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({ success: true })
    });
    fetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({ success: true })
    });

    fireEvent.change(screen.getByDisplayValue('Ana'), { target: { name: 'nome', value: 'Ana Maria' } });
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/visualizarcliente/1');
    });
  });
});
