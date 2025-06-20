import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserType } from '../contexts/AuthContext';
import { BookOpen, Users, GraduationCap } from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

const UserTypeSelection: React.FC = () => {
    const navigate = useNavigate();
    const { selectUserType, state } = useUserType();

    const handleUserTypeSelect = async (userType: 'student' | 'teacher') => {
        await selectUserType(userType);

        // Navigate based on user type
        if (userType === 'teacher') {
            navigate('/teacher');
        } else {
            navigate('/student');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <div className="flex justify-center">
                        <BookOpen className="w-16 h-16 text-primary-600" />
                    </div>
                    <h2 className="mt-6 text-3xl font-bold text-gray-900">Welcome to EduJagat</h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Choose your role to get started
                    </p>
                </div>

                <Card className="mt-8">
                    <div className="space-y-4">
                        <Button
                            onClick={() => handleUserTypeSelect('teacher')}
                            className="w-full flex items-center justify-center space-x-3 py-4"
                            loading={state.loading}
                            variant="primary"
                        >
                            <GraduationCap className="w-6 h-6" />
                            <span className="text-lg">I'm a Teacher</span>
                        </Button>

                        <Button
                            onClick={() => handleUserTypeSelect('student')}
                            className="w-full flex items-center justify-center space-x-3 py-4"
                            loading={state.loading}
                            variant="secondary"
                        >
                            <Users className="w-6 h-6" />
                            <span className="text-lg">I'm a Student</span>
                        </Button>
                    </div>

                    <div className="mt-6 text-center">
                        <p className="text-xs text-gray-500">
                            You can change this selection anytime from the menu
                        </p>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default UserTypeSelection;
