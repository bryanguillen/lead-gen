import type { PlacesApiResponse, Place, BusinessData } from './types';

const axios = require('axios');
const { createObjectCsvWriter } = require('csv-writer');
const fs = require('fs');
const path = require('path');
const { CONFIG } = require('./config');

const NO_WEBSITE = 'No Website';

const sleep = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

const parseTextQueries = (textQuery: string): string[] => {
  return textQuery
    .split(';')
    .map(query => query.trim())
    .filter(query => query.length > 0);
};

const fetchBusinessesForQuery = async (textQuery: string): Promise<Place[]> => {
  const url = 'https://places.googleapis.com/v1/places:searchText';

  const requestBody = {
    textQuery,
  };

  const response = await axios.post(url, requestBody, {
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': CONFIG.GOOGLE_API_KEY,
      'X-Goog-FieldMask':
        'places.displayName,places.addressComponents,places.rating,places.userRatingCount,places.websiteUri,places.googleMapsUri',
    },
  }) as { data: PlacesApiResponse };

  if (!response.data || !response.data.places) {
    console.warn(`No results found for query: "${textQuery}"`);
    return [];
  }

  return response.data.places;
};

const fetchAllBusinesses = async (textQueries: string[]): Promise<Place[]> => {
  const allPlaces: Place[] = [];
  
  console.log(`🔍 Processing ${textQueries.length} queries...`);
  
  for (let i = 0; i < textQueries.length; i++) {
    const query = textQueries[i];
    console.log(`📋 Query ${i + 1}/${textQueries.length}: "${query}"`);
    
    try {
      const places = await fetchBusinessesForQuery(query);
      allPlaces.push(...places);
      console.log(`   ✅ Found ${places.length} results`);
    } catch (error) {
      console.error(`   ❌ Error for query "${query}":`, error);
    }
    
    // Rate limiting: wait between requests (except for the last one)
    if (i < textQueries.length - 1) {
      console.log('   ⏳ Waiting 1 second before next query...');
      await sleep(1000);
    }
  }
  
  console.log(`📊 Total raw results: ${allPlaces.length}`);
  return allPlaces;
};

const parseBusinesses = (places: Place[]): BusinessData[] => {
  const getCity = (place: Place) => {
    const localityObject = (place.addressComponents || []).find(
      (component: any) => {
        return component.types && component.types.includes('locality');
      }
    );

    return localityObject?.longText || 'Unknown City';
  };

  // First, deduplicate by Google Maps URI
  const uniquePlaces = places.reduce((acc: Place[], current) => {
    const uri = current.googleMapsUri;
    if (!uri) return acc;
    
    const exists = acc.some(place => place.googleMapsUri === uri);
    if (!exists) {
      acc.push(current);
    }
    return acc;
  }, []);

  console.log(`🔧 Deduplication: ${places.length} → ${uniquePlaces.length} unique businesses`);

  // Then filter and transform
  const filtered = uniquePlaces.filter(
    (place) =>
      !!place.rating &&
      place.rating >= CONFIG.LOWER_BOUND &&
      !!place.userRatingCount &&
      place.userRatingCount <= CONFIG.UPPER_BOUND
  );

  console.log(`📊 After filtering: ${filtered.length} businesses meet criteria`);

  return filtered.map((place) => {
    const orgName = place.displayName?.text || 'Unknown Name';
    const city = getCity(place);
    const website = place.websiteUri || NO_WEBSITE;
    const facebookQuery = `https://www.google.com/search?q=${encodeURIComponent(`${orgName} ${city} facebook`)}`;

    return {
      orgName,
      city,
      facebookQuery,
      googleMapsUri: place.googleMapsUri || '',
      website,
      // Needed for CSV
      email: '',
      name: '',
    };
  });
};

const writeBusinessesToCsv = (businesses: BusinessData[]) => {
  const outputDir = path.join(__dirname, 'output');
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const leadsWithSite = businesses.filter((b) => b.website !== NO_WEBSITE);
  const leadsWithoutSite = businesses.filter((b) => b.website === NO_WEBSITE);

  const csvWriterWithSite = createObjectCsvWriter({
    path: path.join(outputDir, 'leads_with_site.csv'),
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
    path: path.join(outputDir, 'leads_without_site.csv'),
    header: [
      { id: 'city', title: 'city' },
      { id: 'name', title: 'org_name' },
      { id: 'googleMapsUri', title: 'google_maps_uri' },
      { id: 'facebookQuery', title: 'facebook_query' },
    ],
  });

  csvWriterWithSite
    .writeRecords(leadsWithSite)
    .then(() => console.log('Leads with site written successfully.'))
    .catch((err: any) => console.error('Error writing leads with site:', err));

  csvWriterWithoutSite
    .writeRecords(leadsWithoutSite)
    .then(() => console.log('Leads without site written successfully.'))
    .catch((err: any) => console.error('Error writing leads without site:', err));
};

module.exports = {
  parseTextQueries,
  fetchAllBusinesses,
  parseBusinesses,
  writeBusinessesToCsv,
};
