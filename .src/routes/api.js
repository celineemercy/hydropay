const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

router.post('/qris/generate', paymentController.generateQris);
router.post('/qris/webhook', paymentController.handleWebhook);

module.exports = router;