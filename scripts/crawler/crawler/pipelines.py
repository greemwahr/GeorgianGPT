# Define your item pipelines here
# See documentation in:
# https://docs.scrapy.org/en/latest/topics/item-pipeline.html


class CrawlerPipeline:
    def process_item(self, item, spider):
        return item
