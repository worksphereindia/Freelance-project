from fastapi import FastAPI
from models import MatchRequest, MatchResponse, GenerateProposalRequest, MatchJobsRequest, MatchJobsResponse
from matcher import match_freelancers, match_jobs
from typing import List

app = FastAPI(title="Freelancer AI Matcher")

@app.post("/match", response_model=List[MatchResponse])
async def match(request: MatchRequest):
    results = match_freelancers(request.job, request.freelancers)
    return results

@app.post("/match-jobs", response_model=List[MatchJobsResponse])
async def match_jobs_endpoint(request: MatchJobsRequest):
    results = match_jobs(request.freelancer, request.jobs)
    return results

@app.get("/")
def read_root():
    return {"message": "AI Matcher is running"}

@app.post("/generate-proposal")
async def generate_proposal(req: GenerateProposalRequest):
    # A sophisticated template for our Magic AI Proposal
    skills_str = ", ".join(req.freelancer_skills)
    proposal = (
        f"Hi there!\n\n"
        f"I recently came across your job posting for '{req.job_title}' and I am very interested in helping you out. "
        f"With my strong background in {skills_str}, I am confident I have the exact expertise you are looking for.\n\n"
        f"Regarding your requirements: I have carefully reviewed your description and understand that you need someone who can deliver high-quality results efficiently. "
        f"I always prioritize clear communication and timely delivery to ensure my clients are 100% satisfied.\n\n"
        f"I would love to discuss this project further with you. Please feel free to reach out so we can align on the details.\n\n"
        f"Best regards,\n"
        f"{req.freelancer_name}"
    )
    return {"proposal": proposal}
