const fs = require('fs');
const axios = require('axios');
const docusign = require('docusign-esign');
const readline = require('readline');
const config = require('../../../config/config');
const dotenv = require('dotenv');

dotenv.config();

const API_CLIENT = new docusign.ApiClient();
const TOKEN_PATH = `${__dirname}/token.json`;

//Add from docu sign dashboard
const accountId = config.docusign.accountId; // '928687a2-4ebf-422c-bbd6-4586623b0593';
const integrationKey = config.docusign.integrationKey; // 'ccb6e24f-707f-41ab-8913-52c5f699ac5d';
const projectSecret = config.docusign.projectSecret; // '75ff3beb-fc24-416a-a23f-e823ae1e291a';

//Only for development
API_CLIENT.setOAuthBasePath('account-d.docusign.com');
API_CLIENT.setBasePath('https://demo.docusign.net/restapi');

// Function to prompt user for code input
const promptForCode = async () => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question('Enter the code: ', (code) => {
      rl.close();
      resolve(code);
    });
  });
};

// Function to handle the scenario where refresh token fails
const handleRefreshTokenFailure = async () => {
  try {
    // Generate a new authorization URL
    const newAuthUri = await generateNewAuthUri();
    console.log('New Authorization URL:', newAuthUri);

    // Prompt the user to input the code via CLI
    const userInputCode = await promptForCode();

    // Generate new token using the input code
    const { accessToken, refreshToken, userInfo } = await API_CLIENT.generateAccessToken(integrationKey, projectSecret, userInputCode);

    // Save the new token details
    const newTokenDetails = {
      accessToken,
      refreshToken,
      userInfo,
      expiresAt: Math.floor(new Date().getTime() / 1000) + 3600, // Assuming token valid for 1 hour
    };
    saveTokenDetails(newTokenDetails);

    return accessToken;
  } catch (error) {
    console.error('Failed to handle refresh token failure:', error);
    return null;
  }
};

// Function to refresh access token using refresh token
const refreshAccessToken = async (refreshToken) => {
  const refreshUrl = 'https://account-d.docusign.com/oauth/token'; // Token endpoint URL

  const requestBody = {
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: integrationKey,
    client_secret: projectSecret,
  };

  try {
    const response = await axios.post(refreshUrl, requestBody);
    const { access_token: newAccessToken, refresh_token: newRefreshToken } = response.data;

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  } catch (error) {
    console.error('Error refreshing access token:', error);
    throw error; // Propagate the error for handling at a higher level
  }
};

// Function to save token details to a JSON file
const saveTokenDetails = (tokenDetails) => {
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokenDetails, null, 2));
};

// Function to generate a new authorization URL
const generateNewAuthUri = async () => {
  const scopes = ['signature', 'impersonation', 'extended'];
  const responseType = API_CLIENT.OAuth.ResponseType.CODE;
  const redirectUrl = process.env.DOCUSIGN_APP_AUTH_CALLBACK;

  return API_CLIENT.getAuthorizationUri(integrationKey, scopes, redirectUrl, responseType);
};

const getAccessTokenAndSave = async (userInputCode) => {
  // Generate new token using the input code
  const { accessToken, refreshToken, userInfo } = await API_CLIENT.generateAccessToken(integrationKey, projectSecret, userInputCode);

  // Save the new token details
  const newTokenDetails = {
    accessToken,
    refreshToken,
    userInfo,
    expiresAt: Math.floor(new Date().getTime() / 1000) + 3600, // Assuming token valid for 1 hour
  };
  saveTokenDetails(newTokenDetails);
};

// Updated checkTokenExpiration function to handle refresh token failure
const checkTokenExpiration = async () => {
  let tokenDetails = {};
  try {
    const tokenData = fs.readFileSync(TOKEN_PATH, 'utf8');
    tokenDetails = JSON.parse(tokenData);
    const { accessToken, refreshToken } = tokenDetails;

    const currentTime = Math.floor(new Date().getTime() / 1000);
    const tokenExpiration = tokenDetails.expiresAt;
    console.log(currentTime >= tokenExpiration);
    if (currentTime >= tokenExpiration) {
      try {
        // Attempt to refresh token
        const { accessToken: newAccessToken, refreshToken: newRefreshToken, userInfo } = await refreshAccessToken(refreshToken);
        tokenDetails.accessToken = newAccessToken;
        tokenDetails.refreshToken = newRefreshToken;
        tokenDetails.userInfo = userInfo;
        tokenDetails.expiresAt = Math.floor(new Date().getTime() / 1000) + 3600; // Assuming token valid for 1 hour
        saveTokenDetails(tokenDetails);
        return tokenDetails.accessToken;
      } catch (refreshError) {
        console.error('Failed to refresh token:', refreshError);
        // Handle refresh token failure by generating a new token
        const newAccessToken = await handleRefreshTokenFailure();
        if (newAccessToken) {
          tokenDetails.accessToken = newAccessToken;
          API_CLIENT.addDefaultHeader('Authorization', 'Bearer ' + newAccessToken);
          return tokenDetails.accessToken;
        } else {
          console.error('Error in getting docusign token');
        }
      }
    }
    return tokenDetails.accessToken;
  } catch (err) {
    console.error('Error checking token expiration:', err);
  }
};

