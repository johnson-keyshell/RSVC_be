const LocalStrategy = require('passport-local').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
const { Op } = require('sequelize');
const userService = require('../services/users');
const imageService = require('../services/images');
const rolesService = require('../services/roles');
const config = require('../config/config');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

function configurePassport(passport) {
  // Configure Passport
  passport.use(
    new LocalStrategy(
      {
        usernameField: 'userName',
        passwordField: 'password',
        passReqToCallback: true,
      },
      async (req, userName, password, done) => {
        try {
          userService
            .findOne(() => [{ where: { [Op.or]: [{ UserName: userName }, { eMail: userName }] } }])
            .then(async (user) => {
              if (!user) {
                done(null, false, {
                  errors: 'username or password is invalid',
                });
              } else {
                await bcrypt.compare(password, user.HashPassword).then(async (same) => {
                  if (same) {
                    done(null, user);
                  } else {
                    done(null, false, {
                      errors: 'username or password is invalid',
                    });
                  }
                });
              }
            })
            .catch((err) => {
              console.error(err);
              return err;
            });
        } catch (error) {
          console.error(error);
        }
      }
    )
  );

  passport.use(
    new FacebookStrategy(config.auth.facebook, async (req, accessToken, refreshToken, profile, done) => {
      try {
        let email = profile?.emails?.[0]?.value;
        if (email) {
          let user = await userService.findOne(() => [{ where: { [Op.or]: [{ UserName: email }, { eMail: email }] } }]);
          if (!user) {
            let role = await rolesService.findOne(() => [{ where: { RoleName: req?.query?.state ?? 'buyer' } }]);
            let userDetails = {
              UserName: email,
              FirstName: profile?.name?.givenName ?? email?.split('@')[0],
              LastName: profile?.name?.familyName ?? null,
              eMail: email,
              SignUpMethod: 'Facebook',
              Role: role.RoleID,
            };
            // save the pic info
            if (profile.photos?.length) {
              let image = await imageService.create({
                ImageName: profile.photos[0]?.value,
              });
              userDetails.ProfilePic = image.ImageID;
            }
            await userService.create(userDetails);
            return done(null, userDetails);
          }
          return done(null, user);
        } else {
          return done('Email not recieved');
        }
      } catch (error) {
        console.error(error);
        return error;
      }
    })
  );

  passport.use(
    new GoogleStrategy(config.auth.google, async (req, token, tokenSecret, profile, done) => {
      try {
        let email = profile?.emails?.[0]?.value;
        if (email) {
          let user = await userService.findOne(() => [{ where: { [Op.or]: [{ UserName: email }, { eMail: email }] } }]);
          if (!user) {
            let role = await rolesService.findOne(() => [{ where: { RoleName: req?.query?.state ?? 'buyer' } }]);
            let userDetails = {
              UserName: email,
              FirstName: profile?.name?.givenName ?? email?.split('@')[0],
              LastName: profile?.name?.familyName ?? null,
              eMail: email,
              SignUpMethod: 'Google',
              Role: role.RoleID,
            };
            // save the pic info
            if (profile.photos?.length) {
              let image = await imageService.create({
                ImageName: profile.photos[0]?.value,
              });
              userDetails.ProfilePic = image.ImageID;
            }
            await userService.create(userDetails);
            return done(null, userDetails);
          }
          return done(null, user);
        } else {
          return done('Email not recieved');
        }
      } catch (error) {
        console.error(error);
        return error;
      }
    })
  );
}

const validateToken = (token) =>
  new Promise((resolve, reject) => {
    jwt.verify(token, config.jwt.secret, function (err, decod) {
      if (err) {
        reject(err);
      } else {
        resolve(decod);
      }
    });
  });

module.exports = { configurePassport, validateToken };
