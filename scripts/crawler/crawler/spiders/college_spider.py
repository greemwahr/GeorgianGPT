"""
CollegeSpider: crawls georgiancollege.ca with rate limiting, robots.txt compliance,
and priority URL pattern filtering. Extracts url, page_title, content, section, crawl_timestamp.
"""
import re
from datetime import datetime, timezone

import scrapy
from bs4 import BeautifulSoup

from crawler.items import CrawlerItem


# Priority URL patterns (higher priority = crawl first / prefer when classifying section)
PRIORITY_PATTERNS = [
    ("/programs/", "programs"),
    ("/admissions/", "admissions"),
    ("/student-life/", "student-life"),
    ("/services/", "services"),
]


def section_from_url(url: str) -> str:
    """Determine section from URL using priority patterns."""
    for pattern, section in PRIORITY_PATTERNS:
        if pattern in url:
            return section
    return "general"


def extract_main_content(soup: BeautifulSoup) -> str:
    """Extract main text content, removing nav, footer, scripts, styles, header."""
    # Remove unwanted elements (destructive copy to avoid modifying original)
    for tag in soup.find_all(["nav", "footer", "script", "style", "header"]):
        tag.decompose()

    # Find main content container
    main = soup.find("main") or soup.find("article") or soup.find(id="content")
    if main is None:
        main = soup.body
    if main is None:
        return ""

    text = main.get_text(separator=" ", strip=True)
    # Collapse multiple whitespace/newlines to single space
    return re.sub(r"\s+", " ", text).strip()


def extract_page_title(soup: BeautifulSoup) -> str:
    """Extract page title from h1 or title tag."""
    h1 = soup.find("h1")
    if h1:
        return h1.get_text(strip=True)
    title_tag = soup.find("title")
    if title_tag:
        return title_tag.get_text(strip=True)
    return ""


class CollegeSpider(scrapy.Spider):
    name = "college_spider"
    allowed_domains = ["georgiancollege.ca", "www.georgiancollege.ca"]
    start_urls = ["https://www.georgiancollege.ca/"]

    custom_settings = {
        "DEPTH_LIMIT": 8,
        "DOWNLOAD_DELAY": 1,
        "ROBOTSTXT_OBEY": True,
    }

    def parse(self, response):
        soup = BeautifulSoup(response.text, "lxml")
        content = extract_main_content(soup)
        page_title = extract_page_title(soup)
        section = section_from_url(response.url)

        item = CrawlerItem(
            url=response.url,
            page_title=page_title or response.url,
            content=content,
            section=section,
            crawl_timestamp=datetime.now(timezone.utc).isoformat(),
        )
        yield item

        # Follow links within allowed_domains
        for a in soup.find_all("a", href=True):
            href = a["href"].strip()
            if not href or href.startswith("#") or href.startswith("mailto:") or href.startswith("tel:"):
                continue
            yield response.follow(href, self.parse)
