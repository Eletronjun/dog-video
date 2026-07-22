import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EditarCliente from './editarcliente';

// Mocks the global fetch
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

    // Mock fetch for the PUT request (cliente + passeio)
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
      expect(fetch).toHaveBeenCalledTimes(4); // 2 gets + 2 puts
      expect(mockNavigate).toHaveBeenCalledWith('/visualizarcliente/1');
    });
  });
});
