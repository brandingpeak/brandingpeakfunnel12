const { GoogleAuth } = require('google-auth-library');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Parse credentials from file or environment variable
let credentials;
try {
  const credPath = path.join(__dirname, 'credentials.json');
  if (fs.existsSync(credPath)) {
    credentials = JSON.parse(fs.readFileSync(credPath, 'utf8'));
  } else {
    credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
  }
} catch(e) {
  console.error('Error loading credentials:', e.message);
  credentials = {};
}

const auth = new GoogleAuth({
  credentials: credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

const sheets = google.sheets({ version: 'v4', auth });
const SHEET_ID = '1cvbY7ZZ0qPuKXq3fv8e0EJzvw_8oMztylFy1olG1FT4';

async function addLeadToSheet(data) {
  try {
    const values = [[
      data.name || '',
      data.email || '',
      data.phone || '',
      data.income || '',
      data.niche || '',
      Array.isArray(data.problems) ? data.problems.join('; ') : '',
      data.instagram || '',
      data.goal || '',
      data.agencia || '',
      data.agencia_exp || '',
      new Date().toLocaleString('es-ES')
    ]];

    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: SHEET_ID
    });
    const sheetName = spreadsheet.data.sheets[0].properties.title;
    const sheetId = spreadsheet.data.sheets[0].properties.sheetId;

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      resource: {
        requests: [{
          insertDimension: {
            range: {
              sheetId: sheetId,
              dimension: 'ROWS',
              startIndex: 1,
              endIndex: 2
            }
          }
        }]
      }
    });

    const response = await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${sheetName}!A2:K2`,
      valueInputOption: 'RAW',
      resource: { values }
    });

    return { success: true, response: response.data };
  } catch(e) {
    console.error('Error:', e.message);
    return { error: e.message };
  }
}

exports.handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const data = JSON.parse(event.body);
    console.log('Recibido:', data);

    const result = await addLeadToSheet(data);

    if (result.success) {
      console.log('✓ Lead guardado en Sheets');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true })
      };
    } else {
      console.error('Error:', result.error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify(result)
      };
    }
  } catch(e) {
    console.error('Error:', e);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: e.toString() })
    };
  }
};
