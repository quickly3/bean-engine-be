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

def clearHighLight(string):
    string = string.replace("<em>", "")
    string = string.replace("</em>", "")
    return string

class AliSpider(scrapy.Spider):
    # 593
    name = "csdn_news"
    source = "csdn"

    headers= {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    }

    def start_requests(self):
        self.es = EsClient();

        url = 'https://www.csdn.net'
        option = {}
        option['type'] = 'home'
        yield scrapy.Request(url,headers=self.headers, callback=lambda response, option=option : self.parse(response, option))

    def parse(self, response, option):
        items = []
        if option['type'] == 'home':
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
                            headlines = _.get(python_obj,'pageData.data.www-Headlines')
                            extracted_headlines = list(map(lambda x: {field: x[field] for field in fields_to_extract}, headlines))
                                
                            items = _.concat(extracted_headhots, extracted_headlines)

                            for item in items:
                                url = item['url']
                                count = self.es.queryExistByUrl(url)
                                if count == 0:
                                    option = {}
                                    option['type'] = 'article'
                                    option['item'] = item
                                    yield scrapy.Request(url, callback=lambda response, option=option : self.parse(response, option))
        else:
            bulk = []
            bulk.append({"index": {"_index": "article"}})
            
            item = option['item']
            doc = {}
            doc['title'] = item['title']
            doc['summary'] = item['description']
            doc['url'] = item['url']
            doc['source'] = 'csdn'

            tags = response.xpath('//*[@class="blog-tags-box"]/div/a/text()').getall()
            doc['tag'] = tags
            
            author = response.xpath('//a[@class="follow-nickName "]/text()').get()
            author_url = response.xpath('//a[@class="follow-nickName "]/@href').get()
            
            doc['author'] = author
            doc['author_url'] = author_url
            # current_time = response.xpath('//span[@class="time blog-postTime"]').get()
            
            # if current_time:
            #     pattern = r'\d{4}-\d{2}-\d{2}'
            #     match = re.search(pattern, current_time)
            #     if match :
            #         current_time = match.group()
            #         doc['created_at'] = current_time
            
            
            doc['created_at'] = datetime.now().strftime("%Y-%m-%d")
            bulk.append(doc)
            self.es.client.bulk(index="article", body=bulk)
            

        
    

