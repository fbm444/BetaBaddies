import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '@iconify/react'
import { api } from '../services/api'
import { ROUTES } from '../config/routes'

export function Settings() {
  const navigate = useNavigate()
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmationText, setConfirmationText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isOAuthUser, setIsOAuthUser] = useState(false)
  
  // Check if user is OAuth user (LinkedIn or Google)
  useEffect(() => {
    const checkAuthProvider = async () => {
      try {
        const response = await api.getUserAuth()
        if (response.ok && response.data?.user?.authProvider) {
          setIsOAuthUser(true)
        }
      } catch (err) {
        console.error('Error checking auth provider:', err)
      }
    }
    checkAuthProvider()
  }, [])
  
  const handleDeleteAccount = async () => {
    setError(null)
    
    // Client-side validation
    // Only require password for non-OAuth users
    if (!isOAuthUser && !password) {
      setError('Password is required')
      return
    }
    
    if (confirmationText !== 'DELETE MY ACCOUNT') {
      setError('You must type "DELETE MY ACCOUNT" to confirm')
      return
    }
    
    setIsDeleting(true)
    
    try {
      // For OAuth users, pass empty string or null for password
      await api.deleteAccount(isOAuthUser ? '' : password, confirmationText)
      
      // Account deleted successfully
      alert('Your account has been deleted successfully. A confirmation email has been sent to you.')
      
      // Redirect to landing page
      window.location.href = ROUTES.LANDING
    } catch (err: any) {
      setError(err.message || 'Failed to delete account')
      setIsDeleting(false)
    }
  }
  
  const closeModal = () => {
    setShowDeleteModal(false)
    setPassword('')
    setConfirmationText('')
    setError(null)
  }
  
  return (
    <div className="p-10 max-w-[1400px] mx-auto bg-white font-sans min-h-full">
      <h1 className="text-4xl font-bold text-gray-800 mb-2">Settings</h1>
      <p className="text-gray-600 mb-8">Manage your account settings and preferences</p>
      
      {/* Account Section */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6">
        <h2 className="text-2xl font-semibold mb-6">Account Settings</h2>
        
        {/* Change Password */}
        <div className="mb-6 pb-6 border-b border-slate-100">
          <h3 className="text-lg font-medium mb-2 text-slate-900">Change Password</h3>
          <p className="text-sm text-slate-600 mb-4">
            Update your password to keep your account secure
          </p>
          <button className="px-6 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors font-medium">
            Change Password
          </button>
        </div>

        {/* Email Preferences */}
        <div className="mb-6 pb-6 border-b border-slate-100">
          <h3 className="text-lg font-medium mb-2 text-slate-900">Email Notifications</h3>
          <p className="text-sm text-slate-600 mb-4">
            Manage how you receive notifications
          </p>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                defaultChecked
                className="w-4 h-4 text-blue-700 border-slate-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-slate-700">Send me account security alerts</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                defaultChecked
                className="w-4 h-4 text-blue-700 border-slate-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-slate-700">Notify me about profile updates</span>
            </label>
          </div>
        </div>

        {/* Privacy */}
        <div>
          <h3 className="text-lg font-medium mb-2 text-slate-900">Privacy</h3>
          <p className="text-sm text-slate-600 mb-4">
            Control who can see your profile information
          </p>
          <label htmlFor="privacy-select" className="sr-only">
            Privacy setting
          </label>
          <select 
            id="privacy-select"
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-700 focus:border-transparent"
            aria-label="Privacy setting"
          >
            <option>Public - Anyone can view</option>
            <option>Private - Only you can view</option>
            <option>Recruiters only</option>
          </select>
        </div>
      </div>
      
      {/* Danger Zone */}
      <div className="bg-red-50 rounded-2xl p-6 border-2 border-red-200">
        <div className="flex items-center gap-2 mb-4">
          <Icon icon="mingcute:alert-fill" className="text-red-600" width={24} />
          <h2 className="text-2xl font-semibold text-red-700">Danger Zone</h2>
        </div>
        
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-1">Delete Account</h3>
            <p className="text-sm text-gray-600">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
          </div>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex-shrink-0 ml-4"
          >
            Delete Account
          </button>
        </div>
      </div>
      
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-6">
              <Icon icon="mingcute:alert-fill" className="text-red-500" width={32} />
              <h2 className="text-2xl font-bold text-gray-900">Delete Account?</h2>
            </div>
            
            {/* Warning Message */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-800 font-medium mb-2">
                ⚠️ This action is immediate and permanent!
              </p>
              <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                <li>All your profile data will be deleted</li>
                <li>All your projects will be removed</li>
                <li>All your certifications will be deleted</li>
                <li>All your education history will be removed</li>
                <li>All your employment records will be deleted</li>
                <li>All your skills will be removed</li>
                <li>This action cannot be undone</li>
              </ul>
            </div>
            
            {error && (
              <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded mb-4 flex items-center gap-2">
                <Icon icon="mingcute:close-circle-fill" width={20} />
                <span className="text-sm">{error}</span>
              </div>
            )}
            
            {/* Password Input - Only show for non-OAuth users */}
            {!isOAuthUser && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter your password to confirm: <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Your password"
                  disabled={isDeleting}
                />
              </div>
            )}
            
            {/* OAuth User Notice */}
            {isOAuthUser && (
              <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <Icon icon="mingcute:information-line" className="inline mr-2" width={16} />
                  You signed in with a social account. No password is required to delete your account.
                </p>
              </div>
            )}
            
            {/* Confirmation Text */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type <span className="font-bold text-red-600">DELETE MY ACCOUNT</span> to confirm: <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="DELETE MY ACCOUNT"
                disabled={isDeleting}
              />
            </div>
            
            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={closeModal}
                disabled={isDeleting}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <Icon icon="mingcute:loading-line" className="animate-spin" width={20} />
                    Deleting...
                  </>
                ) : (
                  'Delete My Account'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
