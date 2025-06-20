from datetime import datetime
from typing import Optional, List, Dict
from pydantic import BaseModel, EmailStr
from enum import Enum


class UserRole(str, Enum):
    student = "student"
    teacher = "teacher"

class QuestionType(str, Enum):
    numeric = "numeric"
    mcq_single = "mcq_single"  # Single correct answer
    mcq_multiple = "mcq_multiple"  # Multiple correct answers

class QuestionDifficulty(str, Enum):
    easy = "easy"
    medium = "medium"
    hard = "hard"

class BloomLevel(str, Enum):
    remember = "remember"
    understand = "understand" 
    apply = "apply"
    analyze = "analyze"
    evaluate = "evaluate"
    create = "create"

class AttemptStatus(str, Enum):
    in_progress = "in_progress"
    completed = "completed"
    abandoned = "abandoned"


class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str
    user_type: UserRole

    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    user_type: UserRole

class UserResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    user_type: UserRole

    class Config:
        from_attributes = True


class AssessmentCreate(BaseModel):
    topic: str
    description: str
    bloom_level: BloomLevel  # Use the enum
    num_questions: int
    pdf_content: Optional[str] = None

    class Config:
        from_attributes = True

class AssessmentResponse(BaseModel):
    id: int
    topic: str
    description: str
    bloom_level: str
    pdf_content: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class AssignmentSettingCreate(BaseModel):
    due_date: Optional[datetime] = None
    time_limit_minutes: Optional[int] = None
    max_attempts: int = 1
    retake_allowed: bool = False
    show_results_immediately: bool = True
    shuffle_questions: bool = False

    class Config:
        from_attributes = True

class AssignmentSettingResponse(AssignmentSettingCreate):
    id: int
    assessment_id: int
    created_at: datetime

class TestAttemptCreate(BaseModel):
    assessment_id: int
    student_id: int

    class Config:
        from_attributes = True

class TestAttemptResponse(BaseModel):
    id: int
    student_id: int
    assessment_id: int
    attempt_number: int
    status: AttemptStatus
    started_at: datetime
    completed_at: Optional[datetime] = None
    total_score: Optional[float] = None
    max_possible_score: Optional[float] = None
    time_spent_seconds: Optional[int] = None

    class Config:
        from_attributes = True

class QuestionCreate(BaseModel):
    question_text: str
    type: QuestionType
    difficulty: QuestionDifficulty
    bloom_level: BloomLevel  # Use the enum
    correct_answer: Dict
    options: Optional[Dict] = None

    class Config:
        from_attributes = True

class QuestionResponse(QuestionCreate):
    id: int
    assessment_id: int

class QuestionRegenerateRequest(BaseModel):
    topic: str
    description: str
    bloom_level: BloomLevel
    question_type: Optional[QuestionType] = None
    difficulty: Optional[QuestionDifficulty] = None

    class Config:
        from_attributes = True

class StudentResponseCreate(BaseModel):
    question_id: int
    response: str
    correct: bool
    confused: bool
    shown_at: datetime
    answered_at: datetime
    time_taken_sec: int
    time_by_type: Dict[str, int]
    time_by_difficulty: Dict[str, int]
    test_attempt_id: Optional[int] = None

    class Config:
        from_attributes = True

class StudentResponseOut(StudentResponseCreate):
    id: int
    student_id: int


class PerformanceProfileBase(BaseModel):
    total_correct: int
    total_incorrect: int
    avg_time_per_question: float
    weak_areas: Dict[str, int]
    started_at: datetime
    completed_at: datetime
    duration_seconds: int
    test_attempt_id: Optional[int] = None

    class Config:
        from_attributes = True

class PerformanceProfileResponse(PerformanceProfileBase):
    id: int
    student_id: int
    assessment_id: int

class ClassStatisticsResponse(BaseModel):
    id: int
    assessment_id: int
    total_students: int
    completed_students: int
    average_score: float
    pass_rate: float
    average_time_seconds: float
    difficulty_stats: Dict
    bloom_level_stats: Dict
    question_stats: Dict
    generated_at: datetime

    class Config:
        from_attributes = True

class StudyContentRequest(BaseModel):
    topic: str
    description: str = ""
    bloom_level: BloomLevel = BloomLevel.remember

    class Config:
        from_attributes = True
