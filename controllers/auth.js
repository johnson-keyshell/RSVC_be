const jwt = require('jsonwebtoken');
const config = require('../config/config');
const passport = require('passport');
const HTTP_OK = 200;
const HTTP_FORBIDDEN = 403;

const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client(config.auth.google.clientID);
const rolesService = require('../services/roles');
const userService = require('../services/users');
const { generateRandom } = require('../utils/utils');
const min = process.env.MIN_START || 1;
const max = process.env.MAX_START || 1000;

/**
 * Function to authenticate if the user login is valid or not
 * @param {Object} req The Express req object
 * @param {Object} res The Express response object
 * @param {Function} next The next middleware function to be called
 */
exports.isUserLoggedIn = (req, res, next) => {
  let token = req.cookies.token;
  if (token) {
    // Checks if the user is logged in
    jwt.verify(token, config.jwt.secret, function (err, decod) {
      if (err) {
        res.send({ isLoggedIn: false });
      } else {
        res.send({ isLoggedIn: true });
      }
    });
  } else {
    res.send({ isLoggedIn: false });
  }
};

/**
 * Function to logout user
 * @param {Object} req The Express req object
 * @param {Object} res The Express response object
 * @param {Function} next The next middleware function to be called
 */
exports.logOut = (req, res, next) => {
  // Clear cookies
  res.clearCookie('token');

  // Redirect the user to the home page
  res.redirect('/');
};

/**
 * Function to authenticate if the user login is valid or not
 * @param {Object} req The Express req object
 * @param {Object} res The Express response object
 * @param {Function} next The next middleware function to be called
 */
exports.localLogin = (req, res, next) => {
  passport.authenticate('local', async (err, passportUser, info) => {
    if (err) {
      console.error(err);
      return next(err);
    }
    let token, message;
    if (passportUser) {
      token = jwt.sign({ data: { UserName: passportUser.UserName } }, config.jwt.secret, {
        expiresIn: config.jwt.expiry,
      });
    } else {
      message = 'The username or password you have entered is invalid.';
      res.status(HTTP_FORBIDDEN).json({ message });
      return;
    }
    if (token) {
      let role = await rolesService.findOne(() => [{ where: { RoleID: passportUser.Role } }]);

      res.cookie('token', token);
      res.cookie('userName', passportUser.UserName);
      res.cookie('eMail', passportUser.eMail);
      res.cookie('role', role?.RoleName ?? 'buyer');
      res.redirect(config.successfullLoginRedirect?.[role] ?? '/');
    } else {
      res.status(HTTP_FORBIDDEN).json({ message });
    }
  })(req, res, next);
};

/**
 * Function to authenticate if the user login is valid or not
 * @param {Object} req The Express req object
 * @param {Object} res The Express response object
 * @param {Function} next The next middleware function to be called
 */
exports.googleLogin = (req, res, next) => {
  passport.authenticate('google', async (err, passportUser, info) => {
    if (err) {
      console.error(err);
      return next(err);
    }
    let token, message;
    if (passportUser) {
      token = jwt.sign({ data: { UserName: passportUser.UserName } }, config.jwt.secret, {
        expiresIn: config.jwt.expiry,
      });
    } else {
      message = 'The username or password you have entered is invalid.';
      res.status(HTTP_FORBIDDEN).json({ message });
      return;
    }
    if (token) {
      let role = await rolesService.findOne(() => [{ where: { RoleID: passportUser.Role } }]);

      res.cookie('token', token);
      res.cookie('userName', passportUser.UserName);
      res.cookie('eMail', passportUser.eMail);
      res.cookie('role', role?.RoleName ?? 'buyer');
       if (role?.RoleName === 'agent') {
        res.redirect('/agentlisting'); 
      }
      else if (role?.RoleName === 'owner') {
        res.redirect('/sellers'); 
      }
      else {
        res.redirect(config.successfullLoginRedirect?.[role] ?? '/');
      }
    } else {
      res.status(HTTP_FORBIDDEN).json({ message });
    }
  })(req, res, next);
};

/**
 * Function to authenticate if the user login is valid or not
 * @param {Object} req The Express req object
 * @param {Object} res The Express response object
 * @param {Function} next The next middleware function to be called
 */
exports.facebookLogin = (req, res, next) => {
  passport.authenticate('facebook', async (err, passportUser, info) => {
    if (err) {
      console.error(err);
      return next(err);
    }
    let token, message;
    if (passportUser) {
      token = jwt.sign({ data: { UserName: passportUser.UserName } }, config.jwt.secret, {
        expiresIn: config.jwt.expiry,
      });
    } else {
      message = 'The username or password you have entered is invalid.';
      res.status(HTTP_FORBIDDEN).json({ message });
      return;
    }
    if (token) {
      let role = await rolesService.findOne(() => [{ where: { RoleID: passportUser.Role } }]);

      res.cookie('token', token);
      res.cookie('userName', passportUser.UserName);
      res.cookie('eMail', passportUser.eMail);
      res.cookie('role', role?.RoleName ?? 'buyer');
      res.redirect(config.successfullLoginRedirect?.[role] ?? '/');
    } else {
      res.status(HTTP_FORBIDDEN).json({ message });
    }
  })(req, res, next);
};
