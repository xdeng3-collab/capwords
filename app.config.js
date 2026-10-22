/**
 * app.json holds the configuration; this file only adds checks that need code.
 *
 * Release guard: EXPO_PUBLIC_* values are inlined into the bundle, and a
 * DeepSeek key in a bundle is a key anyone can lift out of the app. So a
 * production build (expo export, an Xcode Release build, EAS) refuses to start
 * while EXPO_PUBLIC_DEEPSEEK_API_KEY is set. Put a development key in
 * .env.development.local, which production builds do not read; production AI
 * calls go through the ai-proxy Edge Function (EXPO_PUBLIC_API_URL).
 */
module.exports = ({ config }) => {
  if (process.env.NODE_ENV === 'production') {
    if (process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY) {
      throw new Error(
        'EXPO_PUBLIC_DEEPSEEK_API_KEY is set for a production build. It would ship inside the app. ' +
          'Remove it from .env (keep a dev key in .env.development.local) and set EXPO_PUBLIC_API_URL ' +
          'to the ai-proxy Edge Function instead.'
      );
    }
    if (!process.env.EXPO_PUBLIC_API_URL) {
      console.warn(
        'warning: EXPO_PUBLIC_API_URL is not set, so photo recognition will not work in this build.'
      );
    }
  }
  return config;
};
