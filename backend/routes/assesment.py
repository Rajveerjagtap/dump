from fastapi import Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from models import (
    Assessment, Question, QuestionType, QuestionDifficulty, BloomLevel, 
    StudentResponse, PerformanceProfile, AssignmentSetting, TestAttempt, 
    AttemptStatus, ClassStatistics
)
from schemas import (
    AssessmentCreate, StudentResponseCreate, AssignmentSettingCreate,
    TestAttemptCreate, QuestionRegenerateRequest, StudyContentRequest
)
from database import get_db
import os
import google.generativeai as genai
import google.api_core.exceptions
import json
from datetime import datetime, timedelta
from typing import List, Dict, Optional

from dotenv import load_dotenv
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
else:
    print("Warning: GEMINI_API_KEY not set. Using fallback questions.")

def create_fallback_questions(num_questions: int, topic: str, bloom_level: str):
    """Create fallback questions when Gemini API is unavailable"""
    fallback_questions = []
    
    # Generic questions for any topic - removed hardcoded content
    for i in range(num_questions):
        question_types = ["mcq_single", "mcq_multiple", "numeric"]
        difficulties = ["easy", "medium", "hard"]
        
        question_type = question_types[i % len(question_types)]
        difficulty = difficulties[i % len(difficulties)]
        
        if question_type == "mcq_single":
            question = {
                "question_text": f"Question {i+1}: What is an important concept related to {topic}?",
                "type": question_type,
                "difficulty": difficulty,
                "bloom_level": bloom_level,
                "correct_answer": {"answer": "A"},
                "options": {
                    "A": f"Key concept of {topic}",
                    "B": f"Secondary aspect",
                    "C": f"Related but different topic",
                    "D": f"Unrelated concept"
                }
            }
        elif question_type == "mcq_multiple":
            question = {
                "question_text": f"Question {i+1}: Which aspects are important when studying {topic}? (Select all that apply)",
                "type": question_type,
                "difficulty": difficulty,
                "bloom_level": bloom_level,
                "correct_answer": {"answers": ["A", "C"]},
                "options": {
                    "A": f"Primary principle of {topic}",
                    "B": f"Unrelated concept",
                    "C": f"Secondary principle of {topic}",
                    "D": f"Incorrect assumption"
                }
            }
        else:  # numeric
            question = {
                "question_text": f"Question {i+1}: Provide a numerical value related to {topic} (example answer based on context):",
                "type": question_type,
                "difficulty": difficulty,
                "bloom_level": bloom_level,
                "correct_answer": {"value": 10, "tolerance": 2},
                "options": None
            }
        
        fallback_questions.append(question)
    
    return fallback_questions

async def generate_gemini_questions(topic: str, description: str, bloom_level: str, num_questions: int):
    """Generate questions using Gemini API"""
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        prompt = f"""
        Generate {num_questions} educational questions about the topic: {topic}
        Description: {description}
        Bloom's taxonomy level: {bloom_level}
        
        Please provide questions in this exact JSON format:
        [
            {{
                "question_text": "Your question here",
                "type": "mcq_single",
                "difficulty": "easy",
                "bloom_level": "{bloom_level}",
                "correct_answer": {{"answer": "A"}},
                "options": {{"A": "option1", "B": "option2", "C": "option3", "D": "option4"}}
            }},
            {{
                "question_text": "Your question here",
                "type": "mcq_multiple",
                "difficulty": "medium",
                "bloom_level": "{bloom_level}",
                "correct_answer": {{"answers": ["A", "C"]}},
                "options": {{"A": "option1", "B": "option2", "C": "option3", "D": "option4"}}
            }},
            {{
                "question_text": "Your question here",
                "type": "numeric",
                "difficulty": "hard",
                "bloom_level": "{bloom_level}",
                "correct_answer": {{"value": 42, "tolerance": 1}},
                "options": null
            }}
        ]
        
        Rules:
        1. Mix different question types (mcq_single, mcq_multiple, numeric)
        2. For MCQ questions, provide exactly 4 options (A, B, C, D)
        3. For mcq_single, correct_answer should have "answer" key with single letter
        4. For mcq_multiple, correct_answer should have "answers" key with array of letters
        5. For numeric, correct_answer should have "value" and "tolerance" keys
        6. Difficulty should be "easy", "medium", or "hard"
        7. Return ONLY the JSON array, no other text
        """
        
        response = model.generate_content(prompt)
        content = response.text.strip()
        
        # Clean up the response to extract JSON
        if "```json" in content:
            json_start = content.find("```json") + 7
            json_end = content.find("```", json_start)
            json_content = content[json_start:json_end].strip()
        elif "```" in content:
            json_start = content.find("```") + 3
            json_end = content.find("```", json_start)
            json_content = content[json_start:json_end].strip()
        else:
            json_content = content.strip()
        
        # Try to parse JSON
        try:
            questions = json.loads(json_content)
            
            # Validate the structure
            if not isinstance(questions, list):
                raise ValueError("Response is not a list")
            
            for q in questions:
                if not all(key in q for key in ["question_text", "type", "difficulty", "bloom_level", "correct_answer"]):
                    raise ValueError("Missing required fields in question")
            
            return questions
            
        except (json.JSONDecodeError, ValueError) as e:
            print(f"Failed to parse Gemini response: {e}")
            print(f"Raw content: {content}")
            print(f"Extracted JSON: {json_content}")
            return create_fallback_questions(num_questions, topic, bloom_level)
        
    except Exception as e:
        print(f"Error generating questions with Gemini: {e}")
        return create_fallback_questions(num_questions, topic, bloom_level)

