import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Redefinir from './redefinir';

global.fetch = jest.fn();

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useParams: () => ({ id: '1' }),
}));

describe('Redefinir Senha Component', () => {
  beforeEach(() => {
    fetch.mockClear();
    mockNavigate.mockClear();
    localStorage.clear();
  });

  test('Redireciona para /login se não houver id_cliente no localStorage', () => {
    render(<Redefinir />, { wrapper: MemoryRouter });
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  test('Renderiza os campos e busca as configurações iniciais', async () => {
    localStorage.setItem('id_cliente', '1');
    fetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({ cliente: { alterar_senha: 0 } })
    });

    render(<Redefinir />, { wrapper: MemoryRouter });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Insira a sua nova senha')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Confirme sua nova senha')).toBeInTheDocument();
    });
  });

  test('Exibe checkbox de termos se alterar_senha for 1', async () => {
    localStorage.setItem('id_cliente', '1');
    fetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({ cliente: { alterar_senha: 1 } })
    });

    render(<Redefinir />, { wrapper: MemoryRouter });

    await waitFor(() => {
      expect(screen.getByLabelText(/Eu li e aceito os/i)).toBeInTheDocument();
    });
  });

  test('Exibe erro se as senhas não coincidirem', async () => {
    localStorage.setItem('id_cliente', '1');
    fetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({ cliente: { alterar_senha: 0 } })
    });

    render(<Redefinir />, { wrapper: MemoryRouter });

    await waitFor(() => screen.getByPlaceholderText('Insira a sua nova senha'));

    fireEvent.change(screen.getByPlaceholderText('Insira a sua nova senha'), { target: { value: '123456' } });
    fireEvent.change(screen.getByPlaceholderText('Confirme sua nova senha'), { target: { value: '654321' } });
    fireEvent.click(screen.getByRole('button', { name: /redefinir/i }));

    expect(screen.getByText('As senhas não coincidem.')).toBeInTheDocument();
  });

  test('Faz requisição de alteração de senha com sucesso', async () => {
    localStorage.setItem('id_cliente', '1');
    fetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({ cliente: { alterar_senha: 0 } })
    });
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue({ success: true })
    });

    render(<Redefinir />, { wrapper: MemoryRouter });

    await waitFor(() => screen.getByPlaceholderText('Insira a sua nova senha'));

    fireEvent.change(screen.getByPlaceholderText('Insira a sua nova senha'), { target: { value: 'novasenha' } });
    fireEvent.change(screen.getByPlaceholderText('Confirme sua nova senha'), { target: { value: 'novasenha' } });
    fireEvent.click(screen.getByRole('button', { name: /redefinir/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });
});
