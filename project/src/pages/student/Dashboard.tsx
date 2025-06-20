import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Clock, BookOpen, CheckCircle, BarChart3, Calendar, Timer, AlertCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { API_ENDPOINTS, AssignmentSettings, StudentAssessmentPerformance } from '../../config/api';
import { CURRENT_STUDENT_ID } from '../../config/constants';

interface Assessment {
  id: number;
  topic: string;
  description: string;
  bloom_level: string;
  created_at: string;
  questions_count: number;
  assignment_settings?: AssignmentSettings | null;
}

interface StudentAttempt {
  id: number;
  attempt_number: number;
  started_at: string;
  completed_at?: string;
  total_score?: number;
  max_possible_score?: number;
}

const StudentDashboard: React.FC = () => {
  console.log('StudentDashboard component mounted/rendered');

  const navigate = useNavigate();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [attempts, setAttempts] = useState<{ [assessmentId: number]: StudentAttempt[] }>({});
  const [performanceData, setPerformanceData] = useState<{ [assessmentId: number]: StudentAssessmentPerformance }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add error boundary for any unhandled errors
  React.useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      console.error('Unhandled error in student dashboard:', error);
      setError('An unexpected error occurred. Please refresh the page.');
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  // Fetch assessments and student attempts from backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Fetching assessments from:', API_ENDPOINTS.assessments);
        const response = await fetch(API_ENDPOINTS.assessments);

        if (response.ok) {
          const data = await response.json();
          console.log('Assessments fetched successfully:', data);

          // Sort assessments by created_at date (newest first)
          const sortedAssessments = data.sort((a: Assessment, b: Assessment) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          setAssessments(sortedAssessments);

          // Fetch attempts and performance data for each assessment
          const attemptsData: { [assessmentId: number]: StudentAttempt[] } = {};
          const performanceData: { [assessmentId: number]: StudentAssessmentPerformance } = {};

          for (const assessment of sortedAssessments) {
            try {
              // Fetch attempts data
              const attemptResponse = await fetch(API_ENDPOINTS.getStudentAttempts(CURRENT_STUDENT_ID, assessment.id));
              if (attemptResponse.ok) {
                const studentAttemptsResponse = await attemptResponse.json();
                console.log(`Attempts response for assessment ${assessment.id}:`, studentAttemptsResponse);
                const studentAttempts = studentAttemptsResponse.attempts || [];
                console.log(`Extracted attempts for assessment ${assessment.id}:`, studentAttempts, 'Is array?', Array.isArray(studentAttempts));
                const attempts = Array.isArray(studentAttempts) ? studentAttempts : [];
                attemptsData[assessment.id] = attempts;
              } else {
                console.warn(`Failed to fetch attempts for assessment ${assessment.id}: ${attemptResponse.status}`);
                attemptsData[assessment.id] = [];
              }

              // Fetch detailed performance data
              const performanceResponse = await fetch(API_ENDPOINTS.getStudentAssessmentPerformance(CURRENT_STUDENT_ID, assessment.id));
              if (performanceResponse.ok) {
                const performanceInfo = await performanceResponse.json();
                console.log(`Performance response for assessment ${assessment.id}:`, performanceInfo);
                performanceData[assessment.id] = performanceInfo;
              } else {
                console.warn(`Failed to fetch performance for assessment ${assessment.id}: ${performanceResponse.status}`);
                // Create fallback performance data if needed
                const attempts = attemptsData[assessment.id] || [];
                if (attempts.length > 0) {
                  const completedAttempts = attempts.filter(a => a.completed_at && a.total_score !== undefined);
                  const scores = completedAttempts.map(a => a.total_score || 0);
                  const bestScore = scores.length > 0 ? Math.max(...scores) : 0;
                  const averageScore = scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;

                  // Create fallback performance data structure
                  performanceData[assessment.id] = {
                    student_id: CURRENT_STUDENT_ID,
                    assessment_id: assessment.id,
                    assessment_topic: assessment.topic,
                    performance_summary: {
                      total_attempts: attempts.length,
                      completed_attempts: completedAttempts.length,
                      in_progress_attempts: attempts.filter(a => !a.completed_at).length,
                      best_score: bestScore,
                      average_score: averageScore,
                      latest_score: scores.length > 0 ? scores[scores.length - 1] : 0,
                      improvement_trend: 'stable' as const,
                      total_time_spent_seconds: 0,
                      weak_areas: {}
                    },
                    attempt_control: {
                      max_attempts: assessment.assignment_settings?.max_attempts || 1,
                      remaining_attempts: Math.max(0, (assessment.assignment_settings?.max_attempts || 1) - attempts.length),
                      can_attempt: attempts.length < (assessment.assignment_settings?.max_attempts || 1),
                      due_date_passed: false,
                      retake_allowed: assessment.assignment_settings?.retake_allowed || false
                    },
                    attempt_history: attempts.map(a => ({
                      ...a,
                      student_id: CURRENT_STUDENT_ID,
                      assessment_id: assessment.id,
                      status: a.completed_at ? 'completed' : 'in_progress'
                    })) as any,
                    assignment_settings: assessment.assignment_settings
                  };
                }
              }
            } catch (error) {
              console.error(`Error fetching data for assessment ${assessment.id}:`, error);
              attemptsData[assessment.id] = [];
            }
          }
          setAttempts(attemptsData);
          setPerformanceData(performanceData);
        } else {
          console.error('Failed to fetch assessments:', response.status, response.statusText);
          setError(`Failed to fetch assessments: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        console.error('Error fetching assessments:', error);
        setError(`Error fetching assessments: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const canTakeAssessment = (assessment: Assessment) => {
    const performanceInfo = performanceData[assessment.id];
    if (performanceInfo) {
      return performanceInfo.attempt_control.can_attempt;
    }

    // Fallback to legacy logic
    const assessmentAttempts = attempts[assessment.id] || [];
    const attemptsArray = Array.isArray(assessmentAttempts) ? assessmentAttempts : [];
    const totalAttempts = attemptsArray.length;

    if (!assessment.assignment_settings) return true;

    const { max_attempts, due_date } = assessment.assignment_settings;

    // Check due date
    if (due_date && new Date(due_date) < new Date()) {
      return false;
    }

    // Check max attempts
    if (max_attempts > 0 && totalAttempts >= max_attempts) {
      return false;
    }

    return true;
  };

  const getAssessmentStatus = (assessment: Assessment) => {
    const performanceInfo = performanceData[assessment.id];
    if (performanceInfo) {
      const { attempt_control, performance_summary } = performanceInfo;

      if (attempt_control.due_date_passed) {
        return 'expired';
      }

      if (!attempt_control.can_attempt && performance_summary.completed_attempts > 0) {
        return 'attempts-exhausted';
      }

      if (performance_summary.completed_attempts > 0 && attempt_control.can_attempt) {
        return 'can-retake';
      }

      return performance_summary.completed_attempts > 0 ? 'completed' : 'available';
    }

    // Fallback to legacy logic
    const assessmentAttempts = attempts[assessment.id] || [];
    const attemptsArray = Array.isArray(assessmentAttempts) ? assessmentAttempts : [];
    const completedAttempts = attemptsArray.filter(a => a.completed_at).length;

    return completedAttempts > 0 ? 'completed' : 'available';
  };

  const getRemainingAttempts = (assessment: Assessment) => {
    const performanceInfo = performanceData[assessment.id];
    if (performanceInfo) {
      const remaining = performanceInfo.attempt_control.remaining_attempts;
      return remaining === -1 ? 'Unlimited' : remaining;
    }

    // Fallback to legacy logic
    const assessmentAttempts = attempts[assessment.id] || [];
    const attemptsArray = Array.isArray(assessmentAttempts) ? assessmentAttempts : [];
    const totalAttempts = attemptsArray.length;

    if (!assessment.assignment_settings?.max_attempts) return 'Unlimited';

    const remaining = assessment.assignment_settings.max_attempts - totalAttempts;
    return Math.max(0, remaining);
  };

  const getImprovementIcon = (trend: 'improving' | 'declining' | 'stable') => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'declining':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      default:
        return <Minus className="w-4 h-4 text-gray-600" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const capitalizeFirst = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  const estimateTime = (questionCount: number) => {
    // Estimate 2 minutes per question
    return questionCount * 2;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">Loading assessments...</div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-lg text-red-600 mb-2">Error Loading Dashboard</div>
            <div className="text-sm text-gray-600">{error}</div>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Retry
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  // Calculate overall stats
  const completedAssessments = assessments.filter(a => {
    const performance = performanceData[a.id];
    return performance && performance.performance_summary.completed_attempts > 0;
  }).length;

  const totalAttempts = Object.values(performanceData).reduce((sum, p) => sum + p.performance_summary.total_attempts, 0);
  const averageScore = Object.values(performanceData).length > 0
    ? Object.values(performanceData).reduce((sum, p) => sum + p.performance_summary.average_score, 0) / Object.values(performanceData).length
    : 0;

  const stats = [
    { label: 'Available Assessments', value: assessments.length, icon: BookOpen, color: 'primary' },
    { label: 'Completed', value: completedAssessments, icon: CheckCircle, color: 'success' },
    { label: 'Average Score', value: `${Math.round(averageScore)}%`, icon: BarChart3, color: 'secondary' },
  ];

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Student Dashboard</h1>
          <p className="mt-2 text-gray-600">Take assessments and track your learning progress</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((stat, index) => (
            <Card key={index} className="p-6">
              <div className="flex items-center">
                <div className={`p-3 rounded-lg bg-${stat.color}-100 text-${stat.color}-600`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Available Assessments */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Available Assessments</h2>

          {assessments.length === 0 ? (
            <Card className="p-8 text-center">
              <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Assessments Available</h3>
              <p className="text-gray-600">Check back later for new assessments from your teachers.</p>
            </Card>
          ) : (
            <div className="grid gap-6">
              {assessments.map((assessment) => {
                const isAviation = assessment.topic.toLowerCase().includes('aviation');
                const isPhotosynthesis = assessment.topic.toLowerCase().includes('photosynthesis');
                const status = getAssessmentStatus(assessment);
                const canTake = canTakeAssessment(assessment);
                const performance = performanceData[assessment.id];
                const assessmentAttempts = attempts[assessment.id] || [];
                const completedAttempts = assessmentAttempts.filter(a => a.completed_at);

                return (
                  <Card key={assessment.id} hover className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            {assessment.topic}
                            {isAviation && <span className="text-blue-600">✈️</span>}
                            {isPhotosynthesis && <span className="text-green-600">🌱</span>}
                          </h3>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${status === 'available' ? 'bg-blue-100 text-blue-800' :
                              status === 'can-retake' ? 'bg-yellow-100 text-yellow-800' :
                                status === 'completed' ? 'bg-green-100 text-green-800' :
                                  status === 'attempts-exhausted' ? 'bg-red-100 text-red-800' :
                                    'bg-red-100 text-red-800'
                            }`}>
                            {status === 'available' ? 'Available' :
                              status === 'can-retake' ? 'Can Retake' :
                                status === 'completed' ? 'Completed' :
                                  status === 'attempts-exhausted' ? 'Max Attempts' :
                                    'Expired'}
                          </span>
                        </div>

                        <p className="text-gray-600 mb-4">{assessment.description}</p>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-4">
                          <div>
                            <span className="font-medium">Questions:</span>
                            <div>{assessment.questions_count}</div>
                          </div>
                          <div>
                            <span className="font-medium">Estimated Time:</span>
                            <div>{estimateTime(assessment.questions_count)} min</div>
                          </div>
                          <div>
                            <span className="font-medium">Bloom Level:</span>
                            <div>{capitalizeFirst(assessment.bloom_level)}</div>
                          </div>
                          <div>
                            <span className="font-medium">Created:</span>
                            <div>{formatDate(assessment.created_at)}</div>
                          </div>
                        </div>

                        {/* Assignment Settings Info */}
                        {assessment.assignment_settings && (
                          <div className="bg-gray-50 rounded-lg p-3 mb-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                              {assessment.assignment_settings.due_date && (
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-gray-500" />
                                  <span>Due: {formatDateTime(assessment.assignment_settings.due_date)}</span>
                                </div>
                              )}
                              {assessment.assignment_settings.time_limit_minutes && (
                                <div className="flex items-center gap-2">
                                  <Timer className="w-4 h-4 text-gray-500" />
                                  <span>Time Limit: {assessment.assignment_settings.time_limit_minutes} min</span>
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <span>Attempts: {performance ? performance.performance_summary.total_attempts : assessmentAttempts.length}/{assessment.assignment_settings.max_attempts === -1 ? '∞' : assessment.assignment_settings.max_attempts}</span>
                                <span className="text-gray-400">|</span>
                                <span>Remaining: {getRemainingAttempts(assessment)}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Performance Summary */}
                        {performance && performance.performance_summary.completed_attempts > 0 && (
                          <div className="bg-blue-50 rounded-lg p-3 mb-4">
                            <h4 className="text-sm font-medium text-blue-800 mb-2 flex items-center gap-2">
                              <BarChart3 className="w-4 h-4" />
                              Your Performance
                              {getImprovementIcon(performance.performance_summary.improvement_trend)}
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                              <div>
                                <span className="text-blue-600 font-medium">Best Score:</span>
                                <div className="text-blue-800">{Math.round(performance.performance_summary.best_score)}%</div>
                              </div>
                              <div>
                                <span className="text-blue-600 font-medium">Average:</span>
                                <div className="text-blue-800">{Math.round(performance.performance_summary.average_score)}%</div>
                              </div>
                              <div>
                                <span className="text-blue-600 font-medium">Latest:</span>
                                <div className="text-blue-800">{Math.round(performance.performance_summary.latest_score)}%</div>
                              </div>
                              <div>
                                <span className="text-blue-600 font-medium">Completed:</span>
                                <div className="text-blue-800">{performance.performance_summary.completed_attempts}</div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Recent Attempt History */}
                        {completedAttempts.length > 0 && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Attempts:</h4>
                            <div className="space-y-1">
                              {completedAttempts.slice(-3).map((attempt) => (
                                <div key={attempt.id} className="text-sm text-gray-600 flex justify-between">
                                  <span>Attempt {attempt.attempt_number}</span>
                                  <span>
                                    {attempt.total_score !== undefined && attempt.max_possible_score !== undefined
                                      ? `${Math.round((attempt.total_score / attempt.max_possible_score) * 100)}%`
                                      : 'Completed'}
                                    {attempt.completed_at && ` - ${formatDate(attempt.completed_at)}`}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center space-x-3">
                          <Button
                            onClick={() => navigate(`/student/assessment/${assessment.id}/study`)}
                            icon={BookOpen}
                            variant="outline"
                            className="flex items-center space-x-2"
                          >
                            Study First
                          </Button>

                          <Button
                            onClick={() => navigate(`/student/assessment/${assessment.id}/start`)}
                            icon={canTake ? Play : AlertCircle}
                            className="flex items-center space-x-2"
                            disabled={!canTake}
                          >
                            {canTake ?
                              (status === 'can-retake' ? 'Retake Assessment' : 'Start Assessment') :
                              status === 'expired' ? 'Expired' :
                                status === 'attempts-exhausted' ? 'Max Attempts Reached' :
                                  'Start Assessment'}
                          </Button>
                        </div>

                        <div className="flex items-center text-sm text-gray-500 mt-2">
                          <Clock className="w-4 h-4 mr-1" />
                          Study: ~{Math.ceil(assessment.questions_count * 1.5)} min | Assessment: ~{estimateTime(assessment.questions_count)} min
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Performance Section */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Overall Performance</h2>
          {Object.keys(performanceData).length === 0 ? (
            <Card className="p-6">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Performance Data Yet</h3>
                <p className="text-gray-600">Complete your first assessment to see your performance metrics.</p>
              </div>
            </Card>
          ) : (
            <div className="grid gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{totalAttempts}</div>
                    <div className="text-sm text-gray-600">Total Attempts</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{completedAssessments}</div>
                    <div className="text-sm text-gray-600">Assessments Completed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{Math.round(averageScore)}%</div>
                    <div className="text-sm text-gray-600">Average Score</div>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default StudentDashboard;