def create_assessment_simple(app):
    @app.post("/assessment")
    async def create_assessment(
        assessment: AssessmentCreate,
        db: Session = Depends(get_db)
    ):
        try:
            # Create new assessment without authentication
            new_assessment = Assessment(
                topic=assessment.topic,
                description=assessment.description,
                bloom_level=assessment.bloom_level,
                pdf_content=assessment.pdf_content,
                teacher_id=None  # No authentication needed
            )
            
            db.add(new_assessment)
            db.commit()
            db.refresh(new_assessment)
            
            # Generate questions using Gemini or fallback
            questions_data = []
            if GEMINI_API_KEY:
                try:
                    questions_data = await generate_gemini_questions(
                        assessment.topic,
                        assessment.description, 
                        assessment.bloom_level.value,
                        assessment.num_questions
                    )
                except Exception as e:
                    print(f"Gemini API error: {e}")
                    questions_data = create_fallback_questions(
                        assessment.num_questions, 
                        assessment.topic, 
                        assessment.bloom_level.value
                    )
            else:
                questions_data = create_fallback_questions(
                    assessment.num_questions, 
                    assessment.topic, 
                    assessment.bloom_level.value
                )
            
            # Save questions to database
            for q_data in questions_data:
                question = Question(
                    assessment_id=new_assessment.id,
                    question_text=q_data["question_text"],
                    type=QuestionType(q_data["type"]),
                    difficulty=QuestionDifficulty(q_data["difficulty"]),
                    bloom_level=BloomLevel(q_data["bloom_level"]),
                    correct_answer=q_data["correct_answer"],
                    options=q_data.get("options")
                )
                db.add(question)
            
            db.commit()
            
            return JSONResponse(
                status_code=201,
                content={
                    "message": "Assessment created successfully",
                    "assessment_id": new_assessment.id,
                    "questions_count": len(questions_data)
                }
            )
        except Exception as e:
            db.rollback()
            return JSONResponse(status_code=500, content={"error": str(e)})

    @app.delete("/assessment/{assessment_id}")
    async def delete_assessment(assessment_id: int, db: Session = Depends(get_db)):
        try:
            assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
            if not assessment:
                raise HTTPException(status_code=404, detail="Assessment not found")
            
            db.delete(assessment)
            db.commit()
            
            return JSONResponse(
                status_code=200,
                content={"message": "Assessment deleted successfully"}
            )
        except Exception as e:
            db.rollback()
            return JSONResponse(status_code=500, content={"error": str(e)})

    @app.post("/assessment/{assessment_id}/assignment-settings")
    async def create_assignment_settings(
        assessment_id: int,
        settings: AssignmentSettingCreate,
        db: Session = Depends(get_db)
    ):
        try:
            assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
            if not assessment:
                raise HTTPException(status_code=404, detail="Assessment not found")
            
            # Check if settings already exist
            existing_settings = db.query(AssignmentSetting).filter(
                AssignmentSetting.assessment_id == assessment_id
            ).first()
            
            if existing_settings:
                # Update existing settings
                for field, value in settings.dict(exclude_unset=True).items():
                    setattr(existing_settings, field, value)
                db.commit()
                db.refresh(existing_settings)
                settings_obj = existing_settings
            else:
                # Create new settings
                new_settings = AssignmentSetting(
                    assessment_id=assessment_id,
                    **settings.dict()
                )
                db.add(new_settings)
                db.commit()
                db.refresh(new_settings)
                settings_obj = new_settings
            
            return {
                "message": "Assignment settings saved successfully",
                "settings": {
                    "id": settings_obj.id,
                    "assessment_id": settings_obj.assessment_id,
                    "due_date": settings_obj.due_date.isoformat() if settings_obj.due_date else None,
                    "time_limit_minutes": settings_obj.time_limit_minutes,
                    "max_attempts": settings_obj.max_attempts,
                    "retake_allowed": settings_obj.retake_allowed,
                    "show_results_immediately": settings_obj.show_results_immediately,
                    "shuffle_questions": settings_obj.shuffle_questions
                }
            }
        except Exception as e:
            db.rollback()
            return JSONResponse(status_code=500, content={"error": str(e)})

