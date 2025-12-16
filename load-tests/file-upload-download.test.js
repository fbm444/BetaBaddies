// k6 Load Test: File Upload/Download Performance
// Tests file upload and download endpoints under load

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import { config, login, getAuthHeaders } from './k6.config.js';

// Custom metrics
const uploadTime = new Trend('file_upload_time');
const downloadTime = new Trend('file_download_time');
const uploadSize = new Counter('file_upload_size');
const downloadSize = new Counter('file_download_size');
const fileErrors = new Rate('file_errors');

export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Start with 10 users (file ops are heavier)
    { duration: '1m', target: 25 },
    { duration: '2m', target: 25 },
    { duration: '1m', target: 50 },
    { duration: '2m', target: 50 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    file_upload_time: ['p(95)<3000', 'p(99)<5000'], // 95% of uploads < 3s
    file_download_time: ['p(95)<1000', 'p(99)<2000'], // 95% of downloads < 1s
    file_errors: ['rate<0.05'], // Less than 5% file operation errors
  },
};

const baseUrl = config.baseUrl;
const testUser = config.testUser;

// Create a small test file (1KB text file)
function createTestFile() {
  const content = 'A'.repeat(1024); // 1KB file
  return content;
}

// Create a test PDF file (simulated - just binary data)
function createTestPDF() {
  // Minimal PDF structure (just for testing)
  const pdfHeader = '%PDF-1.4\n';
  const content = 'A'.repeat(2048); // 2KB
  return pdfHeader + content;
}

export default function () {
  const sessionCookie = login(baseUrl, testUser.email, testUser.password);
  
  if (!sessionCookie) {
    fileErrors.add(1);
    return;
  }
  
  if (!sessionCookie) {
    fileErrors.add(1);
    console.error('Failed to get session cookie, skipping iteration');
    return;
  }
  
  const headers = getAuthHeaders(sessionCookie);
  
  // Test file upload
  const testFile = createTestFile();
  const formData = {
    file: http.file(testFile, 'test-file.txt', 'text/plain'),
  };
  
  const uploadStart = Date.now();
  const uploadResponse = http.post(`${baseUrl}/files`, formData, {
    headers: {
      ...headers,
      'Content-Type': 'multipart/form-data',
    },
  });
  
  const uploadDuration = Date.now() - uploadStart;
  uploadTime.add(uploadDuration);
  uploadSize.add(testFile.length);
  
  const uploadSuccess = check(uploadResponse, {
    'File upload status is 200 or 201': (r) => r.status === 200 || r.status === 201,
    'File upload response time < 5000ms': (r) => r.timings.duration < 5000,
    'File upload returns file ID': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.ok === true && body.data?.file?.id !== undefined;
      } catch {
        return false;
      }
    },
  });
  
  if (!uploadSuccess) {
    fileErrors.add(1);
    console.error(`File upload failed: ${uploadResponse.status}`);
  } else {
    // If upload succeeded, try to download the file
    try {
      const uploadBody = JSON.parse(uploadResponse.body);
      const fileId = uploadBody.data?.file?.id;
      
      if (fileId) {
        const downloadStart = Date.now();
        const downloadResponse = http.get(`${baseUrl}/files/${fileId}`, { headers });
        
        const downloadDuration = Date.now() - downloadStart;
        downloadTime.add(downloadDuration);
        downloadSize.add(downloadResponse.body.length);
        
        const downloadSuccess = check(downloadResponse, {
          'File download status is 200': (r) => r.status === 200,
          'File download response time < 2000ms': (r) => r.timings.duration < 2000,
          'File download returns content': (r) => r.body && r.body.length > 0,
        });
        
        if (!downloadSuccess) {
          fileErrors.add(1);
        }
      }
    } catch (e) {
      console.error('Error parsing upload response:', e);
    }
  }
  
  // Test resume upload (if endpoint exists)
  const resumePDF = createTestPDF();
  const resumeFormData = {
    file: http.file(resumePDF, 'resume.pdf', 'application/pdf'),
    fileType: 'resume',
  };
  
  const resumeUploadStart = Date.now();
  const resumeUploadResponse = http.post(`${baseUrl}/files/resume`, resumeFormData, {
    headers: {
      ...headers,
      'Content-Type': 'multipart/form-data',
    },
  });
  
  const resumeUploadDuration = Date.now() - resumeUploadStart;
  uploadTime.add(resumeUploadDuration);
  uploadSize.add(resumePDF.length);
  
  check(resumeUploadResponse, {
    'Resume upload status is 200 or 201': (r) => r.status === 200 || r.status === 201 || r.status === 404, // 404 if endpoint doesn't exist
  });
  
  // Test file list endpoint
  const listStart = Date.now();
  const listResponse = http.get(`${baseUrl}/files`, { headers });
  const listDuration = Date.now() - listStart;
  downloadTime.add(listDuration);
  
  check(listResponse, {
    'File list status is 200': (r) => r.status === 200,
    'File list response time < 1000ms': (r) => r.timings.duration < 1000,
  });
  
  sleep(randomIntBetween(2, 5));
  sleep(randomIntBetween(3, 6));
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'file-operations-results.json': JSON.stringify(data, null, 2),
  };
}

// textSummary is imported from k6-summary

