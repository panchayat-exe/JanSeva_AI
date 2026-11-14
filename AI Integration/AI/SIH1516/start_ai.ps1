cd "d:\JanSeva_SiH\AI Integration\AI\SIH1516"
.\venv\Scripts\Activate.ps1
python -m uvicorn api.main:app --reload --port 8001
