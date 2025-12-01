# Salary Negotiation Feature - Implementation Plan

## Overview
A comprehensive salary negotiation guidance and tracking system that helps users confidently negotiate competitive compensation. This will be a new tab/section accessible from the main navigation, similar to Interviews, Job Opportunities, etc.

---

## 1. Database Schema

### New Table: `salary_negotiations`
```sql
CREATE TABLE IF NOT EXISTS public.salary_negotiations (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(u_id) ON DELETE CASCADE,
    job_opportunity_id uuid NOT NULL REFERENCES job_opportunities(id) ON DELETE CASCADE,
    
    -- Offer Details
    initial_offer_base_salary numeric,
    initial_offer_bonus numeric,
    initial_offer_equity numeric,
    initial_offer_benefits_value numeric,
    initial_offer_total_compensation numeric,
    initial_offer_currency character varying(10) DEFAULT 'USD',
    initial_offer_date date,
    
    -- Negotiation Details
    target_base_salary numeric,
    target_bonus numeric,
    target_equity numeric,
    target_benefits_value numeric,
    target_total_compensation numeric,
    negotiation_strategy text, -- JSON: {timing, approach, priorities}
    talking_points text, -- JSON array of generated talking points
    scripts text, -- JSON: {scenario_name: {script_text, notes}}
    
    -- Market Research
    market_salary_data text, -- JSON: {role, location, percentile_25, percentile_50, percentile_75, percentile_90, source, date}
    market_research_notes text,
    
    -- Counteroffer Tracking
    counteroffer_count integer DEFAULT 0,
    latest_counteroffer_base numeric,
    latest_counteroffer_total numeric,
    counteroffer_history text, -- JSON array of counteroffers
    
    -- Outcome Tracking
    final_base_salary numeric,
    final_bonus numeric,
    final_equity numeric,
    final_benefits_value numeric,
    final_total_compensation numeric,
    negotiation_outcome character varying(50), -- 'accepted', 'rejected', 'pending', 'withdrawn'
    outcome_date date,
    outcome_notes text,
    
    -- Confidence Building
    confidence_exercises_completed text, -- JSON array of exercise IDs
    practice_sessions_completed integer DEFAULT 0,
    
    -- Metadata
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    status character varying(50) DEFAULT 'draft' -- 'draft', 'active', 'completed', 'archived'
);

CREATE INDEX idx_salary_negotiations_user_id ON salary_negotiations(user_id);
CREATE INDEX idx_salary_negotiations_job_opportunity_id ON salary_negotiations(job_opportunity_id);
CREATE INDEX idx_salary_negotiations_status ON salary_negotiations(status);
```

### New Table: `salary_progression_history`
```sql
CREATE TABLE IF NOT EXISTS public.salary_progression_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(u_id) ON DELETE CASCADE,
    negotiation_id uuid REFERENCES salary_negotiations(id) ON DELETE SET NULL,
    job_opportunity_id uuid REFERENCES job_opportunities(id) ON DELETE SET NULL,
    
    -- Salary Details
    base_salary numeric NOT NULL,
    bonus numeric,
    equity numeric,
    benefits_value numeric,
    total_compensation numeric NOT NULL,
    currency character varying(10) DEFAULT 'USD',
    
    -- Context
    role_title character varying(255),
    company character varying(255),
    location character varying(255),
    effective_date date NOT NULL,
    negotiation_type character varying(50), -- 'initial_offer', 'counteroffer', 'final_offer', 'accepted'
    
    -- Metadata
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    notes text
);

CREATE INDEX idx_salary_progression_user_id ON salary_progression_history(user_id);
CREATE INDEX idx_salary_progression_effective_date ON salary_progression_history(effective_date);
```

