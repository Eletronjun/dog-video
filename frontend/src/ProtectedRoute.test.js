import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';

describe('ProtectedRoute Component', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const TargetElement = () => <div>Conteúdo Protegido</div>;
  const LoginElement = () => <div>Página de Login</div>;

  test('Redireciona para / se não houver authData no localStorage', () => {
    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/" element={<LoginElement />} />
          <Route
            path="/protected"
            element={<ProtectedRoute element={<TargetElement />} allowedRoles={['admin']} />}
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Página de Login')).toBeInTheDocument();
    expect(screen.queryByText('Conteúdo Protegido')).not.toBeInTheDocument();
  });

  test('Redireciona para / se o papel do usuário não for permitido em allowedRoles', () => {
    localStorage.setItem('authData', JSON.stringify({ userType: 'user' }));

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/" element={<LoginElement />} />
          <Route
            path="/protected"
            element={<ProtectedRoute element={<TargetElement />} allowedRoles={['admin']} />}
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Página de Login')).toBeInTheDocument();
    expect(screen.queryByText('Conteúdo Protegido')).not.toBeInTheDocument();
  });

  test('Renderiza o elemento protegido quando o papel do usuário é válido', () => {
    localStorage.setItem('authData', JSON.stringify({ userType: 'admin' }));

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/" element={<LoginElement />} />
          <Route
            path="/protected"
            element={<ProtectedRoute element={<TargetElement />} allowedRoles={['admin']} />}
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Conteúdo Protegido')).toBeInTheDocument();
  });
});
