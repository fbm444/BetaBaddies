import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { api } from "../services/api";
import {
  ProfessionalContact,
  ContactInput,
} from "../types/network.types";
import { validateEmail, validatePhone, validateUrl } from "../utils/validation";
import { INDUSTRIES } from "../types/jobOpportunity.types";

export function NetworkContacts() {
  const [contacts, setContacts] = useState<ProfessionalContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<ProfessionalContact | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      setIsLoading(true);
      setError(null); // Always clear error at the start
      const filters = searchTerm ? { search: searchTerm } : {};
      const response = await api.getContacts(filters);
      if (response.ok && response.data) {
        setContacts(response.data.contacts);
        setError(null); // Ensure error is cleared on success
      } else {
        // If response is not ok, check if we have existing contacts
        // If we do, client-side filtering will work, so don't show error
        // Only show error if we have no contacts at all
        const hasExistingContacts = contacts.length > 0;
        if (!hasExistingContacts) {
          setError(response.error?.message || "Failed to load contacts. Please try again.");
        } else {
          // We have contacts, so client-side filtering will work - don't show error
          setError(null);
        }
      }
    } catch (err: any) {
      console.error("Failed to fetch contacts:", err);
      // Only set error if we don't have any contacts to show
      // Otherwise, client-side filtering will still work
      const hasExistingContacts = contacts.length > 0;
      if (!hasExistingContacts) {
        setError("Failed to load contacts. Please try again.");
      } else {
        // If we have contacts, client-side filtering will still work - don't show error
        setError(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [searchTerm]);

  const handleAddContact = async (contactData: ContactInput) => {
    try {
      setIsSubmitting(true);
      setError(null);
      const response = await api.createContact(contactData);
      if (response.ok) {
        await fetchContacts();
        setIsAddModalOpen(false);
      } else {
        // Handle validation errors
        if (response.error?.fields) {
          const fieldErrors = Object.entries(response.error.fields)
            .map(([field, message]) => `${field}: ${message}`)
            .join(", ");
          setError(fieldErrors || response.error?.message || "Failed to create contact");
        } else {
          setError(response.error?.message || response.error?.code || "Failed to create contact");
        }
      }
    } catch (err: any) {
      console.error("Failed to create contact:", err);
      // Try to parse validation error fields from detail
      if (err.detail) {
        try {
          const fields = JSON.parse(err.detail);
          const fieldErrors = Object.entries(fields)
            .map(([field, message]) => `${field}: ${message}`)
            .join(", ");
          setError(fieldErrors || err.message);
        } catch {
          setError(err.message || "Failed to create contact. Please try again.");
        }
      } else {
        setError(err.message || "Failed to create contact. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditContact = async (id: string, contactData: Partial<ContactInput>) => {
    try {
      setIsSubmitting(true);
      setError(null);
      const response = await api.updateContact(id, contactData);
      if (response.ok) {
        await fetchContacts();
        setIsEditModalOpen(false);
        setSelectedContact(null);
      } else {
        setError(response.error?.message || "Failed to update contact");
      }
    } catch (err: any) {
      console.error("Failed to update contact:", err);
      setError("Failed to update contact. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteContact = async (id: string) => {
    if (!confirm("Are you sure you want to delete this contact?")) return;

    try {
      setError(null);
      const response = await api.deleteContact(id);
      if (response.ok) {
        await fetchContacts();
      } else {
        setError(response.error?.message || "Failed to delete contact");
      }
    } catch (err: any) {
      console.error("Failed to delete contact:", err);
      setError("Failed to delete contact. Please try again.");
    }
  };

  const filteredContacts = contacts.filter((contact) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      contact.firstName?.toLowerCase().includes(search) ||
      contact.lastName?.toLowerCase().includes(search) ||
      contact.email?.toLowerCase().includes(search) ||
      contact.company?.toLowerCase().includes(search) ||
      contact.jobTitle?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Professional Contacts</h1>
          <p className="text-slate-600">Manage your professional network and relationships</p>
        </div>

        {/* Actions Bar */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6 flex items-center justify-between">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Icon
                icon="mingcute:search-line"
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
                width={20}
                height={20}
              />
              <input
                type="text"
                placeholder="Search contacts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3351FD] focus:border-transparent"
              />
            </div>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="ml-4 px-4 py-2 bg-[#3351FD] text-white rounded-lg hover:bg-[#2a43d4] transition-colors flex items-center gap-2"
          >
            <Icon icon="mingcute:add-line" width={20} height={20} />
            Add Contact
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Contacts List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#3351FD]"></div>
            <p className="mt-4 text-slate-600">Loading contacts...</p>
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
            <Icon icon="mingcute:user-3-line" width={64} height={64} className="mx-auto text-slate-400 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No contacts found</h3>
            <p className="text-slate-600 mb-4">
              {searchTerm ? "Try adjusting your search terms" : "Get started by adding your first contact"}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-4 py-2 bg-[#3351FD] text-white rounded-lg hover:bg-[#2a43d4] transition-colors"
              >
                Add Contact
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredContacts.map((contact) => (
              <div
                key={contact.id}
                className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900">
                      {contact.firstName} {contact.lastName}
                    </h3>
                    {contact.jobTitle && (
                      <p className="text-sm text-slate-600 mt-1">{contact.jobTitle}</p>
                    )}
                    {contact.company && (
                      <p className="text-sm text-slate-500 mt-1">{contact.company}</p>
                    )}
                    {contact.industry && (
                      <p className="text-sm text-slate-600 mt-1">
                        <span className="font-medium">Industry:</span> {contact.industry}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedContact(contact);
                        setIsEditModalOpen(true);
                      }}
                      className="p-2 text-slate-600 hover:text-[#3351FD] hover:bg-slate-50 rounded"
                    >
                      <Icon icon="mingcute:edit-line" width={18} height={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteContact(contact.id)}
                      className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded"
                    >
                      <Icon icon="mingcute:delete-line" width={18} height={18} />
                    </button>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  {contact.email && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Icon icon="mingcute:mail-line" width={16} height={16} />
                      <span>{contact.email}</span>
                    </div>
                  )}
                  {contact.phone && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Icon icon="mingcute:phone-line" width={16} height={16} />
                      <span>{contact.phone}</span>
                    </div>
                  )}
                  {contact.relationshipType && (
                    <div className="inline-block px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs">
                      {contact.relationshipType}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add/Edit Modal */}
        {(isAddModalOpen || isEditModalOpen) && (
          <ContactModal
            isOpen={isAddModalOpen || isEditModalOpen}
            onClose={() => {
              setIsAddModalOpen(false);
              setIsEditModalOpen(false);
              setSelectedContact(null);
              setError(null);
            }}
            onSave={isAddModalOpen ? handleAddContact : (data) => selectedContact && handleEditContact(selectedContact.id, data)}
            contact={selectedContact}
            isSubmitting={isSubmitting}
            backendError={error}
          />
        )}
      </div>
    </div>
  );
}

// Contact Modal Component
function ContactModal({
  isOpen,
  onClose,
  onSave,
  contact,
  isSubmitting,
  backendError,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ContactInput) => void;
  contact?: ProfessionalContact | null;
  isSubmitting: boolean;
  backendError?: string | null;
}) {
  const [formData, setFormData] = useState<ContactInput>({
    firstName: contact?.firstName || "",
    lastName: contact?.lastName || "",
    email: contact?.email || "",
    phone: contact?.phone || "",
    company: contact?.company || "",
    jobTitle: contact?.jobTitle || "",
    industry: contact?.industry || "",
    location: contact?.location || "",
    relationshipType: contact?.relationshipType || "",
    relationshipStrength: contact?.relationshipStrength || "",
    notes: contact?.notes || "",
    linkedinUrl: contact?.linkedinUrl || "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Email is required and must be valid format
    const emailError = validateEmail(formData.email || "", true);
    if (emailError) newErrors.email = emailError;

    // Phone is optional but must be exactly 10 digits if provided
    const phoneError = validatePhone(formData.phone || "", false);
    if (phoneError) newErrors.phone = phoneError;

    const urlError = validateUrl(formData.linkedinUrl || "");
    if (urlError) newErrors.linkedinUrl = urlError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      // Clean up the data: convert empty strings to undefined for optional fields, but keep email
      const cleanedData: ContactInput = {
        firstName: formData.firstName?.trim() || undefined,
        lastName: formData.lastName?.trim() || undefined,
        email: formData.email?.trim() || "", // Email is required - validation will catch if empty
        phone: formData.phone?.trim() || undefined,
        company: formData.company?.trim() || undefined,
        jobTitle: formData.jobTitle?.trim() || undefined,
        industry: formData.industry?.trim() || undefined,
        location: formData.location?.trim() || undefined,
        relationshipType: formData.relationshipType?.trim() || undefined,
        relationshipStrength: formData.relationshipStrength?.trim() || undefined,
        notes: formData.notes?.trim() || undefined,
        linkedinUrl: formData.linkedinUrl?.trim() || undefined,
      };
      // Ensure email is present (should be caught by validation, but double-check)
      if (!cleanedData.email || cleanedData.email.trim() === "") {
        setErrors({ email: "Email is required" });
        return;
      }
      onSave(cleanedData);
    }
  };

  // Display backend errors if they exist
  useEffect(() => {
    if (backendError) {
      // Try to parse field-specific errors from backend
      if (backendError.includes("email")) {
        setErrors((prev) => ({ ...prev, email: backendError }));
      } else if (backendError.includes("phone")) {
        setErrors((prev) => ({ ...prev, phone: backendError }));
      }
    }
  }, [backendError]);

  const handleFieldChange = (field: keyof ContactInput, value: string) => {
    setFormData({ ...formData, [field]: value });
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors({ ...errors, [field]: "" });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900">
            {contact ? "Edit Contact" : "Add Contact"}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {backendError && !errors.email && !errors.phone && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {backendError}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3351FD]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3351FD]"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => handleFieldChange("email", e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#3351FD] ${
                  errors.email ? "border-red-300" : "border-slate-300"
                }`}
                placeholder="example@email.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleFieldChange("phone", e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#3351FD] ${
                  errors.phone ? "border-red-300" : "border-slate-300"
                }`}
                placeholder="(123) 456-7890"
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
              )}
              {!errors.phone && (
                <p className="mt-1 text-xs text-slate-500">Must be exactly 10 digits (optional)</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Company</label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3351FD]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Job Title</label>
              <input
                type="text"
                value={formData.jobTitle}
                onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3351FD]"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Industry</label>
            <select
              value={formData.industry || ""}
              onChange={(e) => setFormData({ ...formData, industry: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3351FD]"
            >
              <option value="">Select Industry</option>
              {INDUSTRIES.map((industry) => (
                <option key={industry} value={industry}>
                  {industry}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">LinkedIn URL</label>
            <input
              type="url"
              value={formData.linkedinUrl}
              onChange={(e) => handleFieldChange("linkedinUrl", e.target.value)}
              placeholder="https://linkedin.com/in/..."
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#3351FD] ${
                errors.linkedinUrl ? "border-red-300" : "border-slate-300"
              }`}
            />
            {errors.linkedinUrl && (
              <p className="mt-1 text-sm text-red-600">{errors.linkedinUrl}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3351FD]"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-[#3351FD] text-white rounded-lg hover:bg-[#2a43d4] disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : contact ? "Update" : "Add"} Contact
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

