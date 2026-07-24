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
      endereco: 'Rua B',
      imagem: 'data:image/png;base64,fakeimage'
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

  test('Trata erro ao carregar dados do passeador', async () => {
    fetch.mockRejectedValueOnce(new Error('Erro de conexão'));

    render(<EditarPasseador />, { wrapper: MemoryRouter });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Nome do passeador')).toBeInTheDocument();
    });
  });

  test('Valida campos e exibe mensagens de erro', async () => {
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue(mockPasseadorData)
    });

    render(<EditarPasseador />, { wrapper: MemoryRouter });

    await waitFor(() => screen.getByDisplayValue('Ana Passeadora'));

    // Nome invalido
    fireEvent.change(screen.getByPlaceholderText('Nome do passeador'), { target: { value: 'a' } });
    expect(screen.getByText('O nome deve começar com letra maiúscula e ter pelo menos 2 caracteres')).toBeInTheDocument();

    // Email invalido
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'invalid' } });
    expect(screen.getByText('Email inválido')).toBeInTheDocument();

    // CPF invalido
    fireEvent.change(screen.getByPlaceholderText('CPF'), { target: { value: '123' } });
    expect(screen.getByText('CPF inválido')).toBeInTheDocument();

    // Telefone invalido
    fireEvent.change(screen.getByPlaceholderText('Telefone'), { target: { value: '123' } });
    expect(screen.getByText('Telefone deve ter DDD e 9 dígitos')).toBeInTheDocument();

    // Modulo invalido
    fireEvent.change(screen.getByPlaceholderText('Módulo 1'), { target: { value: 'abc' } });
    expect(screen.getByText('O módulo deve conter apenas números')).toBeInTheDocument();

    // Limpa erro do modulo 1 e testa modulo 2 invalido
    fireEvent.change(screen.getByPlaceholderText('Módulo 1'), { target: { value: '1' } });
    fireEvent.change(screen.getByPlaceholderText('Módulo 2'), { target: { value: 'xyz' } });
    expect(screen.getByText('O módulo 2 deve conter apenas números')).toBeInTheDocument();

    // Tentativa de envio com erros
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));
  });

  test('Trata alteração de imagem via file input', async () => {
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue({
        success: true,
        passeador: { ...mockPasseadorData.passeador, imagem: null }
      })
    });

    render(<EditarPasseador />, { wrapper: MemoryRouter });

    await waitFor(() => screen.getByPlaceholderText('Nome do passeador'));

    const file = new File(['fake'], 'avatar.png', { type: 'image/png' });
    const input = document.querySelector('.image-input');

    const dummyFileReader = {
      readAsDataURL: jest.fn(function() {
        this.onloadend();
      }),
      result: 'data:image/png;base64,newimage'
    };
    jest.spyOn(window, 'FileReader').mockImplementation(() => dummyFileReader);

    fireEvent.change(input, { target: { files: [file] } });
    expect(dummyFileReader.readAsDataURL).toHaveBeenCalledWith(file);
  });

  test('Trata erros de resposta da API no PUT passeador', async () => {
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue(mockPasseadorData)
    });

    render(<EditarPasseador />, { wrapper: MemoryRouter });

    await waitFor(() => screen.getByDisplayValue('Ana Passeadora'));

    // 1. response.ok false com mensagem
    fetch.mockResolvedValueOnce({
      ok: false,
      json: jest.fn().mockResolvedValue({ message: 'CPF já cadastrado' })
    });

    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Erro: CPF já cadastrado');
    });

    // 2. response.ok false sem mensagem
    fetch.mockResolvedValueOnce({
      ok: false,
      json: jest.fn().mockResolvedValue({})
    });

    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Erro ao atualizar passeador.');
    });

    // 3. Exceção de rede
    fetch.mockRejectedValueOnce(new Error('Erro servidor'));

    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Erro ao conectar com o servidor. Tente novamente mais tarde.');
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
