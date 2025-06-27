import datetime
import scrapy
from scrapy.crawler import CrawlerProcess
import os
import re
import sys
import json
import pydash as _
import pprint
from pytz import timezone
import time
from bs4 import BeautifulSoup
import urllib.parse

pp = pprint.PrettyPrinter(indent=4)

sys.path.append('..')
from es.es_client import EsClient


def dict_to_url_params(params_dict):
    return urllib.parse.urlencode(params_dict)


class TestSpider(scrapy.Spider):
    name = 'tai'
    domin = 'https://www.tmtpost.com'
    source = 'tai'
    current = 0
    total = 0

    headers = {
        "Accept": "application/json, text/plain, */*",
        "Accept-Encoding": "gzip, deflate, br, zstd",
        "Accept-Language":
        "en-US,en;q=0.9,zh-TW;q=0.8,zh;q=0.7,ja;q=0.6,fr;q=0.5",
        "app-version": "web1.0",
        "Content-Type": "application/json; charset=utf-8"
    }

    params = {
        "limit":
        200,
        "offset":
        0,
        "subtype":
        "post",
        "post_fields":
        "access;authors;number_of_reads;is_pro_post;is_paid_special_column_post;available;"
    }
    start_url = 'https://api.tmtpost.com/v1/lists/new'

    def start_requests(self):
        print(2)
        self.es = EsClient()

        url_params = dict_to_url_params(self.params)

        url = f"{self.start_url}?{url_params}"

        yield scrapy.Request(url, headers=self.headers)

    def parse(self, response):

        yesterday = (datetime.date.today() +
                     datetime.timedelta(days=-1)).strftime("%Y-%m-%d")
        today = datetime.date.today().strftime("%Y-%m-%d")

        start_time = int(time.mktime(time.strptime(str(yesterday),
                                                   '%Y-%m-%d')))
        end_time = int(time.mktime(time.strptime(str(today), '%Y-%m-%d')))

        # string to json
        resp = json.loads(response.text)
        items = resp['data']

        bulk = []

        for item in items:

            created_at = int(item['time_published'])

            if created_at > end_time:
                print("too new")
                continue

            if created_at < start_time:
                print("too old")
                break

            if item['item_type'] != 'post':
                print("not post")
                continue

            doc = {}

            doc['title'] = item['title']
            doc['summary'] = item['summary']
            doc['source'] = self.source

            doc['url'] = item['short_url']
            doc['author'] = _.get(item, 'authors[0].username')
            doc['tag'] = ['news']
            
            userId = _.get(item, 'authors[0].guid')
            doc['author_url'] = 'https://www.tmtpost.com/user/' + str(userId)

            date_time_obj = datetime.datetime.fromtimestamp(
                int(item['time_published']))

            doc['created_at'] = date_time_obj.astimezone(
                timezone("UTC")).strftime("%Y-%m-%dT%H:%M:%SZ")
            doc['created_year'] = date_time_obj.strftime("%Y")

            bulk.append({"index": {"_index": "article"}})
            bulk.append(doc)

        if len(bulk) > 0:
            resp = self.es.client.bulk(body=bulk)


if __name__ == "__main__":
    process = CrawlerProcess()
    process.crawl(TestSpider)
    process.start()
