import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EditarPasseador from './editarpasseador';

global.fetch = jest.fn();

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useParams: () => ({ id: '1' }),
}));

window.alert = jest.fn();

describe('EditarPasseador Component', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    fetch.mockClear();
    window.alert.mockClear();
  });

  const mockPasseadorData = {
    success: true,
    passeador: {
      nome: 'Ana Passeadora',
      email: 'ana@teste.com',
      cpf: '12345678909',
      telefone: '11999999999',
      modulo: '1',
      modulo2: '2',
      endereco: 'Rua B'
    }
  };

  test('Renderiza os dados do passeador carregados', async () => {
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue(mockPasseadorData)
    });

    render(<EditarPasseador />, { wrapper: MemoryRouter });

    await waitFor(() => {
      expect(screen.getByDisplayValue('Ana Passeadora')).toBeInTheDocument();
      expect(screen.getByDisplayValue('ana@teste.com')).toBeInTheDocument();
    });
  });

  test('Salva alterações com sucesso', async () => {
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue(mockPasseadorData)
    });

    render(<EditarPasseador />, { wrapper: MemoryRouter });

    await waitFor(() => screen.getByDisplayValue('Ana Passeadora'));

    fetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({ success: true })
    });

    fireEvent.change(screen.getByDisplayValue('Ana Passeadora'), { target: { value: 'Ana Maria' } });
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2); // 1 GET + 1 PUT
      expect(mockNavigate).toHaveBeenCalledWith('/visualizarpasseador/1');
    });
  });

  test('Cancela a edição', async () => {
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue(mockPasseadorData)
    });

    render(<EditarPasseador />, { wrapper: MemoryRouter });

    await waitFor(() => screen.getByDisplayValue('Ana Passeadora'));

    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    
    expect(mockNavigate).toHaveBeenCalledWith('/visualizarpasseador/1');
  });
});
