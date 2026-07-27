import reportWebVitals from './reportWebVitals';

jest.mock('web-vitals', () => {
  const fn = jest.fn(cb => cb && cb({ name: 'metric' }));
  return {
    getCLS: fn,
    getFID: fn,
    getFCP: fn,
    getLCP: fn,
    getTTFB: fn,
  };
});

describe('reportWebVitals Utility', () => {
  test('Não faz nada se onPerfEntry não for fornecido ou não for uma função', () => {
    reportWebVitals();
    reportWebVitals(null);
    reportWebVitals('not a function');
  });

  test('Invoca import dinâmico de web-vitals com callback', async () => {
    const mockPerfEntry = jest.fn();
    reportWebVitals(mockPerfEntry);

    await new Promise(resolve => setTimeout(resolve, 100));
  });
});