### New Table: `negotiation_confidence_exercises`
```sql
CREATE TABLE IF NOT EXISTS public.negotiation_confidence_exercises (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(u_id) ON DELETE CASCADE,
    negotiation_id uuid REFERENCES salary_negotiations(id) ON DELETE CASCADE,
    
    exercise_type character varying(50) NOT NULL, -- 'role_play', 'script_practice', 'value_articulation', 'objection_handling'
    exercise_name character varying(255),
    completed_at timestamp with time zone DEFAULT now() NOT NULL,
    notes text,
    self_rating integer, -- 1-5 scale
    practice_script text -- JSON: {scenario, user_response, feedback}
);

CREATE INDEX idx_confidence_exercises_user_id ON negotiation_confidence_exercises(user_id);
CREATE INDEX idx_confidence_exercises_negotiation_id ON negotiation_confidence_exercises(negotiation_id);
```

---

## 2. Backend Architecture

### 2.1 Services

#### `backend/services/salaryNegotiationService.js`
**Purpose**: Core business logic for salary negotiations

**Key Methods**:
- `createNegotiation(userId, jobOpportunityId, offerData)` - Create new negotiation record
- `getNegotiationById(negotiationId, userId)` - Get single negotiation
- `getNegotiationsByUserId(userId, filters)` - Get all negotiations for user
- `getNegotiationByJobOpportunity(jobOpportunityId, userId)` - Get negotiation for specific job
- `updateNegotiation(negotiationId, userId, updates)` - Update negotiation details
- `updateCounteroffer(negotiationId, userId, counterofferData)` - Track counteroffer
- `completeNegotiation(negotiationId, userId, outcomeData)` - Mark negotiation as complete
- `getSalaryProgression(userId)` - Get user's salary progression history
- `addSalaryProgressionEntry(userId, salaryData)` - Add entry to progression history

#### `backend/services/salaryMarketResearchService.js`
**Purpose**: Market salary data research and analysis

**Key Methods**:
- `researchMarketSalary(role, location, experienceLevel, industry)` - Fetch market data
  - **Integration Options**:
    - **Option 1**: Use external API (e.g., Glassdoor API, Payscale API, Salary.com API)
    - **Option 2**: Use OpenAI to analyze job descriptions and provide market insights
    - **Option 3**: Hybrid - use OpenAI with structured prompts to generate market research
  - Returns: `{percentile_25, percentile_50, percentile_75, percentile_90, source, date, notes}`
- `compareOfferToMarket(offerAmount, marketData)` - Compare offer to market
- `getMarketInsights(role, location, industry)` - Get additional market insights

**Market Data Sources (Priority Order)**:
1. **OpenAI-based research** (Primary - no API key needed for external services)
   - Prompt: "Research market salary data for [role] in [location] with [experience] years of experience in [industry]. Provide 25th, 50th, 75th, and 90th percentile salaries."
2. **Fallback**: Static data or user-provided ranges
3. **Future**: Integrate with Glassdoor/Payscale APIs if available

#### `backend/services/salaryNegotiationAIService.js`
**Purpose**: AI-powered generation of talking points, scripts, and guidance

**Key Methods**:
- `generateTalkingPoints(negotiationId, userId, options)` - Generate personalized talking points
  - Uses: User profile, experience, achievements, market data, offer details
  - Returns: Array of talking points with rationale
- `generateNegotiationScripts(negotiationId, userId, scenario)` - Generate scripts for scenarios
  - Scenarios: 'initial_negotiation', 'counteroffer_response', 'benefits_negotiation', 'timing_discussion', 'objection_handling'
  - Returns: Script with key phrases, responses to common objections
- `evaluateCounteroffer(negotiationId, userId, counterofferData)` - Evaluate counteroffer
  - Compares to target, market data, provides recommendation
- `generateTimingStrategy(negotiationId, userId)` - Suggest optimal timing
  - Considers: Offer date, deadline, market conditions, user situation
- `buildConfidenceExercises(negotiationId, userId)` - Generate practice exercises
  - Types: Role-play scenarios, script practice, value articulation, objection handling

**AI Integration**:
- Uses `interviewCommunicationsAIService` pattern
- OpenAI for generation, fallback templates if unavailable
- Caching similar to thank-you notes (check for existing before generating)

