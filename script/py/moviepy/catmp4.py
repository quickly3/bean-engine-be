from moviepy import VideoFileClip, concatenate_videoclips


import os

# 定义文件夹路径
folder_path = "mvs"

# 获取文件夹中的所有文件和文件夹
all_items = os.listdir(folder_path)

# 过滤出文件（排除文件夹）
files = [item for item in all_items if os.path.isfile(os.path.join(folder_path, item))]


video_files = []
# 打印所有文件
print("Files in folder:")
for file in files:
  video_files.append("mvs/"+file)

video_files = sorted(video_files, key=lambda x: int(x.split('/')[-1].split('.')[0]))

# 加载视频文件
clips = [VideoFileClip(video) for video in video_files]

# 拼接视频
final_clip = concatenate_videoclips(clips)

# 输出拼接后的视频文件
final_clip.write_videofile("output.mp4", codec="libx264")