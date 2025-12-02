import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Icon } from "@iconify/react";
import { api } from "../services/api";
import { ROUTES } from "../config/routes";

export function FamilyInviteAccept() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [invitation, setInvitation] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [showLogoutPrompt, setShowLogoutPrompt] = useState(false);

  useEffect(() => {
    if (token) {
      // Store token in sessionStorage immediately
      sessionStorage.setItem("pendingFamilyInvitationToken", token);
      checkAuthAndFetchInvitation();
    } else {
      setError("Invalid invitation link");
      setIsLoading(false);
      setIsCheckingAuth(false);
    }
  }, [token]);

  const checkAuthAndFetchInvitation = async () => {
    try {
      // Check if user is logged in
      try {
        const authResponse = await api.getUserAuth();
        if (authResponse.ok && authResponse.data?.user) {
          setIsLoggedIn(true);
          setCurrentUserEmail(authResponse.data.user.email);
        } else {
          setIsLoggedIn(false);
        }
      } catch (authErr: any) {
        // 401 is expected when user is not logged in
        if (authErr.status !== 401) {
          console.error("Auth check error:", authErr);
        }
        setIsLoggedIn(false);
      }
    } catch (err) {
      setIsLoggedIn(false);
    } finally {
      setIsCheckingAuth(false);
      await fetchInvitation();
    }
  };

  const fetchInvitation = async () => {
    try {
      setIsLoading(true);
      const response = await api.getFamilyInvitationByToken(token!);
      if (response.ok && response.data) {
        setInvitation(response.data.invitation);
        if (response.data.invitation.status !== "pending") {
          if (response.data.invitation.status === "expired") {
            setError("This invitation has expired.");
          } else if (response.data.invitation.status === "accepted") {
            setError("This invitation has already been accepted.");
          } else {
            setError("This invitation is no longer valid.");
          }
        }
      } else {
        setError("Invitation not found or invalid.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load invitation details.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = () => {
    // If logged in and email doesn't match, show logout prompt
    if (isLoggedIn && currentUserEmail) {
      const emailMatches = currentUserEmail.toLowerCase() === invitation?.email?.toLowerCase();
      if (!emailMatches) {
        setShowLogoutPrompt(true);
        return;
      }
    }

    // Store invitation token in sessionStorage
    if (token) {
      sessionStorage.setItem("pendingFamilyInvitationToken", token);
      sessionStorage.setItem("accountType", "family_only"); // Mark as family-only account
    }
    // Navigate to register page
    const registerUrl = invitation?.email
      ? `${ROUTES.REGISTER}?email=${encodeURIComponent(invitation.email)}&familyInvite=${token}`
      : `${ROUTES.REGISTER}?familyInvite=${token}`;
    window.location.href = registerUrl;
  };

  const handleAcceptWithCurrentAccount = async () => {
    if (!token) return;
    
    try {
      setIsLoading(true);
      const response = await api.acceptFamilyInvitation(token);
      
      if (response.ok) {
        // For existing users, redirect to their regular dashboard
        // The family relationship is now linked, they can access family features from their dashboard
        window.location.href = ROUTES.DASHBOARD;
      } else {
        setError(response.error?.message || "Failed to accept invitation. Please try again.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to accept invitation. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogoutAndContinue = async () => {
    try {
      setIsLoading(true);
      await api.logout();
      setShowLogoutPrompt(false);
      setIsLoggedIn(false);
      setCurrentUserEmail(null);
      if (token) {
        sessionStorage.setItem("pendingFamilyInvitationToken", token);
        sessionStorage.setItem("accountType", "family_only");
      }
      setIsLoading(false);
      window.location.reload();
    } catch (err: any) {
      setError(err.message || "Failed to log out. Please try again.");
      setIsLoading(false);
    }
  };

  const handleLogin = () => {
    // Store invitation token for after login
    if (token) {
      sessionStorage.setItem("pendingFamilyInvitationToken", token);
    }
    const loginUrl = invitation?.email
      ? `${ROUTES.LOGIN}?email=${encodeURIComponent(invitation.email)}&familyInvite=${token}`
      : `${ROUTES.LOGIN}?familyInvite=${token}`;
    window.location.href = loginUrl;
  };

  if (isCheckingAuth || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Icon icon="mingcute:loading-line" className="animate-spin text-4xl text-blue-600 mb-4 mx-auto" />
          <p className="text-gray-600">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <Icon icon="mingcute:close-circle-line" className="text-6xl text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Invitation</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate(ROUTES.LANDING)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  const inviterName = invitation?.inviter_first_name && invitation?.inviter_last_name
    ? `${invitation.inviter_first_name} ${invitation.inviter_last_name}`
    : invitation?.inviter_email || "a family member";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-pink-100 rounded-full mb-4">
            <Icon icon="mingcute:heart-line" width={32} className="text-pink-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Family Support Invitation</h1>
          <p className="text-slate-600">
            You've been invited to provide support and encouragement
          </p>
        </div>

        <div className="bg-slate-50 rounded-lg p-6 mb-6 space-y-4">
          <div>
            <div className="text-sm font-medium text-slate-700 mb-1">Invited by</div>
            <div className="text-lg font-semibold text-slate-900">{inviterName}</div>
            {invitation?.inviter_email && (
              <div className="text-sm text-slate-600">{invitation.inviter_email}</div>
            )}
          </div>

          {invitation?.relationship && (
            <div>
              <div className="text-sm font-medium text-slate-700 mb-1">Relationship</div>
              <span className="inline-block px-3 py-1 bg-pink-100 text-pink-800 rounded-full text-sm font-medium capitalize">
                {invitation.relationship}
              </span>
            </div>
          )}

          <div>
            <div className="text-sm font-medium text-slate-700 mb-1">Invitation Email</div>
            <div className="text-slate-900">{invitation?.email}</div>
          </div>

          <div>
            <div className="text-sm font-medium text-slate-700 mb-1">Expires</div>
            <div className="text-slate-600">
              {invitation?.expires_at
                ? new Date(invitation.expires_at).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "N/A"}
            </div>
          </div>
        </div>

        <div className="bg-pink-50 border border-pink-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <Icon icon="mingcute:info-line" width={20} className="text-pink-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-pink-900 mb-2">
                As a family supporter, you'll be able to:
              </p>
              <ul className="text-xs text-pink-700 space-y-1 list-disc list-inside">
                <li>View family-friendly progress summaries</li>
                <li>Celebrate milestones and achievements</li>
                <li>Access educational resources on effective support</li>
                <li>Stay updated on their job search journey</li>
              </ul>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-3">
          {/* Show different UI based on login status and email match */}
          {isLoggedIn && currentUserEmail ? (
            <>
              {currentUserEmail.toLowerCase() === invitation?.email?.toLowerCase() ? (
                // Email matches - automatically accept or show accept button
                <>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <div className="flex items-start gap-3">
                      <Icon icon="mingcute:check-circle-line" width={20} className="text-green-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-green-900 mb-1">
                          This invitation is for your current account ({currentUserEmail})
                        </p>
                        <p className="text-xs text-green-700">
                          Click below to accept this family support invitation.
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleAcceptWithCurrentAccount}
                    disabled={isLoading || invitation?.status !== "pending"}
                    className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-pink-600 hover:to-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? "Accepting..." : "Accept Invitation"}
                  </button>
                </>
              ) : (
                // Email doesn't match - show options to logout or create account
                <>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                    <div className="flex items-start gap-3">
                      <Icon icon="mingcute:alert-line" width={20} className="text-amber-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-amber-900 mb-2">
                          Email Mismatch
                        </p>
                        <p className="text-xs text-amber-700 mb-3">
                          You're logged in as <strong>{currentUserEmail}</strong>, but this invitation is for <strong>{invitation?.email}</strong>.
                        </p>
                        <p className="text-xs text-amber-800 font-medium mb-2">
                          To accept this invitation, you need to:
                        </p>
                        <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside mb-3">
                          <li>Log out and sign in with <strong>{invitation?.email}</strong>, or</li>
                          <li>Create a new account with <strong>{invitation?.email}</strong></li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <button
                      onClick={() => setShowLogoutPrompt(true)}
                      className="w-full bg-amber-500 text-white py-3 px-4 rounded-lg font-semibold hover:bg-amber-600 transition"
                    >
                      Log Out & Continue
                    </button>
                    <button
                      onClick={handleSignUp}
                      className="w-full bg-slate-100 text-slate-700 py-3 px-4 rounded-lg font-semibold hover:bg-slate-200 transition"
                    >
                      Create Account with {invitation?.email}
                    </button>
                  </div>
                </>
              )}
            </>
          ) : (
            // Not logged in - show regular signup/login options
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <Icon icon="mingcute:info-line" width={20} className="text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-blue-900 mb-1">
                      Sign up or log in to accept
                    </p>
                    <p className="text-xs text-blue-700">
                      This invitation is for <strong>{invitation?.email}</strong>. Make sure to use this email when creating your account or logging in.
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={handleSignUp}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-pink-600 hover:to-purple-700 transition"
              >
                Sign Up with {invitation?.email}
              </button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-slate-500">Already have an account?</span>
                </div>
              </div>

              <button
                onClick={handleLogin}
                className="w-full bg-slate-100 text-slate-700 py-3 px-4 rounded-lg font-semibold hover:bg-slate-200 transition"
              >
                Log In with {invitation?.email}
              </button>
            </>
          )}
        </div>

        {/* Logout Prompt Modal */}
        {showLogoutPrompt && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-slate-900 mb-4">Log Out Required</h3>
              <p className="text-slate-600 mb-4">
                You're currently logged in as <strong>{currentUserEmail}</strong>, but this invitation is for <strong>{invitation?.email}</strong>.
              </p>
              <p className="text-sm text-slate-600 mb-6">
                After logging out, you can either:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Log in with <strong>{invitation?.email}</strong> if you already have an account</li>
                  <li>Create a new account with <strong>{invitation?.email}</strong></li>
                </ul>
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={handleLogoutAndContinue}
                  disabled={isLoading}
                  className="w-full bg-pink-500 text-white py-3 px-4 rounded-lg font-semibold hover:bg-pink-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Logging out..." : "Log Out & Continue"}
                </button>
                
                <button
                  onClick={() => setShowLogoutPrompt(false)}
                  disabled={isLoading}
                  className="w-full text-slate-600 py-2 px-4 rounded-lg font-medium hover:bg-slate-50 transition disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <p className="text-xs text-slate-500 text-center mt-6">
          By accepting this invitation, you'll be able to provide support and encouragement
          during their job search journey while respecting their privacy.
        </p>
      </div>
    </div>
  );
}

