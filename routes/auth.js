const express = require('express');
const passport = require('passport');
const router = express.Router();
const authController = require('../controllers/auth');
const googleAuthService = require('../services/utils/mailer/mailAuth');
const docusignAuthService = require('../services/utils/docusign/docusign');
const { initiateMailWatcher } = require('../services/utils/mailer/mailWatcher');

router.use(function (req, res, next) {
  next();
});

/**
 * Get endpoint to see if user is logged in
 */
router.get('/is-user-logged-in', authController.isUserLoggedIn);

/**
 * Get endpoint to see if user is logged in
 */
router.get('/logout', authController.logOut);

/**
 * POST Endpoint to process the local login request
 */
router.post('/local', authController.localLogin);

// Facebook Authentication Routes
router.get(
  '/facebook/buyer',
  passport.authenticate('facebook', {
    state: 'buyer',
  })
);
router.get(
  '/facebook/agent',
  passport.authenticate('facebook', {
    state: 'agent',
  })
);
router.get(
  '/facebook/seller',
  passport.authenticate('facebook', {
    state: 'owner',
  })
);

router.get('/facebook/callback', authController.facebookLogin);

// Google Authentication Routes
router.get(
  '/google/buyer',
  passport.authenticate('google', {
    state: 'buyer',
  })
);
router.get(
  '/google/agent',
  passport.authenticate('google', {
    state: 'agent',
  })
);
router.get(
  '/google/seller',
  passport.authenticate('google', {
    state: 'owner',
  })
);

// Google api auth setup
router.get('/google/auth-url', function (req, res, next) {
  res.redirect(googleAuthService.generateAuthUrl());
});
router.get('/google/app-auth-callback', async function (req, res, next) {
  await googleAuthService.storeToken(req.query.code);
  initiateMailWatcher();
  res.redirect('/admin/settings');
});

router.get('/google/callback', authController.googleLogin);

// Google api auth setup
router.get('/docusign/auth-url', async function (req, res, next) {
  res.redirect(await docusignAuthService.generateNewAuthUri());
});
router.get('/docusign/app-auth-callback', function (req, res, next) {
  docusignAuthService.getAccessTokenAndSave(req.query.code);
  res.redirect('/admin/settings');
});

module.exports = router;
