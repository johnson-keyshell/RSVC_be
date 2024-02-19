var express = require('express');
var router = express.Router();
const userController = require('../controllers/users');
const contractController = require('../controllers/contract');

/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', { title: 'Express' });
});

router.use(function (req, res, next) {
  next();
});

router.get('/docusign/callback', contractController.docusignCallback);

module.exports = router;
