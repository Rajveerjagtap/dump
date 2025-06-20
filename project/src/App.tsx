import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';

// User selection
import UserTypeSelection from './pages/UserTypeSelection';

// Teacher pages
import TeacherDashboard from './pages/teacher/Dashboard';
import CreateAssessment from './pages/teacher/CreateAssessment';
import ViewContent from './pages/teacher/ViewContent';
import Results from './pages/teacher/Results';
import StudentReport from './pages/teacher/StudentReport';

// Student pages
import StudentDashboard from './pages/student/Dashboard';
import StudentDashboardSimple from './pages/student/DashboardSimple';
import StudyContent from './pages/student/StudyContent';
import TakeAssessment from './pages/student/TakeAssessment';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            {/* User type selection - the entry point */}
            <Route path="/" element={<UserTypeSelection />} />

            {/* Teacher routes - no authentication needed */}
            <Route path="/teacher" element={<TeacherDashboard />} />
            <Route path="/teacher/create-assessment" element={<CreateAssessment />} />
            <Route path="/teacher/assessment/:assessmentId/content" element={<ViewContent />} />
            <Route path="/teacher/assessment/new/content" element={<ViewContent />} />
            <Route path="/teacher/results" element={<Results />} />
            <Route path="/teacher/assessment/:assessmentId/results" element={<Results />} />
            <Route path="/teacher/student/:studentId/report" element={<StudentReport />} />

            {/* Student routes - no authentication needed */}
            <Route path="/student" element={<StudentDashboard />} />
            <Route path="/student/test" element={<StudentDashboardSimple />} />
            <Route path="/student/assessment/:assessmentId/study" element={<StudyContent />} />
            <Route path="/student/assessment/:assessmentId/start" element={<TakeAssessment />} />
            <Route path="/student/assessment/:assessmentId/continue" element={<TakeAssessment />} />

            {/* Catch all - redirect to user type selection */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;