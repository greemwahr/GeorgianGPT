# GeorgianGPT

A RAG-powered chatbot for Georgian College that answers student questions using the college's website content.

## Overview

GeorgianGPT provides a ChatGPT-like interface for students to ask questions about programs, admissions, services, and campus information. The system uses retrieval-augmented generation to provide accurate answers with source citations.

## Architecture

- **Frontend**: Next.js with Vercel AI SDK
- **Backend**: RAG pipeline with Supabase pgvector
- **LLM**: Mistral-7B on HuggingFace (swappable providers)
- **Data Source**: georgiancollege.ca (web crawler)

## Quick Start

### Frontend
```bash
npm install
npm run dev
```

### Data Pipeline
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -c "import nltk; nltk.download('punkt')"
cd scripts/crawler && scrapy crawl college_spider -o output.json
python scripts/ingest.py
```

## Environment Variables

Create a `.env.local` file:
```
OPENAI_API_KEY=your_key
SUPABASE_URL=your_url
SUPABASE_ANON_KEY=your_key
INFERENCE_PROVIDER=huggingface
HUGGINGFACE_API_KEY=your_key
```

## Documentation

- `CLAUDE.md` - Architecture and development guidelines
- `PLAN.md` - Detailed implementation plan
- `.flow/` - Task tracking and specifications
