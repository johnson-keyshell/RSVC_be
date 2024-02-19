const express = require('express');
const router = express.Router();
const imagesController = require('../controllers/images');
const chatImagesController = require('../controllers/chatImage');

// get property details
// router.get("/:id", imagesController.getPropertyDetails);

router.post('/upload', imagesController.uploadImage);

router.delete('/delete', imagesController.deteleImage);

router.get('/chat/get-details/:id', chatImagesController.getImageDetails);

router.get('/chat/:chatid/:id', chatImagesController.downloadImage);

router.post('/chat/upload', chatImagesController.uploadImage);

router.delete('/chat/delete/:chatid/:id', chatImagesController.deteleImage);

module.exports = router;
