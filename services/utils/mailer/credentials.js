const dotenv = require('dotenv');

dotenv.config();
module.exports = {
  installed: {
    client_id: '419323079572-4qkkejuf08e9d7vrcc1qnv63jcr4p3pc.apps.googleusercontent.com',
    project_id: 'rsvc-414010',
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    client_secret: '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',
    redirect_uris: [process.env.GOOGLE_APP_AUTH_CALLBACK],
    javascript_origins: [process.env.BASE_URL],
  },
};
