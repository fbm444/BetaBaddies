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
        // Redirect to family dashboard or main dashboard
        window.location.href = ROUTES.FAMILY;
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6 text-white">
          <Icon icon="mingcute:heart-line" className="text-5xl mb-4" />
          <h1 className="text-2xl font-bold mb-2">Family Support Invitation</h1>
          <p className="text-blue-100">You've been invited to provide support</p>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {showLogoutPrompt && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-amber-800 text-sm mb-3">
                You're currently logged in as {currentUserEmail}, but this invitation is for {invitation?.email}.
                Please log out to accept this invitation with the correct account.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleLogoutAndContinue}
                  className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm"
                >
                  Log Out & Continue
                </button>
                <button
                  onClick={() => setShowLogoutPrompt(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="mb-6">
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-gray-700 mb-2">
                <strong>{inviterName}</strong> has invited you to support their job search journey.
              </p>
              {invitation?.relationship && (
                <p className="text-sm text-gray-600">
                  Relationship: <span className="font-medium">{invitation.relationship}</span>
                </p>
              )}
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
              <p className="text-sm text-gray-700 mb-2">
                <strong>As a family supporter, you'll be able to:</strong>
              </p>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li>View family-friendly progress summaries</li>
                <li>Celebrate milestones and achievements</li>
                <li>Access educational resources on effective support</li>
                <li>Stay updated on their job search journey</li>
              </ul>
            </div>
          </div>

          {isLoggedIn ? (
            <div className="space-y-3">
              {currentUserEmail?.toLowerCase() === invitation?.email?.toLowerCase() ? (
                <button
                  onClick={handleAcceptWithCurrentAccount}
                  disabled={isLoading || invitation?.status !== "pending"}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {isLoading ? "Accepting..." : "Accept Invitation"}
                </button>
              ) : (
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-3">
                    This invitation is for {invitation?.email}, but you're logged in as {currentUserEmail}.
                  </p>
                  <button
                    onClick={handleLogoutAndContinue}
                    className="w-full px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium"
                  >
                    Log Out & Continue
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <button
                onClick={handleSignUp}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Create Account & Accept
              </button>
              <button
                onClick={handleLogin}
                className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Already have an account? Log In
              </button>
            </div>
          )}

          <p className="mt-6 text-xs text-gray-500 text-center">
            This invitation expires on {invitation?.expires_at ? new Date(invitation.expires_at).toLocaleDateString() : "N/A"}
          </p>
        </div>
      </div>
    </div>
  );
}

