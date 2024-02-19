const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');
const creds = require('./credentials');

const SCOPES = [
  'https://www.googleapis.com/auth/pubsub',
  'https://mail.google.com/',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.readonly',
];
const TOKEN_PATH = `${__dirname}/token.json`;
const CRED_FILE = './services/utils/mailer/credentials.json';

function authorize(callback) {
  let credentials = creds;
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
  authenticateOrRefreshToken(oAuth2Client, callback);
}

function authenticateOrRefreshToken(oAuth2Client, callback) {
  try {
    const tokenFile = TOKEN_PATH; // Path to your token.json file
    const credentials = require(tokenFile);

    const { expiry_date, refresh_token } = credentials;

    if (expiry_date && Date.now() >= expiry_date) {
      oAuth2Client.setCredentials({ refresh_token });

      oAuth2Client
        .getAccessToken()
        .then(({ token }) => {
          // Update token.json file with the new access token and expiry date
          credentials.access_token = token;
          credentials.expiry_date = Date.now() + 3600000; // Assuming the token is valid for 1 hour (in milliseconds)
          fs.writeFileSync(tokenFile, JSON.stringify(credentials));

          oAuth2Client.setCredentials({ access_token: token });

          callback(oAuth2Client);
        })
        .catch((err) => {
          console.error('Error refreshing access token:', err);
          getNewToken(oAuth2Client, callback);
        });
    } else {
      oAuth2Client.setCredentials(credentials);
      callback(oAuth2Client);
    }
  } catch (error) {
    console.error('Error authenticating with token:', error);
    getNewToken(oAuth2Client, callback);
  }
}

function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this URL:', authUrl);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error while trying to retrieve access token', err);
      oAuth2Client.setCredentials(token);
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

function generateAuthUrl() {
  try {
    let credentials = creds;
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
    });
    return authUrl;
  } catch (error) {
    console.error(error);
    return null;
  }
}

const storeToken = (code) =>
  new Promise((resolve, reject) => {
    let credentials = creds;
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    oAuth2Client.getToken(code, (err, token) => {
      if (err) reject(err);
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
        resolve(TOKEN_PATH);
      });
    });
  });

exports.authorize = authorize;
exports.generateAuthUrl = generateAuthUrl;
exports.storeToken = storeToken;
