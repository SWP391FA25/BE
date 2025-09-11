const express = require('express');
const router = express.Router();
const { genChat } = require('../controllers/aiController');

// change to root POST so mounting path decides final URL
router.post('/', genChat);

module.exports = router;