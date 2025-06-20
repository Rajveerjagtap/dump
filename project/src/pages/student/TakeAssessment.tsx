import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle, Flag, Clock } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { API_ENDPOINTS, AssignmentSettings } from '../../config/api';
import { CURRENT_STUDENT_ID } from '../../config/constants';

interface Question {
  id: number;
  question_text: string;
  type: 'mcq_single' | 'mcq_multiple' | 'numeric';
  difficulty: 'easy' | 'medium' | 'hard';
  bloom_level: string;
  options?: { [key: string]: string };
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

interface TestAttempt {
  id: number;
  assessment_id: number;
  student_id: number;
  started_at: string;
  completed_at?: string;
  attempt_number: number;
  time_limit_minutes?: number;
}

interface UserAnswer {
  questionId: number;
  answer: string | string[];
  timeSpent: number;
  changeCount: number;
  isConfused: boolean;
  shownAt: Date;
  answeredAt?: Date;
}

const TakeAssessment: React.FC = () => {
  const navigate = useNavigate();
  const { assessmentId } = useParams();

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [attempt, setAttempt] = useState<TestAttempt | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [key: number]: UserAnswer }>({});
  const [loading, setLoading] = useState(true);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [showResults, setShowResults] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  // Fetch assessment data and start attempt
  useEffect(() => {
    const fetchAssessmentAndStartAttempt = async () => {
      if (!assessmentId) return;

      try {
        // Fetch assessment details
        const response = await fetch(API_ENDPOINTS.getAssessment(Number(assessmentId)));
        if (response.ok) {
          const data = await response.json();
          setAssessment(data);

          // Start test attempt
          const startAttemptResponse = await fetch(API_ENDPOINTS.startAttempt(Number(assessmentId)), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              student_id: CURRENT_STUDENT_ID // Use constant
            }),
          });

          if (startAttemptResponse.ok) {
            const attemptResponse = await startAttemptResponse.json();
            console.log('Start attempt response:', attemptResponse);

            // Extract the attempt object from the response
            const attemptData = attemptResponse.attempt || attemptResponse;
            setAttempt(attemptData);

            // Set up time limit if specified
            if (attemptData.time_limit_minutes) {
              setTimeRemaining(attemptData.time_limit_minutes * 60); // Convert to seconds
            }

            // Shuffle questions if required
            let questions = data.questions;
            if (data.assignment_settings?.shuffle_questions) {
              questions = [...data.questions].sort(() => Math.random() - 0.5);
            }

            // Initialize answers for all questions
            const initialAnswers: { [key: number]: UserAnswer } = {};
            questions.forEach((question: Question) => {
              initialAnswers[question.id] = {
                questionId: question.id,
                answer: question.type === 'mcq_multiple' ? [] : '',
                timeSpent: 0,
                changeCount: 0,
                isConfused: false,
                shownAt: new Date()
              };
            });
            setAnswers(initialAnswers);
            setAssessment({ ...data, questions });
          } else {
            const errorText = await startAttemptResponse.text();
            alert(`Error starting assessment: ${errorText}`);
            navigate('/student');
          }
        } else {
          console.error('Failed to fetch assessment:', response.status, response.statusText);
          alert(`Error: Could not load assessment. Status: ${response.status}`);
          navigate('/student');
        }
      } catch (error) {
        console.error('Error fetching assessment:', error);
        navigate('/student');
      } finally {
        setLoading(false);
      }
    };

    fetchAssessmentAndStartAttempt();
  }, [assessmentId, navigate]);

  // Handle time limit countdown
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          // Auto-submit when time runs out
          handleSubmitAssessment();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining]);

  // Update question start time when moving to next question
  useEffect(() => {
    setQuestionStartTime(Date.now());
  }, [currentQuestionIndex]);

  const currentQuestion = assessment?.questions[currentQuestionIndex];
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : null;

  const handleAnswerChange = (value: string | string[]) => {
    if (!currentQuestion) return;

    const currentTime = Date.now();
    const timeSpent = currentTime - questionStartTime;

    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: {
        ...prev[currentQuestion.id],
        answer: value,
        timeSpent: prev[currentQuestion.id].timeSpent + timeSpent,
        changeCount: prev[currentQuestion.id].changeCount + 1,
        answeredAt: new Date()
      }
    }));

    setQuestionStartTime(currentTime);
  };

  const handleMarkConfused = () => {
    if (!currentQuestion) return;

    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: {
        ...prev[currentQuestion.id],
        isConfused: !prev[currentQuestion.id].isConfused
      }
    }));
  };

  const submitResponse = async (questionId: number, answer: UserAnswer) => {
    if (!attempt || !assessment) return;

    try {
      const response = await fetch(API_ENDPOINTS.submitResponse(assessment.id), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question_id: questionId,
          response: Array.isArray(answer.answer) ? answer.answer.join(',') : answer.answer,
          confused: answer.isConfused,
          shown_at: answer.shownAt.toISOString(),
          answered_at: answer.answeredAt?.toISOString() || new Date().toISOString(),
          time_taken_sec: Math.floor(answer.timeSpent / 1000),
          time_by_type: {},
          time_by_difficulty: {},
          student_id: CURRENT_STUDENT_ID,
          test_attempt_id: attempt.id
        }),
      });

      if (!response.ok) {
        console.error('Failed to submit response');
      }
    } catch (error) {
      console.error('Error submitting response:', error);
    }
  };

  const handleSubmitAssessment = async () => {
    if (!assessment || !attempt || submitting) return;

    console.log('Starting assessment submission...', { assessment: assessment.id, attempt: attempt.id });
    setSubmitting(true);

    try {
      // Submit all responses
      for (const questionId in answers) {
        await submitResponse(Number(questionId), answers[Number(questionId)]);
      }

      // Complete the assessment
      const completeUrl = `${API_ENDPOINTS.completeAttempt(assessment.id)}?attempt_id=${attempt.id}&student_id=${CURRENT_STUDENT_ID}`;
      console.log('Completing assessment with URL:', completeUrl);

      const completeResponse = await fetch(completeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('Complete response status:', completeResponse.status);

      if (completeResponse.ok) {
        const completionData = await completeResponse.json();
        console.log('Assessment completed successfully:', completionData);

        // Show results if allowed immediately, otherwise navigate to dashboard
        if (assessment.assignment_settings?.show_results_immediately) {
          setShowResults(true);
        } else {
          alert('Assessment submitted successfully! Results will be available later.');
          navigate('/student');
        }
      } else {
        const errorText = await completeResponse.text();
        console.error('Failed to complete assessment:', completeResponse.status, errorText);
        alert(`Failed to complete assessment: ${errorText}. Please try again.`);
      }
    } catch (error) {
      console.error('Error completing assessment:', error);
      alert(`Error submitting assessment: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = async () => {
    if (!currentQuestion) return;

    // Submit current answer if answered
    if (currentAnswer?.answer) {
      await submitResponse(currentQuestion.id, currentAnswer);
    }

    if (currentQuestionIndex < (assessment?.questions.length || 0) - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // Complete assessment
      await handleSubmitAssessment();
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-lg">Loading assessment...</div>
        </div>
      </Layout>
    );
  }

  if (!assessment || !currentQuestion) {
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
              Assessment not found or no questions available
            </div>
            <Button onClick={() => navigate('/student')}>
              Return to Dashboard
            </Button>
          </Card>
        </div>
      </Layout>
    );
  }

  if (showResults) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto">
          <Card className="p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Assessment Completed!
            </h1>
            <p className="text-gray-600 mb-6">
              Thank you for completing the assessment. Your responses have been submitted successfully.
            </p>
            <Button onClick={() => navigate('/student')}>
              Return to Dashboard
            </Button>
          </Card>
        </div>
      </Layout>
    );
  }

  const progress = ((currentQuestionIndex + 1) / assessment.questions.length) * 100;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate('/student')}
              className="flex items-center gap-2"
              variant="outline"
            >
              <ArrowLeft className="w-4 h-4" />
              Exit Assessment
            </Button>
            <div className="text-sm text-gray-600">
              Question {currentQuestionIndex + 1} of {assessment.questions.length}
            </div>
          </div>
          {timeRemaining !== null && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-orange-600" />
              <span className={timeRemaining < 300 ? 'text-red-600 font-bold' : 'text-gray-600'}>
                Time remaining: {formatTime(timeRemaining)}
              </span>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Progress</span>
            <span className="text-sm text-gray-600">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Assessment Info */}
        <Card className="p-6 mb-6">
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            {assessment.topic}
          </h1>
          <p className="text-gray-600">{assessment.description}</p>
        </Card>

        {/* Question */}
        <Card className="p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900 flex-1">
              {currentQuestion.question_text}
            </h2>
            <Button
              onClick={handleMarkConfused}
              className={`flex items-center gap-2 ${currentAnswer?.isConfused ? 'bg-orange-600' : 'bg-gray-400'
                }`}
              size="sm"
            >
              <Flag className="w-3 h-3" />
              {currentAnswer?.isConfused ? 'Confused' : 'Mark as Confused'}
            </Button>
          </div>

          <div className="text-sm text-gray-600 mb-4">
            Type: {currentQuestion.type} | Difficulty: {currentQuestion.difficulty} |
            Bloom Level: {currentQuestion.bloom_level}
          </div>

          {/* Answer Options */}
          <div className="space-y-3">
            {currentQuestion.type === 'mcq_single' && currentQuestion.options && (
              Object.entries(currentQuestion.options).map(([key, value]) => (
                <label key={key} className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name={`question-${currentQuestion.id}`}
                    value={key}
                    checked={currentAnswer?.answer === key}
                    onChange={(e) => handleAnswerChange(e.target.value)}
                    className="mr-3"
                  />
                  <span className="text-gray-700">{key}. {value}</span>
                </label>
              ))
            )}

            {currentQuestion.type === 'mcq_multiple' && currentQuestion.options && (
              Object.entries(currentQuestion.options).map(([key, value]) => (
                <label key={key} className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    value={key}
                    checked={Array.isArray(currentAnswer?.answer) && currentAnswer.answer.includes(key)}
                    onChange={(e) => {
                      const currentAnswers = Array.isArray(currentAnswer?.answer) ? currentAnswer.answer : [];
                      if (e.target.checked) {
                        handleAnswerChange([...currentAnswers, key]);
                      } else {
                        handleAnswerChange(currentAnswers.filter(a => a !== key));
                      }
                    }}
                    className="mr-3"
                  />
                  <span className="text-gray-700">{key}. {value}</span>
                </label>
              ))
            )}

            {currentQuestion.type === 'numeric' && (
              <input
                type="number"
                value={typeof currentAnswer?.answer === 'string' ? currentAnswer.answer : ''}
                onChange={(e) => handleAnswerChange(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your numeric answer"
              />
            )}
          </div>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
            variant="outline"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Previous
          </Button>

          <div className="flex gap-3">
            {currentQuestionIndex === assessment.questions.length - 1 ? (
              <Button
                onClick={handleSubmitAssessment}
                disabled={submitting}
                className="flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                {submitting ? 'Submitting...' : 'Submit Assessment'}
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                className="flex items-center gap-2"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default TakeAssessment;