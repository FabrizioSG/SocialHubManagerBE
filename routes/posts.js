const express = require("express");
const router = express.Router();

const postController = require("../controllers/posts.controller");

router.get('/:usuario_id', postController.getPostsByUser)
//router.delete('/:id', postController.deletepost)
router.post('/tweet',postController.crearTweet)
router.post('/tweet/link',postController.crearAuthLink)
router.post('/tweet/token',postController.crearAuthToken)

module.exports = router;