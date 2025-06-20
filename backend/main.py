from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from database import Base, engine

Base.metadata.create_all(bind=engine)

app = FastAPI(title="EduJagat API", description="Educational Platform API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Simple user type selection endpoint
class UserTypeSelection(BaseModel):
    user_type: str  # "student" or "teacher"

@app.post("/select-user-type")
async def select_user_type(selection: UserTypeSelection):
    if selection.user_type not in ["student", "teacher"]:
        raise HTTPException(status_code=400, detail="Invalid user type. Must be 'student' or 'teacher'")
    
    return JSONResponse(
        status_code=200, 
        content={
            "message": f"User type selected: {selection.user_type}",
            "user_type": selection.user_type
        }
    )

@app.get("/")
async def root():
    return {"message": "EduJagat API - Select Student or Teacher"}

# Import simplified assessment routes
from routes.assesment import (
    create_assessment_simple, list_assessments_simple, submit_student_response, 
    complete_assessment, get_student_statistics,
    get_statistics_endpoints, student_performance_endpoints
)

create_assessment_simple(app)
list_assessments_simple(app)
submit_student_response(app)
complete_assessment(app)
get_student_statistics(app)
get_statistics_endpoints(app)
student_performance_endpoints(app)