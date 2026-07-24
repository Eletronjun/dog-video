import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Dados from './dados';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('Dados Component', () => {
  const mockOnLogout = jest.fn();

  beforeEach(() => {
    mockNavigate.mockClear();
    mockOnLogout.mockClear();
    global.fetch = jest.fn((url) => {
      if (url.includes('/clientes/1')) {
        return Promise.resolve({
          json: () =>
            Promise.resolve({
              success: true,
              cliente: {
                nome: 'Cliente Exemplo',
                email: 'cliente@exemplo.com',
                cpf: '12345678900',
                telefone: '61999998888',
                endereco: 'Rua Exemplo 123',
                pacote: 'mensal',
                caes: ['Rex', 'Bobi'],
                passeador: 'Passeador João',
              },
            }),
        });
      }
      if (url.includes('/passeios/1')) {
        return Promise.resolve({
          json: () =>
            Promise.resolve({
              success: true,
              horario_passeio: '14:00',
            }),
        });
      }
      return Promise.reject(new Error('URL não encontrada'));
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders loading state initially and then displays client data', async () => {
    render(
      <MemoryRouter initialEntries={['/dados/1']}>
        <Routes>
          <Route path="/dados/:id" element={<Dados onLogout={mockOnLogout} />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/Carregando dados do cliente/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Cliente Exemplo')).toBeInTheDocument();
    });

    expect(screen.getByText('Rex')).toBeInTheDocument();
    expect(screen.getByText('mensal')).toBeInTheDocument();
    expect(screen.getByText('14:00')).toBeInTheDocument();
    expect(screen.getByText('Passeador João')).toBeInTheDocument();
  });

  it('navega ao clicar nos botoes de voltar e redefinir senha', async () => {
    render(
      <MemoryRouter initialEntries={['/dados/1']}>
        <Routes>
          <Route path="/dados/:id" element={<Dados onLogout={mockOnLogout} />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => screen.getByText('Cliente Exemplo'));

    fireEvent.click(screen.getByAltText('Ícone de voltar'));
    expect(mockNavigate).toHaveBeenCalledWith('/');

    fireEvent.click(screen.getByRole('button', { name: /redefinir senha/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/redefinir/1');
  });

  it('trata passeioData success false e passeador nulo', async () => {
    global.fetch = jest.fn((url) => {
      if (url.includes('/clientes/1')) {
        return Promise.resolve({
          json: () =>
            Promise.resolve({
              success: true,
              cliente: {
                nome: 'Cliente Sem Passeador',
                email: 'sem@teste.com',
                cpf: '123',
                telefone: '123',
                endereco: 'Rua',
                pacote: 'Mensal',
                caes: ['Bob'],
                passeador: null,
              },
            }),
        });
      }
      if (url.includes('/passeios/1')) {
        return Promise.resolve({
          json: () => Promise.resolve({ success: false }),
        });
      }
      return Promise.reject(new Error('Network error'));
    });

    render(
      <MemoryRouter initialEntries={['/dados/1']}>
        <Routes>
          <Route path="/dados/:id" element={<Dados onLogout={mockOnLogout} />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Cliente Sem Passeador')).toBeInTheDocument();
      expect(screen.getByText('Horário não encontrado')).toBeInTheDocument();
      expect(screen.getByText('Nenhum passeador')).toBeInTheDocument();
    });
  });

  it('trata erro de cliente nao encontrado na API', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      json: () => Promise.resolve({ success: false, message: 'Cliente inexistente' }),
    });

    render(
      <MemoryRouter initialEntries={['/dados/1']}>
        <Routes>
          <Route path="/dados/:id" element={<Dados onLogout={mockOnLogout} />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Carregando dados do cliente...')).toBeInTheDocument();
    });
  });

  it('trata erro de conexao no fetchDadosCliente', async () => {
    global.fetch = jest.fn().mockRejectedValueOnce(new Error('Falha de rede'));

    render(
      <MemoryRouter initialEntries={['/dados/1']}>
        <Routes>
          <Route path="/dados/:id" element={<Dados onLogout={mockOnLogout} />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Carregando dados do cliente...')).toBeInTheDocument();
    });
  });
});
