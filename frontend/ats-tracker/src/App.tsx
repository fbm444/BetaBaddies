import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { Landing } from './pages/Landing'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { Dashboard } from './pages/Dashboard'
import BasicInformation from './pages/BasicInformation'
import { Employment } from './pages/Employment'
import { JobOpportunities } from './pages/JobOpportunities'
import { JobStatistics } from './pages/JobStatistics'
import { Skills } from './pages/Skills'
import { Education } from './pages/Education'
import { Projects } from './pages/Projects'
import { Certifications } from './pages/Certifications'
import { Settings } from './pages/Settings'
import { Resumes } from './pages/Resumes'
import { ResumeBuilder } from './pages/ResumeBuilder'
import { ResumeTemplates } from './pages/ResumeTemplates'
import { ResumePreview } from './pages/ResumePreview'
import { AITailoringPage } from './pages/AITailoringPage'
import { CoverLetters } from './pages/CoverLetters'
import { CoverLetterTemplates } from './pages/CoverLetterTemplates'
import { CoverLetterBuilder } from './pages/CoverLetterBuilder'
import { CompanyResearch } from './pages/CompanyResearch'
import { InterviewScheduling } from './pages/InterviewScheduling'
import { Analytics } from './pages/Analytics'
import { MarketIntelligence } from './pages/MarketIntelligence'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ROUTES } from './config/routes'
import { ForgotPassword } from './pages/ForgotPassword'
import { ResetPassword } from './pages/ResetPassword'
import './App.css'

function App() {
  return (
 //   <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme"> 
    <ErrorBoundary
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center space-y-4">
            <h1 className="text-2xl font-bold text-red-600">Something went wrong</h1>
            <p className="text-slate-700">
              The application encountered an unexpected error. Try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition"
            >
              Reload Page
            </button>
          </div>
        </div>
      }
    >
	    <div className="app">
	      <Routes>
		{/* Landing page - public, no auth required */}
		<Route path={ROUTES.LANDING} element={<Landing />} />
		
		{/* Login page - redirect to dashboard if already authenticated */}
		<Route 
		  path={ROUTES.LOGIN} 
		  element={
		    <ProtectedRoute requireAuth={false}>
		      <Login />
		    </ProtectedRoute>
		  } 
		/>
		
		{/* Register page - redirect to dashboard if already authenticated */}
		<Route 
		  path={ROUTES.REGISTER} 
		  element={
		    <ProtectedRoute requireAuth={false}>
		      <Register />
		    </ProtectedRoute>
		  } 
		/>
		<Route 
			path={ROUTES.FORGOT_PASSWORD} 
			element={
				<ProtectedRoute requireAuth={false}>
				<ForgotPassword />
				</ProtectedRoute>
			} 
			/>

			<Route 
			path={ROUTES.RESET_PASSWORD} 
			element={
				<ProtectedRoute requireAuth={false}>
				<ResetPassword />
				</ProtectedRoute>
			} 
		/>
		
		{/* Protected pages - require authentication */}
		<Route 
		  element={
		    <ProtectedRoute>
		      <Layout />
		    </ProtectedRoute>
		  }
		>
		  <Route path={ROUTES.DASHBOARD} element={<Dashboard />} />
		  <Route path={ROUTES.BASIC_INFO} element={<BasicInformation />} />
		  <Route path={ROUTES.EMPLOYMENT} element={<Employment />} />
		  <Route path={ROUTES.JOB_OPPORTUNITIES} element={<JobOpportunities />} />
		  <Route path={ROUTES.JOB_STATISTICS} element={<JobStatistics />} />
		  <Route path={ROUTES.COMPANY_RESEARCH} element={<CompanyResearch />} />
		  <Route path={ROUTES.INTERVIEW_SCHEDULING} element={<InterviewScheduling />} />
		  <Route path={ROUTES.ANALYTICS} element={<Analytics />} />
		  <Route path={ROUTES.MARKET_INTELLIGENCE} element={<MarketIntelligence />} />
		  <Route path={ROUTES.SKILLS} element={<Skills />} />
		  <Route path={ROUTES.EDUCATION} element={<Education />} />
		  <Route path={ROUTES.PROJECTS} element={<Projects />} />
		  <Route path={ROUTES.CERTIFICATIONS} element={<Certifications />} />
		  <Route path={ROUTES.SETTINGS} element={<Settings />} />
		  <Route path={ROUTES.RESUMES} element={<Resumes />} />
		  <Route path={ROUTES.RESUME_BUILDER} element={<ResumeBuilder />} />
		  <Route path={ROUTES.RESUME_TEMPLATES} element={<ResumeTemplates />} />
		  <Route path={ROUTES.RESUME_PREVIEW} element={<ResumePreview />} />
		  <Route path={ROUTES.RESUME_AI_TAILORING} element={<AITailoringPage />} />
		  <Route path={ROUTES.COVER_LETTERS} element={<CoverLetters />} />
		  <Route path={ROUTES.COVER_LETTER_BUILDER} element={<CoverLetterBuilder />} />
		  <Route path={ROUTES.COVER_LETTER_TEMPLATES} element={<CoverLetterTemplates />} />
		</Route>
	      </Routes>
	    </div>
    </ErrorBoundary>
   // </ThemeProvider>
  )
}

export default App
