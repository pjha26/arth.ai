import { google } from "googleapis";
import { Readable } from "stream";

function getAuth() {
  const credentials = {
    type: "service_account",
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  };
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  });
}

/**
 * Uploads a PDF Buffer to Google Drive and returns a shareable link.
 */
export async function driveUpload(lead, pdfBuffer, jobId) {
  const auth = getAuth();
  const drive = google.drive({ version: "v3", auth });

  const fileName = `${lead.companyName.replace(/[^a-z0-9]/gi, "-")}-arth-audit-${jobId.slice(0, 8)}.pdf`;

  const stream = Readable.from(pdfBuffer);

  const { data: file } = await drive.files.create({
    requestBody: {
      name: fileName,
      mimeType: "application/pdf",
      parents: process.env.GOOGLE_DRIVE_FOLDER_ID
        ? [process.env.GOOGLE_DRIVE_FOLDER_ID]
        : undefined,
    },
    media: {
      mimeType: "application/pdf",
      body: stream,
    },
    fields: "id,webViewLink",
  });

  // Make the file publicly viewable
  await drive.permissions.create({
    fileId: file.id,
    requestBody: {
      role: "reader",
      type: "anyone",
    },
  });

  return file.webViewLink;
}
