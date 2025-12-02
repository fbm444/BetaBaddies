# Collaboration Services

This folder contains all services related to multi-user collaboration features.

## Services

### Core Collaboration Services

- **`chatService.js`** - Chat/messaging system for team communication, mentor-mentee chats, document review discussions, etc.
- **`teamService.js`** - Team account management, member management, invitations, permissions, and team dashboards
- **`mentorDashboardService.js`** - Mentor dashboard functionality, mentee progress tracking, coaching insights, and feedback
- **`documentReviewService.js`** - Collaborative document review (resumes, cover letters) with comments and suggestions
- **`progressShareService.js`** - Progress sharing and accountability features, milestone tracking
- **`jobShareService.js`** - Job opportunity sharing with teams and collaborative comments
- **`taskService.js`** - Task assignment and tracking for mentors/admins to assign tasks to candidates

## Usage

Import services from the centralized index:

```javascript
import {
  chatService,
  teamService,
  mentorDashboardService,
  documentReviewService,
  progressShareService,
  jobShareService,
  taskService,
} from "../services/collaboration/index.js";
```

## Database Tables

All collaboration features use the following database tables:

### Team Management

- `teams` - Team accounts
- `team_members` - Team membership and roles
- `team_invitations` - Team invitation system
- `team_billing` - Team billing information
- `team_dashboards` - Team dashboard data

### Chat/Messaging

- `chat_conversations` - Chat conversations
- `chat_participants` - Conversation participants
- `chat_messages` - Individual messages
- `message_reactions` - Message reactions (likes, etc.)
- `chat_notifications` - Unread message notifications

### Collaboration Features

- `activity_logs` - Team activity feed
- `preparation_tasks` - Assigned tasks
- `shared_jobs` - Shared job opportunities
- `job_comments` - Comments on shared jobs
- `document_review_requests` - Document review requests
- `review_comments` - Comments on document reviews
- `document_versions` - Document version history
- `progress_shares` - Progress sharing configurations
- `milestones` - Achievement milestones

## Related Controllers

- `backend/controllers/teamController.js` - Team management endpoints
- `backend/controllers/chatController.js` - Chat/messaging endpoints
- `backend/controllers/collaborationController.js` - Collaboration feature endpoints

## Related Routes

- `backend/routes/teamRoutes.js` - `/api/v1/teams/*`
- `backend/routes/chatRoutes.js` - `/api/v1/chat/*`
- `backend/routes/collaborationRoutes.js` - `/api/v1/collaboration/*`
