# AI-Powered Criminal Network Analysis Platform

## 1. Overview
The **AI-Powered Criminal Network Analysis Platform** is an intelligent investigative system built for law enforcement and intelligence analysts. It automates the extraction, resolution, and visualization of complex criminal networks from unstructured police documents, First Information Reports (FIRs), call detail records (CDRs), and various media artifacts.

By leveraging advanced OCR, Large Language Models (LLMs) for Natural Language Processing (NLP), and Graph Theory, the platform aims to map out criminal enterprises, uncover hidden relationships, and identify key influencers and middlemen within a network.

## 2. Key Features
- **Multi-Format Document Parsing**: Ingests PDFs, images (PNG, JPG, TIFF), CSVs, Excel spreadsheets, and plain text files.
- **Automated Intelligence Extraction**: Utilizes an LLM (MiMo LLM) to perform Named Entity Recognition (NER) and Relationship Extraction specifically filtered to isolate criminal entities and relationships.
- **Fuzzy Entity Resolution**: Matches incoming entities with existing graph nodes using string matching to merge duplicates and prevent network fragmentation.
- **Graph Database Storage**: Persists multi-case graph networks securely in Neo4j.
- **Graph Analytics & Insights**: Runs NetworkX-backed Graph Theory algorithms to identify top influencers (Degree Centrality), key bridges/middlemen (Betweenness Centrality), and sub-gang clusters (Community Detection).
- **Interactive Visual Explorer**: A responsive Next.js-based interface offering D3 force-directed network graphs, case selection, entity detail inspection, and real-time analytical metrics.

## 3. Technology Stack
- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS v4, D3-force, Axios
- **Backend**: FastAPI (Python 3.10+), Uvicorn, Pydantic v2
- **Database**: Neo4j (Graph Database)
- **AI & NLP**: MiMo LLM (via OpenAI API SDK), pdfplumber, pytesseract, pandas
- **Graph Analytics**: NetworkX

## 4. Getting Started

### Prerequisites
- Node.js & npm (for Frontend)
- Python 3.10+ (for Backend)
- Neo4j Database Server
- Tesseract OCR (system dependency for image parsing)

### Environment Configuration
1. Navigate to the `backend/` directory.
2. Create/Update the `.env` file based on your local setup:
   ```env
   NEO4J_URI=bolt://localhost:7687
   NEO4J_USER=neo4j
   NEO4J_PASSWORD=password
   MIMO_API_KEY=your_mimo_api_key
   ```

### Running the Backend
```bash
cd backend
# Create and activate a virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
# Unix/MacOS:
# source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Running the Frontend
```bash
cd frontend
npm install
npm run dev
```

## 5. Upcoming Features (Roadmap)
- **Blockchain for Case Data Handling**: To ensure data integrity, immutability, and secure audit trails for sensitive case files and intelligence, a blockchain-based immutable ledger will be integrated into the evidence and case data handling pipeline. *(Yet to be implemented)*

## 6. Architecture & System Flow
For a deeper dive into the system's architecture, including component breakdowns, API workflows, and data flow diagrams, please refer to the detailed [architecture.md](architecture.md) document.
