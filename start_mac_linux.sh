#!/bin/bash
echo "====================================="
echo " Starting TVBOT_Desktop Local Server"
echo "====================================="

# Check if pixi is available (Recommended for the new architecture)
if command -v pixi &> /dev/null; then
    echo "[Info] Pixi detected. Using Pixi for efficient dependency management."
    
    # Check if npm dependencies need to be installed/built
    if [ ! -d "node_modules" ] || [ ! -d "src/dist" ]; then
        echo "[Info] Installing Node dependencies and building frontend..."
        npm install
        npm run build
    fi
    
    # Run the python server using pixi
    echo "[Info] Starting Flask server..."
    pixi run python server.py
    exit 0
fi

# Fallback: Default to standard Python/pip with virtualenv
echo "[Warn] Pixi not found. Falling back to standard virtualenv..."
if [ ! -d "venv" ]; then
    echo "Creating virtual environment 'venv'..."
    python3 -m venv venv
fi

echo "Activating virtual environment..."
source venv/bin/activate

echo "Installing requirements if needed..."
pip install -r requirements.txt > /dev/null 2>&1

if [ ! -d "node_modules" ] || [ ! -d "src/dist" ]; then
    echo "[Info] Installing Node dependencies and building frontend..."
    npm install
    npm run build
fi

echo "[Info] Starting Flask server..."
python server.py