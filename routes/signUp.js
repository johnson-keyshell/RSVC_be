const express = require('express');
const router = express.Router();
const userController = require('../controllers/users');
const imagesController = require('../controllers/images');

router.use(function (req, res, next) {
  next();
});

// get property details
router.post('/', userController.signUp);

router.post('/upload-pic', imagesController.uploadImage);

module.exports = router;
