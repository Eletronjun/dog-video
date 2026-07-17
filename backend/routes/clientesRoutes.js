const express = require('express');
const router = express.Router();
const clientesController = require('../controllers/clientesController');
const authenticateToken = require('../middleware/auth');

router.get('/clientes', clientesController.getAllClientes);
router.get('/clientes/:id', clientesController.getClienteById);
router.put('/clientes/:id', clientesController.updateCliente);
router.put('/clientes/:id/reset-senha', authenticateToken, clientesController.resetSenhaCliente);
router.post('/criarcliente', clientesController.criarCliente);
router.delete('/clientes/:id', clientesController.deleteCliente);

module.exports = router;
