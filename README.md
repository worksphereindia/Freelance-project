cd backend && npm run start

cd frontend && npm run dev

cd ai-service
 \venv\Scripts\uvicorn.exe main:app --reload --port 8000

npx kill-port 5000

cd ai-service
venv\Scripts\activate
uvicorn main:app --reload