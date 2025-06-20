import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Clock, Target, Brain, Settings, RefreshCw, Calendar, Timer, Eye, EyeOff, Send } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { API_ENDPOINTS, AssignmentSettings, QuestionRegenerateRequest, BloomLevel } from '../../config/api';

interface Question {
  id: number;
  question_text: string;
  type: string;
  difficulty: string;
  bloom_level: string;
  options: { [key: string]: string } | null;
  correct_answer?: {
    answer?: string;
    answers?: string[];
    value?: number;
    tolerance?: number;
  };
}

interface Assessment {
  id: number;
  topic: string;
  description: string;
  bloom_level: string;
  created_at: string;
  questions: Question[];
  assignment_settings?: AssignmentSettings | null;
}

const ViewContent: React.FC = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showAnswers, setShowAnswers] = useState(false);

  // Assignment Settings Modal
  const [settingsModal, setSettingsModal] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [assignmentSettings, setAssignmentSettings] = useState<AssignmentSettings>({
    due_date: '',
    time_limit_minutes: undefined,
    max_attempts: 1,
    retake_allowed: false,
    show_results_immediately: true,
    shuffle_questions: false
  });

  // Question Regeneration
  const [regenerateModal, setRegenerateModal] = useState<{ show: boolean; questionId: number | null }>({
    show: false,
    questionId: null
  });
  const [regenerating, setRegenerating] = useState(false);

  // Assignment Modal
  const [assignModal, setAssignModal] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const fetchAssessment = async () => {
    if (!assessmentId) {
      setError('Assessment ID not provided');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(API_ENDPOINTS.getAssessment(parseInt(assessmentId)));
      if (response.ok) {
        const data = await response.json();
        setAssessment(data);

        // Set assignment settings if they exist
        if (data.assignment_settings) {
          setAssignmentSettings({
            due_date: data.assignment_settings.due_date || '',
            time_limit_minutes: data.assignment_settings.time_limit_minutes,
            max_attempts: data.assignment_settings.max_attempts || 1,
            retake_allowed: data.assignment_settings.retake_allowed || false,
            show_results_immediately: data.assignment_settings.show_results_immediately || true,
            shuffle_questions: data.assignment_settings.shuffle_questions || false
          });
        }
      } else {
        setError('Failed to fetch assessment details');
      }
    } catch (error) {
      console.error('Error fetching assessment:', error);
      setError('Error loading assessment');
    } finally {
      setLoading(false);
    }
  };

  const fetchAssessmentWithAnswers = async () => {
    if (!assessmentId) return;

    try {
      const response = await fetch(API_ENDPOINTS.getAssessmentWithAnswers(parseInt(assessmentId)));
      if (response.ok) {
        const data = await response.json();
        setAssessment(data);
        setShowAnswers(true);
      } else {
        console.error('Failed to fetch assessment with answers');
      }
    } catch (error) {
      console.error('Error fetching assessment with answers:', error);
    }
  };

  const toggleAnswerView = () => {
    if (showAnswers) {
      // Hide answers - refetch normal assessment
      setShowAnswers(false);
      fetchAssessment();
    } else {
      // Show answers - fetch with answers
      fetchAssessmentWithAnswers();
    }
  };

  useEffect(() => {
    fetchAssessment();
  }, [assessmentId]);

  const handleSaveSettings = async () => {
    if (!assessment) return;

    setSettingsLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.assignmentSettings(assessment.id), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...assignmentSettings,
          due_date: assignmentSettings.due_date || undefined
        }),
      });

      if (response.ok) {
        const updatedAssessment = { ...assessment, assignment_settings: assignmentSettings };
        setAssessment(updatedAssessment);
        setSettingsModal(false);
      } else {
        console.error('Failed to save assignment settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleRegenerateQuestion = async () => {
    if (!assessment || !regenerateModal.questionId) return;

    setRegenerating(true);
    try {
      // Get existing question texts for duplicate checking
      const existingQuestions = assessment.questions
        .filter(q => q.id !== regenerateModal.questionId)
        .map(q => q.question_text.toLowerCase().trim());

      let attempts = 0;
      const maxAttempts = 3;
      let newQuestion = null;

      while (attempts < maxAttempts && !newQuestion) {
        const regenerateRequest: QuestionRegenerateRequest = {
          topic: assessment.topic,
          description: assessment.description,
          bloom_level: assessment.bloom_level as BloomLevel
        };

        const response = await fetch(API_ENDPOINTS.regenerateQuestion(regenerateModal.questionId), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(regenerateRequest),
        });

        if (response.ok) {
          const result = await response.json();
          const generatedText = result.question.question_text.toLowerCase().trim();

          // Check for duplicates
          const isDuplicate = existingQuestions.some(existing => {
            // Simple similarity check - can be enhanced with more sophisticated algorithms
            const similarity = calculateTextSimilarity(existing, generatedText);
            return similarity > 0.8; // 80% similarity threshold
          });

          if (!isDuplicate) {
            newQuestion = result.question;
          } else {
            console.warn(`Attempt ${attempts + 1}: Generated duplicate question, retrying...`);
          }
        } else {
          console.error('Failed to regenerate question');
          break;
        }

        attempts++;
      }

      if (newQuestion) {
        // Update the question in the assessment
        const updatedQuestions = assessment.questions.map(q =>
          q.id === regenerateModal.questionId ? newQuestion : q
        );
        setAssessment({ ...assessment, questions: updatedQuestions });
        setRegenerateModal({ show: false, questionId: null });
      } else {
        console.error('Failed to generate unique question after multiple attempts');
        alert('Failed to generate a unique question. Please try again or modify the assessment parameters.');
      }
    } catch (error) {
      console.error('Error regenerating question:', error);
    } finally {
      setRegenerating(false);
    }
  };

  // Simple text similarity function
  const calculateTextSimilarity = (text1: string, text2: string): number => {
    const words1 = text1.split(/\s+/);
    const words2 = text2.split(/\s+/);
    const allWords = new Set([...words1, ...words2]);

    let commonWords = 0;
    allWords.forEach(word => {
      if (words1.includes(word) && words2.includes(word)) {
        commonWords++;
      }
    });

    return (2 * commonWords) / (words1.length + words2.length);
  };

  // Assignment function
  const handleAssignAssessment = async () => {
    if (!assessment) return;

    setAssigning(true);
    try {
      // Send only the fields expected by the backend schema
      const assignmentData = {
        due_date: assignmentSettings.due_date,
        time_limit_minutes: assignmentSettings.time_limit_minutes,
        max_attempts: assignmentSettings.max_attempts,
        retake_allowed: assignmentSettings.retake_allowed,
        show_results_immediately: assignmentSettings.show_results_immediately,
        shuffle_questions: assignmentSettings.shuffle_questions
      };

      console.log('Assigning assessment with data:', assignmentData);

      const response = await fetch(API_ENDPOINTS.assignmentSettings(assessment.id), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(assignmentData),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Assignment successful:', result);
        setAssignModal(false);
        alert('Assessment assigned successfully! Students will be notified.');
        // Refresh the assessment data
        fetchAssessment();
      } else {
        const errorText = await response.text();
        console.error('Failed to assign assessment:', response.status, errorText);
        alert('Failed to assign assessment. Please try again.');
      }
    } catch (error) {
      console.error('Error assigning assessment:', error);
      alert('Error assigning assessment. Please try again.');
    } finally {
      setAssigning(false);
    }
  };

  useEffect(() => {
    const fetchAssessment = async () => {
      if (!assessmentId) {
        setError('Assessment ID not provided');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(API_ENDPOINTS.getAssessment(parseInt(assessmentId)));
        if (response.ok) {
          const data = await response.json();
          setAssessment(data);

          // Set assignment settings if they exist
          if (data.assignment_settings) {
            setAssignmentSettings({
              due_date: data.assignment_settings.due_date || '',
              time_limit_minutes: data.assignment_settings.time_limit_minutes,
              max_attempts: data.assignment_settings.max_attempts || 1,
              retake_allowed: data.assignment_settings.retake_allowed || false,
              show_results_immediately: data.assignment_settings.show_results_immediately || true,
              shuffle_questions: data.assignment_settings.shuffle_questions || false
            });
          }
        } else {
          setError('Failed to fetch assessment details');
        }
      } catch (error) {
        console.error('Error fetching assessment:', error);
        setError('Error loading assessment');
      } finally {
        setLoading(false);
      }
    };

    fetchAssessment();
  }, [assessmentId]);

  // Generate topic-specific emoji based on assessment topic
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
    return '📖'; // Default book emoji
  };

  // Generate educational content based on the assessment topic
  const generateTopicContent = (topic: string): { introduction: string; keyPoints: string[]; learningObjectives: string[] } => {
    const lowerTopic = topic.toLowerCase();

    if (lowerTopic.includes('aviation') || lowerTopic.includes('flight') || lowerTopic.includes('airplane')) {
      return {
        introduction: `Aviation history encompasses the fascinating journey of human flight, from early dreams of soaring through the skies to the modern aerospace industry. This comprehensive topic covers the pioneers who made flight possible, the technological breakthroughs that revolutionized transportation, and the ongoing innovations that continue to shape our world.`,
        keyPoints: [
          'Early aviation pioneers and their groundbreaking experiments',
          'The Wright Brothers\' historic first powered flight in 1903',
          'World War I and II\'s impact on aviation technology development',
          'The golden age of commercial aviation and jet engines',
          'Modern aerospace innovations and space exploration',
          'The role of aviation in global connectivity and commerce'
        ],
        learningObjectives: [
          'Understand the chronological development of aviation technology',
          'Identify key figures who contributed to aviation advancement',
          'Analyze the impact of aviation on society and global development',
          'Evaluate the technological innovations that made modern flight possible',
          'Apply knowledge of aviation principles to real-world scenarios'
        ]
      };
    }

    // Default content for other topics
    return {
      introduction: `This topic covers important concepts and principles in ${topic}. Students will explore fundamental ideas, key theories, and practical applications that form the foundation of understanding in this subject area.`,
      keyPoints: [
        `Core concepts and terminology in ${topic}`,
        `Historical development and key milestones`,
        `Important theories and principles`,
        `Real-world applications and examples`,
        `Current trends and future developments`,
        `Critical thinking and problem-solving approaches`
      ],
      learningObjectives: [
        `Understand fundamental concepts in ${topic}`,
        `Identify key principles and their applications`,
        `Analyze relationships between different elements`,
        `Evaluate information and draw conclusions`,
        `Apply knowledge to solve problems and answer questions`
      ]
    };
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-lg">Loading assessment content...</div>
        </div>
      </Layout>
    );
  }

  if (error || !assessment) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto">
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
              {error || 'Assessment not found'}
            </div>
            <Button onClick={() => navigate('/teacher')}>
              Return to Dashboard
            </Button>
          </Card>
        </div>
      </Layout>
    );
  }

  const topicContent = generateTopicContent(assessment.topic);
  const topicEmoji = getTopicEmoji(assessment.topic);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button
            onClick={() => navigate('/teacher')}
            className="flex items-center gap-2"
            variant="outline"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
          <div className="text-sm text-gray-600">
            Created: {new Date(assessment.created_at).toLocaleDateString()}
          </div>
        </div>

        {/* Assessment Overview */}
        <Card className="p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="text-4xl">{topicEmoji}</div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {assessment.topic}
              </h1>
              <p className="text-gray-600 mb-4">{assessment.description}</p>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-blue-600" />
                  <span>Bloom Level: {assessment.bloom_level}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-purple-600" />
                  <span>{assessment.questions.length} Questions</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-green-600" />
                  <span>~{assessment.questions.length * 2} minutes</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Learning Content */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            Educational Content
          </h2>

          {/* Introduction */}
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-3">Introduction</h3>
            <p className="text-gray-700 leading-relaxed">
              {topicContent.introduction}
            </p>
          </div>

          {/* Key Points */}
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-3">Key Learning Points</h3>
            <ul className="space-y-2">
              {topicContent.keyPoints.map((point, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-gray-700">{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Learning Objectives */}
          <div>
            <h3 className="text-lg font-medium mb-3">Learning Objectives</h3>
            <ul className="space-y-2">
              {topicContent.learningObjectives.map((objective, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-100 text-green-800 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                    {index + 1}
                  </div>
                  <span className="text-gray-700">{objective}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4 mb-6">
          <Button
            onClick={() => setSettingsModal(true)}
            className="flex items-center gap-2"
            variant="outline"
          >
            <Settings className="w-4 h-4" />
            Assignment Settings
          </Button>
          <Button
            onClick={toggleAnswerView}
            className="flex items-center gap-2"
            variant={showAnswers ? "primary" : "outline"}
          >
            {showAnswers ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showAnswers ? 'Hide Answers' : 'Show Correct Answers'}
          </Button>
          <Button
            onClick={() => setAssignModal(true)}
            className="flex items-center gap-2"
            variant="primary"
          >
            <Send className="w-4 h-4" />
            Assign Assessment
          </Button>
        </div>

        {/* Assignment Settings Display */}
        {assessment.assignment_settings && (
          <Card className="p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-600" />
              Current Assignment Settings
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {assessment.assignment_settings.due_date && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span>Due Date: {new Date(assessment.assignment_settings.due_date).toLocaleDateString()}</span>
                </div>
              )}
              {assessment.assignment_settings.time_limit_minutes && (
                <div className="flex items-center gap-2">
                  <Timer className="w-4 h-4 text-gray-500" />
                  <span>Time Limit: {assessment.assignment_settings.time_limit_minutes} minutes</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span>Max Attempts: {assessment.assignment_settings.max_attempts}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>Retake Allowed: {assessment.assignment_settings.retake_allowed ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>Show Results Immediately: {assessment.assignment_settings.show_results_immediately ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>Shuffle Questions: {assessment.assignment_settings.shuffle_questions ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </Card>
        )}

        {/* Assessment Questions Preview */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            Assessment Questions
          </h2>

          <div className="space-y-6">
            {assessment.questions.map((question, index) => (
              <div key={question.id} className="border-l-4 border-blue-200 pl-4">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-medium">
                    Question {index + 1}: {question.question_text}
                  </h3>
                  <Button
                    onClick={() => setRegenerateModal({ show: true, questionId: question.id })}
                    className="flex items-center gap-2"
                    variant="outline"
                    size="sm"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Regenerate
                  </Button>
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  Type: {question.type} | Difficulty: {question.difficulty} | Bloom Level: {question.bloom_level}
                </div>
                {question.options && (
                  <ul className="space-y-2">
                    {Object.entries(question.options).map(([key, value]) => {
                      const isCorrect = showAnswers && question.correct_answer &&
                        ((question.type === 'mcq_single' && question.correct_answer.answer === key) ||
                          (question.type === 'mcq_multiple' && question.correct_answer.answers?.includes(key)));

                      return (
                        <li
                          key={key}
                          className={`p-2 rounded text-gray-700 ${isCorrect
                            ? 'bg-green-100 border-2 border-green-500 font-medium'
                            : 'bg-gray-50'
                            }`}
                        >
                          {key}. {value}
                          {isCorrect && <span className="text-green-600 ml-2">✓ Correct</span>}
                        </li>
                      );
                    })}
                  </ul>
                )}
                {!question.options && question.type === 'numeric' && (
                  <div className="p-2 rounded bg-yellow-50 text-yellow-800">
                    <em>Numeric answer expected</em>
                    {showAnswers && question.correct_answer && (
                      <div className="mt-2 p-2 bg-green-100 text-green-800 rounded">
                        <strong>Correct Answer:</strong> {question.correct_answer.value}
                        {question.correct_answer.tolerance && (
                          <span> (±{question.correct_answer.tolerance})</span>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {showAnswers && question.correct_answer && question.type === 'mcq_multiple' && (
                  <div className="mt-2 p-2 bg-blue-50 text-blue-800 rounded text-sm">
                    <strong>Correct Answers:</strong> {question.correct_answer.answers?.join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Assignment Settings Modal */}
        <Modal
          isOpen={settingsModal}
          onClose={() => setSettingsModal(false)}
          title="Assignment Settings"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due Date (Optional)
              </label>
              <Input
                type="datetime-local"
                value={assignmentSettings.due_date}
                onChange={(e) => setAssignmentSettings({
                  ...assignmentSettings,
                  due_date: e.target.value
                })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time Limit (minutes, optional)
              </label>
              <Input
                type="number"
                min="1"
                value={assignmentSettings.time_limit_minutes || ''}
                onChange={(e) => setAssignmentSettings({
                  ...assignmentSettings,
                  time_limit_minutes: e.target.value ? parseInt(e.target.value) : undefined
                })}
                placeholder="No time limit"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Maximum Attempts
              </label>
              <Select
                value={assignmentSettings.max_attempts.toString()}
                onChange={(e) => setAssignmentSettings({
                  ...assignmentSettings,
                  max_attempts: parseInt(e.target.value)
                })}
                options={[
                  { value: '1', label: '1 attempt' },
                  { value: '2', label: '2 attempts' },
                  { value: '3', label: '3 attempts' },
                  { value: '5', label: '5 attempts' },
                  { value: '-1', label: 'Unlimited' }
                ]}
              />
            </div>

            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={assignmentSettings.retake_allowed}
                  onChange={(e) => setAssignmentSettings({
                    ...assignmentSettings,
                    retake_allowed: e.target.checked
                  })}
                  className="mr-2"
                />
                Allow retakes
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={assignmentSettings.show_results_immediately}
                  onChange={(e) => setAssignmentSettings({
                    ...assignmentSettings,
                    show_results_immediately: e.target.checked
                  })}
                  className="mr-2"
                />
                Show results immediately after completion
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={assignmentSettings.shuffle_questions}
                  onChange={(e) => setAssignmentSettings({
                    ...assignmentSettings,
                    shuffle_questions: e.target.checked
                  })}
                  className="mr-2"
                />
                Shuffle question order for each student
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSaveSettings}
                disabled={settingsLoading}
                className="flex-1"
              >
                {settingsLoading ? 'Saving...' : 'Save Settings'}
              </Button>
              <Button
                onClick={() => setSettingsModal(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </Modal>

        {/* Question Regeneration Modal */}
        <Modal
          isOpen={regenerateModal.show}
          onClose={() => setRegenerateModal({ show: false, questionId: null })}
          title="Regenerate Question"
        >
          <div className="space-y-4">
            <p className="text-gray-700">
              This will generate a new question for the same topic and learning objectives.
              The original question will be replaced permanently.
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-yellow-800 text-sm">
                <strong>Warning:</strong> This action cannot be undone. Any existing student responses
                to this question will remain unchanged, but new attempts will use the regenerated question.
              </p>
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleRegenerateQuestion}
                disabled={regenerating}
                className="flex-1"
              >
                {regenerating ? 'Regenerating...' : 'Regenerate Question'}
              </Button>
              <Button
                onClick={() => setRegenerateModal({ show: false, questionId: null })}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </Modal>

        {/* Assignment Modal */}
        <Modal
          isOpen={assignModal}
          onClose={() => setAssignModal(false)}
          title="Assign Assessment"
        >
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">Assignment Confirmation</h4>
              <p className="text-sm text-blue-700 mb-3">
                This will assign the assessment "{assessment?.topic}" to students with the current settings.
              </p>
              {assessment?.assignment_settings && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-600">Due Date:</span>
                    <span className="text-blue-900">
                      {assignmentSettings?.due_date ? new Date(assignmentSettings.due_date).toLocaleDateString() : 'Not set'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-600">Max Attempts:</span>
                    <span className="text-blue-900">{assignmentSettings?.max_attempts || 'Unlimited'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-600">Time Limit:</span>
                    <span className="text-blue-900">
                      {assignmentSettings?.time_limit_minutes ? `${assignmentSettings.time_limit_minutes} minutes` : 'No limit'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="text-sm text-gray-600">
              <p>Students will be notified and can access the assessment immediately.</p>
              <p className="mt-1 font-medium">Make sure all settings are configured correctly before assigning.</p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleAssignAssessment}
                loading={assigning}
                className="flex-1"
              >
                {assigning ? 'Assigning...' : 'Assign Assessment'}
              </Button>
              <Button
                onClick={() => setAssignModal(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  );
};

export default ViewContent;