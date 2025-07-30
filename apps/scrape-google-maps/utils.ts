import type { PlacesApiResponse, Place, BusinessData } from './types';

const axios = require('axios');
const { createObjectCsvWriter } = require('csv-writer');
const fs = require('fs');
const path = require('path');
const { CONFIG } = require('./config');

const NO_WEBSITE = 'No Website';

const fetchBusinesses = async (
  professionName: string,
  city: string,
  state: string
): Promise<Place[]> => {
  const url = 'https://places.googleapis.com/v1/places:searchText';

  const requestBody = {
    textQuery: `${professionName} in ${city}, ${state}`,
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
    console.warn(`No results found for ${city}`);
    return [];
  }

  return response.data.places;
};

const parseBusinesses = (places: Place[]): BusinessData[] => {
  const getCity = (place: Place) => {
    const localityObject = (place.addressComponents || []).find(
      (component: any) => {
        return component.types.includes('locality');
      }
    );

    return localityObject?.longText || 'Unknown City';
  };

  return places
    .filter(
      (place) =>
        !!place.rating &&
        place.rating >= 3.5 &&
        !!place.userRatingCount &&
        place.userRatingCount <= 150
    )
    .map((place) => {
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
  fetchBusinesses,
  parseBusinesses,
  writeBusinessesToCsv,
};
