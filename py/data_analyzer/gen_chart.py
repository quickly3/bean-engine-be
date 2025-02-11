import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

# 读取 CSV 文件
df = pd.read_csv('simple_clients.csv')

# 查看数据的基本信息
print(df.info())

# 计算统计数据
statistics = df.describe()
print(statistics)

df = df[df['AGE'] > 0]

# 生成直方图（例如 TOTAL_VISITS）
plt.figure(figsize=(8, 6))
sns.histplot(df['TOTAL_VISITS'], kde=True, bins=10, color='blue')
plt.title('Distribution of Total Visits')
plt.xlabel('Total Visits')
plt.ylabel('Frequency')
plt.savefig('image/TOTAL_VISITS.png')

# 生成柱状图（例如 AGE 列的统计数据）
plt.figure(figsize=(8, 6))
df['AGE'].value_counts().plot(kind='bar', color='green')
plt.title('Age Distribution')
plt.xlabel('Age')
plt.ylabel('Count')
plt.savefig('image/AGE.png')

# 生成箱线图（例如 TOTAL_VISITS）
plt.figure(figsize=(8, 6))
sns.boxplot(x=df['TOTAL_VISITS'], color='red')
plt.title('Boxplot of Total Visits')
plt.xlabel('Total Visits')
plt.savefig('image/Boxplot of Total Visits.png')

# 生成散点图（例如 AGE 与 TOTAL_VISITS 之间的关系）
plt.figure(figsize=(8, 6))
sns.scatterplot(x='AGE', y='TOTAL_VISITS', data=df, color='purple')
plt.title('Scatterplot of Age vs Total Visits')
plt.xlabel('Age')
plt.ylabel('Total Visits')
plt.savefig('image/Scatterplot of Age vs Total Visits.png')
