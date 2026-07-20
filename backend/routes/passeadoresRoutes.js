const express = require('express');
const router = express.Router();
const passeadoresController = require('../controllers/passeadoresController');

router.get('/passeadores/:id?', passeadoresController.getPasseadores);
router.put('/passeadores/:id', passeadoresController.atualizarPasseador);
router.post('/criarpasseador', passeadoresController.criarPasseador);
router.delete('/passeadores/:id', passeadoresController.excluirPasseador);
router.get('/cachorros/:id_cliente/passeador', passeadoresController.getPasseadorPorCliente);
router.get('/passeadores/:id/horarios', passeadoresController.getHorariosPasseador);
router.get('/api/passeadores/modulo/:modulo', passeadoresController.getPasseadoresByModulo);

module.exports = router;
