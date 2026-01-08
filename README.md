# winternship-2026

## Data Exploration

### Setup

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd data_exploration
python3 summary_h5ad.py
```

## Frontend

### Setup

1. set up .env file in the root folder
2. set OPENAI_API_KEY and OPENAI_MODEL environment variables

```bash
npm install
npm run dev
```

## MCP Server

1. Create venv for mcp_server folder
2. set MCP_URL=http://localhost:8000/mcp in root .env

```bash
cd mcp_server
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ..
python3 -m mcp_server.server
```

## Flask 

1. Create venv for backend folder
2. Within that folder, run Flask app

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
flask --app app run --port 5001 --debug
```

## Quick Tests

1. Health check

```bash
curl -s http://127.0.0.1:5001/health
```