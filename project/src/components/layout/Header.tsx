import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, BookOpen } from 'lucide-react';
import Button from '../ui/Button';

const Header: React.FC = () => {
  const { state, clearSelection } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    clearSelection();
    navigate('/');
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-3">
            <BookOpen className="w-8 h-8 text-primary-600" />
            <h1 className="text-xl font-bold text-gray-900">EduJagat</h1>
          </div>

          {state.userType && (
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <User className="w-5 h-5 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">
                  Current User
                </span>
                <span className="text-xs px-2 py-1 bg-primary-100 text-primary-800 rounded-full capitalize">
                  {state.userType}
                </span>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                icon={LogOut}
              >
                Logout
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;