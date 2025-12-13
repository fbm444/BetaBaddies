import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as LinkedInStrategy } from "passport-linkedin-oauth2";
import userService from "../services/userService.js";
import axios from "axios";

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await userService.getUserById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Google OAuth Strategy (only register if credentials are available)
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  // Construct full callback URL from BACKEND_URL if not explicitly set
  const googleCallbackUrl =
    process.env.GOOGLE_CALLBACK_URL ||
    (process.env.BACKEND_URL ||
      process.env.SERVER_URL ||
      "http://localhost:3001") + "/api/v1/users/auth/google/callback";

  // Warn if using localhost in production
  if (
    !process.env.GOOGLE_CALLBACK_URL &&
    !process.env.BACKEND_URL &&
    !process.env.SERVER_URL
  ) {
    console.warn(
      "⚠️ WARNING: BACKEND_URL not set! Google OAuth will redirect to localhost."
    );
    console.warn(
      "   Set BACKEND_URL or GOOGLE_CALLBACK_URL in your environment variables."
    );
    console.warn("   Current callback URL:", googleCallbackUrl);
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: googleCallbackUrl,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Extract email from Google profile
          const email = profile.emails[0].value;
          const googleId = profile.id;

          // First check if user exists with this Google ID
          let user = await userService.getUserByGoogleId(googleId);

          if (user) {
            // User exists with this Google ID
            return done(null, { id: user.u_id, email: user.email });
          }

          // Check if user exists with this email
          user = await userService.getUserByEmail(email);

          if (user) {
            // User exists but doesn't have Google ID linked
            if (!user.google_id) {
              // Link Google account to existing user
              await userService.linkGoogleAccount(user.u_id, googleId);
            }
            return done(null, { id: user.u_id, email: user.email });
          }

          // Create new user from Google OAuth
          const newUser = await userService.createOAuthUser({
            email,
            googleId,
          });

          return done(null, { id: newUser.id, email: newUser.email });
        } catch (error) {
          console.error("❌ OAuth error:", error);
          return done(error, null);
        }
      }
    )
  );
} else {
  console.log(
    "⚠️  Google OAuth credentials not found. Google login will be disabled."
  );
}