// Function to retrieve access token or refresh if needed
const setAccessToken = async () => {
  const accessToken = await checkTokenExpiration();
  API_CLIENT.addDefaultHeader('Authorization', 'Bearer ' + accessToken);
  return accessToken;
};

/**
 * Function to create the definition of the envelop
 * @param {String} documentPath The path of the document to be signed
 * @param {String} documentName The name of the document to be signed
 * @param {String} documentExtension The file extension of the document to be signed
 * @param {String} documentId The unique identifier for the document
 * @param {String} emailSubject The email subject line for the mail to be sent
 * @param {Object} buyer The buyer object which contains the name, eMail and useraName
 * @param {Object} seller The seller object which contains the name, eMail and useraName
 * @returns the object with the envelop defeinition
 */
const makeEnvelope = (documentPath, documentName, documentExtension, documentId, emailSubject, buyer, seller) => {
  let docBytes = fs.readFileSync(documentPath);

  let envelope = new docusign.EnvelopeDefinition();
  envelope.emailSubject = emailSubject;

  let doc = new docusign.Document(),
    doc1b64 = Buffer.from(docBytes).toString('base64');
  doc.documentBase64 = doc1b64;

  doc.name = documentName;
  doc.fileExtension = documentExtension;
  doc.documentId = documentId;

  envelope.documents = [doc];

  // Create a signer recipient to sign the document
  const buyerAsSigner = docusign.Signer.constructFromObject({
    email: buyer.eMail,
    name: buyer.name,
    recipientId: 1,
    routingOrder: '1',
    clientUserId: buyer.userName,
  });

  // Create a sign here tab (tag) for the signer
  const buyerSignHere = docusign.SignHere.constructFromObject({
    documentId: documentId, // ID of the document to sign
    anchorString: `(Buyer's Signature)`, // Text used as an anchor
    anchorXOffset: '0', // X-axis offset from the anchor in pixels
    anchorYOffset: '0', // Y-axis offset from the anchor in pixels
    anchorUnits: 'pixels', // Unit for anchor offsets (pixels or millimeters)
    anchorIgnoreIfNotPresent: 'true', // Ignore tab if anchor text is not found
    anchorCaseSensitive: 'false', // Case sensitivity for anchor text
    recipientId: buyer.userName, // ID of the recipient (signer)
    tabLabel: 'SignHereTab', // Label for identifying the tab (can be any string)
  });

  const buyerDate = docusign.SignHere.constructFromObject({
    anchorString: `(Buyer’s Date)`,
    anchorUnits: 'pixels',
    anchorXOffset: '0',
    anchorYOffset: '0',
    tabLabel: 'Date',
  });

  // Add the sign here tab to the signer
  const buyerTabs = docusign.Tabs.constructFromObject({
    signHereTabs: [buyerSignHere],
    textTabs: [buyerDate],
  });
  buyerAsSigner.tabs = buyerTabs;

  // Create a signer recipient to sign the document
  const sellerAsSigner = docusign.Signer.constructFromObject({
    email: seller.eMail,
    name: seller.name,
    recipientId: 3,
    routingOrder: '3',
    clientUserId: seller.userName,
  });

  // Create a sign here tab (tag) for the signer
  const sellerSignHere = docusign.SignHere.constructFromObject({
    documentId: documentId, // ID of the document to sign
    anchorString: `(Seller's Signature)`, // Text used as an anchor
    anchorXOffset: '0', // X-axis offset from the anchor in pixels
    anchorYOffset: '0', // Y-axis offset from the anchor in pixels
    anchorUnits: 'pixels', // Unit for anchor offsets (pixels or millimeters)
    anchorIgnoreIfNotPresent: 'true', // Ignore tab if anchor text is not found
    anchorCaseSensitive: 'false', // Case sensitivity for anchor text
    recipientId: seller.userName, // ID of the recipient (signer)
    tabLabel: 'SignHereTab', // Label for identifying the tab (can be any string)
  });

  const sellerDate = docusign.SignHere.constructFromObject({
    anchorString: `(Seller's Date)`,
    anchorUnits: 'pixels',
    anchorXOffset: '0',
    anchorYOffset: '0',
    tabLabel: 'Date',
  });

  // Add the sign here tab to the signer
  const sellerTabs = docusign.Tabs.constructFromObject({
    signHereTabs: [sellerSignHere],
    textTabs: [sellerDate],
  });
  sellerAsSigner.tabs = sellerTabs;

  let recipients = docusign.Recipients.constructFromObject({ signers: [buyerAsSigner, sellerAsSigner] });
  envelope.recipients = recipients;
  envelope.status = 'sent';

  return envelope;
};

