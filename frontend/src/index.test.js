import React from 'react';
import { act, waitFor } from '@testing-library/react';

const rootDiv = document.createElement('div');
rootDiv.id = 'root';
document.body.appendChild(rootDiv);

const mockGetUserMedia = jest.fn().mockImplementation(() =>
  Promise.resolve({ getTracks: () => [] })
);

Object.defineProperty(navigator, 'mediaDevices', {
  value: { getUserMedia: mockGetUserMedia },
  writable: true,
  configurable: true,
});

const mockRegister = jest.fn().mockImplementation(() =>
  Promise.resolve({
    pushManager: {
      subscribe: jest.fn().mockImplementation(() =>
        Promise.resolve({ endpoint: 'http://push.com' })
      ),
    },
  })
);

Object.defineProperty(navigator, 'serviceWorker', {
  value: {
    ready: Promise.resolve({
      pushManager: {
        subscribe: jest.fn().mockImplementation(() =>
          Promise.resolve({ endpoint: 'http://push.com' })
        ),
      },
    }),
    register: mockRegister,
  },
  writable: true,
  configurable: true,
});

Object.defineProperty(window, 'Notification', {
  value: class {
    static requestPermission() {
      return Promise.resolve('granted');
    }
  },
  writable: true,
  configurable: true,
});

global.fetch = jest.fn().mockImplementation(() => Promise.resolve({ ok: true }));

describe('Index Entrypoint & App Component', () => {
  beforeEach(() => {
    localStorage.clear();
    mockGetUserMedia.mockImplementation(() => Promise.resolve({ getTracks: () => [] }));
    mockRegister.mockImplementation(() => Promise.resolve({
      pushManager: {
        subscribe: jest.fn().mockImplementation(() => Promise.resolve({ endpoint: 'http://push.com' })),
      },
    }));
  });

  test('Inicializa com authData de cliente dentro do prazo de 1h', async () => {
    localStorage.setItem('authData', JSON.stringify({
      id_cliente: 10,
      userType: 'user',
      timestamp: Date.now() - 1000
    }));

    await act(async () => {
      require('./index');
    });

    await waitFor(() => {
      expect(mockGetUserMedia).toHaveBeenCalled();
    });
  });

  test('Inicializa com authData de admin e simula falha ao registrar Service Worker', async () => {
    mockRegister.mockRejectedValueOnce(new Error('Erro SW'));

    localStorage.setItem('authData', JSON.stringify({
      id_cliente: 1,
      userType: 'admin',
      timestamp: Date.now() - 500
    }));

    await act(async () => {
      jest.isolateModules(() => {
        require('./index');
      });
    });

    await waitFor(() => {
      expect(localStorage.getItem('authData')).toBeTruthy();
    });
  });

  test('Trata recusa de permissão para Notificação', async () => {
    Object.defineProperty(window, 'Notification', {
      value: class {
        static requestPermission() {
          return Promise.resolve('denied');
        }
      },
      writable: true,
      configurable: true,
    });

    await act(async () => {
      jest.isolateModules(() => {
        require('./index');
      });
    });

    await waitFor(() => {
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
    });
  });
});
