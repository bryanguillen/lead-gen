const config = require('./config');
const {
  fetchBusinesses,
  parseBusinesses,
  writeBusinessesToCsv,
} = require('./utils');

async function main(professionName: string, city: string, state: string) {
  try {
    const rawBusinesses = await fetchBusinesses(professionName, city, state);
    const businesses = parseBusinesses(rawBusinesses);

    writeBusinessesToCsv(businesses);

    console.log('DONE!');
  } catch (error) {
    console.error('Error fetching data:', error);
    return [];
  }
}

main(config.CONFIG.PROFESSION_NAME, config.CONFIG.CITY_NAME, config.CONFIG.CITY_STATE);
