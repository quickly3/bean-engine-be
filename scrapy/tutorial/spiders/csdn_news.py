# -*- coding:UTF-8 -*-
#
#

import scrapy
import json
from dateutil.parser import parse as dateparse
import os
import re
import pydash as _

import sys
sys.path.append('..')
from es.es_client import EsClient

def clearHighLight(string):
    string = string.replace("<em>", "")
    string = string.replace("</em>", "")
    return string

class AliSpider(scrapy.Spider):
    # 593
    name = "csdn_news"
    source = "csdn"

    def start_requests(self):
        self.es = EsClient();
        self.headers = {
            "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36",
        }


        url = 'https://www.csdn.net'
        yield scrapy.Request(url, headers=self.headers)

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
                        # print(extracted_headhots)
                        # print(headhots[0])
                        self.queryExist(extracted_headhots)
                        
                        headlines = _.get(python_obj,'pageData.data.www-Headlines')
                        extracted_headlines = list(map(lambda x: {field: x[field] for field in fields_to_extract}, headlines))
                        # print(extracted_headlines)
                        
                        
    def queryExist(self, items):
        for item in items:
            url = item['url']
            count = self.es.queryExistByUrl(url)
            
            if count > 0:
                self.requestPage(url)
                
    def requestPage(self, url):
        print(url)
        
        