#### `backend/services/totalCompensationService.js`
**Purpose**: Total compensation evaluation framework

**Key Methods**:
- `calculateTotalCompensation(compensationData)` - Calculate total comp
  - Input: `{base, bonus, equity, benefits_value, other}`
  - Returns: Total compensation breakdown
- `compareCompensationPackages(offer1, offer2)` - Compare two offers
- `evaluateBenefitsValue(benefitsData, location)` - Estimate benefits value
  - Health insurance, 401k match, PTO, stock options, etc.
- `createCompensationBreakdown(compensationData)` - Visual breakdown for UI

---

### 2.2 Controllers

#### `backend/controllers/salaryNegotiationController.js`
**Endpoints**:
- `POST /api/v1/salary-negotiations` - Create new negotiation
- `GET /api/v1/salary-negotiations` - Get all negotiations for user
- `GET /api/v1/salary-negotiations/:id` - Get single negotiation
- `GET /api/v1/salary-negotiations/job/:jobOpportunityId` - Get negotiation for job
- `PUT /api/v1/salary-negotiations/:id` - Update negotiation
- `POST /api/v1/salary-negotiations/:id/counteroffer` - Add counteroffer
- `PUT /api/v1/salary-negotiations/:id/complete` - Complete negotiation
- `GET /api/v1/salary-negotiations/:id/market-research` - Get market research
- `POST /api/v1/salary-negotiations/:id/market-research` - Trigger market research
- `GET /api/v1/salary-negotiations/:id/talking-points` - Get talking points
- `POST /api/v1/salary-negotiations/:id/talking-points` - Generate talking points
- `GET /api/v1/salary-negotiations/:id/scripts/:scenario` - Get script for scenario
- `POST /api/v1/salary-negotiations/:id/scripts/:scenario` - Generate script
- `POST /api/v1/salary-negotiations/:id/evaluate-counteroffer` - Evaluate counteroffer
- `GET /api/v1/salary-negotiations/:id/timing-strategy` - Get timing strategy
- `GET /api/v1/salary-negotiations/:id/confidence-exercises` - Get confidence exercises
- `POST /api/v1/salary-negotiations/:id/confidence-exercises` - Complete exercise
- `GET /api/v1/salary-progression` - Get salary progression history
- `POST /api/v1/salary-progression` - Add progression entry

---

### 2.3 Routes

#### `backend/routes/salaryNegotiationRoutes.js`
- Mount at `/api/v1/salary-negotiations`
- Include authentication middleware
- Include validation middleware

---

## 3. Frontend Architecture

### 3.1 New Page Component

#### `frontend/ats-tracker/src/pages/SalaryNegotiation.tsx`
**Main page component** with tabs/sections:
- **Overview Tab**: List of all negotiations, quick stats
- **Active Negotiations Tab**: Currently active negotiations
- **Market Research Tab**: Market data for roles/locations
- **Progression Tab**: Salary progression history and charts

### 3.2 Sub-Components

#### `frontend/ats-tracker/src/components/salary-negotiation/`
- `NegotiationCard.tsx` - Card displaying negotiation summary
- `NegotiationDetailModal.tsx` - Full negotiation details modal
- `OfferInputForm.tsx` - Form for entering offer details
- `TotalCompensationCalculator.tsx` - Interactive compensation calculator
- `MarketResearchDisplay.tsx` - Display market salary data with charts
- `TalkingPointsList.tsx` - List of generated talking points
- `NegotiationScripts.tsx` - Scripts for different scenarios
- `CounterofferEvaluator.tsx` - Counteroffer comparison and evaluation
- `TimingStrategyGuide.tsx` - Timing recommendations
- `ConfidenceExercises.tsx` - Practice exercises UI
- `SalaryProgressionChart.tsx` - Chart showing salary progression over time
- `CompensationComparison.tsx` - Side-by-side offer comparison

### 3.3 API Client Methods

