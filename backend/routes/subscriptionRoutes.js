const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const authenticateToken = require('../middleware/auth'); // O mesmo middleware adaptado

router.post('/subscribe', authenticateToken, subscriptionController.subscribe);
router.post('/notificacoes', subscriptionController.criarNotificacao);
router.post('/send-notification', subscriptionController.enviarNotificacao);

module.exports = router;
