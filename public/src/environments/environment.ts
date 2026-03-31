const local =
  window.location.hostname.startsWith('30.') ||
  window.location.hostname === 'localhost';

export const environment = {
  production: false,
  apiURL: local ? 'localhost:3000' : 'tamminademoapps.com:9295',
};
