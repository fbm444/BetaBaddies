import { useEffect, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { api } from '@/services/api'
import { ROUTES } from '@/config/routes'
import { Icon } from '@iconify/react'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAuth?: boolean // true = needs auth, false = must NOT be authenticated
}

export function ProtectedRoute({ children, requireAuth = true }: ProtectedRouteProps) {
  const [isChecking, setIsChecking] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [accountType, setAccountType] = useState<string | null>(null)
  const [searchParams] = useSearchParams()
  const currentPath = window.location.pathname
  
  // Check for invitation token in URL or sessionStorage
  const hasInvitationToken = searchParams.get('invite') || sessionStorage.getItem('pendingInvitationToken')
  const hasFamilyInviteToken = searchParams.get('familyInvite') || sessionStorage.getItem('pendingFamilyInvitationToken')

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await api.getUserAuth()
        const isAuth = response.ok && !!response.data?.user
        setIsAuthenticated(isAuth)
        
        // Store account type if user is authenticated
        if (isAuth && response.data?.user) {
          setAccountType(response.data.user.accountType || 'regular')
        }
      } catch (error) {
        setIsAuthenticated(false)
        setAccountType(null)
      } finally {
        setIsChecking(false)
      }
    }

    checkAuth()
  }, [])

  // Show loading spinner while checking
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Icon icon="mingcute:loading-line" width={48} height={48} className="animate-spin text-blue-500" />
          <p className="text-slate-600">Checking authentication...</p>
        </div>
      </div>
    )
  }

  // If route requires auth and user is NOT authenticated → redirect to login
  if (requireAuth && !isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />
  }

  // If user is authenticated and has family_only account type, restrict access
  if (requireAuth && isAuthenticated && accountType === 'family_only') {
    // Allow access to family-only dashboard and family invite accept page
    const allowedPaths = [
      ROUTES.FAMILY_ONLY_DASHBOARD,
      ROUTES.FAMILY_INVITE_ACCEPT,
    ]
    
    // If trying to access a restricted route, redirect to family dashboard
    if (!allowedPaths.includes(currentPath)) {
      return <Navigate to={ROUTES.FAMILY_ONLY_DASHBOARD} replace />
    }
  }

  // If route requires NO auth (like login/register page) and user IS authenticated
  // Allow access if:
  // 1. There's an invitation token (user might need to log out and use different account)
  // 2. It's the invitation accept page (it handles email mismatch)
  // Otherwise, redirect to dashboard
  const isInvitationAcceptPage = window.location.pathname === ROUTES.TEAM_INVITE_ACCEPT
  const isLoginOrRegisterPage = window.location.pathname === ROUTES.LOGIN || window.location.pathname === ROUTES.REGISTER
  
  if (!requireAuth && isAuthenticated) {
    // Always allow invitation accept page (it handles email mismatch)
    if (isInvitationAcceptPage) {
      return <>{children}</>
    }
    
    // Allow login/register pages if there's an invitation token (user needs to log out)
    if (isLoginOrRegisterPage && hasInvitationToken) {
      return <>{children}</>
    }
    
    // Otherwise, redirect authenticated users away from login/register pages
    if (isLoginOrRegisterPage) {
      // Redirect based on account type
      if (accountType === 'family_only') {
        return <Navigate to={ROUTES.FAMILY_ONLY_DASHBOARD} replace />
      }
      return <Navigate to={ROUTES.DASHBOARD} replace />
    }
  }

  // All good, render the children
  return <>{children}</>
}

