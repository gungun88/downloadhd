#!/bin/bash

# Start development servers for frontend and backend

echo "Starting backend server..."
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

echo "Backend server started (PID: $BACKEND_PID)"
echo "Backend running at http://localhost:8000"

cd ..

echo "Starting frontend server..."
npm run dev &
FRONTEND_PID=$!

echo "Frontend server started (PID: $FRONTEND_PID)"
echo "Frontend running at http://localhost:3000"

echo ""
echo "================================"
echo "Both servers are running!"
echo "Frontend: http://localhost:3000"
echo "Backend:  http://localhost:8000"
echo "================================"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for Ctrl+C
trap "echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait
