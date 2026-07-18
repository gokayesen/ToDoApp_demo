import passport from 'passport';
import { Strategy as GoogleStrategy, type Profile } from 'passport-google-oauth20';

import { loginOrRegisterWithGoogle } from '../services/auth.service.js';

export const isGoogleOAuthConfigured = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
);

if (isGoogleOAuthConfigured) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        callbackURL:
          process.env.GOOGLE_CALLBACK_URL ?? 'http://localhost:4000/auth/google/callback',
      },
      (_accessToken, _refreshToken, profile: Profile, done) => {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          done(new Error('Google account has no email'));
          return;
        }

        loginOrRegisterWithGoogle({
          providerAccountId: profile.id,
          email,
          emailVerified: Boolean(profile.emails?.[0]?.verified),
          name: profile.displayName,
          avatarUrl: profile.photos?.[0]?.value,
        })
          .then((session) => done(null, session))
          .catch(done);
      },
    ),
  );
}

export { passport };
