# -*- coding:UTF-8 -*-
#
#

import scrapy
import os
import json
import time
from dateutil.parser import parse as dateparse
import datetime
import re
import pydash as _

from string import Template

# settings.py
from dotenv import load_dotenv
from pathlib import Path
import random
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
    name = "csdn_news"
    source = "csdn"

    def start_requests(self):

        url = 'https://www.csdn.net'
        yield scrapy.Request(url)

    def parse(self, response):
        
        script_xpath = '/html/body/script'
        script_items = response.xpath(script_xpath)
        if len(script_items) > 0:
            pattern = r'__INITIAL_STATE__'
            for script_item in script_items:
                script_content = script_item.xpath('text()').get()
                if script_content:
                    match = re.search(pattern, script_content)
                    if match:
                        s = script_content.replace('window.__INITIAL_STATE__=','').strip()
                        if s.endswith(";"):
                            s = s.rstrip(";")
                        
                        python_obj = json.loads(s)
                        headhots = _.get(python_obj,'pageData.data.www-headhot')
                        fields_to_extract = ["description", "title", "url"]
                        extracted_headhots = list(map(lambda x: {field: x[field] for field in fields_to_extract}, headhots))
                        print(extracted_headhots)
                        
                        headlines = _.get(python_obj,'pageData.data.www-Headlines')
                        extracted_headlines = list(map(lambda x: {field: x[field] for field in fields_to_extract}, headlines))
                        print(extracted_headlines)
                        
        
        