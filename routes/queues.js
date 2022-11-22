const express = require("express");
const router = express.Router();

const queueController = require("../controllers/queue.controller");

router.get('/:usuario_id', queueController.getPostsByUserInCola);

module.exports = router;
