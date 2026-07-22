import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CriarPasseador from './criarpasseador';

global.fetch = jest.fn();

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

window.alert = jest.fn();

describe('CriarPasseador Component', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    fetch.mockClear();
    window.alert.mockClear();
  });

  test('Renderiza os campos do formulário', () => {
    render(<CriarPasseador />, { wrapper: MemoryRouter });

    expect(screen.getByPlaceholderText('Nome do passeador')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('CPF')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Módulo 1')).toBeInTheDocument();
  });

  test('Exibe erro para CPF e Modulo inválidos', () => {
    render(<CriarPasseador />, { wrapper: MemoryRouter });

    fireEvent.change(screen.getByPlaceholderText('CPF'), { target: { value: '11111111111' } });
    fireEvent.change(screen.getByPlaceholderText('Módulo 1'), { target: { value: 'abc' } });

    expect(screen.getByText('CPF inválido')).toBeInTheDocument();
    expect(screen.getByText('O módulo deve conter apenas números')).toBeInTheDocument();
  });

  test('Cria um passeador com sucesso', async () => {
    fetch.mockResolvedValueOnce({ ok: true });

    render(<CriarPasseador />, { wrapper: MemoryRouter });

    fireEvent.change(screen.getByPlaceholderText('Nome do passeador'), { target: { value: 'Zeca Silva' } });
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'zeca@teste.com' } });
    fireEvent.change(screen.getByPlaceholderText('CPF'), { target: { value: '12345678909' } });
    fireEvent.change(screen.getByPlaceholderText('Telefone'), { target: { value: '11999999999' } });
    fireEvent.change(screen.getByPlaceholderText('Módulo 1'), { target: { value: '1' } });
    fireEvent.change(screen.getByPlaceholderText('Módulo 2'), { target: { value: '2' } });

    fireEvent.click(screen.getByRole('button', { name: /criar/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('/passeadores');
    });
  });
});
