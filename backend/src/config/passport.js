import dotenv from "dotenv";
dotenv.config();

import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import { User } from "../models/userModel.js";

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.SERVER_URL}/api/v1/users/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          user = await User.findOne({ email: profile.emails[0].value });

          if (user) {
            user.googleId = profile.id;
            await user.save();
          } else {
            user = await User.create({
              name: profile.displayName,
              username: profile.emails[0].value.split("@")[0] + "_" + profile.id.slice(-4),
              email: profile.emails[0].value,
              googleId: profile.id,
              avatar: profile.photos?.[0]?.value,
            });
          }
        }

        done(null, user);
      } catch (err) {
        done(err, null);
      }
    }
  )
);

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: `${process.env.SERVER_URL}/api/v1/users/auth/github/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ githubId: profile.id });

        if (!user) {
          const email =
            profile.emails?.[0]?.value || `${profile.username}@github.noemail.com`;

          user = await User.findOne({ email });

          if (user) {
            user.githubId = profile.id;
            await user.save();
          } else {
            user = await User.create({
              name: profile.displayName || profile.username,
              username: profile.username + "_" + profile.id.toString().slice(-4),
              email,
              githubId: profile.id,
              avatar: profile.photos?.[0]?.value,
            });
          }
        }

        done(null, user);
      } catch (err) {
        done(err, null);
      }
    }
  )
);

export default passport;