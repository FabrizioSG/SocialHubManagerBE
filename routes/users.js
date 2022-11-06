const express = require("express");
const router = express.Router();

const userController = require("../controllers/users.controller");

router.get('/', userController.getUsers)
router.post('/', userController.createUser)
router.post('/login', userController.login)
router.put('/:id', userController.updateUser)
router.delete('/:id', userController.deleteUser)
router.post('/tweet',userController.crearTweet)

module.exports = router;
