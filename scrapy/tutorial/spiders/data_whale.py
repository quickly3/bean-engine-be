# -*- coding:UTF-8 -*-
#
#

import scrapy
import json
from dateutil.parser import parse as dateparse
import re
import os

# settings.py
from dotenv import load_dotenv
from elasticsearch import Elasticsearch
from elasticsearch import logger as es_logger

from pathlib import Path


env_path = Path('..')/'.env'
load_dotenv(dotenv_path=env_path)
es_host = os.getenv("ES_HOST")
es = Elasticsearch(es_host)


class AliSpider(scrapy.Spider):
    # 593
    name = "data_whale"
    source = "data_whale"

    domain = 'http://datawhale.club'

    tag = "team_learning"

    page = 1

    category = {
        "5":"组队学习",
        "21":"LeetCode",
        "1":"未分类",
        "24":"深度推荐模型",
        "12":"Pandas",
        "13":"SQL",
        "17":"Go",
        "15":"推荐系统实践"
    }

    def start_requests(self):
        yield scrapy.Request(self.get_url())

    def get_url(self):
        return 'http://datawhale.club/latest.json?no_definitions=true&page=%s'%(str(self.page))

    def parse(self, response):
        resp = json.loads(response.text)
        items = resp['topic_list']['topics']

        if len(items) > 0:
            bulk = []
            for item in items:
                doc = {}
                doc['title'] = item['title']
                doc['url'] = self.domain + '/t/topic/' + str(item['id'])
                doc['summary'] = item['fancy_title']
                doc['author'] = item['last_poster_username']

                doc['created_at'] = item['last_posted_at']
                doc['created_year'] = dateparse(item['created_at']).year

                doc['tag'] = self.tag
                category_id = str(item['category_id'])

                if category_id in self.category:
                    doc['tag'] = self.category[category_id]
                else :
                    doc['tag'] = "未分类"


                doc['source'] = self.source

                doc['stars'] = 0

                bulk.append(
                    {"index": {"_index": "article"}})
                bulk.append(doc)

            if len(bulk) > 0:
                es.bulk(index="article",body=bulk)
            
            self.page = self.page+1
            yield scrapy.Request(self.get_url())
        else:
            os._exit(0)

