import passport from "passport";
import {
  Strategy as GoogleStrategy,
  Profile,
  VerifyCallback,
} from "passport-google-oauth20";
import { GoogleUserDto } from "@/modules/auth/dtos/google-auth.dto";

export function initGoogleStrategy(): void {
  const clientID = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const callbackURL =
    process.env.GOOGLE_CALLBACK_URL ||
    "http://localhost:3000/api/account/auth/google/callback";

  if (!clientID || !clientSecret) {
    console.warn(
      "⚠️  GOOGLE_CLIENT_ID hoặc GOOGLE_CLIENT_SECRET chưa được cấu hình. " +
        "Google OAuth sẽ không hoạt động."
    );
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID,
        clientSecret,
        callbackURL,
        scope: ["email", "profile"],
      },
      async (
        _accessToken: string,
        _refreshToken: string,
        profile: Profile,
        done: VerifyCallback
      ) => {
        try {
          const googleUser: GoogleUserDto = {
            email: profile.emails?.[0]?.value ?? "",
            name: profile.displayName ?? "",
            avatar: profile.photos?.[0]?.value,
            googleId: profile.id,
          };

          if (!googleUser.email) {
            return done(new Error("Google profile thiếu email"), undefined);
          }

          done(null, googleUser);
        } catch (err) {
          done(err as Error, undefined);
        }
      }
    )
  );

  console.log("✅ Google OAuth strategy initialized");
}
