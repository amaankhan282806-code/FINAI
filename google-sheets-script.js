/**
 * FINAI — Google Apps Script for Google Sheets Integration
 * 
 * Instructions:
 * 1. Open Google Sheets (https://sheets.new) and create a new sheet named "FINAI Loan Applications".
 * 2. Rename the first tab to "Applications".
 * 3. Add these headers in Row 1:
 *    A1: Timestamp
 *    B1: Reference ID
 *    C1: Full Name
 *    D1: Employment Type
 *    E1: Monthly Salary (INR)
 *    F1: Credit Score
 *    G1: Existing EMI (INR)
 *    H1: Requested Amount (INR)
 *    I1: Tenure (Months)
 *    J1: Indicative Limit (INR)
 *    K1: Status
 *    L1: Health Score
 * 4. Go to Extensions -> Apps Script.
 * 5. Paste this entire file into the Apps Script editor.
 * 6. Click Deploy -> New deployment -> Select type: Web app.
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 7. Copy the Web App URL and paste into your FINAI/.env file or Vercel Environment Variables:
 *    GOOGLE_SHEETS_WEBHOOK_URL=https://script.google.com/macros/s/your_deployment_id/exec
 */

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Applications");
    if (!sheet) {
      sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    }

    var data = JSON.parse(e.postData.contents);

    sheet.appendRow([
      data.timestamp || new Date().toISOString(),
      data.referenceId || "N/A",
      data.fullName || "N/A",
      data.employmentType || "Salaried",
      data.monthlySalary || 0,
      data.creditScore || 0,
      data.existingEmi || 0,
      data.desiredLoanAmount || 0,
      data.loanTenureMonths || 0,
      data.indicativeEligibleAmount || 0,
      data.statusLabel || data.status || "N/A",
      data.healthScore || 0
    ]);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Application recorded successfully in Google Sheets",
      referenceId: data.referenceId
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "ping";

  if (action === "getApplications" || action === "read") {
    try {
      var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Applications");
      if (!sheet) {
        sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
      }
      var rows = sheet.getDataRange().getValues();
      var data = [];
      for (var i = 1; i < rows.length; i++) {
        var row = rows[i];
        if (row[1]) {
          data.push({
            timestamp: row[0],
            id: row[1],
            fullName: row[2],
            employmentType: row[3],
            monthlySalary: row[4],
            creditScore: row[5],
            existingEmi: row[6],
            desiredLoanAmount: row[7],
            loanTenureMonths: row[8],
            indicativeEligibleAmount: row[9],
            statusLabel: row[10],
            status: row[10],
            healthScore: row[11]
          });
        }
      }
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        count: data.length,
        data: data
      })).setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: err.toString()
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    service: "FINAI Google Sheets Webhook Sync",
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}
