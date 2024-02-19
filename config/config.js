const dotenv = require('dotenv');

dotenv.config();
module.exports = {
  database: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  },
  docusign: {
    accountId: process.env.DOCUSIGN_ACCOUNT_ID,
    integrationKey: process.env.DOCUSIGN_INTEGRATION_KEY,
    projectSecret: process.env.DOCUSIGN_PROJECT_SECRET,
    redirectUrl: process.env.DOCUSIGN_REDIRECT_URL || 'http://localhost:8001/api/docusign/callback',
  },
  jwt: {
    secret: 'rsvc_2023_development_@_deltasoft',
    expiry: '24h',
  },
  baseUrl: process.env.BASE_URL,
  auth: {
    facebook: {
      clientID: process.env.FACEBOOK_APPID || '350251007506320',
      clientSecret: process.env.FACEBOOK_SECRET || '03e3878b50d6a1b973f155c54fdb3867',
      callbackURL: process.env.FACEBOOK_REDIRECT_URI || 'http://localhost:8001/auth/facebook/callback',
      scope: 'email',
      profileFields: ['emails', 'name'],
      passReqToCallback: true,
    },
    google: {
      clientID: process.env.GOOGLE_CLIENTID || '629620806061-q6rk24958e5627lgi7bidnk8lvs13leo.apps.googleusercontent.com',
      clientSecret: process.env.GOOGLE_SECRET || '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',
      callbackURL: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8001/auth/google/callback',
      scope: ['profile', 'email'],
      profileFields: ['emails', 'name'],
      passReqToCallback: true,
    },
  },
  mailInfo: {
    eMail: 'rsvc.4.dev@gmail.com',
  },
  imageBaseUrl: '/images/uploads',
  timezone: 'it-IT',
  notificationWindow: 24 * 60 * 60 * 1000, // This is millisecond value
  successfullLoginRedirect: {
    buyer: '/',
    agent: '/',
    owner: '/',
    admin: '/',
  },
};
