# Scrapy settings for crawler project
# See https://docs.scrapy.org/en/latest/topics/settings.html

BOT_NAME = "crawler"
SPIDER_MODULES = ["crawler.spiders"]
NEWSPIDER_MODULE = "crawler.spiders"

# Obey robots.txt rules
ROBOTSTXT_OBEY = True

# Configure maximum concurrent requests
CONCURRENT_REQUESTS = 1

# Configure a delay for requests (1 req/sec to avoid overwhelming server)
DOWNLOAD_DELAY = 1

# Disable cookies (not needed for public content)
COOKIES_ENABLED = False

# Override the default request headers
USER_AGENT = "GeorgianGPT-Crawler (Educational Project)"

# Enable or disable spider middlewares
SPIDER_MIDDLEWARES = {
    "crawler.middlewares.CrawlerSpiderMiddleware": 543,
}

# Enable or disable downloader middlewares
DOWNLOADER_MIDDLEWARES = {
    "scrapy.downloadermiddlewares.useragent.UserAgentMiddleware": None,
    "scrapy.downloadermiddlewares.robotstxt.RobotsTxtMiddleware": 100,
    "crawler.middlewares.CrawlerDownloaderMiddleware": 543,
}

# Depth limit for link following (default 0 = no limit; we use 8)
DEPTH_LIMIT = 8

# Feed exports
FEEDS = {}
# When run with -o output.json, Scrapy will use this; we don't set a default path

# Set settings whose default value is deprecated to a future-proof value
REQUEST_FINGERPRINTER_IMPLEMENTATION = "2.7"
TWISTED_REACTOR = "twisted.internet.asyncioreactor.AsyncioSelectorReactor"
FEED_EXPORT_ENCODING = "utf-8"