/**
 * Function to create and send the envelop to docusign
 * @param {String} documentPath The path of the document to be signed
 * @param {String} documentName The name of the document to be signed
 * @param {String} documentExtension The file extension of the document to be signed
 * @param {String} documentId The unique identifier for the document
 * @param {String} emailSubject The email subject line for the mail to be sent
 * @param {Object} buyer The buyer object which contains the name, eMail and useraName
 * @param {Object} agent The agent object which contains the name, eMail and useraName
 * @param {Object} seller The seller object which contains the name, eMail and useraName
 * @returns The envelop details
 */
const generateEnvelope = async (documentPath, documentName, documentExtension, documentId, emailSubject, buyer, seller) => {
  await setAccessToken();
  let envelopesApi = new docusign.EnvelopesApi(API_CLIENT);
  let envelope = makeEnvelope(documentPath, documentName, documentExtension, documentId, emailSubject, buyer, seller);
  let results = await envelopesApi.createEnvelope(accountId, { envelopeDefinition: envelope });
  return results;
};

/**
 * Function to fetch the details about a envelope
 * @param {String} envelopeId The envelope ID
 * @returns The envelop details object
 */
const getEnvelopeDetails = async (envelopeId) => {
  await setAccessToken();
  let envelopesApi = new docusign.EnvelopesApi(API_CLIENT);
  let envelopDetails = await envelopesApi.getEnvelope(accountId, envelopeId);
  let recipients = await envelopesApi.listRecipients(accountId, envelopeId);
  return { envelopDetails, recipients };
};

/**
 * Function to download a document from an envelope
 * @param {String} envelopeId The envelop Id
 * @param {String} savePath The path to save the document
 * @returns Function to download a document from an envelope
 */
const downloadSingleDocumentFromEnvelope = async (envelopeId, savePath) => {
  let envelopesApi = new docusign.EnvelopesApi(API_CLIENT);
  let response = await envelopesApi.listDocuments(accountId, envelopeId, null);
  if (response && response.envelopeDocuments && response.envelopeDocuments.length > 0) {
    const documentId = response.envelopeDocuments[0].documentId;
    let data = await envelopesApi.getDocument(accountId, envelopeId, documentId);
    fs.writeFileSync(savePath, Buffer.from(data, 'binary'));
  } else {
    console.error('No documents found in the envelope.');
  }
};

/**
 *
 * @param {String} returnUrl The URL to which the user should be redirected after he signs the document
 * @param {Object} user The user object with userName, eMail and name
 * @param {String} envelopeId The id provided by docusign for the envelope when we generated it
 * @returns The envelopId and the signing url
 */
const generateView = async (returnUrl, user, envelopeId) => {
  await setAccessToken();

  let viewRequest = new docusign.RecipientViewRequest();
  viewRequest.returnUrl = returnUrl;
  viewRequest.authenticationMethod = 'none';
  viewRequest.email = user.eMail;
  viewRequest.userName = user.name;
  viewRequest.clientUserId = user.userName;

  let envelopesApi = new docusign.EnvelopesApi(API_CLIENT);

  results = await envelopesApi.createRecipientView(accountId, envelopeId, {
    recipientViewRequest: viewRequest,
  });

  return { envelopeId: envelopeId, signingUrl: results.url };
};

/**
 * Function to fetch the signing details about a envelope
 * @param {String} envelopeId The envelope ID
 * @returns The envelop details object
 */
const getSigningStatus = async (envelopeId) => {
  await setAccessToken();
  let envelopesApi = new docusign.EnvelopesApi(API_CLIENT);
  let recipients = await envelopesApi.listRecipients(accountId, envelopeId);
  let result = {};
  recipients?.signers?.forEach((signer) => {
    result[['buyer', 'agent', 'owner', 'unknown'][signer?.recipientId ? +signer?.recipientId - 1 : 3]] = signer.status;
  });
  return result;
};

module.exports = {
  generateEnvelope,
  generateView,
  downloadSingleDocumentFromEnvelope,
  getSigningStatus,
  getEnvelopeDetails,
  getAccessTokenAndSave,
  generateNewAuthUri,
};
