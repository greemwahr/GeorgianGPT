# fn-1-j9y.1 Setup Python environment and Scrapy crawler

## Description

Set up Python virtual environment, install dependencies, and implement Scrapy spider to crawl georgiancollege.ca website with rate limiting, robots.txt compliance, and priority URL pattern filtering.

## Acceptance

- [ ] Python venv created with requirements.txt installed (Scrapy 2.11, BeautifulSoup 4.12, PyMuPDF 1.23, NLTK 3.8, OpenAI 1.6, Supabase 2.3)
- [ ] NLTK punkt tokenizer data downloaded
- [ ] Scrapy project initialized in `scripts/crawler/`
- [ ] CollegeSpider implemented with:
  - start_urls: https://www.georgiancollege.ca/
  - allowed_domains: georgiancollege.ca
  - DEPTH_LIMIT: 8, DOWNLOAD_DELAY: 1, ROBOTSTXT_OBEY: True
  - Priority URL patterns: /programs/, /admissions/, /student-life/, /services/
- [ ] Spider extracts: url, page_title, content, section, crawl_timestamp
- [ ] Content extraction removes nav, footer, scripts, styles, header elements
- [ ] Crawler tested on 10-20 pages, outputs valid JSON
- [ ] settings.py configured with USER_AGENT='GeorgianGPT-Crawler (Educational Project)'

## Implementation Notes

**Spider Parse Method**:
- Use BeautifulSoup to parse HTML
- Remove unwanted elements: `soup(['nav', 'footer', 'script', 'style', 'header'])`
- Find main content: `soup.find('main') or soup.find('article') or soup.find(id='content') or soup.body`
- Extract page title from h1 or title tag
- Determine section from URL using priority_patterns
- Yield dict with schema: {url, page_title, content, section, crawl_timestamp}
- Follow links: `response.follow(href, self.parse)`

**Critical**: Respect 1 req/sec rate limit to avoid overwhelming college server.

## Done summary
TBD

## Evidence
- Commits:
- Tests: Run crawler on subset, verify JSON output matches schema
- PRs:
