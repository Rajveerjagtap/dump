import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, Clock, CheckCircle, Users, BarChart3, Target, TrendingUp } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
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

const Results: React.FC = () => {
    const navigate = useNavigate();
    const { assessmentId } = useParams<{ assessmentId: string }>();
    const [statistics, setStatistics] = useState<AssessmentStatistics | null>(null);
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
                const response = await fetch(API_ENDPOINTS.assessmentStatistics(parseInt(assessmentId)));
                if (response.ok) {
                    const data = await response.json();
                    setStatistics(data);
                } else {
                    setError('Failed to fetch assessment statistics');
                }
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