def list_assessments_simple(app):
    @app.get("/assessments")
    async def get_assessments(db: Session = Depends(get_db)):
        try:
            assessments = db.query(Assessment).all()
            result = []
            for assessment in assessments:
                # Get assignment settings if they exist
                settings = db.query(AssignmentSetting).filter(
                    AssignmentSetting.assessment_id == assessment.id
                ).first()
                
                result.append({
                    "id": assessment.id,
                    "topic": assessment.topic,
                    "description": assessment.description,
                    "bloom_level": assessment.bloom_level.value if hasattr(assessment.bloom_level, 'value') else assessment.bloom_level,
                    "created_at": assessment.created_at.isoformat(),
                    "questions_count": len(assessment.questions),
                    "assignment_settings": {
                        "due_date": settings.due_date.isoformat() if settings and settings.due_date else None,
                        "time_limit_minutes": settings.time_limit_minutes if settings else None,
                        "max_attempts": settings.max_attempts if settings else 1,
                        "retake_allowed": settings.retake_allowed if settings else False
                    } if settings else None
                })
            return result
        except Exception as e:
            return JSONResponse(status_code=500, content={"error": str(e)})

    @app.get("/assessment/{assessment_id}")
    async def get_assessment_details(assessment_id: int, db: Session = Depends(get_db)):
        try:
            assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
            if not assessment:
                raise HTTPException(status_code=404, detail="Assessment not found")
            
            questions = []
            for question in assessment.questions:
                questions.append({
                    "id": question.id,
                    "question_text": question.question_text,
                    "type": question.type.value if hasattr(question.type, 'value') else question.type,
                    "difficulty": question.difficulty.value if hasattr(question.difficulty, 'value') else question.difficulty,
                    "bloom_level": question.bloom_level.value if hasattr(question.bloom_level, 'value') else question.bloom_level,
                    "options": question.options
                })
            
            # Get assignment settings
            settings = db.query(AssignmentSetting).filter(
                AssignmentSetting.assessment_id == assessment_id
            ).first()
            
            return {
                "id": assessment.id,
                "topic": assessment.topic,
                "description": assessment.description,
                "bloom_level": assessment.bloom_level.value if hasattr(assessment.bloom_level, 'value') else assessment.bloom_level,
                "created_at": assessment.created_at.isoformat(),
                "questions": questions,
                "assignment_settings": {
                    "due_date": settings.due_date.isoformat() if settings and settings.due_date else None,
                    "time_limit_minutes": settings.time_limit_minutes if settings else None,
                    "max_attempts": settings.max_attempts if settings else 1,
                    "retake_allowed": settings.retake_allowed if settings else False,
                    "show_results_immediately": settings.show_results_immediately if settings else True,
                    "shuffle_questions": settings.shuffle_questions if settings else False
                } if settings else None
            }
        except Exception as e:
            return JSONResponse(status_code=500, content={"error": str(e)})

    @app.post("/question/{question_id}/regenerate")
    async def regenerate_question(
        question_id: int,
        regenerate_request: QuestionRegenerateRequest,
        db: Session = Depends(get_db)
    ):
        try:
            question = db.query(Question).filter(Question.id == question_id).first()
            if not question:
                raise HTTPException(status_code=404, detail="Question not found")
            
            # Generate new question using Gemini or fallback
            new_question_data = None
            if GEMINI_API_KEY:
                try:
                    questions_data = await generate_gemini_questions(
                        regenerate_request.topic,
                        regenerate_request.description,
                        regenerate_request.bloom_level.value,
                        1
                    )
                    if questions_data:
                        new_question_data = questions_data[0]
                except Exception as e:
                    print(f"Gemini API error: {e}")
            
            if not new_question_data:
                fallback_questions = create_fallback_questions(
                    1, 
                    regenerate_request.topic, 
                    regenerate_request.bloom_level.value
                )
                new_question_data = fallback_questions[0]
            
            # Update question with new data
            question.question_text = new_question_data["question_text"]
            question.type = QuestionType(new_question_data["type"])
            question.difficulty = QuestionDifficulty(new_question_data["difficulty"])
            question.bloom_level = BloomLevel(new_question_data["bloom_level"])
            question.correct_answer = new_question_data["correct_answer"]
            question.options = new_question_data.get("options")
            
            db.commit()
            db.refresh(question)
            
            return {
                "message": "Question regenerated successfully",
                "question": {
                    "id": question.id,
                    "question_text": question.question_text,
                    "type": question.type.value,
                    "difficulty": question.difficulty.value,
                    "bloom_level": question.bloom_level.value,
                    "correct_answer": question.correct_answer,
                    "options": question.options
                }
            }
        except Exception as e:
            db.rollback()
            return JSONResponse(status_code=500, content={"error": str(e)})

def submit_student_response(app):
    @app.post("/assessment/{assessment_id}/submit-response")
    async def submit_response(
        assessment_id: int,
        response_data: Dict,
        db: Session = Depends(get_db)
    ):
        try:
            # Verify assessment exists
            assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
            if not assessment:
                raise HTTPException(status_code=404, detail="Assessment not found")
            
            # Verify question exists
            question = db.query(Question).filter(Question.id == response_data["question_id"]).first()
            if not question:
                raise HTTPException(status_code=404, detail="Question not found")
            
            student_id = response_data.get("student_id", 1)  # Default student ID
            test_attempt_id = response_data.get("test_attempt_id")
            
            # Verify test attempt if provided
            if test_attempt_id:
                test_attempt = db.query(TestAttempt).filter(
                    TestAttempt.id == test_attempt_id,
                    TestAttempt.student_id == student_id,
                    TestAttempt.assessment_id == assessment_id
                ).first()
                if not test_attempt:
                    raise HTTPException(status_code=404, detail="Test attempt not found")
                if test_attempt.status != AttemptStatus.in_progress:
                    raise HTTPException(status_code=400, detail="Test attempt is not in progress")
            
            # Check if answer is correct
            user_answer = response_data["response"]
            correct_answer = question.correct_answer
            is_correct = False
            
            if question.type == QuestionType.mcq_single:
                is_correct = user_answer == correct_answer.get("answer")
            elif question.type == QuestionType.mcq_multiple:
                user_answers = set(user_answer.split(",")) if isinstance(user_answer, str) else set(user_answer)
                correct_answers = set(correct_answer.get("answers", []))
                is_correct = user_answers == correct_answers
            elif question.type == QuestionType.numeric:
                try:
                    user_value = float(user_answer)
                    correct_value = correct_answer.get("value", 0)
                    tolerance = correct_answer.get("tolerance", 0)
                    is_correct = abs(user_value - correct_value) <= tolerance
                except ValueError:
                    is_correct = False
            
            # Create student response
            student_response = StudentResponse(
                student_id=student_id,
                question_id=response_data["question_id"],
                test_attempt_id=test_attempt_id,
                response=user_answer,
                correct=is_correct,
                confused=response_data.get("confused", False),
                shown_at=datetime.fromisoformat(response_data["shown_at"].replace("Z", "+00:00")),
                answered_at=datetime.fromisoformat(response_data["answered_at"].replace("Z", "+00:00")),
                time_taken_sec=response_data["time_taken_sec"],
                time_by_type=response_data.get("time_by_type", {}),
                time_by_difficulty=response_data.get("time_by_difficulty", {})
            )
            
            db.add(student_response)
            db.commit()
            
            return {
                "message": "Response submitted successfully",
                "correct": is_correct,
                "correct_answer": correct_answer if not is_correct else None
            }
            
        except Exception as e:
            db.rollback()
            return JSONResponse(status_code=500, content={"error": str(e)})

