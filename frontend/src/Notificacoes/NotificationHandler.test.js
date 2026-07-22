import React from 'react';
import { render, waitFor } from '@testing-library/react';
import NotificationHandler from './NotificationHandler';

describe('NotificationHandler Component', () => {
  let mockServiceWorker;

  beforeEach(() => {
    global.fetch = jest.fn();

    mockServiceWorker = {
      ready: Promise.resolve({
        pushManager: {
          getSubscription: jest.fn(),
          subscribe: jest.fn(),
        }
      })
    };

    Object.defineProperty(global.navigator, 'serviceWorker', {
      value: mockServiceWorker,
      writable: true,
      configurable: true
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('Renderiza componente null sem quebrar', () => {
    const { container } = render(<NotificationHandler />);
    expect(container.firstChild).toBeNull();
  });

  test('Não faz nada se não tiver serviceWorker suportado', () => {
    // Remove o suporte mockado
    delete global.navigator.serviceWorker;

    render(<NotificationHandler />);
    // Só deve passar sem erros
  });

  test('Pula a inscrição se já houver uma subscription', async () => {
    const mockReady = await global.navigator.serviceWorker.ready;
    mockReady.pushManager.getSubscription.mockResolvedValueOnce({ endpoint: 'http://test' });

    render(<NotificationHandler />);

    await waitFor(() => {
      expect(mockReady.pushManager.getSubscription).toHaveBeenCalled();
      expect(mockReady.pushManager.subscribe).not.toHaveBeenCalled();
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  test('Cria nova subscription e envia para o backend caso não exista', async () => {
    const mockReady = await global.navigator.serviceWorker.ready;
    mockReady.pushManager.getSubscription.mockResolvedValueOnce(null);
    mockReady.pushManager.subscribe.mockResolvedValueOnce({ endpoint: 'http://new-subscription' });

    global.fetch.mockResolvedValueOnce({ ok: true });

    render(<NotificationHandler />);

    await waitFor(() => {
      expect(mockReady.pushManager.getSubscription).toHaveBeenCalled();
      expect(mockReady.pushManager.subscribe).toHaveBeenCalledWith({
        userVisibleOnly: true,
        applicationServerKey: 'BBH2oyhNjmKPnyR140S375tVHFM1wuSd7GW7ijm90Ja7NB2eX67YQRbDLVyW_QrLqiDpbIy9QecaBDC_K1AWCro'
      });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/subscribe'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            subscription: { endpoint: 'http://new-subscription' },
            id_cliente: null
          })
        })
      );
    });
  });
});
