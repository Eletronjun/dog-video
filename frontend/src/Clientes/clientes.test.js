import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import Clientes from './clientes';

jest.mock('axios');

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

window.alert = jest.fn();

describe('Clientes Component', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    axios.get.mockClear();
    axios.delete.mockClear();
    window.alert.mockClear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const mockClientes = [
    { id_cliente: 1, nome: 'Ana', pacote: 'Mensal' },
    { id_cliente: 2, nome: 'Zeca', pacote: 'Trimestral' },
  ];

  test('Renderiza a lista de clientes corretamente', async () => {
    axios.get.mockResolvedValueOnce({ data: mockClientes });

    render(<Clientes />, { wrapper: MemoryRouter });

    await waitFor(() => {
      expect(screen.getByText('Ana')).toBeInTheDocument();
      expect(screen.getByText('Zeca')).toBeInTheDocument();
    });
  });

  test('Trata erro ao buscar lista de clientes', async () => {
    axios.get.mockRejectedValueOnce(new Error('Erro de conexão'));

    render(<Clientes />, { wrapper: MemoryRouter });

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledTimes(1);
    });
  });

  test('Navega para a página de criar cliente e voltar para admin', async () => {
    axios.get.mockResolvedValueOnce({ data: mockClientes });

    render(<Clientes />, { wrapper: MemoryRouter });

    fireEvent.click(screen.getByAltText('Ícone de adicionar'));
    expect(mockNavigate).toHaveBeenCalledWith('/criarcliente');

    fireEvent.click(screen.getByAltText('Ícone de voltar'));
    expect(mockNavigate).toHaveBeenCalledWith('/admin');
  });

  test('Abre, foca e fecha a barra de pesquisa', async () => {
    axios.get.mockResolvedValueOnce({ data: mockClientes });

    render(<Clientes />, { wrapper: MemoryRouter });

    const searchIcon = screen.getByAltText('Ícone de busca');
    fireEvent.click(searchIcon);

    expect(screen.getByPlaceholderText('Pesquisar cliente')).toBeInTheDocument();
    jest.runAllTimers();

    fireEvent.click(searchIcon);
    expect(screen.queryByPlaceholderText('Pesquisar cliente')).not.toBeInTheDocument();
  });

  test('Abre menu de filtro, ordena Z-A e A-Z, e filtra por pacote', async () => {
    axios.get.mockResolvedValueOnce({ data: mockClientes });

    render(<Clientes />, { wrapper: MemoryRouter });

    await waitFor(() => screen.getByText('Ana'));

    const filterIcon = screen.getByAltText('Ícone de filtro');
    fireEvent.click(filterIcon);

    expect(screen.getByText('Ordenar A-Z')).toBeInTheDocument();

    // Ordenar Z-A
    fireEvent.click(screen.getByText('Ordenar Z-A'));
    expect(screen.queryByText('Ordenar A-Z')).not.toBeInTheDocument();

    // Reabrir menu e ordenar A-Z
    fireEvent.click(filterIcon);
    fireEvent.click(screen.getByText('Ordenar A-Z'));

    // Reabrir menu e filtrar por pacote Trimestral
    fireEvent.click(filterIcon);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'Trimestral' } });

    expect(screen.getByText('Zeca')).toBeInTheDocument();
    expect(screen.queryByText('Ana')).not.toBeInTheDocument();
  });

  test('Navega para a página de visualização ao clicar no cliente', async () => {
    axios.get.mockResolvedValueOnce({ data: mockClientes });

    render(<Clientes />, { wrapper: MemoryRouter });

    await waitFor(() => screen.getByText('Ana'));

    fireEvent.click(screen.getByText('Ana'));

    expect(mockNavigate).toHaveBeenCalledWith('/visualizarcliente/1');
  });

  test('Exclui um cliente com sucesso e fecha modal no botão Não', async () => {
    axios.get.mockResolvedValueOnce({ data: mockClientes });
    axios.delete.mockResolvedValueOnce({ data: { success: true } });

    render(<Clientes />, { wrapper: MemoryRouter });

    await waitFor(() => screen.getByText('Ana'));

    const deleteButtons = screen.getAllByAltText('Deletar');
    fireEvent.click(deleteButtons[0]);

    expect(screen.getByText('Deseja mesmo excluir este cliente?')).toBeInTheDocument();

    // Cancelar exclusão
    fireEvent.click(screen.getByRole('button', { name: /não/i }));
    expect(screen.queryByText('Deseja mesmo excluir este cliente?')).not.toBeInTheDocument();

    // Reabrir e confirmar exclusão
    fireEvent.click(deleteButtons[0]);
    fireEvent.click(screen.getByRole('button', { name: /sim/i }));

    await waitFor(() => {
      expect(axios.delete).toHaveBeenCalledWith(expect.stringContaining('/clientes/1'));
      expect(screen.queryByText('Ana')).not.toBeInTheDocument();
    });
  });

  test('Trata erro ao excluir cliente (resposta com success false ou exceção)', async () => {
    axios.get.mockResolvedValueOnce({ data: mockClientes });

    render(<Clientes />, { wrapper: MemoryRouter });

    await waitFor(() => screen.getByText('Ana'));

    const deleteButtons = screen.getAllByAltText('Deletar');

    // 1. Resposta success false
    axios.delete.mockResolvedValueOnce({ data: { success: false } });
    fireEvent.click(deleteButtons[0]);
    fireEvent.click(screen.getByRole('button', { name: /sim/i }));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Erro ao excluir cliente.');
    });

    // 2. Exceção no delete
    axios.delete.mockRejectedValueOnce(new Error('Erro rede'));
    fireEvent.click(deleteButtons[0]);
    fireEvent.click(screen.getByRole('button', { name: /sim/i }));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Erro ao excluir cliente.');
    });
  });
});
