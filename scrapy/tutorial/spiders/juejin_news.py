# -*- coding:UTF-8 -*-
#
#

import scrapy
import os
import json
import datetime
from scrapy.http import JsonRequest

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
    name = "juejin_news"

    domain = 'https://juejin.cn'
    postUrl = "https://juejin.cn/news/"

    url = "https://api.juejin.cn/recommend_api/v1/news/list"

    cursor = 0

    def start_requests(self):

        payload = self.getPayload()
        yield JsonRequest(self.url,data=payload)

    def getPayload(self):
        payload = {
            "cursor": str(self.cursor),
            "recommend_mode": 1,
            "sort_type": 600,
            "limit": 20,
        }
        return payload;

    def parse(self, response):

        rs = json.loads(response.text)
        items = rs['data']

        self.cursor = rs['cursor']

        has_more = rs['has_more']
        bulk = []

        for item in items:
            content_info = item['content_info']
            doc = {}
            doc['title'] = content_info['title']
            doc['url'] = self.postUrl+content_info['content_id']
            doc['summary'] = content_info['brief']

            doc['created_at'] = datetime.datetime.fromtimestamp(int(content_info['ctime']),None)
            doc['created_year'] = doc['created_at'].strftime("%Y")

            doc['tag'] = [item['category']['category_url'],"news"]
            doc['source'] = 'juejin'
            doc['source_id'] = item['content_id']
            doc['stars'] = 0
            bulk.append(
                {"index": {"_index": "article"}})
            bulk.append(doc)

        if len(bulk) > 0:
            es.bulk(index="article", body=bulk)

        if has_more == True:
            payload = self.getPayload()
            yield JsonRequest(self.url,data=payload)
        else:
            print("Crawler end");

