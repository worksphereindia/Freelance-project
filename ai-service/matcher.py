import re
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from typing import List, Dict
from models import Job, Freelancer

def normalize_skill(skill: str) -> str:
    # Standardize formatting
    s = skill.lower().strip()
    s = re.sub(r'[\.\-\s]', '', s) # Strip punctuation and spaces (e.g. node.js -> nodejs, react-native -> reactnative)
    
    # Common Developer Synonyms mapping
    synonyms = {
        "nodejs": ["node", "nodejsdev"],
        "react": ["reactjs", "reactjavascript"],
        "javascript": ["js", "ecmascript"],
        "python": ["py", "python3"],
        "ml": ["machinelearning", "ai", "artificialintelligence", "deeplearning"],
        "mongodb": ["mongo", "mongodbdev"],
        "nextjs": ["next", "nextjsdev"],
        "golang": ["go", "golangdev"],
        "css": ["css3", "tailwindcss", "sass", "scss"]
    }
    
    for key, aliases in synonyms.items():
        if s == key or s in aliases:
            return key
    return s

def match_freelancers(job: Job, freelancers: List[Freelancer]) -> List[Dict[str, float]]:
    if not freelancers:
        return []

    # 1. Normalize job required skills
    job_skills_norm = {normalize_skill(s) for s in job.skills_required if s}
    
    # 2. Build TF-IDF search terms (Job title + Description + Skills vs Freelancer Skills)
    job_doc = f"{job.title} {job.description} " + " ".join(job.skills_required)
    freelancer_docs = [" ".join(f.skills) for f in freelancers]
    
    all_docs = [job_doc] + freelancer_docs
    
    # Compute TF-IDF Cosine Similarity
    cosine_sim = [0.0] * len(freelancers)
    try:
        vectorizer = TfidfVectorizer(stop_words='english')
        tfidf_matrix = vectorizer.fit_transform(all_docs)
        cosine_sim = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:]).flatten()
    except Exception as e:
        print(f"Warning: TF-IDF failed ({e}), relying on Jaccard overlap.")

    results = []
    for i, f in enumerate(freelancers):
        # A. Jaccard Overlap Score (Skill matching)
        f_skills_norm = {normalize_skill(s) for s in f.skills if s}
        
        jaccard_score = 0.0
        if job_skills_norm:
            intersection = job_skills_norm.intersection(f_skills_norm)
            jaccard_score = len(intersection) / len(job_skills_norm)
            
        # B. Cosine similarity score
        cosine_score = float(cosine_sim[i]) if i < len(cosine_sim) else 0.0
        
        # C. Combined matching score
        base_match_score = (jaccard_score * 0.6) + (cosine_score * 0.4)
        
        # D. Rating boost (Freelancer with rating 5.0 gets 1.0x, rating 0.0 gets 0.8x)
        rating_boost = 0.8 + (f.rating / 5.0) * 0.2
        final_score = base_match_score * rating_boost

        results.append({
            "freelancer_id": f.id,
            "score": round(float(final_score), 4)
        })
        
    # Sort by score descending
    results = sorted(results, key=lambda x: x["score"], reverse=True)
    return results[:5]  # Return top 5 matches

def match_jobs(freelancer: Freelancer, jobs: List[Job]) -> List[Dict[str, float]]:
    if not jobs:
        return []

    # 1. Normalize freelancer skills
    f_skills_norm = {normalize_skill(s) for s in freelancer.skills if s}
    
    # 2. Build TF-IDF search terms (Freelancer Skills vs Job title + Description + Skills)
    freelancer_doc = " ".join(freelancer.skills)
    job_docs = [f"{j.title} {j.description} " + " ".join(j.skills_required) for j in jobs]
    
    all_docs = [freelancer_doc] + job_docs
    
    # Compute TF-IDF Cosine Similarity
    cosine_sim = [0.0] * len(jobs)
    try:
        vectorizer = TfidfVectorizer(stop_words='english')
        tfidf_matrix = vectorizer.fit_transform(all_docs)
        cosine_sim = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:]).flatten()
    except Exception as e:
        print(f"Warning: TF-IDF failed ({e}), relying on Jaccard overlap.")

    results = []
    for i, j in enumerate(jobs):
        # A. Jaccard Overlap Score (Skill matching)
        job_skills_norm = {normalize_skill(s) for s in j.skills_required if s}
        
        jaccard_score = 0.0
        if job_skills_norm:
            intersection = f_skills_norm.intersection(job_skills_norm)
            jaccard_score = len(intersection) / len(job_skills_norm)
            
        # B. Cosine similarity score
        cosine_score = float(cosine_sim[i]) if i < len(cosine_sim) else 0.0
        
        # C. Combined matching score
        final_score = (jaccard_score * 0.6) + (cosine_score * 0.4)

        results.append({
            "job_id": j.id,
            "score": round(float(final_score), 4)
        })
        
    # Sort by score descending
    results = sorted(results, key=lambda x: x["score"], reverse=True)
    return results[:10]  # Return top 10 matches
