#!/bin/sh
export PATH=$PATH:/usr/local/bin   

cd /home/ubuntu/www/bean-engine-be/scrapy
nohup python3 -m scrapy crawl elastic_cn >> /home/ubuntu/www/bean-engine-be/output/elastic_cn.log 2>&1
# nohup python3 -m scrapy crawl csdn >> /home/ubuntu/www/bean-engine-be/output/csdn.log 2>&1


cd /home/ubuntu/www/bean-engine-be
nohup npm run cli esClear >> /home/ubuntu/www/bean-engine-be/output/elastic_cn.log 2>&1
# nohup sudo php artisan EsClear csdn >> /home/ubuntu/www/bean-engine-be/output/csdn.log 2>&1

