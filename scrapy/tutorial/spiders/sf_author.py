import scrapy
import json
import datetime
import os
from string import Template

from elasticsearch import Elasticsearch
from dotenv import load_dotenv
from pathlib import Path


env_path = Path('..')/'.env'
load_dotenv(dotenv_path=env_path)
es_host = os.getenv("ES_HOST")
es = Elasticsearch(es_host)

class SfAuthorSpider(scrapy.Spider):
    name = 'sf_author'

    urlTpl = Template('https://gateway.segmentfault.com/homepage/xiaoyusmd/timeline?size=20&offset=$offset')

    offset = '';
    source = 'sf'
    domain = 'https://segmentfault.com'


    def start_requests(self):
        url = self.urlTpl.substitute(offset=self.offset)
        yield scrapy.Request(url, method='GET')

    def parse(self, response):

        resp = json.loads(response.text)

        self.offset = resp['offset']

        print(es)

        bulk = []
        for item in resp['rows']:

            doc = {}
            doc['title'] = item['title']
            doc['url'] = self.domain+item['url']

            doc['summary'] =item['excerpt']
            doc['tag'] = ['by_author']
            doc['source'] = self.source

            doc['author'] = item['user']['name']
            doc['author_url'] = self.domain+item['user']['url']

            timeObj = datetime.datetime.fromtimestamp(int(item['modified']),None)

            doc['created_at'] = timeObj.isoformat()
            doc['created_year'] = timeObj.strftime("%Y")

            doc['stars'] = 0

            print(doc)

            bulk.append(
                {"index": {"_index": "article"}})
            bulk.append(doc)

        if len(bulk) > 0:
            resp = es.bulk(index="article", body=bulk)
            print(resp)


        url = self.urlTpl.substitute(offset=self.offset)
        yield scrapy.Request(url, method='GET')



