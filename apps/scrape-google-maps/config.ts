const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const getEnvVar = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
};

const CONFIG = {
  CITY_NAME: getEnvVar('CITY_NAME'),
  CITY_STATE: getEnvVar('CITY_STATE'),
  GOOGLE_API_KEY: getEnvVar('GOOGLE_API_KEY'),
  PROFESSION_NAME: getEnvVar('PROFESSION_NAME'),
} as const;

module.exports = { CONFIG };

