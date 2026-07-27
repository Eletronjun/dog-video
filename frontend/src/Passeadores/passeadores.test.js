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
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
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

  test('Trata resposta invalida e erro de rede na busca de passeadores', async () => {
    // 1. Resposta success false
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue({ success: false })
    });
    render(<Passeadores />, { wrapper: MemoryRouter });
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

    // 2. Exceção no fetch
    fetch.mockRejectedValueOnce(new Error('Erro de Conexão'));
    render(<Passeadores />, { wrapper: MemoryRouter });
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  });

  test('Navega para a página de criar passeador e voltar para admin', async () => {
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue(mockPasseadores)
    });

    render(<Passeadores />, { wrapper: MemoryRouter });

    fireEvent.click(screen.getByAltText('Ícone de adicionar'));
    expect(mockNavigate).toHaveBeenCalledWith('/criarpasseador');

    fireEvent.click(screen.getByAltText('Ícone de voltar'));
    expect(mockNavigate).toHaveBeenCalledWith('/admin');
  });

  test('Filtra passeadores pela busca, foca busca e ordena A-Z/Z-A ao clicar no filtro', async () => {
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue(mockPasseadores)
    });

    render(<Passeadores />, { wrapper: MemoryRouter });

    await waitFor(() => screen.getByText('Ana Passeadora'));

    // Toggle busca
    const searchIcon = screen.getByAltText('Ícone de busca');
    fireEvent.click(searchIcon);

    const inputBusca = screen.getByPlaceholderText('Pesquisar passeador');
    expect(inputBusca).toBeInTheDocument();
    jest.runAllTimers();

    fireEvent.change(inputBusca, { target: { value: 'Zeca' } });
    expect(screen.getByText('Zeca Passeador')).toBeInTheDocument();
    expect(screen.queryByText('Ana Passeadora')).not.toBeInTheDocument();

    // Toggle filtro (inverte ordenação)
    fireEvent.click(screen.getByAltText('Ícone de filtro'));
  });

  test('Navega para a página de visualização ao clicar no passeador', async () => {
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue(mockPasseadores)
    });

    render(<Passeadores />, { wrapper: MemoryRouter });

    await waitFor(() => screen.getByText('Ana Passeadora'));

    fireEvent.click(screen.getByText('Ana Passeadora'));
    expect(mockNavigate).toHaveBeenCalledWith('/visualizarpasseador/1');
  });

  test('Exclui um passeador com sucesso e fecha modal no botão Não', async () => {
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue(mockPasseadores)
    });
    fetch.mockResolvedValueOnce({ ok: true });

    render(<Passeadores />, { wrapper: MemoryRouter });

    await waitFor(() => screen.getByText('Ana Passeadora'));

    const deleteButtons = screen.getAllByAltText('Deletar');
    fireEvent.click(deleteButtons[0]);

    expect(screen.getByText('Deseja mesmo excluir este passeador?')).toBeInTheDocument();

    // Botão Não
    fireEvent.click(screen.getByRole('button', { name: /não/i }));
    expect(screen.queryByText('Deseja mesmo excluir este passeador?')).not.toBeInTheDocument();

    // Confirmar Sim
    fireEvent.click(deleteButtons[0]);
    fireEvent.click(screen.getByRole('button', { name: /sim/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(screen.queryByText('Ana Passeadora')).not.toBeInTheDocument();
    });
  });

  test('Trata erro ao excluir passeador (ok false ou exceção)', async () => {
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue(mockPasseadores)
    });

    render(<Passeadores />, { wrapper: MemoryRouter });

    await waitFor(() => screen.getByText('Ana Passeadora'));

    const deleteButtons = screen.getAllByAltText('Deletar');

    // 1. ok false
    fetch.mockResolvedValueOnce({ ok: false });
    fireEvent.click(deleteButtons[0]);
    fireEvent.click(screen.getByRole('button', { name: /sim/i }));

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));

    // 2. Exceção no fetch
    fetch.mockRejectedValueOnce(new Error('Erro rede'));
    fireEvent.click(deleteButtons[0]);
    fireEvent.click(screen.getByRole('button', { name: /sim/i }));

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(3));
  });
});
