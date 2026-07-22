import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Passeadores from './passeadores';

global.fetch = jest.fn();

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock react-modal
jest.mock('react-modal', () => {
  const React = require('react');
  return ({ isOpen, children }) => {
    return isOpen ? <div>{children}</div> : null;
  };
});

describe('Passeadores Component', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    fetch.mockClear();
  });

  const mockPasseadores = {
    success: true,
    passeadores: [
      { id: 1, nome: 'Ana Passeadora' },
      { id: 2, nome: 'Zeca Passeador' },
    ]
  };

  test('Renderiza a lista de passeadores corretamente', async () => {
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue(mockPasseadores)
    });

    render(<Passeadores />, { wrapper: MemoryRouter });

    await waitFor(() => {
      expect(screen.getByText('Ana Passeadora')).toBeInTheDocument();
      expect(screen.getByText('Zeca Passeador')).toBeInTheDocument();
    });
  });

  test('Navega para a página de criar passeador', async () => {
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue(mockPasseadores)
    });

    render(<Passeadores />, { wrapper: MemoryRouter });

    const addIcon = screen.getByAltText('Ícone de adicionar');
    fireEvent.click(addIcon);

    expect(mockNavigate).toHaveBeenCalledWith('/criarpasseador');
  });

  test('Filtra passeadores pela busca', async () => {
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue(mockPasseadores)
    });

    render(<Passeadores />, { wrapper: MemoryRouter });

    await waitFor(() => screen.getByText('Ana Passeadora'));

    fireEvent.click(screen.getByAltText('Ícone de busca'));
    fireEvent.change(screen.getByPlaceholderText('Pesquisar passeador'), { target: { value: 'Zeca' } });

    expect(screen.getByText('Zeca Passeador')).toBeInTheDocument();
    expect(screen.queryByText('Ana Passeadora')).not.toBeInTheDocument();
  });

  test('Exclui um passeador com sucesso', async () => {
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue(mockPasseadores)
    });
    fetch.mockResolvedValueOnce({ ok: true }); // DELETE response

    render(<Passeadores />, { wrapper: MemoryRouter });

    await waitFor(() => screen.getByText('Ana Passeadora'));

    const deleteButtons = screen.getAllByAltText('Deletar');
    fireEvent.click(deleteButtons[0]);

    expect(screen.getByText('Deseja mesmo excluir este passeador?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /sim/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2); // GET + DELETE
      expect(screen.queryByText('Ana Passeadora')).not.toBeInTheDocument();
    });
  });
});
