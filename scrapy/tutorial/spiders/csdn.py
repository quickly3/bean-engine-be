# -*- coding:UTF-8 -*-
#
#
import scrapy
import os
import json
from dateutil.parser import parse as dateparse
import re
from string import Template

# settings.py
from dotenv import load_dotenv
from pathlib import Path
from elasticsearch import Elasticsearch

env_path = Path('..')/'.env'
load_dotenv(dotenv_path=env_path)
es_host = os.getenv("ES_HOST")
es = Elasticsearch(es_host)

def clearHighLight(string):
    string = string.replace("<em>", "")
    string = string.replace("</em>", "")
    return string

class AliSpider(scrapy.Spider):
    # 593
    name = "csdn"
    source = "csdn"

    domain = 'https://juejin.im'

    tagId = {
        "python": "python",
        "php": "php",
        "javascript": "javascript",
        "css": "css",
        "typescript": "typescript",
        "game": "游戏",
        "security": "安全",
        "blockchain": "区块链",
        "postgresql": "postgresql"
    }

    tag = "python"

    urlTmpl = Template(
        'https://so.csdn.net/api/v2/search?q=${tagId}&t=blog&p=${page}&s=0&tm=30&lv=-1&ft=0&l=&u=')

    page = 2
    pageSize = 100

    def start_requests(self):

        self.tar_arr = []

        for item in self.tagId:
            self.tar_arr.append({'k': item, 'v': self.tagId[item]})

        self._target = self.tar_arr.pop()

        url = self.get_url()

        yield scrapy.Request(url)

    def get_url(self):

        return self.urlTmpl.substitute(
            page=self.page, tagId=self._target['v'])

    def parse(self, response):
        resp = json.loads(response.text)
        items = resp['result_vos']

        if len(items) > 0:
            bulk = []
            for item in items:
                doc = {}
                doc['title'] = clearHighLight(item['title'])
                doc['url'] = re.sub(r'\?.*','',item['url'])
                doc['summary'] = clearHighLight(item['digest'])
                doc['author'] = clearHighLight(item['nickname'])
                doc['author_url'] = 'https://blog.csdn.net/'+item['author']

                doc['created_at'] = item['create_time_str']+"T00:00:00Z"
                doc['created_year'] = dateparse(item['create_time_str']).year

                if ('search_tag' in item) and len(item['search_tag']) > 0:
                    doc['tag'] = list(map(lambda x: clearHighLight(x), item['search_tag']))
                    
                else:
                    doc['tag'] = self._target['k']

                doc['source'] = self.source

                doc['stars'] = 0

                doc['view_count'] = item['view']
                doc['comment_count'] = item['comment']
                doc['digg_count'] = item['digg']

                bulk.append(
                    {"index": {"_index": "article"}})
                bulk.append(doc)

            if len(bulk) > 0:
                es.bulk(index="article",body=bulk)
                pass

            self.page = self.page+1
            url = self.get_url()
            yield scrapy.Request(url)
        else:
            if len(self.tar_arr) > 0:
                self._target = self.tar_arr.pop()
                self.page = 1
                url = self.get_url()
                yield scrapy.Request(url)

            else:
                print("Spider closeed")
