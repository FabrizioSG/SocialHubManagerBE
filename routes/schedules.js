const express = require("express");
const router = express.Router();

const scheduleController = require("../controllers/schedule.controller");

router.get('/:usuario_id', scheduleController.getScheduleByUser);
router.post('/',scheduleController.createSchedule);
router.put('/:id',scheduleController.updateSchedule);

module.exports = router;
