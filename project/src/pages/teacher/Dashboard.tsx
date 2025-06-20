import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, BookOpen, Users, BarChart3, Eye, Trash2, TrendingUp, Award, Clock, Target } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { API_ENDPOINTS, AssignmentSettings } from '../../config/api';

interface Assessment {
  id: number;
  topic: string;
  description: string;
  bloom_level: string;
  created_at: string;
  questions_count: number;
  assignment_settings?: AssignmentSettings | null;
}

interface AssessmentStatistics {
  total_students: number;
  completed_students: number;
  average_score: number;
  pass_rate: number;
  average_time_seconds: number;
}

interface ClassStatistics {
  total_assessments: number;
  total_students_enrolled: number;
  total_assessments_completed: number;
  overall_average_score: number;
  overall_pass_rate: number;
}

const TeacherDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [classStats, setClassStats] = useState<ClassStatistics | null>(null);
  const [assessmentStats, setAssessmentStats] = useState<{ [key: number]: AssessmentStatistics }>({});
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; assessment: Assessment | null }>({
    show: false,
    assessment: null
  });
  const [deleting, setDeleting] = useState(false);

  // Fetch assessments and class statistics
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch assessments
        const assessmentsResponse = await fetch(API_ENDPOINTS.assessments);
        if (assessmentsResponse.ok) {
          const assessmentsData = await assessmentsResponse.json();
          const sortedAssessments = assessmentsData.sort((a: Assessment, b: Assessment) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          setAssessments(sortedAssessments);

          // Fetch individual assessment statistics
          const statsData: { [key: number]: AssessmentStatistics } = {};
          for (const assessment of sortedAssessments) {
            try {
              const statResponse = await fetch(API_ENDPOINTS.assessmentStatistics(assessment.id));
              if (statResponse.ok) {
                const statData = await statResponse.json();
                if (statData.statistics) {
                  statsData[assessment.id] = statData.statistics;
                }
              }
            } catch (error) {
              console.warn(`Failed to fetch stats for assessment ${assessment.id}:`, error);
            }
          }
          setAssessmentStats(statsData);
        }

        // Fetch class statistics
        const statsResponse = await fetch(API_ENDPOINTS.classStatistics);
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setClassStats(statsData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleDeleteAssessment = async () => {
    if (!deleteModal.assessment) return;

    setDeleting(true);
    try {
      const response = await fetch(API_ENDPOINTS.deleteAssessment(deleteModal.assessment.id), {
        method: 'DELETE',
      });

      if (response.ok) {
        setAssessments(prev => prev.filter(a => a.id !== deleteModal.assessment!.id));
        setDeleteModal({ show: false, assessment: null });
      } else {
        console.error('Failed to delete assessment');
      }
    } catch (error) {
      console.error('Error deleting assessment:', error);
    } finally {
      setDeleting(false);
    }
  };

  const stats = [
    {
      label: 'Total Assessments',
      value: classStats?.total_assessments || assessments.length,
      icon: BookOpen,
      color: 'primary'
    },
    {
      label: 'Students Enrolled',
      value: classStats?.total_students_enrolled || 0,
      icon: Users,
      color: 'secondary'
    },
    {
      label: 'Avg. Score',
      value: classStats?.overall_average_score ? `${classStats.overall_average_score.toFixed(1)}%` : '0%',
      icon: BarChart3,
      color: 'success'
    },
  ];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const capitalizeFirst = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  const getAssignmentStatusInfo = (assessment: Assessment) => {
    if (!assessment.assignment_settings) {
      return { status: 'No Settings', color: 'gray-500' };
    }

    const settings = assessment.assignment_settings;
    const now = new Date();
    const dueDate = settings.due_date ? new Date(settings.due_date) : null;

    if (dueDate && now > dueDate) {
      return { status: 'Expired', color: 'red-500' };
    } else if (dueDate) {
      return { status: 'Active', color: 'green-500' };
    } else {
      return { status: 'Open', color: 'blue-500' };
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">Loading dashboard...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Teacher Dashboard</h1>
            <p className="text-gray-600">Welcome back! Manage your assessments and track student progress.</p>
          </div>
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={() => navigate('/teacher/results')}
              icon={BarChart3}
            >
              View Analytics
            </Button>
            <Button
              onClick={() => navigate('/teacher/create-assessment')}
              icon={Plus}
            >
              Create Assessment
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((stat, index) => (
            <Card key={index} className="text-center">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-primary-100 rounded-xl">
                <stat.icon className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
              <p className="text-gray-600">{stat.label}</p>
            </Card>
          ))}
        </div>

        {/* Class Statistics Summary */}
        {classStats && classStats.total_assessments_completed > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Class Performance Overview</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Assessments Completed:</span>
                <div className="text-lg font-semibold">{classStats.total_assessments_completed}</div>
              </div>
              <div>
                <span className="text-gray-600">Average Score:</span>
                <div className="text-lg font-semibold">{classStats.overall_average_score.toFixed(1)}%</div>
              </div>
              <div>
                <span className="text-gray-600">Pass Rate:</span>
                <div className="text-lg font-semibold">{classStats.overall_pass_rate.toFixed(1)}%</div>
              </div>
              <div>
                <span className="text-gray-600">Students Enrolled:</span>
                <div className="text-lg font-semibold">{classStats.total_students_enrolled}</div>
              </div>
            </div>
          </Card>
        )}

        {/* Assessments Section */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Your Assessments</h2>
          </div>

          <div className="grid gap-6">
            {assessments.length === 0 ? (
              <Card className="p-8 text-center">
                <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Assessments Yet</h3>
                <p className="text-gray-600 mb-4">Create your first assessment to get started</p>
                <Button onClick={() => navigate('/teacher/create-assessment')} icon={Plus}>
                  Create Assessment
                </Button>
              </Card>
            ) : (
              assessments.map((assessment) => {
                const statusInfo = getAssignmentStatusInfo(assessment);
                return (
                  <Card key={assessment.id} hover className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{assessment.topic}</h3>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full text-${statusInfo.color}`}>
                              {statusInfo.status}
                            </span>
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary-100 text-primary-800">
                              Published
                            </span>
                          </div>
                        </div>
                        <p className="text-gray-600 mb-4">{assessment.description}</p>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Bloom Level:</span>
                            <div>{capitalizeFirst(assessment.bloom_level)}</div>
                          </div>
                          <div>
                            <span className="font-medium">Questions:</span>
                            <div>{assessment.questions_count}</div>
                          </div>
                          <div>
                            <span className="font-medium">Created:</span>
                            <div>{formatDate(assessment.created_at)}</div>
                          </div>
                          <div>
                            <span className="font-medium">Max Attempts:</span>
                            <div>{assessment.assignment_settings?.max_attempts || 'Unlimited'}</div>
                          </div>
                        </div>

                        {/* Individual Assessment Performance Metrics */}
                        {assessmentStats[assessment.id] && (
                          <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              <BarChart3 className="w-4 h-4 text-blue-600" />
                              Class Performance Overview
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                              <div className="bg-white p-2 rounded border">
                                <span className="text-gray-600">Assessments Completed:</span>
                                <div className="text-sm font-semibold text-green-700">
                                  {assessmentStats[assessment.id].completed_students}
                                </div>
                              </div>
                              <div className="bg-white p-2 rounded border">
                                <span className="text-gray-600">Average Score:</span>
                                <div className="text-sm font-semibold text-blue-700">
                                  {assessmentStats[assessment.id].average_score.toFixed(1)}%
                                </div>
                              </div>
                              <div className="bg-white p-2 rounded border">
                                <span className="text-gray-600">Pass Rate:</span>
                                <div className="text-sm font-semibold text-purple-700">
                                  {assessmentStats[assessment.id].pass_rate.toFixed(1)}%
                                </div>
                              </div>
                              <div className="bg-white p-2 rounded border">
                                <span className="text-gray-600">Students Enrolled:</span>
                                <div className="text-sm font-semibold text-orange-700">
                                  {assessmentStats[assessment.id].total_students}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {assessment.assignment_settings?.due_date && (
                          <div className="mt-2 text-sm text-gray-600">
                            <span className="font-medium">Due Date:</span> {formatDate(assessment.assignment_settings.due_date)}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col space-y-2 ml-4">
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/teacher/assessment/${assessment.id}/content`)}
                            icon={Eye}
                          >
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/teacher/assessment/${assessment.id}/results`)}
                            icon={BarChart3}
                          >
                            Analytics
                          </Button>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={Trash2}
                            className="text-error-600 hover:text-error-700"
                            onClick={() => setDeleteModal({ show: true, assessment })}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={deleteModal.show}
          onClose={() => setDeleteModal({ show: false, assessment: null })}
          title="Delete Assessment"
        >
          <div className="space-y-4">
            <div className="flex items-center space-x-3 p-4 bg-red-50 rounded-lg">
              <Trash2 className="w-6 h-6 text-red-600" />
              <div>
                <h4 className="font-medium text-red-900">Are you sure you want to delete this assessment?</h4>
                <p className="text-sm text-red-700">
                  This will permanently delete "{deleteModal.assessment?.topic}" and all associated data including student responses and statistics.
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setDeleteModal({ show: false, assessment: null })}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteAssessment}
                loading={deleting}
              >
                Delete Assessment
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  );
};

export default TeacherDashboard;