#### `frontend/ats-tracker/src/services/api.ts`
Add methods:
- `createSalaryNegotiation(jobOpportunityId, offerData)`
- `getSalaryNegotiations(filters)`
- `getSalaryNegotiation(id)`
- `getSalaryNegotiationByJob(jobOpportunityId)`
- `updateSalaryNegotiation(id, updates)`
- `addCounteroffer(id, counterofferData)`
- `completeNegotiation(id, outcomeData)`
- `getMarketResearch(role, location, experienceLevel, industry)`
- `generateTalkingPoints(id, options)`
- `generateNegotiationScript(id, scenario)`
- `evaluateCounteroffer(id, counterofferData)`
- `getTimingStrategy(id)`
- `getConfidenceExercises(id)`
- `completeConfidenceExercise(id, exerciseData)`
- `getSalaryProgression()`
- `addSalaryProgressionEntry(data)`

### 3.4 Types

#### `frontend/ats-tracker/src/types/index.ts`
Add TypeScript interfaces:
```typescript
interface SalaryNegotiation {
  id: string;
  userId: string;
  jobOpportunityId: string;
  initialOffer: CompensationPackage;
  targetCompensation: CompensationPackage;
  finalCompensation?: CompensationPackage;
  marketData?: MarketSalaryData;
  talkingPoints?: TalkingPoint[];
  scripts?: Record<string, NegotiationScript>;
  counterofferHistory?: Counteroffer[];
  negotiationStrategy?: NegotiationStrategy;
  timingStrategy?: TimingStrategy;
  confidenceExercises?: ConfidenceExercise[];
  status: 'draft' | 'active' | 'completed' | 'archived';
  outcome?: 'accepted' | 'rejected' | 'pending' | 'withdrawn';
  createdAt: string;
  updatedAt: string;
}

interface CompensationPackage {
  baseSalary: number;
  bonus?: number;
  equity?: number;
  benefitsValue?: number;
  totalCompensation: number;
  currency: string;
}

interface MarketSalaryData {
  role: string;
  location: string;
  percentile25: number;
  percentile50: number;
  percentile75: number;
  percentile90: number;
  source: string;
  date: string;
  notes?: string;
}

interface TalkingPoint {
  id: string;
  point: string;
  rationale: string;
  category: 'experience' | 'achievement' | 'market' | 'value';
}

interface NegotiationScript {
  scenario: string;
  script: string;
  keyPhrases: string[];
  commonObjections: Array<{objection: string, response: string}>;
}

interface Counteroffer {
  id: string;
  baseSalary: number;
  totalCompensation: number;
  date: string;
  notes?: string;
}

interface SalaryProgressionEntry {
  id: string;
  baseSalary: number;
  totalCompensation: number;
  roleTitle: string;
  company: string;
  effectiveDate: string;
  negotiationType: string;
}
```

---

## 4. Integration Points

### 4.1 Job Opportunities Integration
- **Link from Job Opportunities**: When a job opportunity status is "Offer", show a "Start Negotiation" button
- **Bidirectional linking**: Negotiation page links back to job opportunity
- **Auto-populate**: When creating negotiation from job opportunity, pre-fill role, company, location

### 4.2 Profile Integration
- **Experience data**: Use profile experience, skills, achievements for talking points generation
- **Current salary**: Use current job salary for progression tracking

### 4.3 Interviews Integration
- **Interview context**: Link negotiations to interviews for context
- **Interview feedback**: Use interview feedback to inform negotiation strategy

---

## 5. User Flow

### 5.1 Creating a Negotiation
1. User receives offer (job opportunity status = "Offer")
2. User clicks "Start Negotiation" from job opportunity page
3. User enters initial offer details (base, bonus, equity, benefits)
4. System calculates total compensation
5. System prompts for market research (role, location, experience)
6. System generates initial market data
7. User sets target compensation
8. System generates talking points and initial scripts
9. Negotiation is created and saved

### 5.2 Active Negotiation
1. User views negotiation detail page
2. Sections available:
   - **Offer Summary**: Initial offer breakdown
   - **Market Research**: Market data with comparison
   - **Talking Points**: Generated talking points (editable)
   - **Scripts**: Scenario-based scripts
   - **Timing Strategy**: When to negotiate, when to respond
   - **Confidence Exercises**: Practice tools
   - **Counteroffer Tracker**: Track counteroffers
