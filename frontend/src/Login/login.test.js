import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from './login';

// Mocks the global fetch
global.fetch = jest.fn();

// Mocks the service worker for getSubscription
Object.defineProperty(global.navigator, 'serviceWorker', {
  value: {
    ready: Promise.resolve({
      pushManager: {
        getSubscription: jest.fn().mockResolvedValue(null),
        subscribe: jest.fn().mockResolvedValue({ endpoint: 'http://test.com' })
      }
    })
  },
  writable: true
});

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('Login Component', () => {
  let onLoginMock;

  beforeEach(() => {
    onLoginMock = jest.fn();
    fetch.mockClear();
    mockNavigate.mockClear();
    localStorage.clear();
  });

  test('Renderiza os campos de email e senha corretamente', () => {
    render(<Login onLogin={onLoginMock} />, { wrapper: MemoryRouter });
    expect(screen.getByPlaceholderText('Insira seu email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Insira a senha')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /logar/i })).toBeInTheDocument();
  });

  test('Exibe erro se os campos estiverem vazios', () => {
    render(<Login onLogin={onLoginMock} />, { wrapper: MemoryRouter });
    fireEvent.click(screen.getByRole('button', { name: /logar/i }));
    expect(screen.getByText('Todos os campos são obrigatórios.')).toBeInTheDocument();
  });

  test('Exibe erro se a senha for muito curta', () => {
    render(<Login onLogin={onLoginMock} />, { wrapper: MemoryRouter });
    fireEvent.change(screen.getByPlaceholderText('Insira seu email'), { target: { value: 'teste@teste.com' } });
    fireEvent.change(screen.getByPlaceholderText('Insira a senha'), { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: /logar/i }));
    
    expect(screen.getByText('Sua senha deve ter pelo menos 6 caracteres.')).toBeInTheDocument();
  });

  test('Realiza login com sucesso e navega para /', async () => {
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue({ success: true, token: 'fake-token', userType: 'cliente', id_cliente: 1, alterar_senha: 0 })
    });

    render(<Login onLogin={onLoginMock} />, { wrapper: MemoryRouter });
    fireEvent.change(screen.getByPlaceholderText('Insira seu email'), { target: { value: 'teste@teste.com' } });
    fireEvent.change(screen.getByPlaceholderText('Insira a senha'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /logar/i }));

    await waitFor(() => {
      expect(onLoginMock).toHaveBeenCalledWith('cliente', 1);
      expect(localStorage.getItem('token')).toBe('fake-token');
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  test('Redireciona para /redefinir se alterar_senha for 1', async () => {
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue({ success: true, token: 'fake-token', userType: 'cliente', id_cliente: 1, alterar_senha: 1 })
    });

    render(<Login onLogin={onLoginMock} />, { wrapper: MemoryRouter });
    fireEvent.change(screen.getByPlaceholderText('Insira seu email'), { target: { value: 'teste@teste.com' } });
    fireEvent.change(screen.getByPlaceholderText('Insira a senha'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /logar/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/redefinir/1');
    });
  });

  test('Exibe erro de credenciais incorretas', async () => {
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue({ success: false })
    });

    render(<Login onLogin={onLoginMock} />, { wrapper: MemoryRouter });
    fireEvent.change(screen.getByPlaceholderText('Insira seu email'), { target: { value: 'teste@teste.com' } });
    fireEvent.change(screen.getByPlaceholderText('Insira a senha'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /logar/i }));

    await waitFor(() => {
      expect(screen.getByText('Email ou senha incorretos.')).toBeInTheDocument();
    });
  });
});
