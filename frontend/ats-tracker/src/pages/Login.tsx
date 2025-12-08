import { useState, FormEvent, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Icon } from "@iconify/react";
import { api } from "@/services/api";
import { ROUTES } from "@/config/routes";
import loginSvg from "@/assets/login.svg";

export function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("invite") || sessionStorage.getItem("pendingInvitationToken");
  const familyInviteToken = searchParams.get("familyInvite") || sessionStorage.getItem("pendingFamilyInvitationToken");
  const emailFromInvite = searchParams.get("email");
  
  const [email, setEmail] = useState(emailFromInvite || "");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invitationInfo, setInvitationInfo] = useState<any>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is logged in
    const checkAuth = async () => {
      try {
        const response = await api.getUserAuth();
        if (response.ok && response.data?.user) {
          setIsLoggedIn(true);
          setCurrentUserEmail(response.data.user.email);
          
          // If logged in and there's an invitation token, check email match
          if (inviteToken) {
            const invitation = await api.getInvitationByToken(inviteToken);
            if (invitation.ok && invitation.data?.invitation) {
              const invitationEmail = invitation.data.invitation.email?.toLowerCase();
              const currentEmail = response.data.user.email.toLowerCase();
              
              // If emails don't match, redirect to invitation accept page which handles this properly
              if (invitationEmail && currentEmail !== invitationEmail) {
                navigate(`${ROUTES.TEAM_INVITE_ACCEPT}?token=${inviteToken}`);
                return;
              }
            }
          }
          
          // Handle family invitation
          if (familyInviteToken) {
            const invitation = await api.getFamilyInvitationByToken(familyInviteToken);
            if (invitation.ok && invitation.data?.invitation) {
              const invitationEmail = invitation.data.invitation.email?.toLowerCase();
              const currentEmail = response.data.user.email.toLowerCase();
              
              if (invitationEmail && currentEmail !== invitationEmail) {
                navigate(`${ROUTES.FAMILY_INVITE_ACCEPT}?token=${familyInviteToken}`);
                return;
              }
            }
          }
        }
      } catch (err) {
        // User is not logged in
        setIsLoggedIn(false);
      }
    };
    checkAuth();

    // If there's an invitation token, fetch invitation details
    if (inviteToken) {
      fetchInvitationInfo();
    } else if (familyInviteToken) {
      fetchFamilyInvitationInfo();
    }
  }, [inviteToken, familyInviteToken, navigate]);

  const fetchInvitationInfo = async () => {
    try {
      const response = await api.getInvitationByToken(inviteToken!);
      if (response.ok && response.data) {
        setInvitationInfo(response.data.invitation);
        // Pre-fill email if not already set
        if (!email && response.data.invitation.email) {
          setEmail(response.data.invitation.email);
        }
      }
    } catch (err) {
      console.error("Failed to fetch invitation info:", err);
    }
  };

  const fetchFamilyInvitationInfo = async () => {
    try {
      const response = await api.getFamilyInvitationByToken(familyInviteToken!);
      if (response.ok && response.data) {
        setInvitationInfo(response.data.invitation);
        // Pre-fill email if not already set
        if (!email && response.data.invitation.email) {
          setEmail(response.data.invitation.email);
        }
      }
    } catch (err) {
      console.error("Failed to fetch family invitation info:", err);
    }
  };

  const handleGoogleLogin = () => {
    // Redirect to backend Google OAuth endpoint
    // Use full backend URL in production, relative in development (proxy handles it)
    const apiBase = import.meta.env.VITE_API_URL || "/api/v1";
    window.location.href = `${apiBase}/users/auth/google`;
  };

  const handleLinkedInLogin = () => {
    // Redirect to backend LinkedIn OAuth endpoint
    // Use full backend URL in production, relative in development (proxy handles it)
    const apiBase = import.meta.env.VITE_API_URL || "/api/v1";
    window.location.href = `${apiBase}/users/auth/linkedin`;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Validate inputs
    if (!email.trim()) {
      setError("Please enter your email address");
      setIsLoading(false);
      return;
    }

    if (!password.trim()) {
      setError("Please enter your password");
      setIsLoading(false);
      return;
    }

    // CRITICAL: If user is logged in with different email and there's an invitation, prevent login
    if (isLoggedIn && currentUserEmail && inviteToken && invitationInfo) {
      const emailMatches = currentUserEmail.toLowerCase() === invitationInfo.email?.toLowerCase();
      if (!emailMatches) {
        setError(`You're currently logged in as ${currentUserEmail}, but this invitation is for ${invitationInfo.email}. Please log out first before logging in with the correct account.`);
        setIsLoading(false);
        return;
      }
    }

    try {
      const loginResponse = await api.login(email, password);
      console.log("Login successful:", loginResponse);
      
      // If there's a pending family invitation, accept it
      if (familyInviteToken) {
        try {
          // Verify email matches invitation before accepting
          if (invitationInfo && email.toLowerCase() !== invitationInfo.email?.toLowerCase()) {
            setError(`Email mismatch: This invitation is for ${invitationInfo.email}, but you logged in with ${email}.`);
            setIsLoading(false);
            return;
          }
          
          const inviteResponse = await api.acceptFamilyInvitation(familyInviteToken);
          sessionStorage.removeItem("pendingFamilyInvitationToken");
          sessionStorage.removeItem("accountType");
          
          // For existing users logging in, redirect to regular dashboard
          // The family relationship is now linked
          window.location.href = ROUTES.DASHBOARD;
          return;
        } catch (inviteErr: any) {
          console.error("Failed to accept family invitation:", inviteErr);
          // If email mismatch error, show it to user
          if (inviteErr.message?.includes("Email does not match invitation")) {
            setError(`Email mismatch: This invitation is for ${invitationInfo?.email}, but you logged in with ${email}. Please log in with the correct email.`);
            setIsLoading(false);
            return;
          }
          // Continue to dashboard even if invitation acceptance fails for other reasons
        }
      }
      
      // If there's a pending team invitation, accept it
      if (inviteToken) {
        try {
          // Verify email matches invitation before accepting
          if (invitationInfo && email.toLowerCase() !== invitationInfo.email?.toLowerCase()) {
            setError(`Email mismatch: This invitation is for ${invitationInfo.email}, but you logged in with ${email}.`);
            setIsLoading(false);
            return;
          }
          
          const inviteResponse = await api.acceptTeamInvitation(inviteToken);
          sessionStorage.removeItem("pendingInvitationToken");
          // Check if the invitation role is mentor/career_coach and redirect to mentor dashboard
          if (inviteResponse?.data?.team?.userRole === "mentor" || inviteResponse?.data?.team?.userRole === "career_coach") {
            window.location.href = ROUTES.MENTOR_DASHBOARD;
          } else {
            window.location.href = ROUTES.TEAMS;
          }
          return;
        } catch (inviteErr: any) {
          console.error("Failed to accept invitation:", inviteErr);
          // If email mismatch error, show it to user
          if (inviteErr.message?.includes("Email does not match invitation")) {
            setError(`Email mismatch: This invitation is for ${invitationInfo?.email}, but you logged in with ${email}. Please log in with the correct email.`);
            setIsLoading(false);
            return;
          }
          // Continue to dashboard even if invitation acceptance fails for other reasons
        }
      }
      
      // Try to get account type, but don't fail if it doesn't work
      // The session cookie might need a moment to be available
      let userAccountType = 'regular';
      try {
        const authResponse = await api.getUserAuth();
        userAccountType = authResponse.data?.user?.accountType || 'regular';
        console.log("Account type retrieved:", userAccountType);
      } catch (authErr: any) {
        console.warn("Could not fetch user auth after login (this is OK, will redirect anyway):", authErr);
        // Use account type from login response if available
        if (loginResponse?.data?.user?.accountType) {
          userAccountType = loginResponse.data.user.accountType;
        }
      }
      
      // Redirect to dashboard on success - use window.location for full page reload
      // Small delay to ensure session cookie is set
      setTimeout(() => {
        if (userAccountType === 'family_only') {
          console.log("Login successful, redirecting to:", ROUTES.FAMILY_ONLY_DASHBOARD);
          window.location.href = ROUTES.FAMILY_ONLY_DASHBOARD;
        } else {
          console.log("Login successful, redirecting to:", ROUTES.DASHBOARD);
          window.location.href = ROUTES.DASHBOARD;
        }
      }, 100);
    } catch (err: any) {
      // Provide more specific error messages
      let errorMessage = "Authentication failed";

      if (err.status === 401) {
        errorMessage =
          "Invalid email or password. Please check your credentials and try again.";
      } else if (err.code === "INVALID_CREDENTIALS") {
        errorMessage =
          "The email or password you entered is incorrect. Please try again.";
      } else if (err.status === 429) {
        errorMessage =
          "Too many login attempts. Please wait a moment and try again.";
      } else if (err.message) {
        errorMessage = err.message;
      } else {
        errorMessage =
          "Unable to connect to the server. Please check your internet connection.";
      }

      setError(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Section - Gradient Background with Login Form */}
      <div
        className="flex-[0.35] flex flex-col justify-center items-center px-8 lg:px-16 min-h-screen lg:min-h-auto"
        style={{
          background: "linear-gradient(to right, #EC85CA, #3351FD)",
          borderRadius: "0 50px 50px 0",
        }}
      >
        {/* Welcome Section */}
        <div className="mb-8 lg:mb-12 text-left w-full max-w-md">
          <h1
            className="text-white mb-2 lg:mb-3"
            style={{
              fontFamily: "Poppins, sans-serif",
              fontWeight: 700,
              fontSize: "clamp(32px, 5vw, 64px)",
            }}
          >
            Welcome!
          </h1>
          <p
            className="text-white"
            style={{
              fontFamily: "Poppins, sans-serif",
              fontWeight: 600,
              fontSize: "48px",
            }}
          >
            Ready to get started?
          </p>
        </div>

        {/* Login Form Card */}
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
          {/* Title */}
          <h2
            className="text-black mb-6"
            style={{
              fontFamily: "Poppins, sans-serif",
              fontWeight: 500,
              fontSize: "36px",
            }}
          >
            Log In
          </h2>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border-2 border-red-300 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center gap-2 animate-shake">
              <Icon icon="mingcute:alert-line" width={20} height={20} />
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}

          {/* Invitation Banner - Enhanced */}
          {invitationInfo && (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-300 rounded-lg p-5 mb-6">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Icon icon="mingcute:user-group-line" width={24} className="text-blue-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-blue-900 mb-2">
                    Team Invitation
                  </h3>
                  <p className="text-sm font-semibold text-slate-900 mb-2">
                    You've been invited to join <span className="text-blue-700">{invitationInfo.teamName}</span>
                  </p>
                  <div className="space-y-1.5 text-xs text-slate-700">
                    {invitationInfo.inviterName && (
                      <div className="flex items-center gap-2">
                        <Icon icon="mingcute:user-line" width={14} className="text-slate-500" />
                        <span>Invited by <span className="font-medium">{invitationInfo.inviterName}</span></span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Icon icon="mingcute:briefcase-line" width={14} className="text-slate-500" />
                      <span>Role: <span className="font-medium capitalize">{invitationInfo.role}</span></span>
                    </div>
                    {invitationInfo.expiresAt && (
                      <div className="flex items-center gap-2">
                        <Icon icon="mingcute:time-line" width={14} className="text-slate-500" />
                        <span>Expires: {new Date(invitationInfo.expiresAt).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-black mb-2"
                style={{
                  fontFamily: "Poppins, sans-serif",
                  fontWeight: 500,
                  fontSize: "18px",
                }}
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                required
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all placeholder-gray-600"
                placeholder="Enter your email"
                disabled={isLoading}
                style={{
                  fontFamily: "Poppins, sans-serif",
                  fontWeight: 500,
                  fontSize: "16px",
                  color: "#000000",
                }}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-black mb-2"
                style={{
                  fontFamily: "Poppins, sans-serif",
                  fontWeight: 500,
                  fontSize: "18px",
                }}
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                required
                minLength={8}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all placeholder-gray-600"
                placeholder="Enter your password"
                disabled={isLoading}
                style={{
                  fontFamily: "Poppins, sans-serif",
                  fontWeight: 500,
                  fontSize: "16px",
                  color: "#000000",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full text-white py-3 font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{
                background: "linear-gradient(to right, #6A94EE, #916BE3)",
                fontFamily: "Poppins, sans-serif",
                fontWeight: 500,
                fontSize: "22px",
                borderRadius: "15px",
              }}
            >
              {isLoading ? (
                <>
                  <Icon
                    icon="mingcute:loading-line"
                    width={20}
                    height={20}
                    className="animate-spin"
                  />
                  <span>Signing in...</span>
                </>
              ) : (
                "LOG IN"
              )}
            </button>
            <button
              type="button"
              onClick={() => navigate(ROUTES.FORGOT_PASSWORD)}
              className="w-full text-purple-600 hover:text-purple-700 font-semibold hover:underline text-center py-2"
              style={{ fontFamily: "Poppins, sans-serif" }}
            >
              Reset Password
            </button>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span
                  className="bg-white px-4 text-gray-500"
                  style={{ fontFamily: "Poppins, sans-serif" }}
                >
                  Or continue with
                </span>
              </div>
            </div>

            {/* Google OAuth Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full text-white py-3 font-semibold hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 border border-gray-300 rounded-lg"
              style={{
                background: "#fff",
                color: "#4285F4",
                fontFamily: "Poppins, sans-serif",
                fontWeight: 500,
                fontSize: "16px",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </button>

            {/* LinkedIn OAuth Button */}
            <button
              type="button"
              onClick={handleLinkedInLogin}
              className="w-full text-white py-3 font-semibold hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 border border-gray-300 rounded-lg"
              style={{
                background: "#0077B5",
                color: "#fff",
                fontFamily: "Poppins, sans-serif",
                fontWeight: 500,
                fontSize: "16px",
              }}
              disabled={isLoading}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
              Continue with LinkedIn
            </button>
          </form>

          {/* Register Link */}
          <div className="mt-6 text-center">
            <p
              className="text-gray-600"
              style={{ fontFamily: "Poppins, sans-serif" }}
            >
              Don't have an account?{" "}
              <Link
                to={ROUTES.REGISTER}
                className="text-purple-600 hover:text-purple-700 font-semibold hover:underline"
              >
                Sign Up
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right Section - SVG Illustration */}
      <div className="flex-[0.65] bg-white flex items-center justify-center p-8 hidden lg:flex">
        <img
          src={loginSvg}
          alt="Login Illustration"
          className="w-2/3 h-auto object-contain"
        />
      </div>
    </div>
  );
}
