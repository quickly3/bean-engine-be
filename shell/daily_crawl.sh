#!/bin/sh
export PATH=$PATH:/usr/local/bin

cd /home/ubuntu/www/bean-engine-be/scrapy

nohup python3 -m scrapy crawl escn_new >> /home/ubuntu/www/bean-engine-be/output/escn_new.log 2>&1

nohup python3 -m scrapy crawl jianshu_daily >> /home/ubuntu/www/bean-engine-be/output/jianshu_daily.log 2>&1

nohup python3 -m scrapy crawl infoq_daily >> /home/ubuntu/www/bean-engine-be/output/infoq_daily.log 2>&1

nohup python3 -m scrapy crawl sf_daily >> /home/ubuntu/www/bean-engine-be/output/sf_daily.log 2>&1

nohup python3 -m scrapy crawl juejin_daily >> /home/ubuntu/www/bean-engine-be/output/juejin_daily.log 2>&1
# nohup python3 -m scrapy crawl juejin_news_daily >> /home/ubuntu/www/bean-engine-be/output/juejin_news_daily.log 2>&1

nohup python3 -m scrapy crawl cnblogs_daily >> /home/ubuntu/www/bean-engine-be/output/cnblogs_daily.log 2>&1
nohup python3 -m scrapy crawl cnblogs_news_daily >> /home/ubuntu/www/bean-engine-be/output/cnblogs_news_daily.log 2>&1


nohup python3 -m scrapy crawl csdn_daily >> /home/ubuntu/www/bean-engine-be/output/csdn_daily.log 2>&1



nohup python3 -m scrapy crawl oschina_daily >> /home/ubuntu/www/bean-engine-be/output/oschina_daily.log 2>&1
nohup python3 -m scrapy crawl oschina_news_daily >> /home/ubuntu/www/bean-engine-be/output/oschina_news_daily.log 2>&1
nohup python3 -m scrapy crawl oschina_project_daily >> /home/ubuntu/www/bean-engine-be/output/oschina_project_daily.log 2>&1

nohup python3 -m scrapy crawl itpub_z_daily >> /home/ubuntu/www/bean-engine-be/output/itpub_z_daily.log 2>&1

nohup python3 -m scrapy crawl data_whale_daily >> /home/ubuntu/www/bean-engine-be/output/data_whale_daily.log 2>&1

nohup python3 -m scrapy crawl ali_dev_daily >> /home/ubuntu/www/bean-engine-be/output/ali_dev_daily.log 2>&1


cd /home/ubuntu/www/bean-engine-be/scrapy/github
nohup python3 -m trending_daily >> /home/ubuntu/www/bean-engine-be/output/trending_daily.log 2>&1

cd /home/ubuntu/www/bean-engine-be/scrapy/36kr
nohup python3 -m 36kr_daily >> /home/ubuntu/www/bean-engine-be/output/36kr_daily.log 2>&1

cd /home/ubuntu/www/bean-engine-be
nohup npm run cli esClearLast >> /home/ubuntu/www/bean-engine-be/output/EsClearLast.log 2>&1
