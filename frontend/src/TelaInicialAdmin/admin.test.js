import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Admin from './admin';

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

describe('Admin Component', () => {
  let onLogoutMock;

  beforeEach(() => {
    onLogoutMock = jest.fn();
    mockNavigate.mockClear();
  });

  test('Renderiza os elementos iniciais da tela de admin', () => {
    render(<Admin onLogout={onLogoutMock} />, { wrapper: MemoryRouter });
    
    expect(screen.getByAltText('Dogvideo Logomarca')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Clientes')).toBeInTheDocument();
    expect(screen.getByText('Passeadores')).toBeInTheDocument();
  });

  test('Navega para a página de clientes ao clicar em Clientes', () => {
    render(<Admin onLogout={onLogoutMock} />, { wrapper: MemoryRouter });
    
    fireEvent.click(screen.getByText('Clientes'));
    expect(mockNavigate).toHaveBeenCalledWith('/clientes');
  });

  test('Navega para a página de passeadores ao clicar em Passeadores', () => {
    render(<Admin onLogout={onLogoutMock} />, { wrapper: MemoryRouter });
    
    fireEvent.click(screen.getByText('Passeadores'));
    expect(mockNavigate).toHaveBeenCalledWith('/passeadores');
  });

  test('Abre modal de logout e chama onLogout ao confirmar', () => {
    render(<Admin onLogout={onLogoutMock} />, { wrapper: MemoryRouter });
    
    const logoutIcon = screen.getByAltText('Ícone de logout');
    fireEvent.click(logoutIcon);

    expect(screen.getByText('Deseja mesmo sair do site?')).toBeInTheDocument();

    const yesButton = screen.getByRole('button', { name: /sim/i });
    fireEvent.click(yesButton);

    expect(onLogoutMock).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  test('Fecha modal de logout ao cancelar', async () => {
    render(<Admin onLogout={onLogoutMock} />, { wrapper: MemoryRouter });
    
    const logoutIcon = screen.getByAltText('Ícone de logout');
    fireEvent.click(logoutIcon);

    const noButton = screen.getByRole('button', { name: /não/i });
    fireEvent.click(noButton);

    await waitFor(() => {
      expect(screen.queryByText('Deseja mesmo sair do site?')).not.toBeInTheDocument();
    });
  });
});
