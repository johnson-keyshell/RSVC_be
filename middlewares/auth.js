const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const authService = require('../services/auth');

// Middleware that routes each request
router.use(function (req, res, next) {
  let token = req.cookies.token;
  if (token) {
    authService
      .validateToken(token)
      .then((decod) => {
        req.decoded = decod;
        next();
      })
      .catch((err) => {
        res.status(403).send('Unauthorised Access');
      });
  } else {
    res.status(403).send('Unauthorised Access');
  }
});
module.exports = router;
