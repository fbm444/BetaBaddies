# Demo Data Population Script

This script populates the database with comprehensive demo data for Sprint 2 demo presentation.

## Usage

```bash
cd backend
npm run populate:demo
```

Or directly:

```bash
cd backend
node scripts/populateDemoData.js
```

## What It Creates

The script creates a complete demo user account with:

### User Account
- **Email**: `demo@betabaddies.com`
- **Password**: `Demo123!`
- **Full Profile**: Alex Johnson, Senior Software Engineer

### Data Included

1. **Profile**: Complete profile with bio, industry, experience level
2. **Employment History**: 3 jobs (1 current, 2 past)
3. **Education**: Bachelor's degree from UC Berkeley
4. **Skills**: 12 technical and soft skills
5. **Projects**: 3 projects (2 completed, 1 in progress)
6. **Certifications**: 2 certifications (AWS, React)
7. **Job Opportunities**: 6 jobs across all pipeline stages:
   - Interested (Google)
   - Applied (Microsoft)
   - Phone Screen (Netflix)
   - Interview (Airbnb)
   - Offer (Meta)
   - Rejected (Uber)
8. **Prospective Jobs**: 2 additional jobs (legacy table)
9. **Resumes**: 3 resume versions (1 master, 2 tailored)
10. **Cover Letters**: 2 cover letters (1 master, 1 tailored)

## Notes

- If the demo user already exists, the script will clear all existing data and repopulate
- All data is realistic and suitable for demonstration purposes
- Job opportunities are distributed across all pipeline stages for comprehensive demo
- Resumes and cover letters are linked to specific job opportunities

## Demo Flow

This data supports the following demo actions:

1. **Job Management**: View jobs in different stages, drag between stages
2. **Resume Generation**: Use existing resumes, create tailored versions
3. **Cover Letter Generation**: Generate AI cover letters for specific jobs
4. **Pipeline Tracking**: Show complete application pipeline
5. **Analytics**: View statistics across all job opportunities

