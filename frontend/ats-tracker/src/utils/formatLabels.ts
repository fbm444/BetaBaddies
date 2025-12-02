/**
 * Format raw database values into user-friendly labels
 */

export function formatApplicationSource(source: string): string {
  const sourceMap: Record<string, string> = {
    'company_website': 'Company Website',
    'job_board': 'Job Board',
    'referral': 'Referral',
    'recruiter': 'Recruiter',
    'networking': 'Networking Event',
    'social_media': 'Social Media',
    'other': 'Other',
  };
  
  return sourceMap[source] || source.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

export function formatApplicationMethod(method: string): string {
  const methodMap: Record<string, string> = {
    'online_form': 'Online Form',
    'email': 'Email',
    'linkedin_easy_apply': 'LinkedIn Easy Apply',
    'recruiter_submission': 'Recruiter Submission',
    'direct_application': 'Direct Application',
    'other': 'Other',
  };
  
  return methodMap[method] || method.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

export function formatActivityType(activityType: string): string {
  const activityMap: Record<string, string> = {
    'research': 'Research',
    'application': 'Application',
    'interview_prep': 'Interview Prep',
    'interview': 'Interview',
    'networking': 'Networking',
    'follow_up': 'Follow-up',
    'offer_negotiation': 'Offer Negotiation',
    'other': 'Other',
  };
  
  return activityMap[activityType] || activityType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

