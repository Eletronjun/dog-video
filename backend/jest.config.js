module.exports = {
    testEnvironment: 'node', // Define o ambiente de teste como Node.js
    testMatch: ['**/tests/**/*.test.js'], // Padrão para encontrar arquivos de teste
    collectCoverage: false, // O coverage será gerado apenas ao rodar `make test-coverage`
    coverageDirectory: 'coverage', // Pasta onde os relatórios de cobertura serão salvos
  };