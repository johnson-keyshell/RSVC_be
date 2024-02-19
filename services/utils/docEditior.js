const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

const fs = require('fs');

/* Sample usage

editDocument('contract_template.docx', 'output_2.docx', {
  Date: '',
  "Seller's Name": '',
  "Seller's Address": '',
  "Seller's Phone Number": '',
  "Seller's Email": '',
  "Buyer's Name": '',
  "Buyer's Address": '',
  "Buyer's Phone Number": '',
  "Buyer's Email": '',
  "Agent's Name": '',
  "Agent's Company Name": '',
  "Agent's Address": '',
  "Agent's Phone Number": '',
  "Agent's Email": '',
  'Property Address': '',
  'Legal Description of the Property': '',
  'Purchase Price': '',
  'Purchase Price in Words': '',
  'Commission Percentage': '',
  'Closing Date': '',
  'Payment Method': '',
  'Additional Terms': '',
});

*/
function editDocument(fileLocation, outputLocation, data) {
  // Load the docx file as binary content
  const content = fs.readFileSync(fileLocation, 'binary');

  // Unzip the content of the file
  const zip = new PizZip(content);

  // This will parse the template, and will throw an error if the template is
  // invalid, for example, if the template is "{user" (no closing tag)
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  // Convert the buffer content to a string
  const contentString = doc.getFullText();

  // Define a regular expression to find variables within {} brackets
  const variableRegex = /{([^{}]+)}/g;

  // Find all matches that resemble variables
  const matches = contentString.match(variableRegex);

  // Extract variable names from matches
  const variables = {};
  if (matches) {
    matches.forEach((match) => {
      const variableName = match.replace(/{|}/g, '').trim();
      variables[variableName] = '';
    });
  }

  console.log('Variables found in the document:', variables);

  // Render the document
  doc.render({ ...variables, ...data });

  // Get the zip document and generate it as a nodebuffer
  const buf = doc.getZip().generate({
    type: 'nodebuffer',
    // compression: DEFLATE adds a compression step.
    // For a 50MB output document, expect 500ms additional CPU time
    compression: 'DEFLATE',
  });

  // buf is a nodejs Buffer, you can either write it to a
  // file or res.send it with express for example.
  fs.writeFileSync(outputLocation, buf);
}

exports.editDocument = editDocument;
