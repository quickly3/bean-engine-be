# -*- coding:UTF-8 -*-
#
#

import scrapy
import os
from dateutil import parser


# settings.py
from dotenv import load_dotenv
from pathlib import Path

from elasticsearch import Elasticsearch

env_path = Path('..')/'.env'
load_dotenv(dotenv_path=env_path)
es_host = os.getenv("ES_HOST")
es = Elasticsearch(es_host)

class AliSpider(scrapy.Spider):
    # 593
    name = "itpub_z"

    domain = 'https://z.itpub.net'
    # 593
    source = "itpub"

    page = 1
    pageSize = 100

    def start_requests(self):
        url = 'https://z.itpub.net/?page=%s'%(str(self.page))

        yield scrapy.Request(url)

    def get_next_page(self):
        self.page = self.page + 1;
        return 'https://z.itpub.net/?page=%s'%(str(self.page))
        

    def parse(self, response):
        items = response.xpath('/html/body/div[3]/div[1]/div[4]/ul/li')

        if len(items) == 0:
            os._exit(0)

        bulk = []
        for item in items:
            doc = {}
            doc['title'] = item.xpath("a/div/div[2]/h4/text()").get();
            doc['url'] = self.domain + item.xpath("a/@href").get();
            doc['summary'] = item.xpath("a/div/div[2]/p/text()").get();
            doc['author'] = item.xpath("a/div/div[2]/div/span[1]/text()").get();
            doc['created_at'] = item.xpath("a/div/div[2]/div/span[2]/text()").get();

            if not doc['title']:
                doc['title'] = item.xpath("a/div/div/h4/text()").get();
                
            if not doc['summary']:
                doc['summary'] = item.xpath("a/div/div/p/text()").get();

            if not doc['author']:
                doc['author'] = item.xpath("a/div/div/div/span[1]/text()").get();
            if not doc['author']:
                doc['author'] = item.xpath("a/div/div/*/div/span[1]/text()").get();                
            if not doc['author']:  
                doc['author'] = item.xpath("a/div/div/*/*/div/span[1]/text()").get();
            if not doc['author']:  
                doc['author'] = item.xpath("a/div/div/*/*/*/div/span[1]/text()").get();

            if not doc['created_at']:
                doc['created_at'] = item.xpath("a/div/div/div/span[2]/text()").get();
            if not doc['created_at']:
                doc['created_at'] = item.xpath("a/div/div/*/div/span[2]/text()").get();
            if not doc['created_at']:
                doc['created_at'] = item.xpath("a/div/div/*/*/div/span[2]/text()").get();
            if not doc['created_at']:
                doc['created_at'] = item.xpath("a/div/div/*/*/*/div/span[2]/text()").get();

            # print(item.xpath("a/div/div/*").getall())
                
            date = parser.parse(doc['created_at'])
            doc['created_at'] = date.isoformat();
            doc['created_year'] = date.strftime("%Y")
            doc['source'] = self.source
            bulk.append(
                {"index": {"_index": "article"}})
            bulk.append(doc)



        if len(bulk) > 0:
            resp = es.bulk(index="article", body=bulk)

        next_page = self.get_next_page()
        yield scrapy.Request(next_page)