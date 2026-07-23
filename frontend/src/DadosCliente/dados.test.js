import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Dados from './dados';

describe('DadosComponent Tests', () => {
  beforeEach(() => {
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
          <Route path="/dados/:id" element={<Dados onLogout={jest.fn()} />} />
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
});
