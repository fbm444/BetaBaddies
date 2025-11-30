import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Icon } from "@iconify/react";
import { api } from "../services/api";
import { ROUTES } from "../config/routes";

export function TeamInviteAccept() {
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
      const authResponse = await api.getUserAuth();
      if (authResponse.ok && authResponse.data?.user) {
        setIsLoggedIn(true);
        setCurrentUserEmail(authResponse.data.user.email);
      } else {
        setIsLoggedIn(false);
      }
    } catch (err) {
      // User is not logged in
      setIsLoggedIn(false);
    } finally {
      setIsCheckingAuth(false);
      // Fetch invitation details
      await fetchInvitation();
    }
  };

  const fetchInvitation = async () => {
    try {
      setIsLoading(true);
      const response = await api.getInvitationByToken(token!);
      if (response.ok && response.data) {
        setInvitation(response.data.invitation);
        if (!response.data.invitation.isValid) {
          if (response.data.invitation.isExpired) {
            setError("This invitation has expired.");
          } else if (response.data.invitation.isUsed) {
            setError("This invitation has already been used.");
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

    // Store invitation token in sessionStorage to use after registration
    if (token) {
      sessionStorage.setItem("pendingInvitationToken", token);
    }
    // Navigate to register page with email pre-filled if available
    const registerUrl = invitation?.email
      ? `${ROUTES.REGISTER}?email=${encodeURIComponent(invitation.email)}&invite=${token}`
      : `${ROUTES.REGISTER}?invite=${token}`;
    navigate(registerUrl);
  };

  const handleAcceptWithCurrentAccount = async () => {
    if (!token) return;
    
    try {
      await api.acceptTeamInvitation(token);
      // Redirect to teams page
      window.location.href = ROUTES.TEAMS;
    } catch (err: any) {
      setError(err.message || "Failed to accept invitation. Please try again.");
    }
  };

  const handleLogoutAndContinue = async () => {
    try {
      // Log out current user
      await api.logout();
      setShowLogoutPrompt(false);
      setIsLoggedIn(false);
      setCurrentUserEmail(null);
      // Store invitation token for after signup/login
      if (token) {
        sessionStorage.setItem("pendingInvitationToken", token);
      }
    } catch (err: any) {
      setError(err.message || "Failed to log out. Please try again.");
    }
  };

  const handleLogin = () => {
    // If logged in and email doesn't match, show logout prompt
    if (isLoggedIn && currentUserEmail) {
      const emailMatches = currentUserEmail.toLowerCase() === invitation?.email?.toLowerCase();
      if (!emailMatches) {
        setShowLogoutPrompt(true);
        return;
      }
    }

    // Store invitation token to use after login
    if (token) {
      sessionStorage.setItem("pendingInvitationToken", token);
    }
    navigate(`${ROUTES.LOGIN}?invite=${token}`);
  };

  if (isLoading || isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <Icon icon="mingcute:loading-line" width={48} className="animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-slate-600">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <Icon icon="mingcute:close-circle-line" width={64} className="text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Invalid Invitation</h1>
          <p className="text-slate-600 mb-6">{error || "This invitation link is not valid."}</p>
          <button
            onClick={() => navigate(ROUTES.LANDING)}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Icon icon="mingcute:user-group-line" width={32} className="text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">You've Been Invited!</h1>
          <p className="text-slate-600">
            Join <span className="font-semibold text-slate-900">{invitation.teamName}</span> on ATS Tracker
          </p>
        </div>

        <div className="bg-slate-50 rounded-lg p-6 mb-6 space-y-4">
          <div>
            <div className="text-sm font-medium text-slate-700 mb-1">Team</div>
            <div className="text-lg font-semibold text-slate-900">{invitation.teamName}</div>
          </div>

          {invitation.inviterName && (
            <div>
              <div className="text-sm font-medium text-slate-700 mb-1">Invited by</div>
              <div className="text-slate-900">{invitation.inviterName}</div>
              {invitation.inviterEmail && (
                <div className="text-sm text-slate-600">{invitation.inviterEmail}</div>
              )}
            </div>
          )}

          <div>
            <div className="text-sm font-medium text-slate-700 mb-1">Your Role</div>
            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium capitalize">
              {invitation.role}
            </span>
          </div>

          <div>
            <div className="text-sm font-medium text-slate-700 mb-1">Invitation Email</div>
            <div className="text-slate-900">{invitation.email}</div>
          </div>

          <div>
            <div className="text-sm font-medium text-slate-700 mb-1">Expires</div>
            <div className="text-slate-600">
              {new Date(invitation.expiresAt).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {/* Show different UI based on login status and email match */}
          {isLoggedIn && currentUserEmail ? (
            <>
              {currentUserEmail.toLowerCase() === invitation?.email?.toLowerCase() ? (
                // Email matches - show direct accept button
                <>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <div className="flex items-start gap-3">
                      <Icon icon="mingcute:check-circle-line" width={20} className="text-green-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-green-900 mb-1">
                          This invitation is for your current account ({currentUserEmail})
                        </p>
                        <p className="text-xs text-green-700">
                          You can accept this invitation directly.
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleAcceptWithCurrentAccount}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition"
                  >
                    Accept Invitation
                  </button>
                </>
              ) : (
                // Email doesn't match - show logout prompt
                <>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                    <div className="flex items-start gap-3">
                      <Icon icon="mingcute:alert-line" width={20} className="text-amber-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-amber-900 mb-1">
                          Email Mismatch
                        </p>
                        <p className="text-xs text-amber-700">
                          You're logged in as <strong>{currentUserEmail}</strong>, but this invitation is for <strong>{invitation?.email}</strong>. Please log out to continue.
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowLogoutPrompt(true)}
                    className="w-full bg-amber-500 text-white py-3 px-4 rounded-lg font-semibold hover:bg-amber-600 transition"
                  >
                    Log Out to Continue
                  </button>
                </>
              )}
            </>
          ) : (
            // Not logged in - show regular signup/login options
            <>
              <button
                onClick={handleSignUp}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition"
              >
                Sign Up to Accept
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
                Log In to Accept
              </button>
            </>
          )}
        </div>

        {/* Logout Prompt Modal */}
        {showLogoutPrompt && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-slate-900 mb-4">Log Out Required</h3>
              <p className="text-slate-600 mb-6">
                You're currently logged in as <strong>{currentUserEmail}</strong>, but this invitation is for <strong>{invitation?.email}</strong>.
                <br /><br />
                Please log out to sign up or log in with the correct account.
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={handleLogoutAndContinue}
                  className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-600 transition"
                >
                  Log Out & Continue
                </button>
                
                <button
                  onClick={() => setShowLogoutPrompt(false)}
                  className="w-full text-slate-600 py-2 px-4 rounded-lg font-medium hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <p className="text-xs text-slate-500 text-center mt-6">
          By accepting this invitation, you'll be able to collaborate with your team members on job applications,
          share resources, and track progress together.
        </p>
      </div>
    </div>
  );
}

