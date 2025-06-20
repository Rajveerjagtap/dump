import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Clock, Target, Brain, ArrowRight, CheckCircle } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { API_ENDPOINTS } from '../../config/api';

interface StudySection {
    title: string;
    content: string;
    key_points: string[];
}

interface StudyContent {
    topic: string;
    description: string;
    bloom_level: string;
    content: {
        introduction: string;
        sections: StudySection[];
        summary: string;
        learning_objectives: string[];
    };
}

interface Assessment {
    id: number;
    topic: string;
    description: string;
    bloom_level: string;
    created_at: string;
    questions_count: number;
}

const StudyContent: React.FC = () => {
    const { assessmentId } = useParams<{ assessmentId: string }>();
    const navigate = useNavigate();
    const [studyContent, setStudyContent] = useState<StudyContent | null>(null);
    const [assessment, setAssessment] = useState<Assessment | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');
    const [currentSection, setCurrentSection] = useState(0);
    const [studyCompleted, setStudyCompleted] = useState(false);

    useEffect(() => {
        const fetchAssessmentAndContent = async () => {
            if (!assessmentId) {
                setError('Assessment ID not provided');
                setLoading(false);
                return;
            }

            try {
                // First, fetch the assessment details
                const assessmentResponse = await fetch(API_ENDPOINTS.getAssessment(parseInt(assessmentId)));
                if (!assessmentResponse.ok) {
                    throw new Error('Failed to fetch assessment details');
                }
                const assessmentData = await assessmentResponse.json();
                setAssessment(assessmentData);

                // Then, generate study content for the topic
                const studyResponse = await fetch(
                    `${API_ENDPOINTS.getStudyContent(assessmentData.topic)}?description=${encodeURIComponent(assessmentData.description)}&bloom_level=${assessmentData.bloom_level}`
                );

                if (!studyResponse.ok) {
                    throw new Error('Failed to generate study content');
                }

                const studyData = await studyResponse.json();
                setStudyContent(studyData.study_content);
            } catch (error) {
                console.error('Error fetching content:', error);
                setError('Error loading study content');
            } finally {
                setLoading(false);
            }
        };

        fetchAssessmentAndContent();
    }, [assessmentId]);

    const getTopicEmoji = (topic: string): string => {
        const lowerTopic = topic.toLowerCase();
        if (lowerTopic.includes('aviation') || lowerTopic.includes('flight') || lowerTopic.includes('airplane')) return '✈️';
        if (lowerTopic.includes('space') || lowerTopic.includes('astronomy')) return '🚀';
        if (lowerTopic.includes('biology') || lowerTopic.includes('life')) return '🧬';
        if (lowerTopic.includes('chemistry')) return '⚗️';
        if (lowerTopic.includes('physics')) return '⚛️';
        if (lowerTopic.includes('mathematics') || lowerTopic.includes('math')) return '📐';
        if (lowerTopic.includes('history')) return '📜';
        if (lowerTopic.includes('geography')) return '🌍';
        if (lowerTopic.includes('literature') || lowerTopic.includes('english')) return '📚';
        if (lowerTopic.includes('art')) return '🎨';
        if (lowerTopic.includes('music')) return '🎵';
        if (lowerTopic.includes('computer') || lowerTopic.includes('programming')) return '💻';
        if (lowerTopic.includes('environment') || lowerTopic.includes('ecology')) return '🌱';
        return '📖';
    };

    const handleNextSection = () => {
        if (studyContent && currentSection < studyContent.content.sections.length) {
            setCurrentSection(currentSection + 1);
        }
    };

    const handlePreviousSection = () => {
        if (currentSection > 0) {
            setCurrentSection(currentSection - 1);
        }
    };

    const handleStudyComplete = () => {
        setStudyCompleted(true);
    };

    const handleStartAssessment = () => {
        navigate(`/student/assessment/${assessmentId}/start`);
    };

    if (loading) {
        return (
            <Layout>
                <div className="flex items-center justify-center min-h-96">
                    <div className="text-lg">Loading study content...</div>
                </div>
            </Layout>
        );
    }

    if (error || !studyContent || !assessment) {
        return (
            <Layout>
                <div className="max-w-4xl mx-auto">
                    <Button
                        onClick={() => navigate('/student')}
                        className="mb-6 flex items-center gap-2"
                        variant="outline"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Dashboard
                    </Button>
                    <Card className="p-8 text-center">
                        <div className="text-red-600 text-lg mb-4">
                            {error || 'Study content not found'}
                        </div>
                        <Button onClick={() => navigate('/student')}>
                            Return to Dashboard
                        </Button>
                    </Card>
                </div>
            </Layout>
        );
    }

    const currentContent = currentSection === 0
        ? { title: 'Introduction', content: studyContent.content.introduction, key_points: [] }
        : currentSection <= studyContent.content.sections.length
            ? studyContent.content.sections[currentSection - 1]
            : { title: 'Summary', content: studyContent.content.summary, key_points: [] };

    const totalSections = studyContent.content.sections.length + 2; // introduction + sections + summary
    const isLastSection = currentSection === totalSections - 1;
    const topicEmoji = getTopicEmoji(studyContent.topic);

    if (studyCompleted) {
        return (
            <Layout>
                <div className="max-w-4xl mx-auto">
                    <Card className="p-8 text-center">
                        <div className="mb-6">
                            <div className="text-6xl mb-4">{topicEmoji}</div>
                            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">
                                Study Complete!
                            </h1>
                            <p className="text-gray-600 text-lg">
                                You've finished studying {studyContent.topic}. Ready to test your knowledge?
                            </p>
                        </div>

                        <div className="bg-blue-50 p-6 rounded-lg mb-6">
                            <h3 className="text-lg font-semibold mb-3">What You've Learned:</h3>
                            <ul className="text-left space-y-2">
                                {studyContent.content.learning_objectives.map((objective, index) => (
                                    <li key={index} className="flex items-start gap-3">
                                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span className="text-gray-700">{objective}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="flex gap-4 justify-center">
                            <Button
                                onClick={() => setStudyCompleted(false)}
                                variant="outline"
                                className="flex items-center gap-2"
                            >
                                <BookOpen className="w-4 h-4" />
                                Review Content
                            </Button>
                            <Button
                                onClick={handleStartAssessment}
                                className="flex items-center gap-2"
                                variant="primary"
                            >
                                <Brain className="w-4 h-4" />
                                Start Assessment
                            </Button>
                        </div>
                    </Card>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <Button
                        onClick={() => navigate('/student')}
                        className="flex items-center gap-2"
                        variant="outline"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Dashboard
                    </Button>
                    <div className="text-sm text-gray-600">
                        Section {currentSection + 1} of {totalSections}
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-6">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${((currentSection + 1) / totalSections) * 100}%` }}
                        ></div>
                    </div>
                </div>

                {/* Topic Overview */}
                <Card className="p-6 mb-6">
                    <div className="flex items-start gap-4">
                        <div className="text-4xl">{topicEmoji}</div>
                        <div className="flex-1">
                            <h1 className="text-2xl font-bold text-gray-900 mb-2">
                                Study: {studyContent.topic}
                            </h1>
                            <p className="text-gray-600 mb-4">{studyContent.description}</p>
                            <div className="flex flex-wrap gap-4 text-sm">
                                <div className="flex items-center gap-2">
                                    <Target className="w-4 h-4 text-blue-600" />
                                    <span>Bloom Level: {studyContent.bloom_level}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-green-600" />
                                    <span>~{totalSections * 3} minutes reading</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Content Section */}
                <Card className="p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-blue-600" />
                        {currentContent.title}
                    </h2>

                    <div className="prose max-w-none">
                        <p className="text-gray-700 leading-relaxed mb-6">
                            {currentContent.content}
                        </p>

                        {currentContent.key_points && currentContent.key_points.length > 0 && (
                            <div>
                                <h3 className="text-lg font-medium mb-3">Key Points:</h3>
                                <ul className="space-y-2">
                                    {currentContent.key_points.map((point, index) => (
                                        <li key={index} className="flex items-start gap-3">
                                            <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                                            <span className="text-gray-700">{point}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </Card>

                {/* Learning Objectives (shown only in introduction) */}
                {currentSection === 0 && (
                    <Card className="p-6 mb-6">
                        <h3 className="text-lg font-semibold mb-4">Learning Objectives</h3>
                        <ul className="space-y-3">
                            {studyContent.content.learning_objectives.map((objective, index) => (
                                <li key={index} className="flex items-start gap-3">
                                    <div className="w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                                        {index + 1}
                                    </div>
                                    <span className="text-gray-700">{objective}</span>
                                </li>
                            ))}
                        </ul>
                    </Card>
                )}

                {/* Navigation */}
                <div className="flex justify-between items-center">
                    <Button
                        onClick={handlePreviousSection}
                        disabled={currentSection === 0}
                        variant="outline"
                        className="flex items-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Previous
                    </Button>

                    {isLastSection ? (
                        <Button
                            onClick={handleStudyComplete}
                            className="flex items-center gap-2"
                            variant="primary"
                        >
                            Complete Study
                            <CheckCircle className="w-4 h-4" />
                        </Button>
                    ) : (
                        <Button
                            onClick={handleNextSection}
                            className="flex items-center gap-2"
                        >
                            Next
                            <ArrowRight className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default StudyContent;