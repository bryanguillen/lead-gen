const config = require('./config');
const {
  parseTextQueries,
  fetchAllBusinesses,
  parseBusinesses,
  writeBusinessesToCsv,
} = require('./utils');

async function main(textQuery: string) {
  try {
    console.log('🚀 Starting lead generation...');
    console.log(`📝 Text Query: "${textQuery}"`);

    // Parse the semicolon-delimited queries
    const queries = parseTextQueries(textQuery);
    console.log(`📋 Parsed into ${queries.length} individual queries`);

    // Fetch businesses from all queries
    const rawBusinesses = await fetchAllBusinesses(queries);
    
    // Parse and deduplicate businesses
    const businesses = parseBusinesses(rawBusinesses);

    // Write to CSV files
    writeBusinessesToCsv(businesses);

    console.log('✅ DONE!');
  } catch (error) {
    console.error('❌ Error fetching data:', error);
    process.exit(1);
  }
}

main(config.CONFIG.TEXT_QUERY);
