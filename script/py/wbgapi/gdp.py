import wbgapi as wb
import pandas as pd

# 查看可用的数据库 保存到csv

# dir = '../../../output/wbg/'
# sr = wb.source.list()
# pd.DataFrame(sr).to_csv(f'{dir}sources.csv', index=False)
# # print(sr.to_csv('sources.csv'))

# sr_list = list(wb.source.list())

# # 查看每个数据库包含什么指标
# for source in sr_list:
#     print(source['id'], source['name'])
#     # 获取指标列表
#     # 显式指定 db，并减小每页大小，避免返回过大导致 JSON 解码失败
#     indicators = list(wb.series.list(db=source['id']))
#     pd.DataFrame(indicators).to_csv(f'{dir}indicators/indicators_{source["id"]}.csv', index=False)

# 保存到CSV文件
# wb.data.DataFrame('NY.GDP.MKTP.CD', mrv=10).to_csv('gdp.csv')

# 获取多个国家的 GDP（当前美元，1960年至今）
df = wb.data.DataFrame(
    ['NY.GDP.MKTP.CD'],     # GDP指标代码
    ['USA', 'CHN', 'JPN', 'DEU'],  # 国家/地区代码
    time=range(2020, 2026),        # 时间范围
    columns='series'               # 以指标为列
)

# 重置索引，获得整洁的表格
df = df.reset_index()
print(df)

# help(wb.series.info)