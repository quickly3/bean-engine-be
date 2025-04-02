from bs4 import BeautifulSoup
import json
import os

def parse_categories(html_file):
    # 读取HTML文件
    with open(html_file, 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    # 使用BeautifulSoup解析HTML
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # 查找主菜单容器
    menu = soup.find('div', id='projectCategoryMenu')
    if not menu:
        print("未找到主菜单容器")
        return []
        
    categories = []
    # 查找所有主分类项
    main_items = menu.find_all('div', class_='ui dropdown item')
    
    for item in main_items:
        category = {}
        
        # 获取主分类名称 (去除箭头图标的文本)
        title = item.get_text(strip=True).split('\n')[0]
        category['name'] = title
        category['subcategories'] = []
        
        # 查找子分类菜单
        menu_div = item.find('div', class_='menu')
        if menu_div:
            # 查找所有链接
            sub_categories_wrap = menu_div.find('div', class_='sub-categories-wrap')
            if sub_categories_wrap:
                links = sub_categories_wrap.find_all('a', class_='item')
                for link in links:
                    # 提取子分类名称和数量
                    name_with_count = link.get_text(strip=True)
                    name = name_with_count.split('(')[0].strip()
                    
                    # 提取项目数量
                    count_span = link.find('span', class_='projects-count')
                    count = count_span.text.strip('()') if count_span else '0'
                    
                    sub_category = {
                        'name': name,
                        'url': link.get('href', ''),
                        'count': count
                    }
                    category['subcategories'].append(sub_category)
        
        categories.append(category)
    
    return categories

def save_to_json(categories, output_file):
    # 保存为JSON文件
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(categories, f, ensure_ascii=False, indent=2)
    
    # 打印统计信息
    print(f'已保存 {len(categories)} 个主分类')
    total_subcategories = sum(len(c['subcategories']) for c in categories)
    print(f'总计 {total_subcategories} 个子分类')

def main():
    # 设置文件路径
    current_dir = os.path.dirname(os.path.abspath(__file__))
    html_file = os.path.join(current_dir, 'cate.html')
    output_file = os.path.join(current_dir, 'categories.json')
    
    print(f'开始解析文件: {html_file}')
    
    # 检查文件是否存在
    if not os.path.exists(html_file):
        print(f'错误: 文件不存在 - {html_file}')
        return
    
    # 解析分类
    categories = parse_categories(html_file)
    
    if categories:
        # 保存结果
        save_to_json(categories, output_file)
        print(f'\n分类结构已成功保存至: {output_file}')
    else:
        print('未找到任何分类数据')

if __name__ == '__main__':
    main()