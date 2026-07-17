const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/login', authController.login);
router.post('/alterar-senha', authController.alterarSenha);
router.post('/aceitar-termo', authController.aceitarTermo);

module.exports = router;
