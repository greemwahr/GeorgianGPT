# GeorgianGPT Crawler

Scrapy project to crawl georgiancollege.ca for RAG ingestion.

## Setup

From project root:

```bash
python3 -m venv venv
# Windows: venv\Scripts\activate
# macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
python -c "import nltk; nltk.download('punkt')"
```

## Run

From project root:

```bash
cd scripts/crawler
scrapy crawl college_spider -o output.json
```

Limit to 10–20 pages (for testing):

```bash
scrapy crawl college_spider -o output.json -s CLOSESPIDER_PAGECOUNT=20
```

## Output schema

Each item has:

- `url` – page URL
- `page_title` – from `<h1>` or `<title>`
- `content` – main text (nav, footer, script, style, header removed)
- `section` – derived from URL: `programs`, `admissions`, `student-life`, `services`, or `general`
- `crawl_timestamp` – ISO 8601 UTC

## Settings

- `USER_AGENT`: GeorgianGPT-Crawler (Educational Project)
- `ROBOTSTXT_OBEY`: True
- `DOWNLOAD_DELAY`: 1 (1 req/sec)
- `DEPTH_LIMIT`: 8
