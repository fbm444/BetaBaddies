import { useState, FormEvent, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { Icon } from '@iconify/react'
import { api } from '@/services/api'
import { ROUTES } from '@/config/routes'
import loginSvg from '@/assets/login.svg'

export function Register() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const inviteToken = searchParams.get('invite') || sessionStorage.getItem('pendingInvitationToken')
  const familyInviteToken = searchParams.get('familyInvite') || sessionStorage.getItem('pendingFamilyInvitationToken')
  const emailFromInvite = searchParams.get('email')
  const accountTypeFromStorage = sessionStorage.getItem('accountType')
  
  const [email, setEmail] = useState(emailFromInvite || '')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [invitationInfo, setInvitationInfo] = useState<any>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null)
  const [isFamilyInvitation, setIsFamilyInvitation] = useState(!!familyInviteToken || accountTypeFromStorage === 'family_only')

  useEffect(() => {
    // Check if user is logged in
    const checkAuth = async () => {
      try {
        const response = await api.getUserAuth()
        if (response.ok && response.data?.user) {
          setIsLoggedIn(true)
          setCurrentUserEmail(response.data.user.email)
          
          // If logged in and there's an invitation token, check email match
          if (inviteToken) {
            const invitation = await api.getInvitationByToken(inviteToken)
            if (invitation.ok && invitation.data?.invitation) {
              const invitationEmail = invitation.data.invitation.email?.toLowerCase()
              const currentEmail = response.data.user.email.toLowerCase()
              
              // If emails don't match, redirect to invitation accept page which handles this properly
              if (invitationEmail && currentEmail !== invitationEmail) {
                navigate(`${ROUTES.TEAM_INVITE_ACCEPT}?token=${inviteToken}`)
                return
              }
            }
          }
          
          // Handle family invitation
          if (familyInviteToken) {
            const invitation = await api.getFamilyInvitationByToken(familyInviteToken)
            if (invitation.ok && invitation.data?.invitation) {
              const invitationEmail = invitation.data.invitation.email?.toLowerCase()
              const currentEmail = response.data.user.email.toLowerCase()
              
              if (invitationEmail && currentEmail !== invitationEmail) {
                navigate(`${ROUTES.FAMILY_INVITE_ACCEPT}?token=${familyInviteToken}`)
                return
              }
            }
          }
        }
      } catch (err) {
        // User is not logged in
        setIsLoggedIn(false)
      }
    }
    checkAuth()

    // If there's an invitation token, fetch invitation details
    if (inviteToken) {
      fetchInvitationInfo()
    } else if (familyInviteToken) {
      fetchFamilyInvitationInfo()
    }
  }, [inviteToken, familyInviteToken, navigate])

  const fetchInvitationInfo = async () => {
    try {
      const response = await api.getInvitationByToken(inviteToken!)
      if (response.ok && response.data) {
        setInvitationInfo(response.data.invitation)
        // Pre-fill email if not already set
        if (!email && response.data.invitation.email) {
          setEmail(response.data.invitation.email)
        }
      }
    } catch (err) {
      console.error('Failed to fetch invitation info:', err)
    }
  }

  const fetchFamilyInvitationInfo = async () => {
    try {
      const response = await api.getFamilyInvitationByToken(familyInviteToken!)
      if (response.ok && response.data) {
        setInvitationInfo(response.data.invitation)
        setIsFamilyInvitation(true)
        // Pre-fill email if not already set
        if (!email && response.data.invitation.email) {
          setEmail(response.data.invitation.email)
        }
      }
    } catch (err) {
      console.error('Failed to fetch family invitation info:', err)
    }
  }

  // Password strength indicator
  const getPasswordStrength = (pwd: string) => {
    if (pwd.length === 0) return { strength: 0, label: '', color: '' }
    if (pwd.length < 8) return { strength: 25, label: 'Too short', color: '#EF4444' }
    
    let strength = 0
    if (pwd.length >= 8) strength += 25
    if (pwd.length >= 12) strength += 15
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength += 20
    if (/[0-9]/.test(pwd)) strength += 20
    if (/[^a-zA-Z0-9]/.test(pwd)) strength += 20
    
    if (strength < 50) return { strength, label: 'Weak', color: '#EF4444' }
    if (strength < 80) return { strength, label: 'Good', color: '#F59E0B' }
    return { strength: 100, label: 'Strong', color: '#10B981' }
  }

  const passwordStrength = getPasswordStrength(password)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    // Validation
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setIsLoading(false)
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long')
      setIsLoading(false)
      return
    }

    // CRITICAL: If user is logged in with different email and there's an invitation, prevent registration
    if (isLoggedIn && currentUserEmail && inviteToken && invitationInfo) {
      const emailMatches = currentUserEmail.toLowerCase() === invitationInfo.email?.toLowerCase()
      if (!emailMatches) {
        setError(`You're currently logged in as ${currentUserEmail}, but this invitation is for ${invitationInfo.email}. Please log out first before creating a new account.`)
        setIsLoading(false)
        return
      }
    }

    try {
      // Determine account type
      const accountType = isFamilyInvitation ? 'family_only' : 'regular'
      
      // Register the user
      const registerResponse = await api.register(email, password, accountType)
      
      // Automatically log them in after registration
      await api.login(email, password)
      
      // If there's a pending family invitation, accept it
      if (familyInviteToken) {
        try {
          // Verify email matches invitation before accepting
          if (invitationInfo && email.toLowerCase() !== invitationInfo.email?.toLowerCase()) {
            setError(`Email mismatch: This invitation is for ${invitationInfo.email}, but you registered with ${email}. Please register with the correct email.`)
            setIsLoading(false)
            return
          }
          
          const inviteResponse = await api.acceptFamilyInvitation(familyInviteToken)
          sessionStorage.removeItem('pendingFamilyInvitationToken')
          sessionStorage.removeItem('accountType')
          
          // Redirect to family-only dashboard
          window.location.href = ROUTES.FAMILY_ONLY_DASHBOARD
          return
        } catch (inviteErr: any) {
          console.error('Failed to accept family invitation:', inviteErr)
          if (inviteErr.message?.includes('Email does not match invitation')) {
            setError(`Email mismatch: This invitation is for ${invitationInfo?.email}, but you registered with ${email}. Please register with the correct email.`)
            setIsLoading(false)
            return
          }
        }
      }
      
      // If there's a pending team invitation, accept it
      if (inviteToken) {
        try {
          // Verify email matches invitation before accepting
          if (invitationInfo && email.toLowerCase() !== invitationInfo.email?.toLowerCase()) {
            setError(`Email mismatch: This invitation is for ${invitationInfo.email}, but you registered with ${email}. Please register with the correct email.`)
            setIsLoading(false)
            return
          }
          
          const inviteResponse = await api.acceptTeamInvitation(inviteToken)
          sessionStorage.removeItem('pendingInvitationToken')
          // Check if the invitation role is mentor/career_coach and redirect to mentor dashboard
          if (inviteResponse?.data?.team?.userRole === "mentor" || inviteResponse?.data?.team?.userRole === "career_coach") {
            window.location.href = ROUTES.MENTOR_DASHBOARD
          } else {
            window.location.href = ROUTES.TEAMS
          }
          return
        } catch (inviteErr: any) {
          console.error('Failed to accept invitation:', inviteErr)
          // If email mismatch error, show it to user
          if (inviteErr.message?.includes('Email does not match invitation')) {
            setError(`Email mismatch: This invitation is for ${invitationInfo?.email}, but you registered with ${email}. Please register with the correct email.`)
            setIsLoading(false)
            return
          }
          // Continue to dashboard even if invitation acceptance fails for other reasons
        }
      }
      
      // Redirect based on account type
      if (accountType === 'family_only') {
        window.location.href = ROUTES.FAMILY_ONLY_DASHBOARD
      } else {
        console.log('Registration successful, redirecting to:', ROUTES.DASHBOARD)
        window.location.href = ROUTES.DASHBOARD
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Section - Gradient Background with Register Form */}
      <div 
        className="flex-[0.35] flex flex-col justify-center items-center px-8 lg:px-16 min-h-screen lg:min-h-auto"
        style={{
          background: 'linear-gradient(to right, #EC85CA, #3351FD)',
          borderRadius: '0 50px 50px 0'
        }}
      >
        {/* Welcome Section */}
        <div className="mb-8 lg:mb-12 text-left w-full max-w-md">
          <h1 
            className="text-white mb-2 lg:mb-3"
            style={{ 
              fontFamily: 'Poppins, sans-serif',
              fontWeight: 700,
              fontSize: 'clamp(32px, 5vw, 64px)'
            }}
          >
            Join Us!
          </h1>
          <p 
            className="text-white"
            style={{ 
              fontFamily: 'Poppins, sans-serif',
              fontWeight: 600,
              fontSize: '48px'
            }}
          >
            Create your account
          </p>
        </div>

        {/* Register Form Card */}
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
          {/* Title */}
          <h2 
            className="text-black mb-6"
            style={{ 
              fontFamily: 'Poppins, sans-serif',
              fontWeight: 500,
              fontSize: '36px'
            }}
          >
            Sign Up
          </h2>

          {/* Logged in warning */}
          {isLoggedIn && currentUserEmail && inviteToken && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <Icon icon="mingcute:alert-line" width={24} className="text-amber-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-900 mb-1">
                    You're currently logged in as {currentUserEmail}
                  </p>
                  <p className="text-xs text-amber-700 mb-3">
                    {invitationInfo && currentUserEmail.toLowerCase() !== invitationInfo.email?.toLowerCase()
                      ? `This invitation is for ${invitationInfo.email}. Please log out to create a new account.`
                      : 'Please log out to create a new account for this invitation.'}
                  </p>
                  <button
                    onClick={async () => {
                      try {
                        await api.logout()
                        setIsLoggedIn(false)
                        setCurrentUserEmail(null)
                        // Reload to clear any cached state
                        window.location.reload()
                      } catch (err: any) {
                        setError(err.message || 'Failed to log out. Please try again.')
                      }
                    }}
                    className="text-xs bg-amber-500 text-white px-3 py-1.5 rounded hover:bg-amber-600 transition"
                  >
                    Log Out
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
              <Icon icon="mingcute:alert-line" width={20} height={20} />
              <span className="text-sm">{error}</span>
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
            {/* Email Field */}
            <div>
              <label 
                htmlFor="email" 
                className="block text-black mb-2"
                style={{ 
                  fontFamily: 'Poppins, sans-serif',
                  fontWeight: 500,
                  fontSize: '18px'
                }}
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all placeholder-gray-600"
                placeholder="Enter your email"
                disabled={isLoading}
                style={{
                  fontFamily: 'Poppins, sans-serif',
                  fontWeight: 500,
                  fontSize: '16px',
                  color: '#000000'
                }}
              />
            </div>

            {/* Password Field */}
            <div>
              <label 
                htmlFor="password" 
                className="block text-black mb-2"
                style={{ 
                  fontFamily: 'Poppins, sans-serif',
                  fontWeight: 500,
                  fontSize: '18px'
                }}
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-4 py-3 pr-12 bg-white border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all placeholder-gray-600"
                  placeholder="At least 8 characters"
                  disabled={isLoading}
                  style={{
                    fontFamily: 'Poppins, sans-serif',
                    fontWeight: 500,
                    fontSize: '16px',
                    color: '#000000'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  <Icon 
                    icon={showPassword ? 'mingcute:eye-close-line' : 'mingcute:eye-line'} 
                    width={20} 
                    height={20} 
                  />
                </button>
              </div>
              
              {/* Password Strength Indicator */}
              {password && (
                <div className="mt-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full transition-all duration-300"
                        style={{ 
                          width: `${passwordStrength.strength}%`,
                          backgroundColor: passwordStrength.color
                        }}
                      />
                    </div>
                    <span 
                      className="text-xs font-medium"
                      style={{ color: passwordStrength.color }}
                    >
                      {passwordStrength.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">
                    Use 8+ characters with a mix of letters, numbers & symbols
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label 
                htmlFor="confirmPassword" 
                className="block text-black mb-2"
                style={{ 
                  fontFamily: 'Poppins, sans-serif',
                  fontWeight: 500,
                  fontSize: '18px'
                }}
              >
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-4 py-3 pr-12 bg-white border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all placeholder-gray-600"
                  placeholder="Re-enter your password"
                  disabled={isLoading}
                  style={{
                    fontFamily: 'Poppins, sans-serif',
                    fontWeight: 500,
                    fontSize: '16px',
                    color: '#000000'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  <Icon 
                    icon={showConfirmPassword ? 'mingcute:eye-close-line' : 'mingcute:eye-line'} 
                    width={20} 
                    height={20} 
                  />
                </button>
              </div>
              
              {/* Password Match Indicator */}
              {confirmPassword && (
                <div className="mt-2 flex items-center gap-1">
                  {password === confirmPassword ? (
                    <>
                      <Icon icon="mingcute:check-circle-fill" width={16} className="text-green-500" />
                      <span className="text-xs text-green-600">Passwords match</span>
                    </>
                  ) : (
                    <>
                      <Icon icon="mingcute:close-circle-fill" width={16} className="text-red-500" />
                      <span className="text-xs text-red-600">Passwords do not match</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || password !== confirmPassword}
              className="w-full text-white py-3 font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(to right, #6A94EE, #916BE3)',
                fontFamily: 'Poppins, sans-serif',
                fontWeight: 500,
                fontSize: '22px',
                borderRadius: '15px'
              }}
            >
              {isLoading ? (
                <>
                  <Icon icon="mingcute:loading-line" width={20} height={20} className="animate-spin" />
                  <span>Creating account...</span>
                </>
              ) : (
                'CREATE ACCOUNT'
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-gray-600" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Already have an account?{' '}
              <Link 
                to={ROUTES.LOGIN} 
                className="text-purple-600 hover:text-purple-700 font-semibold hover:underline"
              >
                Log In
              </Link>
            </p>
          </div>

          {/* Terms & Privacy */}
          <p className="mt-4 text-xs text-center text-gray-500" style={{ fontFamily: 'Poppins, sans-serif' }}>
            By signing up, you agree to our{' '}
            <a href="#" className="text-purple-600 hover:underline">Terms of Service</a>
            {' '}and{' '}
            <a href="#" className="text-purple-600 hover:underline">Privacy Policy</a>
          </p>
        </div>
      </div>

      {/* Right Section - SVG Illustration */}
      <div className="flex-[0.65] bg-white flex items-center justify-center p-8 hidden lg:flex">
        <img 
          src={loginSvg} 
          alt="Registration Illustration" 
          className="w-2/3 h-auto object-contain"
        />
      </div>
    </div>
  )
}

