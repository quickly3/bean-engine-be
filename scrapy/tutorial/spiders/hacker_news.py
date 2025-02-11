# -*- coding:UTF-8 -*-
#
#

import scrapy
import json
from dateutil.parser import parse as dateparse
import os
import re
import pydash as _
from datetime import datetime

import sys
sys.path.append('..')
from es.es_client import EsClient

class AliSpider(scrapy.Spider):
    name = "hacker_news"
    source = "hacker"

    def start_requests(self):
        self.es = EsClient();
        url = 'https://news.ycombinator.com/news'
        yield scrapy.Request(url)

    def parse(self, response):
        print(response.text)