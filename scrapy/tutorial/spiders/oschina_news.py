# -*- coding:UTF-8 -*-
#
#

import scrapy
import os
import time
from dateutil.parser import parse as dateparse
import datetime
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
    name = "oschina_news"
    source = "oschina"

    domain = 'https://www.oschina.net'

    urlTmpl = Template(
        'https://www.oschina.net/news/widgets/_news_index_all_list_new?p=${page}&type=ajax')

    page = 1
    pageSize = 50

    today = time.strftime("%Y-%m-%d")
    yesterday = (datetime.date.today() +
                 datetime.timedelta(days=-1)).strftime("%Y-%m-%d")
    last2day = (datetime.date.today() +
                datetime.timedelta(days=-2)).strftime("%Y-%m-%d")

    headers = {
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Accept-Language": "en,zh-CN;q=0.9,zh;q=0.8,zh-TW;q=0.7",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Content-Type": "application/json;charset=UTF-8",
        "Host": "www.oschina.net",
        "Pragma": "no-cache",
        "Referer": "https://www.oschina.net",
        "sec-ch-ua": '"Google Chrome";v="89", "Chromium";v="89", ";Not A Brand";v="99"',
        "sec-ch-ua-mobile": '?0',
        "Upgrade-Insecure-Requests": '1',
        "Sec-Fetch-Site": 'none',
        "Sec-Fetch-Mode": 'navigate',
        "Sec-Fetch-User": '?1',
        "Sec-Fetch-Dest": 'document',
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.114 Safari/537.36"
    }


    def start_requests(self):
        url = self.get_url()
        yield scrapy.Request(url,headers=self.headers)

    def get_url(self):
        return self.urlTmpl.substitute(page=self.page)

    def parse(self, response):
        items = response.xpath('/html/body/div[1]/div[@class="item news-item news-item-hover"]')

        bulk = []
        for item in items:

            doc = {}
            title = item.xpath('div[1]/h3/div/text()').get()
            title = title.strip()
            desp = item.xpath('div[1]/div/p/text()').get()
            author = item.xpath('div[1]/div/div/div/div[1]/a/text()').get()
            url = item.xpath('@data-url').get()

            doc['title'] = title
            doc['url'] = url
            doc['summary'] = desp
            doc['author'] = author


            createdAt = item.xpath('div[1]/div/div/div/div[1]/text()').getall()
            createdAt = createdAt[1]

            if "今天" in createdAt:
                createdAt = self.today

            if "昨天" in createdAt:
                createdAt = self.yesterday

            if "前天" in createdAt:
                createdAt = self.last2day

            if "分钟前" in createdAt:
                createdAt = self.today
            
            _date = dateparse(createdAt)

            ts = _date.timestamp()

            doc['created_at'] = _date.strftime("%Y-%m-%dT%H:%M:%SZ")

            year = _date.year

            doc['created_year'] = year

            doc['tag'] = 'news'
            doc['source'] = self.source
            doc['stars'] = 0

            bulk.append(
                {"index": {"_index": "article"}})
            bulk.append(doc)
        if len(bulk) > 0:
            es.bulk(index="article", body=bulk)

        if self.page < 50:
            self.page = self.page+1
            url = self.get_url()
            yield scrapy.Request(url,headers=self.headers)

    
