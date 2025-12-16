import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { api } from '../services/api';
import { ProfileData, ProfileInput } from '../types';
import ProfilePictureUpload from '../components/ProfilePictureUpload';

export default function BasicInformation() {
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    phone: '',
    city: '',
    state: '',
    jobTitle: '',
    bio: '',
    industry: '',
    expLevel: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [charCount, setCharCount] = useState(0);

  const industries = [
    'Technology',
    'Finance',
    'Healthcare',
    'Education',
    'Marketing',
    'Manufacturing',
    'Retail',
    'Consulting',
    'Government',
    'Non-profit',
    'Other',
  ];

  const experienceLevels = [
    { value: 'Entry', label: 'Entry Level (0-2 years)' },
    { value: 'Mid', label: 'Mid Level (3-5 years)' },
    { value: 'Senior', label: 'Senior Level (6-10 years)' },
  ];

  // Load profile data on component mount
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getProfile();
      if (response.data?.profile) {
        const profile = response.data.profile;
        setFormData({
          firstName: profile.first_name || '',
          middleName: profile.middle_name || '',
          lastName: profile.last_name || '',
          phone: profile.phone || '',
          city: profile.city || '',
          state: profile.state || '',
          jobTitle: profile.job_title || '',
          bio: profile.bio || '',
          industry: profile.industry || '',
          expLevel: profile.exp_level || '',
        });
        setCharCount(profile.bio?.length || 0);
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    if (name === 'bio') {
      if (value.length <= 500) {
        setFormData({ ...formData, [name]: value });
        setCharCount(value.length);
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    // Validation
    if (!formData.firstName.trim()) {
      setError('First name is required');
      setSaving(false);
      return;
    }
    if (!formData.lastName.trim()) {
      setError('Last name is required');
      setSaving(false);
      return;
    }
    if (!formData.state.trim()) {
      setError('State is required');
      setSaving(false);
      return;
    }

    // State validation (must be 2 characters)
    if (formData.state.length !== 2) {
      setError('State must be a 2-character code (e.g., CA, NY, TX)');
      setSaving(false);
      return;
    }

    // Experience level validation
    if (formData.expLevel && !['Entry', 'Mid', 'Senior'].includes(formData.expLevel)) {
      setError('Experience level must be one of: Entry, Mid, Senior');
      setSaving(false);
      return;
    }

    try {
      // Transform form data to match backend expectations
      const profileData = {
        firstName: formData.firstName.trim(),
        middleName: formData.middleName.trim() || undefined,
        lastName: formData.lastName.trim(),
        phone: formData.phone.trim() || undefined,
        city: formData.city.trim() || undefined,
        state: formData.state.trim().toUpperCase(),
        jobTitle: formData.jobTitle.trim() || undefined,
        bio: formData.bio.trim() || undefined,
        industry: formData.industry.trim() || undefined,
        expLevel: formData.expLevel || undefined,
      };

      await api.createOrUpdateProfile(profileData);
      setMessage('Profile saved successfully!');
      setTimeout(() => setMessage(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    loadProfile();
    setError(null);
    setMessage(null);
  };

  if (loading) {
    return (
      <div className="p-10 max-w-[1400px] mx-auto bg-white font-sans min-h-full">
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-10 max-w-[1400px] mx-auto bg-white font-sans min-h-full">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">Basic Information</h1>
        <p className="text-lg text-gray-600">Manage your personal details and contact information</p>
      </div>

      {/* Message Display */}
      {message && (
        <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg flex items-center justify-between">
          <span>{message}</span>
          <button 
            onClick={() => setMessage(null)}
            className="text-green-600 hover:text-green-800"
          >
            <Icon icon="mingcute:close-line" className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button 
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-800"
          >
            <Icon icon="mingcute:close-line" className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Profile Picture Section */}
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <Icon icon="mingcute:camera-line" className="text-blue-600" width={24} />
          <h2 className="text-2xl font-semibold text-gray-800">Profile Picture</h2>
        </div>
        <ProfilePictureUpload />
      </div>

      {/* Profile Form */}
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
        <div className="flex items-center gap-3 mb-6">
          <Icon icon="mingcute:user-line" className="text-blue-600" width={24} />
          <h2 className="text-2xl font-semibold text-gray-800">Personal Information</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your first name"
                required
                disabled={saving}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your last name"
                required
                disabled={saving}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Middle Name
              </label>
              <input
                type="text"
                name="middleName"
                value={formData.middleName}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your middle name (optional)"
                disabled={saving}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="(555) 123-4567"
                disabled={saving}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your city"
                disabled={saving}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="CA, NY, TX, etc."
                maxLength={2}
                required
                disabled={saving}
              />
              <p className="text-xs text-gray-500 mt-1">Enter 2-letter state code</p>
            </div>
          </div>

          {/* Professional Information */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center gap-3 mb-6">
              <Icon icon="mingcute:briefcase-line" className="text-blue-600" width={24} />
              <h3 className="text-xl font-semibold text-gray-800">Professional Information</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Job Title
                </label>
                <input
                  type="text"
                  name="jobTitle"
                  value={formData.jobTitle}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Senior Software Engineer"
                  disabled={saving}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Industry
                </label>
                <select
                  name="industry"
                  value={formData.industry}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={saving}
                >
                  <option value="">Select Industry</option>
                  {industries.map((industry) => (
                    <option key={industry} value={industry}>
                      {industry}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label htmlFor="exp-level-select" className="block text-sm font-medium text-gray-700 mb-2">
                  Experience Level
                </label>
                <select
                  id="exp-level-select"
                  name="expLevel"
                  value={formData.expLevel}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-700 focus:border-transparent"
                  disabled={saving}
                >
                  <option value="">Select Experience Level</option>
                  {experienceLevels.map((level) => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Bio Section */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center gap-3 mb-6">
              <Icon icon="mingcute:file-text-line" className="text-blue-600" width={24} />
              <h3 className="text-xl font-semibold text-gray-800">About You</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Professional Bio ({charCount}/500 characters)
              </label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={6}
                placeholder="Tell us about yourself, your professional background, and what makes you unique..."
                disabled={saving}
                maxLength={500}
              />
              <div className="flex justify-between items-center mt-2">
                <p className="text-sm text-gray-500">
                  A compelling bio helps recruiters understand your background and expertise
                </p>
                <span className={`text-sm ${charCount > 450 ? 'text-amber-600' : 'text-gray-500'}`}>
                  {charCount}/500
                </span>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleCancel}
              disabled={saving}
              className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Icon icon="mingcute:loading-line" className="animate-spin h-4 w-4" />
                  Saving...
                </>
              ) : (
                <>
                  <Icon icon="mingcute:save-line" className="h-4 w-4" />
                  Save Profile
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
