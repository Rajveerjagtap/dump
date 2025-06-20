import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, CheckCircle, XCircle, AlertTriangle, BarChart3 } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

const StudentReport: React.FC = () => {
  const navigate = useNavigate();
  const { studentId } = useParams();

  // Mock data - replace with actual API integration
  const studentData = {
    id: studentId,
    name: 'Alice Johnson',
    email: 'alice@school.edu',
    assessment: 'Photosynthesis in Plants',
    completedAt: '2024-01-15T14:30:00Z',
    totalTime: 1800, // 30 minutes
    score: 14,
    totalQuestions: 15,
    accuracy: 93.3,
    confusedQuestions: 2
  };

  const questionAnalysis = [
    {
      id: 1,
      question: 'What does the word "photosynthesis" literally mean?',
      studentAnswer: 'Light and putting together',
      correctAnswer: 'Light and putting together',
      isCorrect: true,
      timeSpent: 45,
      wasConfused: false,
      bloomLevel: 'Remember'
    },
    {
      id: 2,
      question: 'Where does photosynthesis primarily occur in plants?',
      studentAnswer: 'Leaves',
      correctAnswer: 'Leaves',
      isCorrect: true,
      timeSpent: 30,
      wasConfused: false,
      bloomLevel: 'Remember'
    },
    {
      id: 3,
      question: 'Which of the following best describes the overall equation for photosynthesis?',
      studentAnswer: '6CO₂ + 6H₂O + light energy → C₆H₁₂O₆ + 6O₂',
      correctAnswer: '6CO₂ + 6H₂O + light energy → C₆H₁₂O₆ + 6O₂',
      isCorrect: true,
      timeSpent: 120,
      wasConfused: true,
      bloomLevel: 'Understand'
    },
    {
      id: 4,
      question: 'What is the primary function of chlorophyll in photosynthesis?',
      studentAnswer: 'To produce oxygen',
      correctAnswer: 'To capture light energy',
      isCorrect: false,
      timeSpent: 90,
      wasConfused: true,
      bloomLevel: 'Understand'
    },
    {
      id: 5,
      question: 'Why is photosynthesis important for life on Earth?',
      studentAnswer: 'It produces oxygen and forms the base of food chains',
      correctAnswer: 'It produces oxygen and forms the base of food chains',
      isCorrect: true,
      timeSpent: 75,
      wasConfused: false,
      bloomLevel: 'Analyze'
    }
  ];

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const correctAnswers = questionAnalysis.filter(q => q.isCorrect).length;
  const incorrectAnswers = questionAnalysis.filter(q => !q.isCorrect).length;
  const confusedQuestions = questionAnalysis.filter(q => q.wasConfused).length;

  const bloomLevelStats = questionAnalysis.reduce((acc, q) => {
    acc[q.bloomLevel] = acc[q.bloomLevel] || { total: 0, correct: 0 };
    acc[q.bloomLevel].total++;
    if (q.isCorrect) acc[q.bloomLevel].correct++;
    return acc;
  }, {} as Record<string, { total: number; correct: number }>);

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/teacher/results')}
            icon={ArrowLeft}
          >
            Back to Results
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Student Report</h1>
            <p className="text-gray-600">{studentData.name} - {studentData.assessment}</p>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <Card className="text-center">
            <CheckCircle className="w-8 h-8 text-success-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-success-600">{correctAnswers}</div>
            <div className="text-gray-600">Correct Answers</div>
          </Card>
          
          <Card className="text-center">
            <XCircle className="w-8 h-8 text-error-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-error-600">{incorrectAnswers}</div>
            <div className="text-gray-600">Incorrect Answers</div>
          </Card>
          
          <Card className="text-center">
            <Clock className="w-8 h-8 text-primary-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-primary-600">{formatTime(studentData.totalTime)}</div>
            <div className="text-gray-600">Total Time</div>
          </Card>
          
          <Card className="text-center">
            <AlertTriangle className="w-8 h-8 text-warning-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-warning-600">{confusedQuestions}</div>
            <div className="text-gray-600">Confused Questions</div>
          </Card>
          
          <Card className="text-center">
            <BarChart3 className="w-8 h-8 text-secondary-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-secondary-600">{studentData.accuracy.toFixed(1)}%</div>
            <div className="text-gray-600">Accuracy</div>
          </Card>
        </div>

        {/* Assessment Details */}
        <Card>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Assessment Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div>
              <span className="font-medium text-gray-700">Student:</span>
              <div className="text-gray-900">{studentData.name}</div>
              <div className="text-gray-600">{studentData.email}</div>
            </div>
            <div>
              <span className="font-medium text-gray-700">Assessment:</span>
              <div className="text-gray-900">{studentData.assessment}</div>
            </div>
            <div>
              <span className="font-medium text-gray-700">Completed:</span>
              <div className="text-gray-900">{formatDate(studentData.completedAt)}</div>
            </div>
          </div>
        </Card>

        {/* Bloom Level Performance */}
        <Card>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Performance by Bloom Level</h2>
          <div className="space-y-4">
            {Object.entries(bloomLevelStats).map(([level, stats]) => (
              <div key={level} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{level}</div>
                  <div className="text-sm text-gray-600">
                    {stats.correct} of {stats.total} questions correct
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full"
                      style={{ width: `${(stats.correct / stats.total) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-12">
                    {Math.round((stats.correct / stats.total) * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Question-by-Question Analysis */}
        <Card>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Question Analysis</h2>
          <div className="space-y-6">
            {questionAnalysis.map((question, index) => (
              <div key={question.id} className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="font-medium text-gray-900">Question {index + 1}</span>
                      <span className="text-xs px-2 py-1 bg-primary-100 text-primary-800 rounded-full">
                        {question.bloomLevel}
                      </span>
                      {question.wasConfused && (
                        <span className="text-xs px-2 py-1 bg-warning-100 text-warning-800 rounded-full">
                          Confused
                        </span>
                      )}
                    </div>
                    <p className="text-gray-700 mb-4">{question.question}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {question.isCorrect ? (
                      <CheckCircle className="w-6 h-6 text-success-600" />
                    ) : (
                      <XCircle className="w-6 h-6 text-error-600" />
                    )}
                    <span className="text-sm text-gray-600">{formatTime(question.timeSpent)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Student Answer:</span>
                    <div className={`mt-1 p-3 rounded-lg ${
                      question.isCorrect 
                        ? 'bg-success-50 text-success-800' 
                        : 'bg-error-50 text-error-800'
                    }`}>
                      {question.studentAnswer}
                    </div>
                  </div>
                  {!question.isCorrect && (
                    <div>
                      <span className="text-sm font-medium text-gray-700">Correct Answer:</span>
                      <div className="mt-1 p-3 bg-success-50 text-success-800 rounded-lg">
                        {question.correctAnswer}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default StudentReport;