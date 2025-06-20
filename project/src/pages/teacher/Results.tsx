import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, Clock, Users, BarChart3, Target, TrendingUp, Award, BookOpen } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import SimpleChart from '../../components/ui/SimpleChart';
import { API_ENDPOINTS } from '../../config/api';

interface AssessmentStatistics {
  assessment_id: number;
  assessment_title: string;
  statistics: {
    total_students: number;
    completed_students: number;
    average_score: number;
    pass_rate: number;
    average_time_seconds: number;
    difficulty_breakdown: { [key: string]: any };
    bloom_level_breakdown: { [key: string]: any };
    question_performance: { [key: string]: any };
    generated_at: string;
  } | null;
}

interface StudentPerformance {
  student_id: number;
  student_name?: string;
  score: number;
  completion_time: number;
  attempt_date: string;
  questions_correct: number;
  total_questions: number;
}

interface ClassProgress {
  assessment_id: number;
  assessment_title: string;
  completion_date: string;
  class_average: number;
  pass_rate: number;
  total_participants: number;
}

const Results: React.FC = () => {
  const navigate = useNavigate();
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const [statistics, setStatistics] = useState<AssessmentStatistics | null>(null);
  const [studentPerformances, setStudentPerformances] = useState<StudentPerformance[]>([]);
  const [classProgress, setClassProgress] = useState<ClassProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchStatistics = async () => {
      if (!assessmentId) {
        setError('Assessment ID not provided');
        setLoading(false);
        return;
      }

      try {
        // Fetch individual assessment statistics
        const response = await fetch(API_ENDPOINTS.assessmentStatistics(parseInt(assessmentId)));
        if (response.ok) {
          const data = await response.json();
          setStatistics(data);
        } else {
          setError('Failed to fetch assessment statistics');
        }

        // Fetch all assessments for class progress visualization
        const assessmentsResponse = await fetch(API_ENDPOINTS.assessments);
        if (assessmentsResponse.ok) {
          const assessments = await assessmentsResponse.json();
          const progressData: ClassProgress[] = [];

          for (const assessment of assessments) {
            try {
              const statResponse = await fetch(API_ENDPOINTS.assessmentStatistics(assessment.id));
              if (statResponse.ok) {
                const statData = await statResponse.json();
                if (statData.statistics) {
                  progressData.push({
                    assessment_id: assessment.id,
                    assessment_title: assessment.topic,
                    completion_date: assessment.created_at,
                    class_average: statData.statistics.average_score,
                    pass_rate: statData.statistics.pass_rate,
                    total_participants: statData.statistics.completed_students
                  });
                }
              }
            } catch (error) {
              console.warn(`Failed to fetch progress for assessment ${assessment.id}`);
            }
          }

          // Sort by creation date
          progressData.sort((a, b) => new Date(a.completion_date).getTime() - new Date(b.completion_date).getTime());
          setClassProgress(progressData);
        }

        // Mock student performance data for individual assessment
        const mockStudentPerformances: StudentPerformance[] = [
          { student_id: 1, student_name: 'Student 1', score: 85, completion_time: 1200, attempt_date: '2025-06-19T10:00:00Z', questions_correct: 4, total_questions: 5 },
          { student_id: 2, student_name: 'Student 2', score: 60, completion_time: 1800, attempt_date: '2025-06-19T11:00:00Z', questions_correct: 3, total_questions: 5 },
          { student_id: 3, student_name: 'Student 3', score: 95, completion_time: 900, attempt_date: '2025-06-19T12:00:00Z', questions_correct: 5, total_questions: 5 },
        ];
        setStudentPerformances(mockStudentPerformances);

      } catch (error) {
        console.error('Error fetching statistics:', error);
        setError('Error loading statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
  }, [assessmentId]);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatDateTime = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-lg">Loading assessment results...</div>
        </div>
      </Layout>
    );
  }

  if (error || !statistics) {
    return (
      <Layout>
        <div className="max-w-6xl mx-auto">
          <Button
            onClick={() => navigate('/teacher')}
            className="mb-6 flex items-center gap-2"
            variant="outline"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
          <Card className="p-8 text-center">
            <div className="text-red-600 text-lg mb-4">
              {error || 'Assessment results not found'}
            </div>
            <Button onClick={() => navigate('/teacher')}>
              Return to Dashboard
            </Button>
          </Card>
        </div>
      </Layout>
    );
  }

  const stats = statistics.statistics;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => navigate('/teacher')}
              icon={ArrowLeft}
            >
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Assessment Results</h1>
              <p className="text-gray-600">{statistics.assessment_title}</p>
            </div>
          </div>
          <Button
            onClick={() => navigate(`/teacher/assessment/${assessmentId}/report`)}
            icon={FileText}
            variant="outline"
          >
            Detailed Report
          </Button>
        </div>

        {/* Statistics Overview */}
        {stats ? (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-lg bg-blue-100 text-blue-600">
                    <Users className="w-6 h-6" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.total_students > 0 ? Math.round((stats.completed_students / stats.total_students) * 100) : 0}%
                    </p>
                    <p className="text-sm text-gray-500">
                      {stats.completed_students} of {stats.total_students} students
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-lg bg-green-100 text-green-600">
                    <Target className="w-6 h-6" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Average Score</p>
                    <p className="text-2xl font-bold text-gray-900">{Math.round(stats.average_score)}%</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-lg bg-purple-100 text-purple-600">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Pass Rate</p>
                    <p className="text-2xl font-bold text-gray-900">{Math.round(stats.pass_rate)}%</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-lg bg-orange-100 text-orange-600">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Avg Time</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatTime(stats.average_time_seconds)}
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Performance Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Difficulty Breakdown */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-600" />
                  Performance by Difficulty
                </h3>
                <div className="space-y-3">
                  {Object.entries(stats.difficulty_breakdown || {}).map(([difficulty, data]: [string, any]) => (
                    <div key={difficulty} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 capitalize">{difficulty}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-purple-600 h-2 rounded-full"
                            style={{ width: `${data.accuracy || 0}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600 w-12 text-right">
                          {Math.round(data.accuracy || 0)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Bloom Level Breakdown */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-600" />
                  Performance by Bloom Level
                </h3>
                <div className="space-y-3">
                  {Object.entries(stats.bloom_level_breakdown || {}).map(([level, data]: [string, any]) => (
                    <div key={level} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 capitalize">{level}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${data.accuracy || 0}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600 w-12 text-right">
                          {Math.round(data.accuracy || 0)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Question Performance */}
            {stats.question_performance && Object.keys(stats.question_performance).length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Question Performance</h3>
                <div className="space-y-3">
                  {Object.entries(stats.question_performance).map(([questionId, data]: [string, any]) => (
                    <div key={questionId} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-medium text-gray-700">Question {questionId}</span>
                        <span className="text-sm text-gray-600">
                          {Math.round(data.accuracy || 0)}% correct
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${(data.accuracy || 0) >= 80 ? 'bg-green-600' :
                            (data.accuracy || 0) >= 60 ? 'bg-yellow-600' : 'bg-red-600'
                            }`}
                          style={{ width: `${data.accuracy || 0}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>{data.correct || 0} correct</span>
                        <span>{data.total || 0} total responses</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Class Progress Over Time */}
            {classProgress.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SimpleChart
                  data={classProgress.map(progress => ({
                    label: progress.assessment_title.substring(0, 10) + '...',
                    value: progress.class_average,
                    color: 'bg-blue-500'
                  }))}
                  title="Class Average Score Progress"
                  height={250}
                  type="bar"
                />
                <SimpleChart
                  data={classProgress.map(progress => ({
                    label: progress.assessment_title.substring(0, 10) + '...',
                    value: progress.pass_rate,
                    color: 'bg-green-500'
                  }))}
                  title="Pass Rate Progress"
                  height={250}
                  type="line"
                />
              </div>
            )}

            {/* Individual Student Performance */}
            {studentPerformances.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-gold-600" />
                  Individual Student Performance
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full table-auto">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Student</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Score</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Questions Correct</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Time Taken</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Completed At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentPerformances.map((performance) => (
                        <tr key={performance.student_id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            {performance.student_name || `Student ${performance.student_id}`}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`font-medium ${performance.score >= 80 ? 'text-green-600' :
                                performance.score >= 60 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                              {performance.score}%
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {performance.questions_correct}/{performance.total_questions}
                          </td>
                          <td className="py-3 px-4">
                            {formatTime(performance.completion_time)}
                          </td>
                          <td className="py-3 px-4 text-gray-600">
                            {new Date(performance.attempt_date).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* Statistics Generation Info */}
            <Card className="p-4 bg-gray-50">
              <p className="text-sm text-gray-600 text-center">
                Statistics generated on {formatDateTime(stats.generated_at)}
              </p>
            </Card>
          </>
        ) : (
          <Card className="p-8 text-center">
            <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Available</h3>
            <p className="text-gray-600">
              No students have completed this assessment yet. Results will appear here once students start submitting their responses.
            </p>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default Results;