3. User can generate/regenerate any section
4. User can update negotiation details
5. User can add counteroffers as they come in

### 5.3 Completing Negotiation
1. User receives final offer
2. User enters final compensation details
3. System evaluates final offer vs. target and market
4. User selects outcome (accepted, rejected, withdrawn)
5. System saves to salary progression history
6. Negotiation marked as completed

---

## 6. AI/ML Features

### 6.1 Talking Points Generation
**Prompt Structure**:
```
You are a salary negotiation coach. Generate personalized talking points for a candidate negotiating a [role] position at [company] in [location].

Candidate Profile:
- Experience: [years] years in [field]
- Current Role: [current role] at [current company]
- Key Achievements: [achievements from profile]
- Skills: [top skills]

Offer Details:
- Base Salary: $[amount]
- Bonus: $[amount]
- Equity: $[amount]
- Total: $[amount]

Market Data:
- 50th percentile: $[amount]
- 75th percentile: $[amount]

Generate 5-7 talking points that:
1. Highlight specific achievements and value
2. Reference market data appropriately
3. Are confident but not aggressive
4. Focus on mutual benefit
5. Include specific examples from their experience

Return as JSON array: [{"point": "...", "rationale": "...", "category": "..."}]
```

### 6.2 Script Generation
**Scenarios**:
- Initial negotiation call/email
- Responding to counteroffer
- Negotiating benefits
- Handling objections ("We don't negotiate", "That's our best offer")
- Timing discussions

**Prompt Structure**:
```
Generate a negotiation script for [scenario] for a [role] position.

Context: [negotiation context]
Talking Points: [selected talking points]

Include:
1. Opening statement
2. Key phrases to use
3. Responses to common objections: [list objections]
4. Closing statement

Return as JSON: {"script": "...", "keyPhrases": [...], "commonObjections": [{"objection": "...", "response": "..."}]}
```

### 6.3 Market Research
**Prompt Structure**:
```
Research market salary data for [role] in [location] with [experience] years of experience in [industry].

Provide:
- 25th percentile salary
- 50th percentile (median) salary
- 75th percentile salary
- 90th percentile salary
- Notes on factors affecting salary (company size, specific skills, etc.)

Return as JSON: {"percentile25": ..., "percentile50": ..., "percentile75": ..., "percentile90": ..., "notes": "..."}
```

---

## 7. UI/UX Design

