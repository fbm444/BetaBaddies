import { useState, useEffect, FormEvent } from 'react'
import { Icon } from '@iconify/react'
import { api } from '@/services/api'
import type { JobData, JobInput, JobStatistics } from '@/types'

export function Employment() {
  // State Management
  const [jobs, setJobs] = useState<JobData[]>([])
  const [currentJob, setCurrentJob] = useState<JobData | null>(null)
  const [statistics, setStatistics] = useState<JobStatistics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  
  // Modal States
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedJob, setSelectedJob] = useState<JobData | null>(null)
  
  // View States
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list')
  const [filterMode, setFilterMode] = useState<'all' | 'current' | 'past'>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'company'>('newest')

  // Load data on mount and when filters change
  useEffect(() => {
    fetchJobs()
  }, [filterMode, sortBy])

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 5000)
  }

  const fetchJobs = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const [jobsResponse, statsResponse] = await Promise.all([
        api.getJobs(),
        api.getJobStatistics()
      ])
      
      if (jobsResponse.ok && jobsResponse.data) {
        let jobsList = jobsResponse.data.jobs || []
        
        // Apply filters
        if (filterMode === 'current') {
          jobsList = jobsList.filter(job => job.isCurrent)
        } else if (filterMode === 'past') {
          jobsList = jobsList.filter(job => !job.isCurrent)
        }
        
        // Apply sorting
        jobsList = sortJobs(jobsList, sortBy)
        
        setJobs(jobsList)
        
        // Set current job
        const current = jobsList.find(job => job.isCurrent) || null
        setCurrentJob(current)
      }
      
      if (statsResponse.ok && statsResponse.data) {
        setStatistics(statsResponse.data.statistics)
      }
    } catch (err: any) {
      console.error('Failed to fetch jobs:', err)
      setError(err.message || 'Failed to load employment data')
    } finally {
      setIsLoading(false)
    }
  }

  const sortJobs = (jobsList: JobData[], sortMethod: string) => {
    const sorted = [...jobsList]
    switch (sortMethod) {
      case 'newest':
        return sorted.sort((a, b) => 
          new Date(b.startDate || 0).getTime() - new Date(a.startDate || 0).getTime()
        )
      case 'oldest':
        return sorted.sort((a, b) => 
          new Date(a.startDate || 0).getTime() - new Date(b.startDate || 0).getTime()
        )
      case 'company':
        return sorted.sort((a, b) => a.company.localeCompare(b.company))
      default:
        return sorted
    }
  }

  const handleAddJob = async (jobData: JobInput) => {
    try {
      const response = await api.createJob(jobData)
      if (response.ok) {
        setShowAddModal(false)
        await fetchJobs()
        showMessage('Position added successfully!', 'success')
      }
    } catch (err: any) {
      showMessage(err.message || 'Failed to add position', 'error')
    }
  }

  const handleEditJob = async (jobData: JobInput) => {
    if (!selectedJob) return
    try {
      const response = await api.updateJob(selectedJob.id, jobData)
      if (response.ok) {
        setShowEditModal(false)
        setSelectedJob(null)
        await fetchJobs()
        showMessage('Position updated successfully!', 'success')
      }
    } catch (err: any) {
      showMessage(err.message || 'Failed to update position', 'error')
    }
  }

  const handleDeleteJob = async () => {
    if (!selectedJob) return
    try {
      const response = await api.deleteJob(selectedJob.id)
      if (response.ok) {
        setShowDeleteModal(false)
        setSelectedJob(null)
        await fetchJobs()
        showMessage('Position deleted successfully!', 'success')
      }
    } catch (err: any) {
      showMessage(err.message || 'Failed to delete position', 'error')
    }
  }

  const openEditModal = (job: JobData) => {
    setSelectedJob(job)
    setShowEditModal(true)
  }

  const openDeleteModal = (job: JobData) => {
    setSelectedJob(job)
    setShowDeleteModal(true)
  }

  // Loading State
  if (isLoading) {
    return (
      <div className="p-10 max-w-[1400px] mx-auto font-poppins min-h-full flex items-center justify-center">
        <div className="text-center">
          <Icon icon="mingcute:loading-line" className="animate-spin text-blue-700 mx-auto mb-4" width={48} />
          <div className="text-2xl font-semibold text-slate-900 mb-2">Loading employment history...</div>
          <div className="text-base text-slate-500">Please wait</div>
        </div>
      </div>
    )
  }

  const filteredJobs = filterMode === 'current' 
    ? jobs.filter(job => job.isCurrent)
    : filterMode === 'past'
    ? jobs.filter(job => !job.isCurrent)
    : jobs

  return (
    <div className="p-10 max-w-[1400px] mx-auto font-poppins min-h-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Employment History</h1>
          <p className="text-slate-600">Manage your work experience and career timeline</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-6 py-3 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors font-medium flex items-center gap-2"
        >
          <Icon icon="mingcute:add-line" width={20} />
          Add Position
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Message Banner */}
      {message && (
        <div className={`rounded-xl p-4 mb-6 ${message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      {/* Controls */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-6">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          {/* View Mode Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-blue-700 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Icon icon="mingcute:list-check-line" width={20} className="inline mr-2" />
              List View
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'timeline'
                  ? 'bg-blue-700 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Icon icon="mingcute:timeline-line" width={20} className="inline mr-2" />
              Timeline View
            </button>
          </div>

          {/* Filter */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterMode === 'all'
                  ? 'bg-blue-700 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterMode('current')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterMode === 'current'
                  ? 'bg-green-500 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Current
            </button>
            <button
              onClick={() => setFilterMode('past')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterMode === 'past'
                  ? 'bg-slate-500 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Past
            </button>
          </div>

          {/* Sort */}
          <label htmlFor="sort-select" className="sr-only">
            Sort by
          </label>
          <select
            id="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-700 focus:border-transparent"
            aria-label="Sort jobs by"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="company">Company A-Z</option>
          </select>
        </div>
      </div>

      {/* Statistics */}
      {statistics && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="text-3xl font-bold text-blue-700 mb-2">{statistics.totalJobs}</div>
            <div className="text-sm text-slate-600">Total Positions</div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="text-3xl font-bold text-blue-700 mb-2">{statistics.totalExperienceYears}</div>
            <div className="text-sm text-slate-600">Total Experience</div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="text-3xl font-bold text-blue-700 mb-2">
              {statistics.averageTenureMonths ? `${Math.round(statistics.averageTenureMonths / 12 * 10) / 10}y` : 'N/A'}
            </div>
            <div className="text-sm text-slate-600">Avg Tenure</div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="text-3xl font-bold text-blue-700 mb-2">{statistics.companiesWorked}</div>
            <div className="text-sm text-slate-600">Companies</div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredJobs.length === 0 && (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-slate-200">
          <Icon icon="mingcute:briefcase-line" width={64} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">No Employment Records</h3>
          <p className="text-slate-600 mb-6">
            {filterMode !== 'all' 
              ? `No ${filterMode} positions found. Try changing the filter.`
              : 'Start building your career history by adding your first position.'}
          </p>
          {filterMode === 'all' && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors font-medium inline-flex items-center gap-2"
            >
              <Icon icon="mingcute:add-line" width={20} />
              Add Your First Position
            </button>
          )}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && filteredJobs.length > 0 && (
        <div className="space-y-6">
          {/* Current Position Section */}
          {currentJob && filterMode !== 'past' && (
            <div>
              <h2 className="text-2xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Icon icon="mingcute:star-fill" className="text-green-500" width={24} />
                Current Position
              </h2>
              <JobCard job={currentJob} onEdit={openEditModal} onDelete={openDeleteModal} />
            </div>
          )}

          {/* Past Positions Section */}
          {filteredJobs.filter(job => !job.isCurrent).length > 0 && filterMode !== 'current' && (
            <div>
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">Past Positions</h2>
              <div className="space-y-4">
                {filteredJobs.filter(job => !job.isCurrent).map(job => (
                  <JobCard key={job.id} job={job} onEdit={openEditModal} onDelete={openDeleteModal} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Timeline View */}
      {viewMode === 'timeline' && filteredJobs.length > 0 && (
        <div className="relative">
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200" />
          <div className="space-y-8">
            {filteredJobs.map((job) => (
              <div key={job.id} className="relative pl-16">
                <div className={`absolute left-0 top-0 w-12 h-12 rounded-full flex items-center justify-center shadow-lg ${
                  job.isCurrent ? 'bg-green-500' : 'bg-blue-500'
                }`}>
                  <Icon icon="mingcute:briefcase-line" width={24} className="text-white" />
                </div>
                <JobCard job={job} onEdit={openEditModal} onDelete={openDeleteModal} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <JobFormModal
          title="Add Employment Entry"
          onSubmit={handleAddJob}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {showEditModal && selectedJob && (
        <JobFormModal
          title="Edit Employment Entry"
          initialData={selectedJob}
          onSubmit={handleEditJob}
          onClose={() => {
            setShowEditModal(false)
            setSelectedJob(null)
          }}
        />
      )}

      {showDeleteModal && selectedJob && (
        <DeleteConfirmationModal
          job={selectedJob}
          onConfirm={handleDeleteJob}
          onCancel={() => {
            setShowDeleteModal(false)
            setSelectedJob(null)
          }}
        />
      )}
    </div>
  )
}

// Job Card Component
function JobCard({ job, onEdit, onDelete }: { 
  job: JobData; 
  onEdit: (job: JobData) => void; 
  onDelete: (job: JobData) => void; 
}) {
  const duration = calculateDuration(job.startDate, job.endDate)
  
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-all">
      {/* Current Badge */}
      {job.isCurrent && (
        <span className="inline-block px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full mb-3">
          Current Position
        </span>
      )}
      
      {/* Job Title */}
      <h3 className="text-xl font-semibold text-slate-900 mb-2">{job.title}</h3>
      
      {/* Company and Location */}
      <div className="flex items-center gap-2 text-slate-600 mb-2 flex-wrap">
        <Icon icon="mingcute:building-2-line" width={16} />
        <span className="font-medium">{job.company}</span>
        {job.location && (
          <>
            <span>•</span>
            <Icon icon="mingcute:location-line" width={16} />
            <span>{job.location}</span>
          </>
        )}
      </div>
      
      {/* Dates and Duration */}
      <div className="flex items-center gap-2 text-slate-500 text-sm mb-3 flex-wrap">
        <Icon icon="mingcute:calendar-line" width={16} />
        <span>
          {formatDate(job.startDate)} - {job.isCurrent ? 'Present' : formatDate(job.endDate)}
        </span>
        {duration && (
          <>
            <span>•</span>
            <span>{duration}</span>
          </>
        )}
      </div>
      
      {/* Salary */}
      {job.salary && (
        <div className="text-slate-700 text-sm mb-3 flex items-center gap-2">
          <Icon icon="mingcute:currency-dollar-line" width={16} />
          <span>${job.salary.toLocaleString()}/year</span>
        </div>
      )}
      
      {/* Description */}
      {job.description && (
        <p className="text-slate-600 text-sm mb-4 line-clamp-3">{job.description}</p>
      )}
      
      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onEdit(job)}
          className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2 text-sm font-medium"
        >
          <Icon icon="mingcute:edit-line" width={16} />
          Edit
        </button>
        <button
          onClick={() => onDelete(job)}
          className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2 text-sm font-medium"
        >
          <Icon icon="mingcute:delete-line" width={16} />
          Delete
        </button>
      </div>
    </div>
  )
}

// Job Form Modal Component
function JobFormModal({ 
  title, 
  initialData, 
  onSubmit, 
  onClose 
}: { 
  title: string; 
  initialData?: JobData; 
  onSubmit: (data: JobInput) => void; 
  onClose: () => void; 
}) {
  // Helper function to format ISO date to YYYY-MM-DD for HTML date input
  const formatDateForInput = (dateString: string | null | undefined): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    } catch (e) {
      console.error('Error formatting date:', dateString, e);
      return '';
    }
  };

  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    company: initialData?.company || '',
    location: initialData?.location || '',
    salary: initialData?.salary?.toString() || '',
    startDate: formatDateForInput(initialData?.startDate),
    endDate: formatDateForInput(initialData?.endDate),
    description: initialData?.description || '',
    isCurrent: initialData?.isCurrent || false,
  })
  
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const charCount = formData.description.length

  // Check if form is valid for button state
  const isFormValid = formData.title.trim() && formData.company.trim() && formData.startDate

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.title.trim()) {
      newErrors.title = 'Job title is required'
    }
    
    if (!formData.company.trim()) {
      newErrors.company = 'Company name is required'
    }
    
    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required'
    }
    
    if (formData.startDate && formData.endDate && !formData.isCurrent) {
      if (new Date(formData.endDate) < new Date(formData.startDate)) {
        newErrors.endDate = 'End date must be after start date'
      }
    }
    
    if (formData.isCurrent && formData.endDate) {
      newErrors.isCurrent = 'Current position cannot have an end date'
    }
    
    if (formData.description.length > 2000) {
      newErrors.description = 'Description must be less than 2000 characters'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setIsSubmitting(true)
    
    const jobData: JobInput = {
      title: formData.title.trim(),
      company: formData.company.trim(),
      location: formData.location.trim() || undefined,
      salary: formData.salary ? parseFloat(formData.salary) : undefined,
      startDate: formData.startDate || undefined,
      endDate: formData.isCurrent ? undefined : formData.endDate || undefined,
      description: formData.description.trim() || undefined,
      isCurrent: formData.isCurrent,
    }
    
    await onSubmit(jobData)
    setIsSubmitting(false)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <Icon icon="mingcute:close-line" width={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Job Title */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Job Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Senior Software Engineer"
              disabled={isSubmitting}
            />
            {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
          </div>

          {/* Company */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Company <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., TechCorp Inc."
              disabled={isSubmitting}
            />
            {errors.company && <p className="text-red-500 text-sm mt-1">{errors.company}</p>}
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Location
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., San Francisco, CA"
              disabled={isSubmitting}
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isSubmitting}
              />
              {errors.startDate && <p className="text-red-500 text-sm mt-1">{errors.startDate}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isSubmitting || formData.isCurrent}
              />
              {errors.endDate && <p className="text-red-500 text-sm mt-1">{errors.endDate}</p>}
            </div>
          </div>

          {/* Current Position Checkbox */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isCurrent"
              checked={formData.isCurrent}
              onChange={(e) => setFormData({ ...formData, isCurrent: e.target.checked, endDate: e.target.checked ? '' : formData.endDate })}
              className="w-4 h-4 text-blue-700 border-slate-300 rounded focus:ring-blue-500"
              disabled={isSubmitting}
            />
            <label htmlFor="isCurrent" className="text-sm font-medium text-slate-700">
              I currently work here
            </label>
          </div>
          {errors.isCurrent && <p className="text-red-500 text-sm mt-1">{errors.isCurrent}</p>}

          {/* Salary */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Annual Salary (Optional)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span>
              <input
                type="number"
                value={formData.salary}
                onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                className="w-full pl-8 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="120000"
                disabled={isSubmitting}
                min="0"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Job Description ({charCount}/2000 characters)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Describe your responsibilities and achievements..."
              disabled={isSubmitting}
              maxLength={2000}
            />
            {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 transition-colors font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !isFormValid}
              className="flex-1 px-6 py-3 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Icon icon="mingcute:loading-line" className="animate-spin" width={20} />
                  Saving...
                </>
              ) : (
                'Save Position'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Delete Confirmation Modal
function DeleteConfirmationModal({ 
  job, 
  onConfirm, 
  onCancel 
}: { 
  job: JobData; 
  onConfirm: () => void; 
  onCancel: () => void; 
}) {
  const [isDeleting, setIsDeleting] = useState(false)
  
  const handleDelete = async () => {
    setIsDeleting(true)
    await onConfirm()
    setIsDeleting(false)
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full">
        <div className="flex items-center gap-3 mb-4">
          <Icon icon="mingcute:alert-fill" className="text-red-500" width={32} />
          <h2 className="text-2xl font-bold text-slate-900">Delete Position?</h2>
        </div>
        
        <p className="text-slate-600 mb-4">
          Are you sure you want to delete this position?
        </p>
        
        <div className="bg-slate-50 rounded-lg p-4 mb-4">
          <p className="font-semibold text-slate-900">{job.title}</p>
          <p className="text-sm text-slate-600">{job.company}</p>
        </div>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-yellow-800">
            ⚠️ This action cannot be undone. The employment record will be permanently deleted.
          </p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 px-6 py-3 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 transition-colors font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isDeleting ? (
              <>
                <Icon icon="mingcute:loading-line" className="animate-spin" width={20} />
                Deleting...
              </>
            ) : (
              'Delete Position'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// Helper Functions
function calculateDuration(startDate?: string, endDate?: string): string {
  if (!startDate) return ''
  
  const start = new Date(startDate)
  const end = endDate ? new Date(endDate) : new Date()
  
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
  
  if (months < 1) return 'Less than 1 month'
  
  const years = Math.floor(months / 12)
  const remainingMonths = months % 12
  
  if (years === 0) {
    return `${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}`
  } else if (remainingMonths === 0) {
    return `${years} year${years !== 1 ? 's' : ''}`
  } else {
    return `${years} year${years !== 1 ? 's' : ''} ${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}`
  }
}

function formatDate(dateString?: string): string {
  if (!dateString) return 'Not specified'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    year: 'numeric' 
  })
}
