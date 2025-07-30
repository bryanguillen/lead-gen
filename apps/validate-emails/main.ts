const fs = require("fs");
const csvParser = require("csv-parser");
const { parse } = require("json2csv");
const verifier = require("email-verify");
const path = require("path");

const inputFile = path.join(__dirname, "input.csv");
const successFile = path.join(__dirname, "success.csv");
const failureFile = path.join(__dirname, "failure.csv");

// Helper to verify email via SMTP
const verifyEmail = (email: string): Promise<boolean> => {
  return new Promise((resolve) => {
    verifier.verify(email.trim(), { timeout: 5000, port: 25 }, (err: any, info: any) => {
      if (err) return resolve(false);
      resolve(info?.success || false);
    });
  });
};

(async () => {
  const rows: any[] = [];

  console.log(`📥 Reading ${inputFile}...`);
  await new Promise<void>((resolve) => {
    fs.createReadStream(inputFile)
      .pipe(csvParser())
      .on("data", (data: any) => rows.push(data))
      .on("end", () => resolve());
  });

  console.log(`🔍 Verifying ${rows.length} emails...`);
  const success: any[] = [];
  const failure: any[] = [];

  for (const row of rows) {
    const email = row.email;
    if (!email) {
      console.warn("⚠️ Missing email in row, skipping...");
      failure.push(row);
      continue;
    }

    try {
      const isValid = await verifyEmail(email);
      isValid ? success.push(row) : failure.push(row);
    } catch (err) {
      console.error(`❌ Error verifying ${email}`);
      failure.push(row);
    }
  }

  // Save results
  const fields = Object.keys(rows[0]);
  fs.writeFileSync(successFile, parse(success, { fields }), "utf8");
  fs.writeFileSync(failureFile, parse(failure, { fields }), "utf8");

  console.log(`✅ Done. ${success.length} valid, ${failure.length} invalid.`);
  console.log(`📄 success → ${successFile}`);
  console.log(`📄 failure → ${failureFile}`);
})();
