import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { Landing } from './pages/Landing'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { Dashboard } from './pages/Dashboard'
import BasicInformation from './pages/BasicInformation'
import { Employment } from './pages/Employment'
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
import { ErrorBoundary } from './components/ErrorBoundary'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ROUTES } from './config/routes'
import { ForgotPassword } from './pages/ForgotPassword'
import { ResetPassword } from './pages/ResetPassword'
import './App.css'

function App() {
  return (
 //   <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme"> 
    <ErrorBoundary>
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
		</Route>
	      </Routes>
	    </div>
    </ErrorBoundary>
   // </ThemeProvider>
  )
}

export default App
