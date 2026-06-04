export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? "",
  TEST_UNLOCK_PRICE_PENCE: process.env.TEST_UNLOCK_PRICE_PENCE ? parseInt(process.env.TEST_UNLOCK_PRICE_PENCE, 10) : null,
  KLAVIYO_API_KEY: process.env.KLAVIYO_API_KEY ?? "",
};