def complete_assessment(app):
    @app.post("/assessment/{assessment_id}/complete")
    async def complete_assessment_endpoint(
        assessment_id: int,
        completion_data: Dict,
        db: Session = Depends(get_db)
    ):
        try:
            student_id = completion_data.get("student_id", 1)  # Default student ID
            test_attempt_id = completion_data.get("test_attempt_id")
            
            # Get test attempt if provided
            test_attempt = None
            if test_attempt_id:
                test_attempt = db.query(TestAttempt).filter(
                    TestAttempt.id == test_attempt_id,
                    TestAttempt.student_id == student_id,
                    TestAttempt.assessment_id == assessment_id
                ).first()
                if not test_attempt:
                    raise HTTPException(status_code=404, detail="Test attempt not found")
            
            # Get all responses for this assessment and student (optionally filtered by attempt)
            query = db.query(StudentResponse).join(Question).filter(
                Question.assessment_id == assessment_id,
                StudentResponse.student_id == student_id
            )
            
            if test_attempt_id:
                query = query.filter(StudentResponse.test_attempt_id == test_attempt_id)
            
            responses = query.all()
            
            if not responses:
                raise HTTPException(status_code=404, detail="No responses found for this assessment")
            
            # Calculate statistics
            total_questions = len(responses)
            correct_answers = sum(1 for r in responses if r.correct)
            incorrect_answers = total_questions - correct_answers
            total_time = sum(r.time_taken_sec for r in responses)
            avg_time = total_time / total_questions if total_questions > 0 else 0
            
            # Calculate weak areas by bloom level
            weak_areas = {}
            bloom_stats = {}
            
            for response in responses:
                question = response.question
                bloom_level = question.bloom_level.value if hasattr(question.bloom_level, 'value') else question.bloom_level
                
                if bloom_level not in bloom_stats:
                    bloom_stats[bloom_level] = {"correct": 0, "total": 0}
                
                bloom_stats[bloom_level]["total"] += 1
                if response.correct:
                    bloom_stats[bloom_level]["correct"] += 1
            
            # Identify weak areas (less than 60% correct)
            for bloom_level, stats in bloom_stats.items():
                accuracy = stats["correct"] / stats["total"] if stats["total"] > 0 else 0
                if accuracy < 0.6:
                    weak_areas[bloom_level] = stats["total"] - stats["correct"]
            
            # Update test attempt if exists
            if test_attempt:
                test_attempt.status = AttemptStatus.completed
                test_attempt.completed_at = datetime.utcnow()
                test_attempt.total_score = float(correct_answers)
                test_attempt.max_possible_score = float(total_questions)
                test_attempt.time_spent_seconds = total_time
                db.commit()
            
            # Create performance profile
            performance_profile = PerformanceProfile(
                student_id=student_id,
                assessment_id=assessment_id,
                test_attempt_id=test_attempt_id,
                total_correct=correct_answers,
                total_incorrect=incorrect_answers,
                avg_time_per_question=avg_time,
                weak_areas=weak_areas,
                started_at=min(r.shown_at for r in responses),
                completed_at=max(r.answered_at for r in responses),
                duration_seconds=total_time
            )
            
            db.add(performance_profile)
            db.commit()
            
            # Update class statistics
            await update_class_statistics(assessment_id, db)
            
            return {
                "message": "Assessment completed successfully",
                "performance": {
                    "total_questions": total_questions,
                    "correct_answers": correct_answers,
                    "incorrect_answers": incorrect_answers,
                    "accuracy_percentage": round((correct_answers / total_questions) * 100, 2),
                    "total_time_seconds": total_time,
                    "average_time_per_question": round(avg_time, 2),
                    "weak_areas": weak_areas,
                    "bloom_level_stats": bloom_stats,
                    "test_attempt_id": test_attempt_id
                }
            }
            
        except Exception as e:
            db.rollback()
            return JSONResponse(status_code=500, content={"error": str(e)})

