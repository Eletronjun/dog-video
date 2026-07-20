const express = require('express');
const router = express.Router();
const livesController = require('../controllers/livesController');

router.get('/api/lives/modulo/:modulo', livesController.getLiveByModulo);

module.exports = router;
