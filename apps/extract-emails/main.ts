const fsLib = require("fs");
const axiosLib = require("axios");
const csvParserLib = require("csv-parser");
const { parse: parseJson2Csv } = require("json2csv");
const cheerio = require("cheerio");
const pathLib = require("path");

const inputFilePath = pathLib.join(__dirname, "input.csv");
const outputFilePath = pathLib.join(__dirname, "results.csv");

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/gi;

const extractEmailsFromHTML = (html: string) => {
  const matches = html.match(EMAIL_REGEX);
  return matches || [];
};

const tryFetch = async (url: string) => {
  try {
    const response = await axiosLib.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 8000,
    });
    return response.data;
  } catch {
    return null;
  }
};

const buildURLs = (base: string) => {
  const url = base.endsWith("/") ? base.slice(0, -1) : base;
  return [url, url + "/contact", url + "/about"];
};

(async () => {
  const rows: any[] = [];

  console.log(`📥 Reading ${inputFilePath}...`);
  await new Promise<void>((resolve) => {
    fsLib.createReadStream(inputFilePath)
      .pipe(csvParserLib())
      .on("data", (data: any) => rows.push(data))
      .on("end", () => resolve());
  });

  console.log(`🔍 Processing ${rows.length} websites...`);
  const results = [];

  for (const row of rows) {
    const website = row.website?.trim();

    if (!website) {
      row.status = "invalid_website";
      row.reason = "Missing website";
      results.push(row);
      continue;
    }

    const urlPrefix = website.startsWith("http") ? website : `https://${website}`;
    const urlsToTry = buildURLs(urlPrefix);
    let foundEmails: string[] = [];

    for (const url of urlsToTry) {
      const html = await tryFetch(url);
      if (html) {
        const $ = cheerio.load(html);
        const text = $("body").text();
        foundEmails = extractEmailsFromHTML(text);
        if (foundEmails.length > 0) break;
      }
    }

    if (foundEmails.length > 0) {
      row.email = foundEmails[0];
      row.status = "success";
    } else {
      row.status = "no_email";
      row.reason = "No email found on site";
    }

    results.push(row);
  }

  const allFields = Object.keys(rows[0]);
  const extraFields = ["email", "status", "reason"];
  const fields = Array.from(new Set([...allFields, ...extraFields]));

  fsLib.writeFileSync(outputFilePath, parseJson2Csv(results, { fields }), "utf8");

  console.log(`✅ Done. Results written to ${outputFilePath}`);
})();
