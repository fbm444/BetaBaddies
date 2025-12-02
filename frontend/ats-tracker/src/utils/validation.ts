// Validation utilities for form fields

export const validateEmail = (email: string, required: boolean = false): string | null => {
  if (!email) {
    if (required) {
      return "Email is required";
    }
    return null; // Empty is allowed (optional field)
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return "Please enter a valid email address";
  }
  return null;
};

export const validatePhone = (phone: string, required: boolean = false): string | null => {
  if (!phone) {
    if (required) {
      return "Phone number is required";
    }
    return null; // Empty is allowed (optional field)
  }
  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, "");
  if (digitsOnly.length !== 10) {
    return "Phone number must be exactly 10 digits";
  }
  return null;
};

export const validateUrl = (url: string): string | null => {
  if (!url) return null; // Empty is allowed (optional field)
  try {
    new URL(url);
    return null;
  } catch {
    return "Please enter a valid URL";
  }
};

export const validateTime = (time: string): string | null => {
  if (!time) return null; // Empty is allowed (optional field)
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(time)) {
    return "Please enter a valid time (HH:MM format)";
  }
  return null;
};

export const validateDate = (date: string): string | null => {
  if (!date) return null; // Empty is allowed (optional field)
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) {
    return "Please enter a valid date";
  }
  return null;
};

export const validateRequired = (value: string | undefined, fieldName: string): string | null => {
  if (!value || value.trim() === "") {
    return `${fieldName} is required`;
  }
  return null;
};

export const validateMaxLength = (value: string | undefined, maxLength: number, fieldName: string): string | null => {
  if (!value) return null;
  if (value.length > maxLength) {
    return `${fieldName} must be no more than ${maxLength} characters`;
  }
  return null;
};

