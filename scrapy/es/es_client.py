from elasticsearch import Elasticsearch
from elasticsearch import logger as es_logger
from dotenv import load_dotenv
import os
import logging
import pydash as _
from pathlib import Path

logging.getLogger("urllib3").setLevel(logging.ERROR)

es_logger.setLevel(50)


class EsClient:

    def __init__(self):
        env_path = Path('../..')/'.env'
        load_dotenv(dotenv_path=env_path)
        es_host = os.getenv("ES_HOST")
        self.client = Elasticsearch(es_host)

    def getDocs(self):
        query = {
            "query": {
                "query_string": {
                    "query": "source:juejin && -author_id:*"
                }
            },
            "size": 1000,
            "_source": ["url", "source"]
        }

        resp = self.client.search(index="article", body=query, scroll='2m')
        result = self.formatResp(resp)
        return result
    
    def queryExistByUrl(self,url):
        queryString = f"url:\"{url}\""
        query = {
            "query": {
                "query_string": {
                    "query": queryString
                }
            }
        }

        resp = self.client.count(index="article", body=query)
        return resp['count']

    def getDocsByQuery(self, query):
        query = {
            "query": {
                "query_string": {
                    "query": query
                }
            },
            "size": 1000,
            "_source": ["url", "source", "sub_id"]
        }

        resp = self.client.search(index="article", body=query, scroll='2m')
        # result = self.formatResp(resp)
        return resp

    def index(self, doc):
        self.client.index(index="article", document=doc)

    def getTeamIds(self):
        query = {
            "query": {
                "query_string": {
                    "query": "tech_team:*"
                }
            },
            "_source": [
                "tech_team.org_id"
            ],
            "size": 300
        }

        resp = self.client.search(index="author", body=query)
        ids = list(
            map(lambda x: x['_source']['tech_team']['org_id'], resp['hits']['hits']))
        return ids

    def getAuthorCount(self, source, id):
        query = {
            "query": {
                "query_string": {
                    "query": "source:"+source+" && source_id:\""+id+"\""
                }
            }
        }

        resp = self.client.count(index="article", body=query)
        count = _.get(resp, 'count')

        return count or 0

    def articleExisted(self, url):
        query = {
            "query": {
                "query_string": {
                    "query": "url:\""+url+"\""
                }
            }
        }

        resp = self.client.count(index="article", body=query)
        return resp['count'] > 0

    def getAuthors(self):
        fisrt_query = {
            "query": {
                "query_string": {
                    "query": "source:juejin"
                }
            },
            "size": 0,
            "aggs": {
                "author_buckets": {
                    "composite": {
                        "size": 1000,
                        "sources": [
                            {
                                "author_url": {
                                    "terms": {
                                        "field": "author_url"
                                    }
                                }
                            }
                        ]
                    }
                }
            }
        }
        resp = self.client.search(index="article", body=fisrt_query)
        result = self.formatCompositeTermsAgg(resp)
        list = []

        if result:
            list = result['hits']
            print(len(list))

            if 'after_key' in result:
                after_key = result['after_key']
                while result:
                    result = self.getAuthorsByAfterKey(after_key)
                    if result:
                        list = list + result['hits']
                        if 'after_key' in result:
                            after_key = result['after_key']
                        else:
                            break

        return list

    def getAuthorsByAfterKey(self, after_key):
        after_query = {
            "track_total_hits": True,
            "query": {
                "query_string": {
                    "query": "source:juejin"
                }
            },
            "size": 0,
            "aggs": {
                "author_buckets": {
                    "composite": {
                        "size": 1000,
                        "sources": [
                            {
                                "author_url": {
                                    "terms": {
                                        "field": "author_url"
                                    }
                                }
                            }
                        ],
                        "after": after_key
                    }
                }
            }
        }
        resp = self.client.search(index="article", body=after_query)
        result = self.formatCompositeTermsAgg(resp)
        return result

    def getAuthorLast(self, source, author):
        fisrt_query = {
            "query": {
                "query_string": {
                    "query": "source:{source} && author:{author}".format(source, author)
                }
            },
            "size": 1,
            "sort": [
                {
                    "created_at": {
                        "order": "desc"
                    }
                }
            ]
        }
        resp = self.client.search(index="article", body=fisrt_query)
        
        list = self.formatResp(resp)

        return list[0]

    def getDocsNext(self, scroll_id):
        resp = self.client.scroll(scroll_id=scroll_id, scroll='2m')
        result = self.formatResp(resp)
        return result

    def updateById(self, id, body):
        return self.client.update(index="article", id=id, body=body)

    def deleteById(self, id):
        return self.client.delete(index="article", id=id)

    def formatCompositeTermsAgg(self, resp):
        result = {}
        buckets = resp['aggregations']['author_buckets']

        if len(buckets) > 0:
            if 'after_key' in buckets:
                result['after_key'] = buckets['after_key']

            result['hits'] = list(map(lambda x: dict(
                author_url=x['key']['author_url'], doc_count=x['doc_count']), buckets['buckets']))
            return result
        else:
            return False

    def formatResp(self, resp):
        result = {}

        if len(resp['hits']['hits']) == 0:
            result['scroll_id'] = ""
            result['hits'] = []
        else:
            result['scroll_id'] = resp['_scroll_id']
            result['total'] = resp['hits']['total']
            result['hits'] = list(map(lambda x: dict(
                id=x['_id'], source=x['_source']['source'], url=x['_source']['url']), resp['hits']['hits']))

        return result