// LinkedIn OAuth Strategy (only register if credentials are available)
if (process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET) {
  // Construct full callback URL from BACKEND_URL if not explicitly set
  const linkedinCallbackUrl =
    process.env.LINKEDIN_CALLBACK_URL ||
    (process.env.BACKEND_URL ||
      process.env.SERVER_URL ||
      "http://localhost:3001") + "/api/v1/users/auth/linkedin/callback";

  // Create a custom strategy that overrides userProfile to use OpenID Connect UserInfo endpoint
  const linkedinStrategy = new LinkedInStrategy(
    {
      clientID: process.env.LINKEDIN_CLIENT_ID,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
      callbackURL: linkedinCallbackUrl,
      scope: ["openid", "profile", "email"],
    },
    async (accessToken, refreshToken, profile, done) => {
      // Store access token for manual fetching if needed
      console.log("🔑 LinkedIn OAuth - Access token received");
      console.log(
        "📦 LinkedIn OAuth - Profile object:",
        profile ? "exists" : "null"
      );

      // If profile is null/undefined, passport failed to fetch it
      // We'll fetch it manually using the access token
      if (!profile || (!profile.email && !profile.sub && !profile.id)) {
        console.log(
          "⚠️ Passport profile is incomplete, will fetch manually..."
        );
        // Continue with manual fetch - don't fail here
        // We'll handle it in the callback
      }
      try {
        // Handle case where passport package failed to fetch profile
        if (!profile) {
          console.log(
            "⚠️ Passport returned null profile, fetching manually from UserInfo endpoint..."
          );
        } else {
          console.log(
            "🔍 LinkedIn OAuth profile data:",
            JSON.stringify(profile, null, 2)
          );
          console.log(
            "🔍 LinkedIn OAuth _json:",
            JSON.stringify(profile?._json, null, 2)
          );
        }

        let email = null;
        let linkedinId = null;
        let firstName = null;
        let lastName = null;
        let profilePicture = null;
        let headline = null;

        // Always fetch from OpenID Connect UserInfo endpoint for reliable data
        // This is necessary because passport-linkedin-oauth2 may not support OpenID Connect properly
        console.log("🔍 Fetching LinkedIn profile from UserInfo endpoint...");
        if (!accessToken) {
          return done(
            new Error("No access token received from LinkedIn"),
            null
          );
        }

        try {
          // Fetch from OpenID Connect UserInfo endpoint
          const userInfoResponse = await axios.get(
            "https://api.linkedin.com/v2/userinfo",
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
            }
          );

          const userInfo = userInfoResponse.data;
          console.log(
            "✅ LinkedIn UserInfo data:",
            JSON.stringify(userInfo, null, 2)
          );

          // Extract OpenID Connect fields
          email = userInfo.email || null;
          linkedinId = userInfo.sub || null;
          firstName = userInfo.given_name || null;
          lastName = userInfo.family_name || null;
          profilePicture = userInfo.picture || null;

          // Fallback to passport profile if UserInfo doesn't have email/name
          if (!email && profile?.email) {
            email = profile.email;
          }
          if (!email && profile?.emails?.[0]?.value) {
            email = profile.emails[0].value;
          }

          if (!linkedinId && profile?.sub) {
            linkedinId = profile.sub;
          }
          if (!linkedinId && profile?.id) {
            linkedinId = profile.id;
          }

          if (!firstName && profile?.given_name) {
            firstName = profile.given_name;
          }
          if (!lastName && profile?.family_name) {
            lastName = profile.family_name;
          }

          if (!profilePicture && profile?.picture) {
            profilePicture = profile.picture;
          }

          // Try to get headline from profile API (not available in UserInfo)
          try {
            const profileResponse = await axios.get(
              "https://api.linkedin.com/v2/me",
              {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
                params: {
                  projection: "(headline)",
                },
              }
            );
            headline = profileResponse.data?.headline || null;
          } catch (headlineError) {
            console.warn("⚠️ Could not fetch headline:", headlineError.message);
            // Headline is optional, continue without it
          }
        } catch (userInfoError) {
          console.error(
            "❌ Error fetching UserInfo:",
            userInfoError.response?.status,
            userInfoError.response?.data || userInfoError.message
          );
          console.error(
            "❌ Full error:",
            JSON.stringify(
              userInfoError.response?.data || userInfoError.message,
              null,
              2
            )
          );

          // Check if it's a 401/403 error (token issue) or 404 (endpoint issue)
          if (
            userInfoError.response?.status === 401 ||
            userInfoError.response?.status === 403
          ) {
            return done(
              new Error(
                `LinkedIn authentication failed: Invalid or expired token. Status: ${userInfoError.response.status}`
              ),
              null
            );
          }

          if (userInfoError.response?.status === 404) {
            // Try alternative endpoint
            console.log(
              "⚠️ UserInfo endpoint not found, trying alternative..."
            );
            try {
              const altResponse = await axios.get(
                "https://api.linkedin.com/v2/me",
                {
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                  },
                  params: {
                    projection:
                      "(id,firstName,lastName,profilePicture(displayImage~:playableStreams))",
                  },
                }
              );
              console.log(
                "✅ Alternative endpoint worked:",
                JSON.stringify(altResponse.data, null, 2)
              );
              // Extract from alternative format
              linkedinId = altResponse.data.id || null;
              firstName =
                altResponse.data.firstName?.localized?.en_US ||
                altResponse.data.firstName?.preferredLocale?.language ||
                null;
              lastName =
                altResponse.data.lastName?.localized?.en_US ||
                altResponse.data.lastName?.preferredLocale?.language ||
                null;

              // Get email separately
              try {
                const emailResponse = await axios.get(
                  "https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))",
                  {
                    headers: {
                      Authorization: `Bearer ${accessToken}`,
                    },
                  }
                );
                email =
                  emailResponse.data?.elements?.[0]?.["handle~"]
                    ?.emailAddress || null;
              } catch (emailErr) {
                console.warn("⚠️ Could not fetch email:", emailErr.message);
              }
            } catch (altError) {
              console.error(
                "❌ Alternative endpoint also failed:",
                altError.message
              );
            }
          }

          // Fallback to passport profile data if UserInfo fails
          if (!email || !linkedinId) {
            console.log("⚠️ Falling back to passport profile data...");
            email =
              profile?.email ||
              (profile?.emails && profile.emails[0]
                ? profile.emails[0].value
                : null) ||
              profile?._json?.email ||
              null;

            linkedinId =
              profile?.sub || profile?.id || profile?._json?.sub || null;

            if (profile?.given_name || profile?.family_name) {
              firstName = profile.given_name || null;
              lastName = profile.family_name || null;
            } else if (profile?.name) {
              firstName =
                profile.name.givenName ||
                (profile.name.localized && profile.name.localized.en_US) ||
                null;
              lastName =
                profile.name.familyName ||
                (profile.name.localized && profile.name.localized.en_US) ||
                null;
            }

            if (!firstName && profile?.displayName) {
              const nameParts = profile.displayName.split(" ");
              firstName = nameParts[0] || null;
              lastName = nameParts.slice(1).join(" ") || null;
            }

            profilePicture =
              profile?.picture ||
              (profile?.photos && profile.photos[0]
                ? profile.photos[0].value
                : null) ||
              null;

            headline =
              profile?.headline ||
              profile?._json?.headline ||
              profile?._json?.tagline ||
              null;
          }

          // If still no data, return error
          if (!email || !linkedinId) {
            return done(
              new Error(
                `Failed to fetch LinkedIn profile. UserInfo error: ${
                  userInfoError.message
                }. Status: ${userInfoError.response?.status || "unknown"}`
              ),
              null
            );
          }
        }

        if (!email) {
          return done(
            new Error("LinkedIn profile does not include email address"),
            null
          );
        }

        // First check if user exists with this LinkedIn ID
        let user = await userService.getUserByLinkedInId(linkedinId);

        if (user) {
          // User exists with this LinkedIn ID - update tokens
          await userService.updateLinkedInTokens(
            user.u_id,
            accessToken,
            refreshToken
          );
          return done(null, { id: user.u_id, email: user.email });
        }

        // Check if user exists with this email
        user = await userService.getUserByEmail(email);

        if (user) {
          // User exists but doesn't have LinkedIn ID linked
          if (!user.linkedin_id) {
            // Link LinkedIn account to existing user
            await userService.linkLinkedInAccount(
              user.u_id,
              linkedinId,
              accessToken,
              refreshToken,
              firstName,
              lastName,
              profilePicture,
              headline
            );
          } else {
            // Update tokens for existing LinkedIn user
            await userService.updateLinkedInTokens(
              user.u_id,
              accessToken,
              refreshToken
            );
          }
          return done(null, { id: user.u_id, email: user.email });
        }

        // Create new user from LinkedIn OAuth
        const newUser = await userService.createLinkedInOAuthUser({
          email,
          linkedinId,
          firstName,
          lastName,
          profilePicture,
          headline,
          accessToken,
          refreshToken,
        });

        return done(null, { id: newUser.id, email: newUser.email });
      } catch (error) {
        console.error("❌ LinkedIn OAuth error:", error);
        return done(error, null);
      }
    }
  );

  // Override the userProfile method to use OpenID Connect UserInfo endpoint
  linkedinStrategy.userProfile = async function (accessToken, done) {
    try {
      console.log("🔍 Fetching profile from LinkedIn UserInfo endpoint...");

      // Fetch from OpenID Connect UserInfo endpoint
      const userInfoResponse = await axios.get(
        "https://api.linkedin.com/v2/userinfo",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      const userInfo = userInfoResponse.data;
      console.log(
        "✅ LinkedIn UserInfo received:",
        JSON.stringify(userInfo, null, 2)
      );

      // Transform OpenID Connect format to passport profile format
      const profile = {
        provider: "linkedin",
        id: userInfo.sub,
        displayName:
          userInfo.name ||
          `${userInfo.given_name || ""} ${userInfo.family_name || ""}`.trim(),
        name: {
          familyName: userInfo.family_name,
          givenName: userInfo.given_name,
        },
        emails: userInfo.email
          ? [{ value: userInfo.email, type: "account" }]
          : [],
        photos: userInfo.picture ? [{ value: userInfo.picture }] : [],
        _json: userInfo,
      };

      return done(null, profile);
    } catch (error) {
      console.error(
        "❌ Error fetching UserInfo:",
        error.response?.status,
        error.response?.data || error.message
      );
      return done(
        new Error(`Failed to fetch LinkedIn profile: ${error.message}`),
        null
      );
    }
  };

  passport.use(linkedinStrategy);
} else {
  console.log(
    "⚠️  LinkedIn OAuth credentials not found. LinkedIn login will be disabled."
  );
}

export default passport;