### 7.1 Main Page Layout
```
┌─────────────────────────────────────────────────┐
│  Salary Negotiation                              │
│  [Overview] [Active] [Market Research] [History] │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌──────────────┐  ┌──────────────┐           │
│  │ Active: 2    │  │ Completed: 5 │           │
│  │ Avg Increase │  │ Total Saved  │           │
│  │ +15%         │  │ $45,000      │           │
│  └──────────────┘  └──────────────┘           │
│                                                  │
│  [Negotiation Cards List]                        │
│  ┌──────────────────────────────────────────┐   │
│  │ Software Engineer @ Google               │   │
│  │ Initial: $120k | Target: $140k          │   │
│  │ Status: Active | Counteroffers: 2       │   │
│  │ [View Details]                            │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

### 7.2 Negotiation Detail Modal/Page
```
┌─────────────────────────────────────────────────┐
│  Software Engineer @ Google                     │
│  [Offer Summary] [Market] [Talking Points]     │
│  [Scripts] [Timing] [Exercises] [Counteroffers] │
├─────────────────────────────────────────────────┤
│                                                  │
│  Offer Summary                                   │
│  ┌──────────────────────────────────────────┐   │
│  │ Base Salary:        $120,000            │   │
│  │ Bonus:              $15,000              │   │
│  │ Equity:             $20,000              │   │
│  │ Benefits Value:     $12,000             │   │
│  │ ────────────────────────────────────────│   │
│  │ Total Compensation: $167,000           │   │
│  └──────────────────────────────────────────┘   │
│                                                  │
│  Market Research                                  │
│  ┌──────────────────────────────────────────┐   │
│  │ 25th: $110k  │ 50th: $130k │ 75th: $150k │   │
│  │ [Chart showing offer vs market]          │   │
│  │ Your offer is at 25th percentile        │   │
│  └──────────────────────────────────────────┘   │
│                                                  │
│  Talking Points [Generate]                        │
│  • "I've led 3 major projects that increased..."│
│  • "Market data shows 75th percentile is..."    │
│  [Edit] [Add]                                    │
│                                                  │
│  Scripts [Generate]                               │
│  [Initial Negotiation] [Counteroffer Response]   │
│  [Objection Handling]                            │
└─────────────────────────────────────────────────┘
```

---

## 8. Implementation Phases

### Phase 1: Core Infrastructure (Week 1)
- [ ] Database schema creation
- [ ] Backend service structure
- [ ] Basic CRUD endpoints
- [ ] Frontend page structure
- [ ] API client methods
- [ ] Type definitions

### Phase 2: Offer Management (Week 1-2)
- [ ] Offer input form
- [ ] Total compensation calculator
- [ ] Offer comparison UI
- [ ] Integration with job opportunities

### Phase 3: Market Research (Week 2)
- [ ] Market research service (OpenAI-based)
- [ ] Market data display with charts
- [ ] Market comparison to offer
- [ ] Caching market research

### Phase 4: AI Generation (Week 2-3)
- [ ] Talking points generation
- [ ] Script generation for scenarios
- [ ] Counteroffer evaluation
- [ ] Timing strategy generation
- [ ] Caching for AI-generated content

### Phase 5: Confidence Building (Week 3)
- [ ] Confidence exercises UI
- [ ] Exercise completion tracking
- [ ] Practice scripts

### Phase 6: Tracking & Analytics (Week 3-4)
- [ ] Salary progression history
- [ ] Progression charts
- [ ] Negotiation outcome tracking
- [ ] Success metrics dashboard

### Phase 7: Polish & Testing (Week 4)
- [ ] UI/UX refinements
- [ ] Error handling
- [ ] Loading states
- [ ] Integration testing
- [ ] User acceptance testing

---

## 9. Testing Strategy

### 9.1 Backend Tests
- Unit tests for services
- Integration tests for API endpoints
- Market research service tests
- AI generation tests (with mocks)

### 9.2 Frontend Tests
- Component tests
- User flow tests
- API integration tests

### 9.3 End-to-End Tests
- Complete negotiation flow
- Market research flow
- Talking points generation
- Script generation

---

## 10. Future Enhancements

- **Real-time market data APIs**: Integrate with Glassdoor, Payscale, etc.
- **Negotiation templates**: Pre-built templates for common scenarios
- **Video practice**: Record and review negotiation practice
- **Peer comparison**: Anonymous peer salary data
- **Negotiation analytics**: Success rate by strategy, industry insights
- **Mobile app**: Mobile-optimized negotiation tools

---

## 11. Acceptance Criteria Checklist

- [x] Research market salary data for specific roles and locations
- [x] Generate negotiation talking points based on experience and achievements
- [x] Provide framework for total compensation evaluation
- [x] Include scripts for different negotiation scenarios
- [x] Suggest timing strategies for salary discussions
- [x] Create counteroffer evaluation templates
- [x] Provide negotiation confidence building exercises
- [x] Track negotiation outcomes and salary progression
- [x] Frontend Verification: Access salary negotiation prep for specific offer, verify market data and talking points

---

## 12. Notes

- **Market Data**: Start with OpenAI-based research, can add real APIs later
- **Caching**: Similar to thank-you notes, cache AI-generated content to save credits
- **Privacy**: Salary data is sensitive - ensure proper access controls
- **Currency**: Support multiple currencies (default USD, allow override)
- **Validation**: Ensure salary values are reasonable (non-negative, logical ranges)

