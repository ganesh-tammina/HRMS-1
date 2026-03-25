const local =
  window.location.hostname.startsWith('30.') ||
  window.location.hostname === 'localhost';

export const environment = {
  production: true,

  apiURL: local ? 'localhost:3000' : 'tamminademoapps.com:9295',
  // apiURL: local ? '30.0.0.128:4201' : 'tamminademoapps.com:9295',
  // candidateURL: local ? '30.0.0.128:4201' : 'tamminademoapps.com:9295',
};
