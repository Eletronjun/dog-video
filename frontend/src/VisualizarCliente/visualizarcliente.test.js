import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import VisualizarCliente from './visualizarcliente';

global.fetch = jest.fn();

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useParams: () => ({ id: '1' }),
}));

describe('VisualizarCliente Component', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    fetch.mockClear();
    localStorage.clear();
  });

  const mockClienteData = {
    success: true,
    cliente: {
      nome: 'Ana',
      email: 'ana@teste.com',
      cpf: '11111111111',
      telefone: '11999999999',
      caes: ['Rex'],
      pacote: 'Mensal',
      endereco: 'Rua A',
      anotacoes: 'Sem anotação',
      passeador: 'Passeador Z'
    }
  };

  const mockPasseioData = {
    success: true,
    horario_passeio: '10:00:00'
  };

  test('Renderiza carregando inicialmente', () => {
    fetch.mockResolvedValueOnce(new Promise(() => {}));
    render(<VisualizarCliente />, { wrapper: MemoryRouter });
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  test('Renderiza os dados do cliente com sucesso', async () => {
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue(mockClienteData)
    });
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue(mockPasseioData)
    });

    render(<VisualizarCliente />, { wrapper: MemoryRouter });

    await waitFor(() => {
      expect(screen.getByText('Ana')).toBeInTheDocument();
      expect(screen.getByText('ana@teste.com')).toBeInTheDocument();
      expect(screen.getByText('10:00')).toBeInTheDocument();
    });
  });

  test('Renderiza cliente com pacote Temporario, dias_teste e id_passeador', async () => {
    const mockTempData = {
      success: true,
      cliente: {
        ...mockClienteData.cliente,
        pacote: 'Temporario',
        dias_teste: '7',
        criado_em: new Date().toISOString(),
        id_passeador: 5,
      }
    };

    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue(mockTempData)
    });
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue(mockPasseioData)
    });

    render(<VisualizarCliente />, { wrapper: MemoryRouter });

    await waitFor(() => {
      expect(screen.getByText(/Faltam|Termina/i)).toBeInTheDocument();
    });
    expect(localStorage.getItem('passeadorId')).toBe('5');
  });

  test('Trata data invalida em criado_em para pacote Temporario', async () => {
    const mockInvalidData = {
      success: true,
      cliente: {
        ...mockClienteData.cliente,
        pacote: 'Temporario',
        dias_teste: '7',
        criado_em: 'data-invalida',
      }
    };

    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue(mockInvalidData)
    });
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue({ success: false })
    });

    render(<VisualizarCliente />, { wrapper: MemoryRouter });

    await waitFor(() => {
      expect(screen.getByText(/Termina hoje \(Data inválida\)/i)).toBeInTheDocument();
    });
  });

  test('Renderiza Cliente nao encontrado quando success e false', async () => {
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue({ success: false, message: 'Cliente não encontrado' })
    });

    render(<VisualizarCliente />, { wrapper: MemoryRouter });

    await waitFor(() => {
      expect(screen.getByText('Cliente não encontrado')).toBeInTheDocument();
    });
  });

  test('Trata erro de rede na busca do cliente', async () => {
    fetch.mockRejectedValueOnce(new Error('Erro de Conexão'));

    render(<VisualizarCliente />, { wrapper: MemoryRouter });

    await waitFor(() => {
      expect(screen.getByText('Cliente não encontrado')).toBeInTheDocument();
    });
  });

  test('Navega para editarcliente', async () => {
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue(mockClienteData)
    });
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue(mockPasseioData)
    });

    render(<VisualizarCliente />, { wrapper: MemoryRouter });

    await waitFor(() => screen.getByText('Ana'));

    fireEvent.click(screen.getByRole('button', { name: /editar/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/editarcliente/1');
  });

  test('Navega de volta para clientes', async () => {
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue(mockClienteData)
    });
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue(mockPasseioData)
    });

    render(<VisualizarCliente />, { wrapper: MemoryRouter });

    await waitFor(() => screen.getByText('Ana'));

    fireEvent.click(screen.getByAltText('Ícone de voltar'));
    expect(mockNavigate).toHaveBeenCalledWith('/clientes');
  });
});
