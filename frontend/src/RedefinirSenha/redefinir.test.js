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

  test('Renderiza os campos e busca as configurações iniciais com alterar_senha = 0', async () => {
    localStorage.setItem('id_cliente', '1');
    fetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({ cliente: { alterar_senha: 0 } })
    });

    render(<Redefinir />, { wrapper: MemoryRouter });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Insira a sua nova senha')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Confirme sua nova senha')).toBeInTheDocument();
      expect(screen.getByAltText('Ícone de voltar')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByAltText('Ícone de voltar'));
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  test('Exibe checkbox de termos se alterar_senha for 1 e exige aceite', async () => {
    localStorage.setItem('id_cliente', '1');
    fetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({ cliente: { alterar_senha: 1 } })
    });

    render(<Redefinir />, { wrapper: MemoryRouter });

    await waitFor(() => {
      expect(screen.getByLabelText(/Eu li e aceito os/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('Insira a sua nova senha'), { target: { value: 'novasenha' } });
    fireEvent.change(screen.getByPlaceholderText('Confirme sua nova senha'), { target: { value: 'novasenha' } });
    fireEvent.click(screen.getByRole('button', { name: /redefinir/i }));

    expect(screen.getByText(/Você precisa aceitar a Política de Privacidade/i)).toBeInTheDocument();

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);
  });

  test('Trata aviso quando alterar_senha não está presente no cliente', async () => {
    localStorage.setItem('id_cliente', '1');
    fetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({ cliente: {} })
    });

    render(<Redefinir />, { wrapper: MemoryRouter });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Insira a sua nova senha')).toBeInTheDocument();
    });
  });

  test('Trata erro quando API retorna cliente ausente ou ok: false', async () => {
    localStorage.setItem('id_cliente', '1');
    fetch.mockResolvedValueOnce({
      ok: false,
      json: jest.fn().mockResolvedValue({})
    });

    render(<Redefinir />, { wrapper: MemoryRouter });

    await waitFor(() => {
      expect(screen.getByText('Falha na conexão com o servidor')).toBeInTheDocument();
    });
  });

  test('Trata erro quando cliente é incompleto na resposta', async () => {
    localStorage.setItem('id_cliente', '1');
    fetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({})
    });

    render(<Redefinir />, { wrapper: MemoryRouter });

    await waitFor(() => {
      expect(screen.getByText('Erro ao carregar configurações de senha')).toBeInTheDocument();
    });
  });

  test('Valida campos obrigatorios, tamanho minimo e senha inicial dog123', async () => {
    localStorage.setItem('id_cliente', '1');
    fetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({ cliente: { alterar_senha: 0 } })
    });

    render(<Redefinir />, { wrapper: MemoryRouter });

    await waitFor(() => screen.getByPlaceholderText('Insira a sua nova senha'));

    // 1. Campos vazios
    fireEvent.click(screen.getByRole('button', { name: /redefinir/i }));
    expect(screen.getByText('Todos os campos são obrigatórios.')).toBeInTheDocument();

    // 2. Senha menor que 6 caracteres
    fireEvent.change(screen.getByPlaceholderText('Insira a sua nova senha'), { target: { value: '123' } });
    fireEvent.change(screen.getByPlaceholderText('Confirme sua nova senha'), { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: /redefinir/i }));
    expect(screen.getByText('Sua senha deve ter pelo menos 6 caracteres.')).toBeInTheDocument();

    // 3. Senha dog123
    fireEvent.change(screen.getByPlaceholderText('Insira a sua nova senha'), { target: { value: 'dog123' } });
    fireEvent.change(screen.getByPlaceholderText('Confirme sua nova senha'), { target: { value: 'dog123' } });
    fireEvent.click(screen.getByRole('button', { name: /redefinir/i }));
    expect(screen.getByText('Sua senha deve ser diferente da inicial.')).toBeInTheDocument();

    // 4. Senhas não coincidem
    fireEvent.change(screen.getByPlaceholderText('Insira a sua nova senha'), { target: { value: '123456' } });
    fireEvent.change(screen.getByPlaceholderText('Confirme sua nova senha'), { target: { value: '654321' } });
    fireEvent.click(screen.getByRole('button', { name: /redefinir/i }));
    expect(screen.getByText('As senhas não coincidem.')).toBeInTheDocument();
  });

  test('Alterna visibilidade das senhas e trata teclas Enter', async () => {
    localStorage.setItem('id_cliente', '1');
    fetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({ cliente: { alterar_senha: 0 } })
    });

    render(<Redefinir />, { wrapper: MemoryRouter });

    await waitFor(() => screen.getByPlaceholderText('Insira a sua nova senha'));

    const inputNew = screen.getByPlaceholderText('Insira a sua nova senha');
    const inputConfirm = screen.getByPlaceholderText('Confirme sua nova senha');

    expect(inputNew.type).toBe('password');

    // Alternar visibilidade
    const toggleIcons = document.querySelectorAll('.password-toggle-icon');
    fireEvent.click(toggleIcons[0]);
    expect(inputNew.type).toBe('text');
    fireEvent.click(toggleIcons[1]);
    expect(inputConfirm.type).toBe('text');

    // Tecla Enter no campo newPassword
    fireEvent.keyDown(inputNew, { key: 'Enter', code: 'Enter' });

    // Tecla Enter no campo confirmPassword (submete formulário com senhas vazias)
    fireEvent.keyDown(inputConfirm, { key: 'Enter', code: 'Enter' });
    expect(screen.getByText('Todos os campos são obrigatórios.')).toBeInTheDocument();
  });

  test('Trata erro retornado pela API ao alterar senha', async () => {
    localStorage.setItem('id_cliente', '1');
    fetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({ cliente: { alterar_senha: 0 } })
    });
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue({ success: false, message: 'Erro de validação' })
    });

    render(<Redefinir />, { wrapper: MemoryRouter });

    await waitFor(() => screen.getByPlaceholderText('Insira a sua nova senha'));

    fireEvent.change(screen.getByPlaceholderText('Insira a sua nova senha'), { target: { value: 'novasenha' } });
    fireEvent.change(screen.getByPlaceholderText('Confirme sua nova senha'), { target: { value: 'novasenha' } });
    fireEvent.click(screen.getByRole('button', { name: /redefinir/i }));

    await waitFor(() => {
      expect(screen.getByText('Erro de validação')).toBeInTheDocument();
    });
  });

  test('Trata exceção de rede ao alterar senha', async () => {
    localStorage.setItem('id_cliente', '1');
    fetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({ cliente: { alterar_senha: 0 } })
    });
    fetch.mockRejectedValueOnce(new Error('Erro de Conexão'));

    render(<Redefinir />, { wrapper: MemoryRouter });

    await waitFor(() => screen.getByPlaceholderText('Insira a sua nova senha'));

    fireEvent.change(screen.getByPlaceholderText('Insira a sua nova senha'), { target: { value: 'novasenha' } });
    fireEvent.change(screen.getByPlaceholderText('Confirme sua nova senha'), { target: { value: 'novasenha' } });
    fireEvent.click(screen.getByRole('button', { name: /redefinir/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });
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
