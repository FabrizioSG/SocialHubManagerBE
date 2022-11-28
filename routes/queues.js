const express = require("express");
const router = express.Router();

const queueController = require("../controllers/queue.controller");

router.get('/posts_in_queue', queueController.getPostsInCola);
router.get('/posts_in_queue/:usuario_id', queueController.getPostsByUserInCola);
router.get('/schedules', queueController.getSchedules);
router.get('/schedules_by_day', queueController.getSchedulesByDay);
router.get('/schedules_and_posts', queueController.getSchedulesAndPostsByUserAndDayAndTime);

module.exports = router;