async def update_class_statistics(assessment_id: int, db: Session):
    """Update class statistics for an assessment"""
    try:
        # Get all completed performance profiles for this assessment
        profiles = db.query(PerformanceProfile).filter(
            PerformanceProfile.assessment_id == assessment_id
        ).all()
        
        if not profiles:
            return
        
        total_students = len(profiles)
        completed_students = total_students
        
        # Calculate average score and pass rate
        total_correct = sum(p.total_correct for p in profiles)
        total_questions = sum(p.total_correct + p.total_incorrect for p in profiles)
        average_score = (total_correct / total_questions * 100) if total_questions > 0 else 0
        
        # Calculate pass rate (assuming 60% is passing)
        passing_students = sum(1 for p in profiles if (p.total_correct / (p.total_correct + p.total_incorrect)) >= 0.6)
        pass_rate = (passing_students / total_students * 100) if total_students > 0 else 0
        
        # Calculate average time
        average_time_seconds = sum(p.duration_seconds for p in profiles) / total_students
        
        # Calculate difficulty and bloom level statistics
        difficulty_stats = {}
        bloom_level_stats = {}
        question_stats = {}
        
        # Get all responses for this assessment
        responses = db.query(StudentResponse).join(Question).filter(
            Question.assessment_id == assessment_id
        ).all()
        
        for response in responses:
            question = response.question
            
            # Difficulty stats
            difficulty = question.difficulty.value if hasattr(question.difficulty, 'value') else question.difficulty
            if difficulty not in difficulty_stats:
                difficulty_stats[difficulty] = {"correct": 0, "total": 0}
            difficulty_stats[difficulty]["total"] += 1
            if response.correct:
                difficulty_stats[difficulty]["correct"] += 1
            
            # Bloom level stats
            bloom_level = question.bloom_level.value if hasattr(question.bloom_level, 'value') else question.bloom_level
            if bloom_level not in bloom_level_stats:
                bloom_level_stats[bloom_level] = {"correct": 0, "total": 0}
            bloom_level_stats[bloom_level]["total"] += 1
            if response.correct:
                bloom_level_stats[bloom_level]["correct"] += 1
            
            # Question stats
            q_id = str(question.id)
            if q_id not in question_stats:
                question_stats[q_id] = {
                    "question_text": question.question_text,
                    "correct": 0,
                    "total": 0,
                    "average_time": 0
                }
            question_stats[q_id]["total"] += 1
            if response.correct:
                question_stats[q_id]["correct"] += 1
        
        # Calculate average time per question
        for q_id in question_stats:
            q_responses = [r for r in responses if str(r.question.id) == q_id]
            if q_responses:
                question_stats[q_id]["average_time"] = sum(r.time_taken_sec for r in q_responses) / len(q_responses)
        
        # Update or create class statistics
        existing_stats = db.query(ClassStatistics).filter(
            ClassStatistics.assessment_id == assessment_id
        ).first()
        
        if existing_stats:
            existing_stats.total_students = total_students
            existing_stats.completed_students = completed_students
            existing_stats.average_score = average_score
            existing_stats.pass_rate = pass_rate
            existing_stats.average_time_seconds = average_time_seconds
            existing_stats.difficulty_stats = difficulty_stats
            existing_stats.bloom_level_stats = bloom_level_stats
            existing_stats.question_stats = question_stats
            existing_stats.generated_at = datetime.utcnow()
        else:
            class_stats = ClassStatistics(
                assessment_id=assessment_id,
                total_students=total_students,
                completed_students=completed_students,
                average_score=average_score,
                pass_rate=pass_rate,
                average_time_seconds=average_time_seconds,
                difficulty_stats=difficulty_stats,
                bloom_level_stats=bloom_level_stats,
                question_stats=question_stats
            )
            db.add(class_stats)
        
        db.commit()
        
    except Exception as e:
        print(f"Error updating class statistics: {e}")
        db.rollback()

def get_student_statistics(app):
    @app.get("/student/{student_id}/statistics")
    async def get_statistics(student_id: int, db: Session = Depends(get_db)):
        try:
            # Get all performance profiles for the student
            profiles = db.query(PerformanceProfile).filter(
                PerformanceProfile.student_id == student_id
            ).all()
            
            if not profiles:
                return {
                    "message": "No assessment history found",
                    "statistics": {
                        "total_assessments": 0,
                        "average_accuracy": 0,
                        "total_time_spent": 0,
                        "assessments": []
                    }
                }
            
            total_assessments = len(profiles)
            total_correct = sum(p.total_correct for p in profiles)
            total_questions = sum(p.total_correct + p.total_incorrect for p in profiles)
            average_accuracy = (total_correct / total_questions * 100) if total_questions > 0 else 0
            total_time_spent = sum(p.duration_seconds for p in profiles)
            
            # Get detailed assessment results
            assessment_results = []
            for profile in profiles:
                assessment = db.query(Assessment).filter(Assessment.id == profile.assessment_id).first()
                if assessment:
                    assessment_results.append({
                        "assessment_id": assessment.id,
                        "topic": assessment.topic,
                        "completed_at": profile.completed_at.isoformat(),
                        "accuracy": round((profile.total_correct / (profile.total_correct + profile.total_incorrect)) * 100, 2),
                        "time_taken": profile.duration_seconds,
                        "weak_areas": profile.weak_areas
                    })
            
            return {
                "statistics": {
                    "total_assessments": total_assessments,
                    "average_accuracy": round(average_accuracy, 2),
                    "total_time_spent": total_time_spent,
                    "assessments": assessment_results
                }
            }
            
        except Exception as e:
            return JSONResponse(status_code=500, content={"error": str(e)})

