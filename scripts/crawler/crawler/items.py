# Define here the models for your scraped items
# See documentation in:
# https://docs.scrapy.org/en/latest/topics/items.html

import scrapy


class CrawlerItem(scrapy.Item):
    url = scrapy.Field()
    page_title = scrapy.Field()
    content = scrapy.Field()
    section = scrapy.Field()
    crawl_timestamp = scrapy.Field()
