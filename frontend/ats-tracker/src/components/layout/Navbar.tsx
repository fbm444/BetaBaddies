import { useState, useEffect, useRef } from 'react'
import { Icon } from '@iconify/react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Menubar, MenubarMenu, MenubarTrigger } from '@/components/ui/menubar'
import { cn } from '@/lib/utils'
import { navigationGroups, navigationItems, ROUTES } from '@/config/routes'
import { api } from '@/services/api'
import logo from '@/assets/logo.png'

export function Navbar() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState<string>('User')
  const [userEmail, setUserEmail] = useState<string>('')
  const [profilePicture, setProfilePicture] = useState<string>('https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_640.png')
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true)
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false)
  const [accountType, setAccountType] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const mobileMenuRef = useRef<HTMLDivElement>(null)
  const groupTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const navigate = useNavigate()
  const location = useLocation()

  // Check if any item in a group is active
  const isGroupActive = (group: typeof navigationGroups[0]) => {
    // Special case: interview-analytics should be considered part of the Career group (interviews)
    if (group.id === "career" && location.pathname === ROUTES.INTERVIEW_ANALYTICS) {
      return true
    }
    return group.items.some(item => location.pathname === item.path)
  }

  // Check authentication and fetch user profile
  useEffect(() => {
    const checkAuthAndFetchProfile = async () => {
      try {
        console.log('Navbar: Checking authentication...')
        // Try to fetch user auth first
        const userResponse = await api.getUserAuth()
        console.log('Navbar: User auth response:', userResponse)
        
        if (userResponse.ok && userResponse.data?.user) {
          setUserEmail(userResponse.data.user.email)
          setIsLoggedIn(true)
          setAccountType(userResponse.data.user.accountType || 'regular')
          console.log('Navbar: User is logged in:', userResponse.data.user.email, 'Account type:', userResponse.data.user.accountType)
          
          // Then try to fetch profile for full name and picture
          try {
            const profileResponse = await api.getProfile()
            console.log('Navbar: Profile response:', profileResponse)
            
            if (profileResponse.ok && profileResponse.data?.profile) {
              const { fullName, first_name, last_name, pfp_link } = profileResponse.data.profile
              const name = fullName || `${first_name} ${last_name}`.trim()
              if (name) {
                setDisplayName(name)
                console.log('Navbar: Display name set to:', name)
              } else {
                // Fallback to email username
                const emailName = userResponse.data.user.email.split('@')[0]
                setDisplayName(emailName)
                console.log('Navbar: Using email username:', emailName)
              }
              
              // Set profile picture if available
              if (pfp_link) {
                // Use the path directly - Vite proxy will handle routing to backend
                setProfilePicture(pfp_link)
                console.log('Navbar: Profile picture set to:', pfp_link)
              }
            }
          } catch (profileError) {
            console.log('Navbar: Profile not found, using email')
            // Profile doesn't exist yet, use email
            setDisplayName(userResponse.data.user.email.split('@')[0])
          }
        } else {
          console.log('Navbar: User not authenticated')
          setIsLoggedIn(false)
        }
      } catch (error) {
        console.error('Navbar: Auth check failed:', error)
        // Not authenticated
        setIsLoggedIn(false)
      } finally {
        console.log('Navbar: Auth check complete')
        setIsCheckingAuth(false)
      }
    }

    checkAuthAndFetchProfile()
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false)
      }
    }

    if (isDropdownOpen || isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isDropdownOpen, isMobileMenuOpen])

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false)
    setExpandedGroup(null)
  }, [location.pathname])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (groupTimeoutRef.current) {
        clearTimeout(groupTimeoutRef.current)
      }
    }
  }, [])

  // Listen for profile picture updates
  useEffect(() => {
    const handleProfilePictureUpdate = (event: CustomEvent) => {
      console.log('Navbar: Profile picture updated event received:', event.detail)
      if (event.detail?.filePath) {
        setProfilePicture(event.detail.filePath)
      }
    }

    window.addEventListener('profilePictureUpdated', handleProfilePictureUpdate as EventListener)

    return () => {
      window.removeEventListener('profilePictureUpdated', handleProfilePictureUpdate as EventListener)
    }
  }, [])

  return (
    <nav className="bg-white sticky top-0 z-[100] border-b border-slate-200">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10">
        {/* Top Row: Logo, Navigation, Export Button, and User Profile */}
        <div className="flex items-center justify-between py-3 md:py-4">
          {/* Logo/Brand */}
          <button
            onClick={() => {
              if (isLoggedIn) {
                if (accountType === 'family_only') {
                  navigate(ROUTES.FAMILY_ONLY_DASHBOARD)
                } else {
                  navigate(ROUTES.DASHBOARD)
                }
              }
            }}
            className="flex items-center gap-2 md:gap-3 flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity bg-transparent border-none p-0"
            disabled={!isLoggedIn}
            style={{ cursor: isLoggedIn ? 'pointer' : 'default' }}
          >
            <img src={logo} alt="ATS Logo" className="w-8 h-8 md:w-10 md:h-10" />
            <h1 className="text-lg md:text-2xl font-bold text-slate-900 m-0 font-poppins whitespace-nowrap">
              <span className="hidden sm:inline">ATS For Candidates</span>
              <span className="sm:hidden">ATS</span>
            </h1>
          </button>

          {/* Desktop Navigation Menu - Centered with Groups */}
          {isLoggedIn && (
            <div className="hidden lg:flex flex-1 justify-center">
              <Menubar className="border-0 bg-transparent shadow-none p-0 h-auto space-x-1">
                {accountType === 'family_only' ? (
                  // For family-only accounts, show only the family dashboard link
                  <MenubarMenu>
                    <MenubarTrigger
                      onClick={() => navigate(ROUTES.FAMILY_ONLY_DASHBOARD)}
                      className={cn(
                        "cursor-pointer bg-transparent data-[state=open]:bg-transparent focus:bg-transparent text-sm font-medium",
                        location.pathname === ROUTES.FAMILY_ONLY_DASHBOARD
                          ? "bg-black text-white hover:bg-black rounded-md px-4 py-2" 
                          : "text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-md px-4 py-2"
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <Icon 
                          icon="mingcute:heart-line" 
                          width={16} 
                          height={16} 
                          className={location.pathname === ROUTES.FAMILY_ONLY_DASHBOARD ? "text-white" : "text-slate-600"}
                        />
                        <span>Family Dashboard</span>
                      </span>
                    </MenubarTrigger>
                  </MenubarMenu>
                ) : (
                  // For regular accounts, show all navigation groups
                  navigationGroups.map((group) => {
                  const groupIsActive = isGroupActive(group)
                  const isExpanded = expandedGroup === group.id
                  
                  // If group has only one item, render it directly
                  if (group.items.length === 1) {
                    const item = group.items[0]
                    const itemIsActive = location.pathname === item.path
                  return (
                      <MenubarMenu key={group.id}>
                      <MenubarTrigger
                        onClick={() => navigate(item.path)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            navigate(item.path)
                          }
                        }}
                        className={cn(
                          "cursor-pointer bg-transparent data-[state=open]:bg-transparent focus:bg-transparent text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2",
                            itemIsActive 
                            ? "bg-black text-white hover:bg-black rounded-md px-4 py-2" 
                            : "text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-md px-4 py-2"
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <Icon 
                            icon={item.icon || "mdi:office-building"} 
                            width={16} 
                            height={16} 
                            className={itemIsActive ? "text-white" : "text-slate-600"}
                          />
                          <span>{item.label}</span>
                        </span>
                      </MenubarTrigger>
                    </MenubarMenu>
                    )
                  }
                  
                  // If group has multiple items, render as dropdown
                  return (
                    <div
                      key={group.id}
                      className="relative"
                      onMouseEnter={() => {
                        if (groupTimeoutRef.current) {
                          clearTimeout(groupTimeoutRef.current)
                        }
                        setExpandedGroup(group.id)
                      }}
                      onMouseLeave={() => {
                        groupTimeoutRef.current = setTimeout(() => {
                          setExpandedGroup(null)
                        }, 150)
                      }}
                    >
                      <button
                        type="button"
                        aria-expanded={isExpanded}
                        aria-haspopup="true"
                        aria-controls={`menu-${group.id}`}
                        className={cn(
                          "cursor-pointer bg-transparent text-sm font-medium flex items-center gap-1.5 rounded-md px-4 py-2 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2",
                          groupIsActive 
                            ? "bg-black text-white hover:bg-black" 
                            : "text-slate-700 hover:text-slate-900 hover:bg-slate-50"
                        )}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setExpandedGroup(isExpanded ? null : group.id)
                            if (!isExpanded) {
                              // Focus first item after menu opens
                              setTimeout(() => {
                                const menu = document.getElementById(`menu-${group.id}`)
                                const firstButton = menu?.querySelector('button[role="menuitem"]') as HTMLButtonElement
                                firstButton?.focus()
                              }, 50)
                            }
                          } else if (e.key === 'ArrowDown' && !isExpanded) {
                            e.preventDefault()
                            setExpandedGroup(group.id)
                            // Focus first item after a brief delay
                            setTimeout(() => {
                              const menu = document.getElementById(`menu-${group.id}`)
                              const firstButton = menu?.querySelector('button[role="menuitem"]') as HTMLButtonElement
                              firstButton?.focus()
                            }, 50)
                          } else if (e.key === 'Escape' && isExpanded) {
                            e.preventDefault()
                            setExpandedGroup(null)
                          }
                        }}
                      >
                        <span>{group.label}</span>
                        <Icon 
                          icon="mingcute:down-line" 
                          width={14} 
                          height={14}
                          className={cn(
                            "transition-transform duration-200",
                            isExpanded && "rotate-180"
                          )}
                        />
                      </button>
                      {isExpanded && (
                        <div
                          id={`menu-${group.id}`}
                          role="menu"
                          className="absolute top-full left-0 mt-1 min-w-[200px] bg-white border border-slate-200 rounded-lg shadow-lg p-1 z-50"
                          onMouseEnter={() => {
                            if (groupTimeoutRef.current) {
                              clearTimeout(groupTimeoutRef.current)
                            }
                          }}
                          onMouseLeave={() => {
                            groupTimeoutRef.current = setTimeout(() => {
                              setExpandedGroup(null)
                            }, 150)
                          }}
                          onKeyDown={(e) => {
                            const menu = e.currentTarget
                            const menuItems = Array.from(menu.querySelectorAll('button[role="menuitem"]')) as HTMLButtonElement[]
                            const currentIndex = menuItems.findIndex(btn => btn === document.activeElement)
                            
                            if (e.key === 'Escape') {
                              e.preventDefault()
                              setExpandedGroup(null)
                              // Return focus to the trigger button
                              const trigger = menu.parentElement?.querySelector('button[aria-expanded]') as HTMLButtonElement
                              trigger?.focus()
                            } else if (e.key === 'ArrowDown') {
                              e.preventDefault()
                              const nextIndex = currentIndex < menuItems.length - 1 ? currentIndex + 1 : 0
                              menuItems[nextIndex]?.focus()
                            } else if (e.key === 'ArrowUp') {
                              e.preventDefault()
                              const prevIndex = currentIndex > 0 ? currentIndex - 1 : menuItems.length - 1
                              menuItems[prevIndex]?.focus()
                            } else if (e.key === 'Home') {
                              e.preventDefault()
                              menuItems[0]?.focus()
                            } else if (e.key === 'End') {
                              e.preventDefault()
                              menuItems[menuItems.length - 1]?.focus()
                            }
                          }}
                        >
                          {group.items.map((item) => {
                            // Special case: interview-analytics should highlight the Interviews item
                            const itemIsActive = location.pathname === item.path || 
                              (item.id === "interviews" && location.pathname === ROUTES.INTERVIEW_ANALYTICS)
                            return (
                              <button
                                key={item.id}
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  navigate(item.path)
                                  setExpandedGroup(null)
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault()
                                    navigate(item.path)
                                    setExpandedGroup(null)
                                  }
                                }}
                                className={cn(
                                  "w-full cursor-pointer rounded-md px-3 py-2 text-sm font-medium flex items-center gap-2 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2",
                                  itemIsActive
                                    ? "bg-black text-white hover:bg-black"
                                    : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                                )}
                              >
                                <Icon 
                                  icon={item.icon || "mdi:office-building"} 
                                  width={16} 
                                  height={16}
                                  className={itemIsActive ? "text-white" : "text-slate-600"}
                                />
                                <span>{item.label}</span>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                }))}
              </Menubar>
            </div>
          )}

          {/* Right Side: Mobile Menu Button + User Profile */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Mobile Menu Button */}
            {isLoggedIn && (
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
                aria-label="Toggle menu"
              >
                <Icon 
                  icon={isMobileMenuOpen ? "mingcute:close-line" : "mingcute:menu-line"} 
                  width={24} 
                  height={24}
                  className="text-slate-700"
                />
              </button>
            )}

            {/* User Profile Area */}
            {isCheckingAuth || isLoggingOut ? (
              <div className="flex items-center gap-2 text-slate-600">
                <Icon icon="mingcute:loading-line" width={20} height={20} className="animate-spin" />
                <span className="hidden sm:inline text-sm">{isLoggingOut ? 'Logging out...' : 'Loading...'}</span>
              </div>
            ) : isLoggedIn ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 md:gap-3 px-2 md:px-4 py-2 bg-transparent border border-slate-200 rounded-lg cursor-pointer transition-all duration-200 hover:bg-slate-50"
              >
                <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-blue-700 text-white flex items-center justify-center text-sm md:text-base font-semibold overflow-hidden flex-shrink-0">
                  {profilePicture && !profilePicture.includes('blank-profile-picture') ? (
                    <img 
                      src={profilePicture} 
                      alt={displayName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to initial if image fails to load
                        console.error('Failed to load profile picture:', profilePicture);
                        e.currentTarget.style.display = 'none';
                        if (e.currentTarget.nextElementSibling) {
                          (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                        }
                      }}
                      onLoad={() => {
                        console.log('✅ Profile picture loaded successfully');
                      }}
                    />
                  ) : null}
                  <span style={{ display: (profilePicture && !profilePicture.includes('blank-profile-picture')) ? 'none' : 'flex' }} className="w-full h-full items-center justify-center">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="hidden md:inline text-base font-medium text-slate-900 whitespace-nowrap">{displayName}</span>
                <Icon 
                  icon={isDropdownOpen ? "mingcute:up-line" : "mingcute:down-line"} 
                  width={20} 
                  height={20}
                  className="text-slate-600 hidden md:block"
                />
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute top-full right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg min-w-[280px] overflow-hidden z-50">
                  <div className="p-4 flex items-center gap-3 bg-slate-50">
                    <div className="w-12 h-12 rounded-full bg-blue-700 text-white flex items-center justify-center text-lg font-semibold overflow-hidden">
                      {profilePicture && !profilePicture.includes('blank-profile-picture') ? (
                        <img 
                          src={profilePicture} 
                          alt={displayName}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.error('Failed to load dropdown profile picture:', profilePicture);
                            e.currentTarget.style.display = 'none';
                            if (e.currentTarget.nextElementSibling) {
                              (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                            }
                          }}
                        />
                      ) : null}
                      <span style={{ display: (profilePicture && !profilePicture.includes('blank-profile-picture')) ? 'none' : 'flex' }} className="w-full h-full items-center justify-center">
                        {displayName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="text-base font-semibold text-slate-900 mb-0.5">{displayName}</div>
                      <div className="text-sm text-slate-500">{userEmail}</div>
                    </div>
                  </div>
                  <div className="h-px bg-slate-100 my-2" />
                  {accountType !== 'family_only' && (
                    <>
                      <button 
                        className="w-full flex items-center gap-3 px-4 py-3 bg-transparent border-none text-left cursor-pointer text-sm font-medium text-slate-900 transition-colors duration-200 hover:bg-slate-50"
                        onClick={() => {
                          setIsDropdownOpen(false)
                          navigate(ROUTES.BASIC_INFO)
                        }}
                      >
                        <Icon icon="mingcute:edit-line" width={20} height={20} />
                        <span>Edit Profile</span>
                      </button>
                      <button 
                        className="w-full flex items-center gap-3 px-4 py-3 bg-transparent border-none text-left cursor-pointer text-sm font-medium text-slate-900 transition-colors duration-200 hover:bg-slate-50"
                        onClick={() => navigate(ROUTES.SETTINGS)}
                      >
                        <Icon icon="mingcute:setting-line" width={20} height={20} />
                        <span>Settings</span>
                      </button>
                    </>
                  )}
                  <div className="h-px bg-slate-100 my-2" />
                  <button 
                    className="w-full flex items-center gap-3 px-4 py-3 bg-transparent border-none text-left cursor-pointer text-sm font-medium text-red-500 transition-colors duration-200 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isLoggingOut}
                    onClick={async () => {
                      // Immediately set logout state and close dropdown
                      setIsLoggingOut(true)
                      setIsDropdownOpen(false)
                      
                      // Clear local state immediately to prevent seeing old data
                      setIsLoggedIn(false)
                      setDisplayName('User')
                      setUserEmail('')
                      setProfilePicture('https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_640.png')
                      
                      try {
                        // Call logout API to clear session on backend
                        await api.logout()
                      } catch (error) {
                        console.error('Logout API failed:', error)
                        // Continue with redirect even if API fails
                      } finally {
                        // Use navigate with replace to redirect to landing page
                        // replace: true prevents going back to the protected page
                        navigate(ROUTES.LANDING, { replace: true })
                      }
                    }}
                  >
                    <Icon 
                      icon={isLoggingOut ? "mingcute:loading-line" : "mingcute:logout-line"} 
                      width={20} 
                      height={20}
                      className={isLoggingOut ? "animate-spin" : ""}
                    />
                    <span>{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex gap-2 md:gap-3">
              <button 
                onClick={() => navigate(ROUTES.LOGIN)}
                className="px-4 md:px-6 py-2 md:py-2.5 bg-transparent border border-slate-200 rounded-lg text-sm font-medium text-slate-900 cursor-pointer transition-all duration-200 hover:bg-slate-50 whitespace-nowrap"
              >
                <span className="hidden sm:inline">Login</span>
                <span className="sm:hidden">Sign In</span>
              </button>
              <button 
                onClick={() => navigate(ROUTES.LOGIN)}
                className="px-4 md:px-6 py-2 md:py-2.5 bg-gradient-to-br from-blue-500 to-blue-700 border-none rounded-lg text-sm font-semibold text-white cursor-pointer transition-all duration-200 shadow-lg hover:shadow-xl whitespace-nowrap"
              >
                Sign Up
              </button>
            </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isLoggedIn && isMobileMenuOpen && (
          <div 
            ref={mobileMenuRef}
            className="lg:hidden border-t border-slate-200 py-4 animate-in slide-in-from-top-2 duration-200"
          >
            <nav className="flex flex-col gap-1">
              {accountType === 'family_only' ? (
                // For family-only accounts, show only the family dashboard link
                <button
                  onClick={() => {
                    navigate(ROUTES.FAMILY_ONLY_DASHBOARD)
                    setIsMobileMenuOpen(false)
                  }}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors duration-200",
                    location.pathname === ROUTES.FAMILY_ONLY_DASHBOARD
                      ? "bg-black text-white"
                      : "text-slate-700 hover:bg-slate-100"
                  )}
                >
                  <Icon 
                    icon="mingcute:heart-line" 
                    width={20} 
                    height={20}
                    className={location.pathname === ROUTES.FAMILY_ONLY_DASHBOARD ? "text-white" : "text-slate-600"}
                  />
                  <span className="font-medium">Family Dashboard</span>
                </button>
              ) : (
                // For regular accounts, show all navigation groups
                navigationGroups.map((group) => {
                const isGroupExpanded = expandedGroup === group.id
                const groupIsActive = isGroupActive(group)
                
                return (
                  <div key={group.id} className="flex flex-col">
                    <button
                      onClick={() => {
                        if (group.items.length === 1) {
                          navigate(group.items[0].path)
                          setIsMobileMenuOpen(false)
                        } else {
                          setExpandedGroup(isGroupExpanded ? null : group.id)
                        }
                      }}
                      className={cn(
                        "flex items-center justify-between gap-3 px-4 py-3 rounded-lg text-left transition-colors duration-200",
                        groupIsActive && !isGroupExpanded
                          ? "bg-black text-white"
                          : "text-slate-700 hover:bg-slate-100"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon 
                          icon={group.icon} 
                          width={20} 
                          height={20}
                          className={groupIsActive && !isGroupExpanded ? "text-white" : "text-slate-600"}
                        />
                        <span className="font-medium">{group.label}</span>
                      </div>
                      {group.items.length > 1 && (
                        <Icon 
                          icon="mingcute:down-line" 
                          width={16} 
                          height={16}
                          className={cn(
                            "transition-transform duration-200",
                            isGroupExpanded && "rotate-180",
                            groupIsActive && !isGroupExpanded ? "text-white" : "text-slate-600"
                          )}
                        />
                      )}
                    </button>
                    
                    {/* Expanded items */}
                    {isGroupExpanded && group.items.length > 1 && (
                      <div className="ml-4 mt-1 flex flex-col gap-1 border-l-2 border-slate-200 pl-4">
                        {group.items.map((item) => {
                          // Special case: interview-analytics should highlight the Interviews item
                          const itemIsActive = location.pathname === item.path || 
                            (item.id === "interviews" && location.pathname === ROUTES.INTERVIEW_ANALYTICS)
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      navigate(item.path)
                      setIsMobileMenuOpen(false)
                                setExpandedGroup(null)
                    }}
                    className={cn(
                                "flex items-center gap-3 px-4 py-2.5 rounded-lg text-left transition-colors duration-200",
                                itemIsActive
                        ? "bg-black text-white"
                        : "text-slate-700 hover:bg-slate-100"
                    )}
                  >
                    <Icon 
                      icon={item.icon || "mdi:office-building"} 
                      width={18} 
                      height={18}
                      className={itemIsActive ? "text-white" : "text-slate-600"}
                    />
                              <span className="font-medium text-sm">{item.label}</span>
                  </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              }))}
            </nav>
          </div>
        )}
      </div>
    </nav>
  )
}

