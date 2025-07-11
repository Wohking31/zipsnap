// Centralized API functions
const BASE_URL = 'http://api.zippopotam.us';

export const fetchLocationByZip = async (countryCode, zipCode) => {
  const response = await fetch(`${BASE_URL}/${countryCode}/${zipCode}`);

  if (response.status === 404) {
    throw new Error('Location not found for this zip code');
  }

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  return response.json();
};

export const validateZipCode = (zipCode, countryCode = 'us') => {
  const patterns = {
    us: /^\d{5}(-\d{4})?$/,
    ca: /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/,
    de: /^\d{5}$/
  };

  return patterns[countryCode]?.test(zipCode) || false;
};