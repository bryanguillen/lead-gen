import type { BusinessData } from './types';

const fs = require('fs');
const path = require('path');
const csvParser = require('csv-parser');
const { createObjectCsvWriter } = require('csv-writer');

const NO_WEBSITE = 'No Website';

const readCsvFile = (filePath: string): Promise<BusinessData[]> => {
  return new Promise((resolve, reject) => {
    const results: BusinessData[] = [];
    
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  File not found: ${filePath}`);
      resolve([]);
      return;
    }

    fs.createReadStream(filePath)
      .pipe(csvParser({
        mapHeaders: ({ header }: { header: string }) => {
          // Map CSV headers to our BusinessData interface
          const headerMap: Record<string, string> = {
            'org_name': 'orgName',
            'google_maps_uri': 'googleMapsUri',
            'facebook_query': 'facebookQuery'
          };
          return headerMap[header] || header;
        }
      }))
      .on('data', (data: BusinessData) => results.push(data))
      .on('end', () => {
        console.log(`📄 Read ${results.length} records from ${path.basename(filePath)}`);
        resolve(results);
      })
      .on('error', reject);
  });
};

const deduplicateBusinesses = (businesses: BusinessData[]): BusinessData[] => {
  console.log(`🔧 Starting deduplication on ${businesses.length} total records...`);
  
  const uniqueBusinesses = businesses.reduce((acc: BusinessData[], current) => {
    const uri = current.googleMapsUri;
    if (!uri) return acc;
    
    const exists = acc.some(business => business.googleMapsUri === uri);
    if (!exists) {
      acc.push(current);
    }
    return acc;
  }, []);

  console.log(`✅ Deduplication complete: ${businesses.length} → ${uniqueBusinesses.length} unique businesses`);
  return uniqueBusinesses;
};

const writeDeduplicatedCsv = (businesses: BusinessData[], outputDir: string) => {
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const leadsWithSite = businesses.filter((b) => b.website !== NO_WEBSITE);
  const leadsWithoutSite = businesses.filter((b) => b.website === NO_WEBSITE);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

  const csvWriterWithSite = createObjectCsvWriter({
    path: path.join(outputDir, `deduplicated_leads_with_site_${timestamp}.csv`),
    header: [
      { id: 'city', title: 'city' },
      { id: 'email', title: 'email' },
      { id: 'name', title: 'name' },
      { id: 'orgName', title: 'org_name' },
      { id: 'website', title: 'website' },
      { id: 'googleMapsUri', title: 'google_maps_uri' },
      { id: 'facebookQuery', title: 'facebook_query' },
    ],
  });

  const csvWriterWithoutSite = createObjectCsvWriter({
    path: path.join(outputDir, `deduplicated_leads_without_site_${timestamp}.csv`),
    header: [
      { id: 'city', title: 'city' },
      { id: 'orgName', title: 'org_name' },
      { id: 'googleMapsUri', title: 'google_maps_uri' },
      { id: 'facebookQuery', title: 'facebook_query' },
    ],
  });

  csvWriterWithSite
    .writeRecords(leadsWithSite)
    .then(() => console.log(`📄 Wrote ${leadsWithSite.length} deduplicated leads with sites`))
    .catch((err: any) => console.error('Error writing leads with site:', err));

  csvWriterWithoutSite
    .writeRecords(leadsWithoutSite)
    .then(() => console.log(`📄 Wrote ${leadsWithoutSite.length} deduplicated leads without sites`))
    .catch((err: any) => console.error('Error writing leads without site:', err));
};

const findCsvFiles = (directory: string): string[] => {
  if (!fs.existsSync(directory)) {
    console.error(`❌ Output directory not found: ${directory}`);
    return [];
  }

  const files = fs.readdirSync(directory);
  const csvFiles = files
    .filter((file: string) => file.endsWith('.csv'))
    .filter((file: string) => !file.includes('deduplicated')) // Skip already deduplicated files
    .map((file: string) => path.join(directory, file));

  return csvFiles;
};

async function main() {
  try {
    console.log('🚀 Starting deduplication process...');
    
    const outputDir = path.join(__dirname, 'output');
    const csvFiles = findCsvFiles(outputDir);

    if (csvFiles.length === 0) {
      console.log('📄 No CSV files found to deduplicate in output directory');
      return;
    }

    console.log(`📋 Found ${csvFiles.length} CSV files to process:`);
    csvFiles.forEach((file, index) => {
      console.log(`${index + 1}. ${path.basename(file)}`);
    });

    // Read all CSV files
    const allBusinessData: BusinessData[] = [];
    for (const csvFile of csvFiles) {
      const data = await readCsvFile(csvFile);
      allBusinessData.push(...data);
    }

    // Deduplicate
    const uniqueBusinesses = deduplicateBusinesses(allBusinessData);

    // Write deduplicated results
    writeDeduplicatedCsv(uniqueBusinesses, outputDir);

    console.log('✅ Deduplication completed successfully!');
  } catch (error) {
    console.error('❌ Error during deduplication:', error);
    process.exit(1);
  }
}

main(); 