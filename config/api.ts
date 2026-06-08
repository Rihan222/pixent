export const API_CONFIG = {
  pexels: {
    baseUrl: "https://api.pexels.com",
    apiKey: process.env.EXPO_PUBLIC_PEXELS_API_KEY ?? "",
  },
  pixabay: {
    baseUrl: "https://pixabay.com/api",
    apiKey: process.env.EXPO_PUBLIC_PIXABAY_API_KEY ?? "",
  },
  freesound: {
    baseUrl: "https://freesound.org/apiv2",
    clientId: process.env.EXPO_PUBLIC_FREESOUND_CLIENT_ID ?? "",
    apiKey: process.env.EXPO_PUBLIC_FREESOUND_API_KEY ?? "",
  },
};

export const PAGE_SIZE = 20;
