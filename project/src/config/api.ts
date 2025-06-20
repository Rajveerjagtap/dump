// API configuration
export const API_BASE_URL = 'http://localhost:8000';

export const API_ENDPOINTS = {
    assessments: `${API_BASE_URL}/assessments`,
    createAssessment: `${API_BASE_URL}/assessment`,
    getAssessment: (id: number) => `${API_BASE_URL}/assessment/${id}`,
    getAssessmentWithAnswers: (id: number) => `${API_BASE_URL}/assessment/${id}/teacher-view`,
    deleteAssessment: (id: number) => `${API_BASE_URL}/assessment/${id}`,
    submitResponse: (assessmentId: number) => `${API_BASE_URL}/assessment/${assessmentId}/submit-response`,
    completeAssessment: (assessmentId: number) => `${API_BASE_URL}/assessment/${assessmentId}/complete`,
    selectUserType: `${API_BASE_URL}/select-user-type`,
    studentStats: (studentId: number) => `${API_BASE_URL}/student/${studentId}/statistics`,
    studentPerformanceReport: (studentId: number) => `${API_BASE_URL}/student/${studentId}/performance-report`,
    createStudyContent: `${API_BASE_URL}/study-content`,
    getStudyContent: (topic: string) => `${API_BASE_URL}/study-content/${encodeURIComponent(topic)}`,

    // Assignment Settings
    assignmentSettings: (assessmentId: number) => `${API_BASE_URL}/assessment/${assessmentId}/assignment-settings`,

    // Test Attempts
    startAttempt: (assessmentId: number) => `${API_BASE_URL}/assessment/${assessmentId}/start-attempt`,
    getStudentAttempts: (studentId: number, assessmentId: number) => `${API_BASE_URL}/student/${studentId}/attempts/${assessmentId}`,
    getStudentAssessmentPerformance: (studentId: number, assessmentId: number) => `${API_BASE_URL}/student/${studentId}/assessment/${assessmentId}/performance`,
    completeAttempt: (assessmentId: number) => `${API_BASE_URL}/assessment/${assessmentId}/complete-attempt`,

    // Question Management
    regenerateQuestion: (questionId: number) => `${API_BASE_URL}/question/${questionId}/regenerate`,

    // Statistics
    assessmentStatistics: (assessmentId: number) => `${API_BASE_URL}/assessment/${assessmentId}/statistics`,
    classStatistics: `${API_BASE_URL}/class-statistics`,
};

// Types for API requests/responses
export interface AssessmentCreate {
    topic: string;
    description: string;
    bloom_level: BloomLevel;
    num_questions: number;
    pdf_content?: string;
}

export interface AssignmentSettings {
    due_date?: string;
    time_limit_minutes?: number;
    max_attempts: number;
    retake_allowed: boolean;
    show_results_immediately: boolean;
    shuffle_questions: boolean;
}

export interface TestAttempt {
    id: number;
    student_id: number;
    assessment_id: number;
    attempt_number: number;
    status: 'in_progress' | 'completed' | 'abandoned';
    started_at: string;
    completed_at?: string;
    total_score?: number;
    max_possible_score?: number;
    time_spent_seconds?: number;
}

export interface StudentResponse {
    question_id: number;
    response: string;
    correct: boolean;
    confused: boolean;
    shown_at: string;
    answered_at: string;
    time_taken_sec: number;
    time_by_type: Record<string, number>;
    time_by_difficulty: Record<string, number>;
    test_attempt_id?: number;
}

export interface QuestionRegenerateRequest {
    topic: string;
    description: string;
    bloom_level: BloomLevel;
    question_type?: 'mcq_single' | 'mcq_multiple' | 'numeric';
    difficulty?: 'easy' | 'medium' | 'hard';
}

export interface StudentAssessmentPerformance {
    student_id: number;
    assessment_id: number;
    assessment_topic: string;
    performance_summary: {
        total_attempts: number;
        completed_attempts: number;
        in_progress_attempts: number;
        best_score: number;
        average_score: number;
        latest_score: number;
        improvement_trend: 'improving' | 'declining' | 'stable';
        total_time_spent_seconds: number;
        weak_areas: Record<string, number>;
    };
    attempt_control: {
        max_attempts: number;
        remaining_attempts: number;
        can_attempt: boolean;
        due_date_passed: boolean;
        retake_allowed: boolean;
    };
    attempt_history: TestAttempt[];
    assignment_settings?: AssignmentSettings;
}

export interface AttemptCompletionResponse {
    message: string;
    attempt_id: number;
    final_score: number;
    max_possible_score: number;
    percentage: number;
    time_spent_seconds: number;
}

export type BloomLevel = 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';
export type QuestionType = 'mcq_single' | 'mcq_multiple' | 'numeric';
export type QuestionDifficulty = 'easy' | 'medium' | 'hard';
