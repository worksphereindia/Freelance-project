from pydantic import BaseModel
from typing import List, Optional

class Freelancer(BaseModel):
    id: str
    name: str = ""
    skills: List[str]
    rating: float = 5.0
    profilePicture: Optional[str] = None

class Job(BaseModel):
    id: str
    title: str = ""
    description: str = ""
    skills_required: List[str]

class MatchRequest(BaseModel):
    job: Job
    freelancers: List[Freelancer]

class MatchResponse(BaseModel):
    freelancer_id: str
    score: float

class GenerateProposalRequest(BaseModel):
    job_title: str
    job_description: str
    freelancer_name: str
    freelancer_skills: List[str]

