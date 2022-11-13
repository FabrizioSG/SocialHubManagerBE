const express = require("express");
const router = express.Router();

const scheduleController = require("../controllers/schedule.controller");

router.get('/:usuario_id', scheduleController.getScheduleByUser);

module.exports = router;
