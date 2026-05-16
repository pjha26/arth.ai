import { google } from "googleapis";

function getAuth() {
  const credentials = {
    type: "service_account",
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  };
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

/**
 * Appends a row to the Google Sheet tracking all leads.
 */
export async function sheetsLog(lead, status, submittedAt, driveLink = null) {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  const timestamp = new Date(submittedAt || Date.now()).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
  });

  const row = [
    timestamp,
    lead.fullName,
    lead.email,
    lead.companyName,
    lead.website,
    lead.industry,
    lead.companySize,
    status,
    driveLink || "—",
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    range: "Sheet1!A:I",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] },
  });
}

/**
 * Creates the header row if the sheet is empty.
 * Call this once during initial setup.
 */
export async function initializeSheet() {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  const headers = [
    "Timestamp",
    "Full Name",
    "Email",
    "Company",
    "Website",
    "Industry",
    "Company Size",
    "Report Status",
    "Drive Link",
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    range: "Sheet1!A1:I1",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [headers] },
  });
}
