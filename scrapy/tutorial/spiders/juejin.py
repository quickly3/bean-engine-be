# -*- coding:UTF-8 -*-
#
#

import scrapy
import os
import json
import time
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
    name = "juejin"

    domain = 'https://juejin.cn'
    postUrl = "https://juejin.cn/post/"

    tags = [
        {"id":"6809640794794754061","tag":"Elasticsearch"}
    ]

    url = "https://api.juejin.cn/recommend_api/v1/article/recommend_tag_feed"

    cursor = 0

    def start_requests(self):

        self._target = self.tags.pop()
        payload = self.getPayload()
        yield JsonRequest(self.url,data=payload)

    def getPayload(self):
        t = time.time()
        payload = {
            "cursor": str(self.cursor),
            "id_type": 2,
            "sort_type": 300,
            "tag_ids": [self._target['id']],
        }
        return payload;

    def parse(self, response):

        rs = json.loads(response.text)
        items = rs['data']

        self.cursor = rs['cursor']

        has_more = rs['has_more']
        bulk = []

        for item in items:
            article_info = item['article_info']
            author_user_info = item['author_user_info']

            doc = {}
            doc['title'] = article_info['title']
            doc['url'] = self.postUrl+article_info['article_id']
            doc['summary'] = article_info['brief_content']

            doc['created_at'] = datetime.datetime.fromtimestamp(int(article_info['ctime']),None)
            doc['created_year'] = doc['created_at'].strftime("%Y")

            doc['tag'] = self._target['tag']
            doc['source'] = 'juejin'
            doc['source_id'] = item['article_id']
            doc['author'] = author_user_info['user_name']
            doc['author_url'] = self.userUrl + author_user_info['user_id']
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
            if len(self.tags) > 0:
                self.cursor = 0
                self._target = self.tags.pop()
                payload = self.getPayload()
                yield JsonRequest(self.url,data=payload)
            else:
                print("Crawler end");
