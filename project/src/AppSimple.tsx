import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Student pages
import StudentDashboardSimple from './pages/student/DashboardSimple';

function AppSimple() {
    return (
        <Router>
            <div className="min-h-screen bg-gray-50">
                <Routes>
                    <Route path="/student" element={<StudentDashboardSimple />} />
                    <Route path="*" element={<Navigate to="/student" replace />} />
                </Routes>
            </div>
        </Router>
    );
}

export default AppSimple;
