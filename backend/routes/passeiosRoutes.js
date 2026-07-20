const express = require('express');
const router = express.Router();
const passeiosController = require('../controllers/passeiosController');

router.post('/passeios', passeiosController.criarPasseio);
router.put('/passeios/:id_cliente', passeiosController.updatePasseio);
router.get('/passeios/:id_cliente', passeiosController.getPasseio);

module.exports = router;
