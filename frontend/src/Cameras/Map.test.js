import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import LocationMap from './Map';

const mockUseJsApiLoader = jest.fn();
jest.mock('@react-google-maps/api', () => ({
  useJsApiLoader: () => mockUseJsApiLoader(),
  GoogleMap: ({ children }) => <div data-testid="google-map">{children}</div>,
  Marker: () => <div data-testid="marker" />,
}));

describe('LocationMap Component', () => {
  const originalGeolocation = navigator.geolocation;

  beforeEach(() => {
    mockUseJsApiLoader.mockClear();
    console.error = jest.fn();
  });

  afterAll(() => {
    Object.defineProperty(navigator, 'geolocation', {
      value: originalGeolocation,
      writable: true,
    });
  });

  test('Exibe mensagem de carregando quando o mapa não está carregado', () => {
    mockUseJsApiLoader.mockReturnValue({ isLoaded: false });

    render(<LocationMap />);

    expect(screen.getByText('Carregando mapa...')).toBeInTheDocument();
  });

  test('Obtém localização do navegador e renderiza o mapa com marcador', async () => {
    mockUseJsApiLoader.mockReturnValue({ isLoaded: true });

    const mockGetCurrentPosition = jest.fn((success) =>
      success({ coords: { latitude: -15.7942, longitude: -47.8822 } })
    );

    Object.defineProperty(navigator, 'geolocation', {
      value: { getCurrentPosition: mockGetCurrentPosition },
      writable: true,
      configurable: true,
    });

    render(<LocationMap />);

    await waitFor(() => {
      expect(screen.getByTestId('google-map')).toBeInTheDocument();
      expect(screen.getByTestId('marker')).toBeInTheDocument();
    });
  });

  test('Trata erro de geolocalização do navegador', async () => {
    mockUseJsApiLoader.mockReturnValue({ isLoaded: true });

    const mockGetCurrentPosition = jest.fn((success, error) =>
      error({ message: 'Permissão negada' })
    );

    Object.defineProperty(navigator, 'geolocation', {
      value: { getCurrentPosition: mockGetCurrentPosition },
      writable: true,
      configurable: true,
    });

    render(<LocationMap />);

    await waitFor(() => {
      expect(screen.getByText('Não foi possível obter sua localização.')).toBeInTheDocument();
    });
  });

  test('Trata ausência de geolocalização no navegador', async () => {
    mockUseJsApiLoader.mockReturnValue({ isLoaded: true });

    Object.defineProperty(navigator, 'geolocation', {
      value: null,
      writable: true,
      configurable: true,
    });

    render(<LocationMap />);

    await waitFor(() => {
      expect(screen.getByText('Geolocalização não é suportada pelo navegador.')).toBeInTheDocument();
    });
  });
});