def student_performance_endpoints(app):
    @app.post("/assessment/{assessment_id}/start-attempt")
    async def start_test_attempt(
        assessment_id: int,
        student_id: int = 1,  # Default for now, will be from auth later
        db: Session = Depends(get_db)
    ):
        try:
            assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
            if not assessment:
                raise HTTPException(status_code=404, detail="Assessment not found")
            
            # Get assignment settings
            settings = db.query(AssignmentSetting).filter(
                AssignmentSetting.assessment_id == assessment_id
            ).first()
            
            # Check if due date has passed
            if settings and settings.due_date and datetime.utcnow() > settings.due_date:
                raise HTTPException(status_code=400, detail="Assessment due date has passed")
            
            # Check existing attempts
            existing_attempts = db.query(TestAttempt).filter(
                TestAttempt.assessment_id == assessment_id,
                TestAttempt.student_id == student_id
            ).all()
            
            max_attempts = settings.max_attempts if settings else 1
            
            # Check if student has exceeded max attempts
            completed_attempts = [a for a in existing_attempts if a.status == AttemptStatus.completed]
            if len(completed_attempts) >= max_attempts and not (settings and settings.retake_allowed):
                raise HTTPException(
                    status_code=400, 
                    detail=f"Maximum attempts ({max_attempts}) exceeded"
                )
            
            # Check for existing in-progress attempt
            in_progress = [a for a in existing_attempts if a.status == AttemptStatus.in_progress]
            if in_progress:
                return {
                    "message": "Existing attempt found",
                    "attempt": {
                        "id": in_progress[0].id,
                        "attempt_number": in_progress[0].attempt_number,
                        "started_at": in_progress[0].started_at.isoformat(),
                        "status": in_progress[0].status.value
                    }
                }
            
            # Create new attempt
            attempt_number = len(existing_attempts) + 1
            new_attempt = TestAttempt(
                student_id=student_id,
                assessment_id=assessment_id,
                attempt_number=attempt_number,
                status=AttemptStatus.in_progress
            )
            
            db.add(new_attempt)
            db.commit()
            db.refresh(new_attempt)
            
            return {
                "message": "Test attempt started successfully",
                "attempt": {
                    "id": new_attempt.id,
                    "attempt_number": new_attempt.attempt_number,
                    "started_at": new_attempt.started_at.isoformat(),
                    "status": new_attempt.status.value,
                    "time_limit_minutes": settings.time_limit_minutes if settings else None
                }
            }
        except Exception as e:
            db.rollback()
            return JSONResponse(status_code=500, content={"error": str(e)})

    @app.get("/student/{student_id}/attempts/{assessment_id}")
    async def get_student_attempts(
        student_id: int,
        assessment_id: int,
        db: Session = Depends(get_db)
    ):
        try:
            attempts = db.query(TestAttempt).filter(
                TestAttempt.student_id == student_id,
                TestAttempt.assessment_id == assessment_id
            ).order_by(desc(TestAttempt.started_at)).all()
            
            result = []
            for attempt in attempts:
                result.append({
                    "id": attempt.id,
                    "attempt_number": attempt.attempt_number,
                    "status": attempt.status.value,
                    "started_at": attempt.started_at.isoformat(),
                    "completed_at": attempt.completed_at.isoformat() if attempt.completed_at else None,
                    "total_score": attempt.total_score,
                    "max_possible_score": attempt.max_possible_score,
                    "time_spent_seconds": attempt.time_spent_seconds
                })
            
            return {
                "assessment_id": assessment_id,
                "student_id": student_id,
                "attempts": result
            }
        except Exception as e:
            return JSONResponse(status_code=500, content={"error": str(e)})

    @app.get("/student/{student_id}/assessment/{assessment_id}/performance")
    async def get_student_assessment_performance(
        student_id: int, 
        assessment_id: int, 
        db: Session = Depends(get_db)
    ):
        """Get detailed performance data for a specific student and assessment"""
        try:
            # Get all attempts for this student and assessment
            attempts = db.query(TestAttempt).filter(
                TestAttempt.student_id == student_id,
                TestAttempt.assessment_id == assessment_id
            ).order_by(TestAttempt.started_at).all()
            
            # Get assignment settings
            settings = db.query(AssignmentSetting).filter(
                AssignmentSetting.assessment_id == assessment_id
            ).first()
            
            # Get assessment info
            assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
            if not assessment:
                raise HTTPException(status_code=404, detail="Assessment not found")
            
            # Calculate performance metrics
            total_attempts = len(attempts)
            completed_attempts = [a for a in attempts if a.status == AttemptStatus.completed]
            in_progress_attempts = [a for a in attempts if a.status == AttemptStatus.in_progress]
            
            # Calculate scores and improvement
            scores = [a.total_score for a in completed_attempts if a.total_score is not None]
            best_score = max(scores) if scores else 0
            average_score = sum(scores) / len(scores) if scores else 0
            latest_score = scores[-1] if scores else 0
            
            # Calculate improvement trend
            improvement_trend = 'stable'
            if len(scores) >= 2:
                if scores[-1] > scores[0]:
                    improvement_trend = 'improving'
                elif scores[-1] < scores[0]:
                    improvement_trend = 'declining'
            
            # Check if student can take more attempts
            max_attempts = settings.max_attempts if settings else 1
            remaining_attempts = max(0, max_attempts - total_attempts) if max_attempts > 0 else float('inf')
            can_attempt = remaining_attempts > 0 or (settings and settings.retake_allowed)
            
            # Check due date
            due_date_passed = False
            if settings and settings.due_date:
                due_date_passed = datetime.utcnow() > settings.due_date
            
            # Get performance profiles for detailed analysis
            performance_profiles = db.query(PerformanceProfile).filter(
                PerformanceProfile.student_id == student_id,
                PerformanceProfile.assessment_id == assessment_id
            ).all()
            
            weak_areas = {}
            total_time_spent = 0
            for profile in performance_profiles:
                total_time_spent += profile.duration_seconds
                for area, count in profile.weak_areas.items():
                    weak_areas[area] = weak_areas.get(area, 0) + count
            
            # Format attempt history
            attempt_history = []
            for attempt in attempts:
                attempt_data = {
                    "id": attempt.id,
                    "attempt_number": attempt.attempt_number,
                    "status": attempt.status.value,
                    "started_at": attempt.started_at.isoformat(),
                    "completed_at": attempt.completed_at.isoformat() if attempt.completed_at else None,
                    "total_score": attempt.total_score,
                    "max_possible_score": attempt.max_possible_score,
                    "time_spent_seconds": attempt.time_spent_seconds,
                    "percentage_score": round((attempt.total_score / attempt.max_possible_score * 100), 2) if attempt.total_score and attempt.max_possible_score else None
                }
                attempt_history.append(attempt_data)
            
            return {
                "student_id": student_id,
                "assessment_id": assessment_id,
                "assessment_topic": assessment.topic,
                "performance_summary": {
                    "total_attempts": total_attempts,
                    "completed_attempts": len(completed_attempts),
                    "in_progress_attempts": len(in_progress_attempts),
                    "best_score": best_score,
                    "average_score": round(average_score, 2),
                    "latest_score": latest_score,
                    "improvement_trend": improvement_trend,
                    "total_time_spent_seconds": total_time_spent,
                    "weak_areas": weak_areas
                },
                "attempt_control": {
                    "max_attempts": max_attempts,
                    "remaining_attempts": remaining_attempts if remaining_attempts != float('inf') else -1,
                    "can_attempt": can_attempt and not due_date_passed,
                    "due_date_passed": due_date_passed,
                    "retake_allowed": settings.retake_allowed if settings else False
                },
                "attempt_history": attempt_history,
                "assignment_settings": {
                    "due_date": settings.due_date.isoformat() if settings and settings.due_date else None,
                    "time_limit_minutes": settings.time_limit_minutes if settings else None,
                    "max_attempts": settings.max_attempts if settings else 1,
                    "retake_allowed": settings.retake_allowed if settings else False,
                    "show_results_immediately": settings.show_results_immediately if settings else True
                } if settings else None
            }
            
        except Exception as e:
            return JSONResponse(status_code=500, content={"error": str(e)})

    @app.post("/assessment/{assessment_id}/complete-attempt")
    async def complete_test_attempt(
        assessment_id: int,
        attempt_id: int,
        student_id: int = 1,  # Default for now
        db: Session = Depends(get_db)
    ):
        """Complete a test attempt and update scores"""
        try:
            # Get the attempt
            attempt = db.query(TestAttempt).filter(
                TestAttempt.id == attempt_id,
                TestAttempt.student_id == student_id,
                TestAttempt.assessment_id == assessment_id
            ).first()
            
            if not attempt:
                raise HTTPException(status_code=404, detail="Test attempt not found")
            
            if attempt.status == AttemptStatus.completed:
                return {"message": "Attempt already completed", "attempt_id": attempt_id}
            
            # Calculate final score from responses
            responses = db.query(StudentResponse).filter(
                StudentResponse.test_attempt_id == attempt_id
            ).all()
            
            total_score = sum(1 for r in responses if r.correct)
            max_possible_score = len(responses)
            time_spent = sum(r.time_taken_sec for r in responses)
            
            # Update attempt
            attempt.status = AttemptStatus.completed
            attempt.completed_at = datetime.utcnow()
            attempt.total_score = total_score
            attempt.max_possible_score = max_possible_score
            attempt.time_spent_seconds = time_spent
            
            db.commit()
            
            return {
                "message": "Test attempt completed successfully",
                "attempt_id": attempt_id,
                "final_score": total_score,
                "max_possible_score": max_possible_score,
                "percentage": round((total_score / max_possible_score * 100), 2) if max_possible_score > 0 else 0,
                "time_spent_seconds": time_spent
            }
            
        except Exception as e:
            db.rollback()
            return JSONResponse(status_code=500, content={"error": str(e)})

