import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import Clientes from './clientes';

// Mocks the axios module
jest.mock('axios');

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

describe('Clientes Component', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    axios.get.mockClear();
    axios.delete.mockClear();
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

  test('Navega para a página de criar cliente', async () => {
    axios.get.mockResolvedValueOnce({ data: mockClientes });

    render(<Clientes />, { wrapper: MemoryRouter });

    const addIcon = screen.getByAltText('Ícone de adicionar');
    fireEvent.click(addIcon);

    expect(mockNavigate).toHaveBeenCalledWith('/criarcliente');
  });

  test('Abre e fecha a barra de pesquisa', async () => {
    axios.get.mockResolvedValueOnce({ data: mockClientes });

    render(<Clientes />, { wrapper: MemoryRouter });

    const searchIcon = screen.getByAltText('Ícone de busca');
    fireEvent.click(searchIcon);

    expect(screen.getByPlaceholderText('Pesquisar cliente')).toBeInTheDocument();

    fireEvent.click(searchIcon);
    expect(screen.queryByPlaceholderText('Pesquisar cliente')).not.toBeInTheDocument();
  });

  test('Filtra clientes pela busca', async () => {
    axios.get.mockResolvedValueOnce({ data: mockClientes });

    render(<Clientes />, { wrapper: MemoryRouter });

    await waitFor(() => screen.getByText('Ana'));

    fireEvent.click(screen.getByAltText('Ícone de busca'));
    fireEvent.change(screen.getByPlaceholderText('Pesquisar cliente'), { target: { value: 'Zeca' } });

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

  test('Exclui um cliente com sucesso', async () => {
    axios.get.mockResolvedValueOnce({ data: mockClientes });
    axios.delete.mockResolvedValueOnce({ data: { success: true } });

    render(<Clientes />, { wrapper: MemoryRouter });

    await waitFor(() => screen.getByText('Ana'));

    // Pega todos os ícones de deletar e clica no primeiro
    const deleteButtons = screen.getAllByAltText('Deletar');
    fireEvent.click(deleteButtons[0]);

    // O modal deve aparecer
    expect(screen.getByText('Deseja mesmo excluir este cliente?')).toBeInTheDocument();

    // Confirma a exclusão
    fireEvent.click(screen.getByRole('button', { name: /sim/i }));

    await waitFor(() => {
      expect(axios.delete).toHaveBeenCalledWith(expect.stringContaining('/clientes/1'));
      expect(screen.queryByText('Ana')).not.toBeInTheDocument();
    });
  });
});
