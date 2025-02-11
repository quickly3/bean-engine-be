import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from matplotlib.backends.backend_agg import FigureCanvasAgg as FigureCanvas
from io import BytesIO

# Step 1: 加载数据
data = pd.read_csv('simple_clients.csv')

# Step 2: 数据清理与转换
# 将 BIRTH_DATE 和 FIRST_VISIT_DATE, LAST_VISIT_DATE 转换为日期类型
data['BIRTH_DATE'] = pd.to_datetime(data['BIRTH_DATE'], errors='coerce')
data['FIRST_VISIT_DATE'] = pd.to_datetime(data['FIRST_VISIT_DATE'], errors='coerce')
data['LAST_VISIT_DATE'] = pd.to_datetime(data['LAST_VISIT_DATE'], errors='coerce')
data['NEXT_BOOKED_CLASS_DATE'] = pd.to_datetime(data['NEXT_BOOKED_CLASS_DATE'], errors='coerce')

# 计算年龄（假设当前年份为2025年）
data['AGE'] = data['AGE'].fillna((pd.to_datetime('2025-01-01') - data['BIRTH_DATE']).dt.days // 365)

# Step 3: 数据统计
# 性别分布
gender_dist = data['GENDER'].value_counts()

# 会员类型分布
client_type_dist = data['CLIENT_TYPE'].value_counts()

# 年龄分布
age_stats = data['AGE'].describe()

# 访问统计
total_visits_stats = data['TOTAL_VISITS'].describe()

# Step 4: 数据可视化
# 性别分布图
fig, ax = plt.subplots()
sns.countplot(x='GENDER', data=data, ax=ax)
ax.set_title('Gender Distribution')
plt.savefig('image/gender_distribution.png')

# 年龄分布图
fig, ax = plt.subplots()
sns.histplot(data['AGE'], kde=True, ax=ax)
ax.set_title('Age Distribution')
plt.savefig('image/age_distribution.png')

# 会员类型分布图
fig, ax = plt.subplots()
sns.countplot(x='CLIENT_TYPE', data=data, ax=ax)
ax.set_title('Client Type Distribution')
plt.savefig('image/client_type_distribution.png')

# Step 5: 生成报告（Excel格式）
with pd.ExcelWriter('report/data_report.xlsx', engine='xlsxwriter') as writer:
    # 将统计数据写入Excel
    gender_dist.to_frame().to_excel(writer, sheet_name='Gender Distribution')
    client_type_dist.to_frame().to_excel(writer, sheet_name='Client Type Distribution')
    age_stats.to_frame().to_excel(writer, sheet_name='Age Stats')
    total_visits_stats.to_frame().to_excel(writer, sheet_name='Total Visits Stats')
    
    # 插入图表
    workbook  = writer.book
    worksheet = workbook.add_worksheet('Charts')
    
    # 插入性别分布图
    worksheet.insert_image('A1', 'image/gender_distribution.png')
    # 插入年龄分布图
    worksheet.insert_image('A20', 'image/age_distribution.png')
    # 插入会员类型分布图
    worksheet.insert_image('A40', 'image/client_type_distribution.png')

# Step 6: 生成PDF报告（可选）
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

pdf = canvas.Canvas("report/data_report.pdf", pagesize=letter)
pdf.drawString(100, 750, "Data Analysis Report")

# 插入统计信息
pdf.drawString(100, 730, f"Gender Distribution: {gender_dist.to_string()}")
pdf.drawString(100, 710, f"Client Type Distribution: {client_type_dist.to_string()}")
pdf.drawString(100, 690, f"Age Stats: {age_stats.to_string()}")
pdf.drawString(100, 670, f"Total Visits Stats: {total_visits_stats.to_string()}")

# 插入图表
pdf.drawImage('image/gender_distribution.png', 100, 400, width=400, height=300)
pdf.drawImage('image/age_distribution.png', 100, 100, width=400, height=300)

pdf.save()
