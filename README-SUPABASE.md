Supabase integration

Steps to configure and test Supabase integration locally:

1. Install new dependencies:

```bash
cd MiAppRentas
npm install @supabase/supabase-js react-native-get-random-values react-native-url-polyfill
```

2. Add your Supabase credentials to environment or Expo secrets:

Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` in your environment or use a `.env` solution.

3. Run the app with Expo:

```bash
npx expo start
```

Notes:
- React Native requires `react-native-url-polyfill` for `@supabase/supabase-js` to work correctly.
- For production, consider using secure storage for tokens.
