const dotenv = require('dotenv');
const pathModule = require('path');

dotenv.config({ path: pathModule.join(__dirname, '.env') });

const getEnvVar = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
};

const CONFIG = {
  TEXT_QUERY: getEnvVar('TEXT_QUERY'),
  GOOGLE_API_KEY: getEnvVar('GOOGLE_API_KEY'),
  LOWER_BOUND: parseInt(getEnvVar('LOWER_BOUND')),
  UPPER_BOUND: parseInt(getEnvVar('UPPER_BOUND')),
} as const;

module.exports = { CONFIG };

