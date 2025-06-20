from enum import Enum as PyEnum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Enum, ForeignKey, DateTime, Boolean, Float, JSON, Text
from sqlalchemy.orm import relationship
from database import Base  # Import Base from database.py instead of creating a new one

class UserRole(PyEnum):
    student = "student"
    teacher = "teacher"

class QuestionType(PyEnum):
    numeric = "numeric"
    mcq_single = "mcq_single"  # Single correct answer
    mcq_multiple = "mcq_multiple"  # Multiple correct answers

class QuestionDifficulty(PyEnum):
    easy = "easy"
    medium = "medium"
    hard = "hard"

class BloomLevel(PyEnum):
    remember = "remember"
    understand = "understand"
    apply = "apply"
    analyze = "analyze"
    evaluate = "evaluate"
    create = "create"

class AttemptStatus(PyEnum):
    in_progress = "in_progress"
    completed = "completed"
    abandoned = "abandoned"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    user_type = Column(Enum(UserRole), nullable=False)
    
    # Relationships
    assessments = relationship("Assessment", back_populates="teacher")
    responses = relationship("StudentResponse", back_populates="student")
    performance_profiles = relationship("PerformanceProfile", back_populates="student")
    test_attempts = relationship("TestAttempt", back_populates="student")

class Assessment(Base):
    __tablename__ = "assessments"
    
    id = Column(Integer, primary_key=True, index=True)
    topic = Column(String, nullable=False)
    description = Column(String, nullable=False)
    bloom_level = Column(Enum(BloomLevel), nullable=False)  # Use enum
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    pdf_content = Column(Text, nullable=True)
    teacher_id = Column(Integer, ForeignKey("users.id"))
    
    # Relationships
    teacher = relationship("User", back_populates="assessments")
    questions = relationship("Question", back_populates="assessment", cascade="all, delete-orphan")
    performance_profiles = relationship("PerformanceProfile", back_populates="assessment", cascade="all, delete-orphan")
    assignment_settings = relationship("AssignmentSetting", back_populates="assessment", cascade="all, delete-orphan")
    test_attempts = relationship("TestAttempt", back_populates="assessment", cascade="all, delete-orphan")

class AssignmentSetting(Base):
    __tablename__ = "assignment_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    assessment_id = Column(Integer, ForeignKey("assessments.id"), unique=True)
    due_date = Column(DateTime, nullable=True)
    time_limit_minutes = Column(Integer, nullable=True)
    max_attempts = Column(Integer, default=1, nullable=False)
    retake_allowed = Column(Boolean, default=False, nullable=False)
    show_results_immediately = Column(Boolean, default=True, nullable=False)
    shuffle_questions = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    assessment = relationship("Assessment", back_populates="assignment_settings")

class TestAttempt(Base):
    __tablename__ = "test_attempts"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"))
    assessment_id = Column(Integer, ForeignKey("assessments.id"))
    attempt_number = Column(Integer, nullable=False)
    status = Column(Enum(AttemptStatus), default=AttemptStatus.in_progress, nullable=False)
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    total_score = Column(Float, nullable=True)
    max_possible_score = Column(Float, nullable=True)
    time_spent_seconds = Column(Integer, nullable=True)
    
    # Relationships
    student = relationship("User", back_populates="test_attempts")
    assessment = relationship("Assessment", back_populates="test_attempts")

class Question(Base):
    __tablename__ = "questions"
    
    id = Column(Integer, primary_key=True, index=True)
    assessment_id = Column(Integer, ForeignKey("assessments.id"))
    question_text = Column(String, nullable=False)
    type = Column(Enum(QuestionType), nullable=False)
    difficulty = Column(Enum(QuestionDifficulty), nullable=False)
    bloom_level = Column(Enum(BloomLevel), nullable=False)  # Use enum
    correct_answer = Column(JSON, nullable=False)
    options = Column(JSON, nullable=True)
    
    # Relationships
    assessment = relationship("Assessment", back_populates="questions")
    responses = relationship("StudentResponse", back_populates="question", cascade="all, delete-orphan")

class StudentResponse(Base):
    __tablename__ = "student_responses"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"))
    question_id = Column(Integer, ForeignKey("questions.id"))
    test_attempt_id = Column(Integer, ForeignKey("test_attempts.id"), nullable=True)
    response = Column(String, nullable=False)
    correct = Column(Boolean, nullable=False)
    confused = Column(Boolean, nullable=False)
    shown_at = Column(DateTime, nullable=False)
    answered_at = Column(DateTime, nullable=False)
    time_taken_sec = Column(Integer, nullable=False)
    time_by_type = Column(JSON, nullable=False)
    time_by_difficulty = Column(JSON, nullable=False)
    
    # Relationships
    student = relationship("User", back_populates="responses")
    question = relationship("Question", back_populates="responses")
    test_attempt = relationship("TestAttempt")

class PerformanceProfile(Base):
    __tablename__ = "performance_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"))
    assessment_id = Column(Integer, ForeignKey("assessments.id"))
    test_attempt_id = Column(Integer, ForeignKey("test_attempts.id"), nullable=True)
    total_correct = Column(Integer, nullable=False)
    total_incorrect = Column(Integer, nullable=False)
    avg_time_per_question = Column(Float, nullable=False)
    weak_areas = Column(JSON, nullable=False)
    started_at = Column(DateTime, nullable=False)
    completed_at = Column(DateTime, nullable=False)
    duration_seconds = Column(Integer, nullable=False)
    
    # Relationships
    student = relationship("User", back_populates="performance_profiles")
    assessment = relationship("Assessment", back_populates="performance_profiles")
    test_attempt = relationship("TestAttempt")

class ClassStatistics(Base):
    __tablename__ = "class_statistics"
    
    id = Column(Integer, primary_key=True, index=True)
    assessment_id = Column(Integer, ForeignKey("assessments.id"))
    total_students = Column(Integer, nullable=False)
    completed_students = Column(Integer, nullable=False)
    average_score = Column(Float, nullable=False)
    pass_rate = Column(Float, nullable=False)
    average_time_seconds = Column(Float, nullable=False)
    difficulty_stats = Column(JSON, nullable=False)  # Performance by difficulty
    bloom_level_stats = Column(JSON, nullable=False)  # Performance by Bloom level
    question_stats = Column(JSON, nullable=False)  # Per-question statistics
    generated_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    assessment = relationship("Assessment")
