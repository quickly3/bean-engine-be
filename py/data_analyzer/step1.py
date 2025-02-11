import pandas as pd

# 读取 CSV 文件
# df = pd.read_csv('sc_clients.csv')
df = pd.read_csv('simple_clients.csv')


# 获取字段名（列名）
column_names = df.columns

# 打印字段名
# print("CSV 文件的字段名：")
# print(column_names)


cols = ['birth_date','gender','client_type','membership_type','package_type','founder','msth','total_visits','first_visit_date','last_visit_date','next_booked_class_date']

cols = list(map(str.upper, cols))

df2 = df[cols]

df2['BIRTH_DATE'] = pd.to_datetime(df2['BIRTH_DATE'], errors='coerce')

current_date = pd.to_datetime('today')

# 自定义函数来计算年龄，跳过为空的行
def calculate_age(birth_date):
    if pd.isnull(birth_date):
        return None
    return current_date.year - birth_date.year - ((current_date.month, current_date.day) < (birth_date.month, birth_date.day))

# 使用 apply 来计算年龄
df2['AGE'] = df2['BIRTH_DATE'].apply(calculate_age)

df2['TOTAL_VISITS'] = df2['TOTAL_VISITS'].fillna(0).astype('int')
df2['AGE'] = df2['AGE'].fillna(0).astype('int')


df2.to_csv('simple_clients.csv', index=False)
# print(df2.tail())