def get_statistics_endpoints(app):
    @app.get("/assessment/{assessment_id}/statistics")
    async def get_assessment_statistics(assessment_id: int, db: Session = Depends(get_db)):
        try:
            assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
            if not assessment:
                raise HTTPException(status_code=404, detail="Assessment not found")
            
            # Get class statistics
            class_stats = db.query(ClassStatistics).filter(
                ClassStatistics.assessment_id == assessment_id
            ).first()
            
            if not class_stats:
                # Generate statistics if not available
                await update_class_statistics(assessment_id, db)
                class_stats = db.query(ClassStatistics).filter(
                    ClassStatistics.assessment_id == assessment_id
                ).first()
            
            if not class_stats:
                return {
                    "message": "No statistics available yet",
                    "assessment_id": assessment_id,
                    "statistics": None
                }
            
            return {
                "assessment_id": assessment_id,
                "assessment_title": assessment.topic,
                "statistics": {
                    "total_students": class_stats.total_students,
                    "completed_students": class_stats.completed_students,
                    "average_score": round(class_stats.average_score, 2),
                    "pass_rate": round(class_stats.pass_rate, 2),
                    "average_time_seconds": round(class_stats.average_time_seconds, 2),
                    "difficulty_breakdown": class_stats.difficulty_stats,
                    "bloom_level_breakdown": class_stats.bloom_level_stats,
                    "question_performance": class_stats.question_stats,
                    "generated_at": class_stats.generated_at.isoformat()
                }
            }
        except Exception as e:
            return JSONResponse(status_code=500, content={"error": str(e)})

    @app.get("/class-statistics")
    async def get_class_statistics(db: Session = Depends(get_db)):
        try:
            # Get all assessments with their statistics
            assessments = db.query(Assessment).all()
            
            overall_stats = {
                "total_assessments": len(assessments),
                "total_students_enrolled": 0,
                "total_assessments_completed": 0,
                "overall_average_score": 0,
                "overall_pass_rate": 0,
                "assessments": []
            }
            
            total_scores = []
            total_pass_count = 0
            total_student_count = 0
            
            for assessment in assessments:
                class_stats = db.query(ClassStatistics).filter(
                    ClassStatistics.assessment_id == assessment.id
                ).first()
                
                if class_stats:
                    assessment_data = {
                        "assessment_id": assessment.id,
                        "topic": assessment.topic,
                        "students_completed": class_stats.completed_students,
                        "average_score": round(class_stats.average_score, 2),
                        "pass_rate": round(class_stats.pass_rate, 2),
                        "created_at": assessment.created_at.isoformat()
                    }
                    
                    overall_stats["assessments"].append(assessment_data)
                    
                    # Add to overall calculations
                    if class_stats.completed_students > 0:
                        total_scores.append(class_stats.average_score)
                        total_pass_count += (class_stats.pass_rate / 100) * class_stats.completed_students
                        total_student_count += class_stats.completed_students
                        overall_stats["total_assessments_completed"] += 1
            
            # Calculate overall averages
            if total_scores:
                overall_stats["overall_average_score"] = round(sum(total_scores) / len(total_scores), 2)
            
            if total_student_count > 0:
                overall_stats["overall_pass_rate"] = round((total_pass_count / total_student_count) * 100, 2)
                overall_stats["total_students_enrolled"] = total_student_count
            
            return overall_stats
            
        except Exception as e:
            return JSONResponse(status_code=500, content={"error": str(e)})

    @app.get("/student/{student_id}/performance-report")
    async def get_student_performance_report(student_id: int, db: Session = Depends(get_db)):
        try:
            # Get all performance profiles for the student
            profiles = db.query(PerformanceProfile).filter(
                PerformanceProfile.student_id == student_id
            ).order_by(desc(PerformanceProfile.completed_at)).all()
            
            if not profiles:
                return {
                    "message": "No performance data found",
                    "student_id": student_id,
                    "report": {
                        "total_assessments": 0,
                        "average_accuracy": 0,
                        "total_time_spent": 0,
                        "improvement_trend": [],
                        "weak_areas_summary": {},
                        "assessments": []
                    }
                }
            
            # Calculate summary statistics
            total_assessments = len(profiles)
            total_correct = sum(p.total_correct for p in profiles)
            total_questions = sum(p.total_correct + p.total_incorrect for p in profiles)
            average_accuracy = (total_correct / total_questions * 100) if total_questions > 0 else 0
            total_time_spent = sum(p.duration_seconds for p in profiles)
            
            # Calculate improvement trend (last 5 assessments)
            recent_profiles = profiles[:5]
            improvement_trend = []
            for profile in reversed(recent_profiles):
                assessment = db.query(Assessment).filter(Assessment.id == profile.assessment_id).first()
                accuracy = (profile.total_correct / (profile.total_correct + profile.total_incorrect)) * 100
                improvement_trend.append({
                    "assessment_id": profile.assessment_id,
                    "topic": assessment.topic if assessment else "Unknown",
                    "accuracy": round(accuracy, 2),
                    "completed_at": profile.completed_at.isoformat()
                })
            
            # Aggregate weak areas
            weak_areas_summary = {}
            for profile in profiles:
                for area, count in profile.weak_areas.items():
                    if area not in weak_areas_summary:
                        weak_areas_summary[area] = 0
                    weak_areas_summary[area] += count
            
            # Detailed assessment results
            assessment_results = []
            for profile in profiles:
                assessment = db.query(Assessment).filter(Assessment.id == profile.assessment_id).first()
                if assessment:
                    # Get test attempt info if available
                    attempt_info = None
                    if profile.test_attempt_id:
                        attempt = db.query(TestAttempt).filter(TestAttempt.id == profile.test_attempt_id).first()
                        if attempt:
                            attempt_info = {
                                "attempt_number": attempt.attempt_number,
                                "total_score": attempt.total_score,
                                "max_possible_score": attempt.max_possible_score
                            }
                    
                    assessment_results.append({
                        "assessment_id": assessment.id,
                        "topic": assessment.topic,
                        "bloom_level": assessment.bloom_level.value if hasattr(assessment.bloom_level, 'value') else assessment.bloom_level,
                        "completed_at": profile.completed_at.isoformat(),
                        "accuracy": round((profile.total_correct / (profile.total_correct + profile.total_incorrect)) * 100, 2),
                        "time_taken_seconds": profile.duration_seconds,
                        "weak_areas": profile.weak_areas,
                        "attempt_info": attempt_info
                    })
            
            return {
                "student_id": student_id,
                "report": {
                    "total_assessments": total_assessments,
                    "average_accuracy": round(average_accuracy, 2),
                    "total_time_spent": total_time_spent,
                    "improvement_trend": improvement_trend,
                    "weak_areas_summary": weak_areas_summary,
                    "assessments": assessment_results
                }
            }
            
        except Exception as e:
            return JSONResponse(status_code=500, content={"error": str(e)})

    @app.get("/assessment/{assessment_id}/teacher-view")
    async def get_assessment_with_answers(assessment_id: int, db: Session = Depends(get_db)):
        """Teacher-only endpoint to view assessment with correct answers"""
        try:
            assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
            if not assessment:
                raise HTTPException(status_code=404, detail="Assessment not found")
            
            questions = []
            for question in assessment.questions:
                questions.append({
                    "id": question.id,
                    "question_text": question.question_text,
                    "type": question.type.value if hasattr(question.type, 'value') else question.type,
                    "difficulty": question.difficulty.value if hasattr(question.difficulty, 'value') else question.difficulty,
                    "bloom_level": question.bloom_level.value if hasattr(question.bloom_level, 'value') else question.bloom_level,
                    "options": question.options,
                    "correct_answer": question.correct_answer  # Include correct answer for teachers
                })
            
            # Get assignment settings
            settings = db.query(AssignmentSetting).filter(
                AssignmentSetting.assessment_id == assessment_id
            ).first()
            
            return {
                "id": assessment.id,
                "topic": assessment.topic,
                "description": assessment.description,
                "bloom_level": assessment.bloom_level.value if hasattr(assessment.bloom_level, 'value') else assessment.bloom_level,
                "created_at": assessment.created_at.isoformat(),
                "questions": questions,
                "assignment_settings": {
                    "due_date": settings.due_date.isoformat() if settings and settings.due_date else None,
                    "time_limit_minutes": settings.time_limit_minutes if settings else None,
                    "max_attempts": settings.max_attempts if settings else 1,
                    "retake_allowed": settings.retake_allowed if settings else False,
                    "show_results_immediately": settings.show_results_immediately if settings else True,
                    "shuffle_questions": settings.shuffle_questions if settings else False
                } if settings else None
            }
        except Exception as e:
            return JSONResponse(status_code=500, content={"error": str(e)})

