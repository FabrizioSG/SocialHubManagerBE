const express = require("express");
const router = express.Router();

const userController = require("../controllers/users.controller");

router.get('/', userController.getUsers)
router.post('/', userController.createUser)
router.post('/login', userController.login)
router.put('/:id', userController.updateUser)
router.delete('/:id', userController.deleteUser)
router.post('/tweet',userController.crearTweet)

router.post('/otp/generate/:id', userController.generarOTP);
router.post('/otp/verify/:id', userController.verificarOTP);
router.post('/otp/validate/:id', userController.validarOTP);
router.post('/otp/disable/:id', userController.desactivarOTP);

module.exports = router;
