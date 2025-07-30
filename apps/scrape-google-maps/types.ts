export interface BusinessData {
  city: string;
  email: string;
  facebookQuery: string;
  googleMapsUri: string;
  name: string;
  orgName: string;
  website: string;
}

export interface Place {
  displayName?: { text: string };
  addressComponents?: any; // TODO: Map to Address Object
  rating?: number;
  userRatingCount?: number;
  websiteUri?: string;
  googleMapsUri?: string;
}

export interface PlacesApiResponse {
  places?: Place[];
}