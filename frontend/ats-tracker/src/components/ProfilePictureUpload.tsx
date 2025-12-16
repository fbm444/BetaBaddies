import { useState, useEffect, useRef } from 'react';
import { Icon } from '@iconify/react';
import { api } from '../services/api';

const DEFAULT_AVATAR = 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_640.png';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];

export default function ProfilePictureUpload() {
  const [currentPicture, setCurrentPicture] = useState<string>(DEFAULT_AVATAR);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fileId, setFileId] = useState<string | null>(null);
  const [isDefault, setIsDefault] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load current profile picture on mount
  useEffect(() => {
    loadCurrentPicture();
  }, []);

  const loadCurrentPicture = async () => {
    try {
      setLoading(true);
      const response = await api.getCurrentProfilePicture();
      
      if (response.ok && response.data?.profilePicture) {
        const { profilePicture } = response.data;
        
        if (!profilePicture.isDefault && profilePicture.filePath) {
          // Use path directly - Vite proxy handles routing
          setCurrentPicture(profilePicture.filePath);
          setFileId(profilePicture.fileId || null);
          setIsDefault(false);
          console.log('Loaded profile picture:', profilePicture.filePath);
        } else {
          setCurrentPicture(DEFAULT_AVATAR);
          setIsDefault(true);
        }
      }
    } catch (err) {
      console.error('Failed to load profile picture:', err);
      // Don't show error to user, just use default
      setCurrentPicture(DEFAULT_AVATAR);
      setIsDefault(true);
    } finally {
      setLoading(false);
    }
  };

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Please select a JPG, PNG, or GIF image';
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      return `File size (${sizeMB}MB) exceeds the maximum allowed size of 5MB`;
    }

    return null;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset previous states
    setError(null);
    setSuccess(null);

    // Validate file
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Create preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
      setSelectedFile(file);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      setError(null);
      
      console.log('Starting upload for file:', selectedFile.name);
      const response = await api.uploadProfilePicture(selectedFile);
      console.log('Upload response:', response);
      
      if (response.ok && response.data) {
        console.log('Upload successful, file path:', response.data.filePath);
        
        setSuccess('Profile picture uploaded successfully!');
        setCurrentPicture(response.data.filePath);
        setFileId(response.data.fileId);
        setIsDefault(false);
        setPreviewUrl(null);
        setSelectedFile(null);
        
        // Clear file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }

        // Dispatch custom event to notify navbar
        window.dispatchEvent(new CustomEvent('profilePictureUpdated', { 
          detail: { filePath: response.data.filePath } 
        }));

        // Auto-dismiss success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
      } else {
        console.error('Upload response not ok:', response);
        setError('Upload failed. Please try again.');
      }
    } catch (err) {
      console.error('Upload failed with error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleCancelPreview = () => {
    setPreviewUrl(null);
    setSelectedFile(null);
    setError(null);
    
    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemove = async () => {
    if (!fileId || isDefault) return;

    // Show confirmation
    if (!window.confirm('Remove your profile picture? This will revert to the default avatar.')) {
      return;
    }

    try {
      setUploading(true);
      setError(null);

      await api.deleteFile(fileId);
      
      setSuccess('Profile picture removed successfully!');
      setCurrentPicture(DEFAULT_AVATAR);
      setFileId(null);
      setIsDefault(true);

      // Dispatch custom event to notify navbar
      window.dispatchEvent(new CustomEvent('profilePictureUpdated', { 
        detail: { filePath: DEFAULT_AVATAR } 
      }));

      // Auto-dismiss success message
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Remove failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove picture. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Icon icon="mingcute:loading-line" className="animate-spin h-8 w-8 text-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      {/* Success Message */}
      {success && (
        <div className="mb-6 w-full p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon icon="mingcute:check-circle-line" width={20} height={20} />
            <span>{success}</span>
          </div>
          <button 
            onClick={() => setSuccess(null)}
            className="text-green-600 hover:text-green-800"
            aria-label="Close success message"
          >
            <Icon icon="mingcute:close-line" width={16} height={16} aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 w-full p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon icon="mingcute:alert-circle-line" width={20} height={20} />
            <span>{error}</span>
          </div>
          <button 
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-800"
            aria-label="Close error message"
          >
            <Icon icon="mingcute:close-line" width={16} height={16} aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Profile Picture Display */}
      <div className="relative mb-6">
        <div className="w-40 h-40 rounded-full overflow-hidden bg-gray-100 border-4 border-gray-200 shadow-lg">
          <img 
            src={previewUrl || currentPicture} 
            alt="Profile" 
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback to default avatar if image fails to load
              e.currentTarget.src = DEFAULT_AVATAR;
            }}
          />
        </div>
        
        {/* Upload Overlay (shown on hover when not previewing) */}
        {!previewUrl && !uploading && (
          <button
            onClick={triggerFileInput}
            aria-label="Upload or change profile picture"
            className="absolute inset-0 rounded-full bg-black bg-opacity-0 hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center group"
          >
            <Icon 
              icon="mingcute:camera-line" 
              className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" 
              width={32} 
              height={32}
              aria-hidden="true"
            />
          </button>
        )}

        {/* Uploading Spinner */}
        {uploading && (
          <div className="absolute inset-0 rounded-full bg-black bg-opacity-50 flex items-center justify-center">
            <Icon 
              icon="mingcute:loading-line" 
              className="text-white animate-spin" 
              width={32} 
              height={32}
            />
          </div>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Preview Actions */}
      {previewUrl && selectedFile && !uploading && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg w-full max-w-md">
          <div className="flex items-center gap-3 mb-3">
            <Icon icon="mingcute:file-line" className="text-blue-600" width={20} height={20} />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
              <p className="text-xs text-gray-600">{formatFileSize(selectedFile.size)}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleUpload}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <Icon icon="mingcute:upload-line" width={18} height={18} />
              Upload
            </button>
            <button
              onClick={handleCancelPreview}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Upload/Replace/Remove Buttons */}
      {!previewUrl && !uploading && (
        <div className="flex flex-wrap gap-3 justify-center">
          <button
            onClick={triggerFileInput}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
          >
            <Icon icon="mingcute:upload-line" width={20} height={20} />
            {isDefault ? 'Upload Picture' : 'Replace Picture'}
          </button>

          {!isDefault && fileId && (
            <button
              onClick={handleRemove}
              className="px-6 py-3 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium flex items-center gap-2"
            >
              <Icon icon="mingcute:delete-line" width={20} height={20} />
              Remove Picture
            </button>
          )}
        </div>
      )}

      {/* Upload Info */}
      <div className="mt-4 text-center text-sm text-gray-600">
        <p>Accepted formats: JPG, PNG, GIF</p>
        <p>Maximum file size: 5MB</p>
        <p className="text-xs mt-1">Images will be automatically resized to 300x300 pixels</p>
      </div>
    </div>
  );
}

