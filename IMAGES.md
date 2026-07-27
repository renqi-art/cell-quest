# 图片优化

所有图片统一用 WebP 格式，Pillow 一键转换，23MB → 2MB。

## 转换命令

```bash
pip install Pillow

python3 -c "
import os
from PIL import Image
for root, dirs, files in os.walk('images'):
    for f in files:
        if not f.endswith(('.png','.jpg','.jpeg')): continue
        path = os.path.join(root, f)
        webp = os.path.splitext(path)[0] + '.webp'
        img = Image.open(path)
        mode = 'RGBA' if img.mode in ('RGBA','P') else 'RGB'
        img.convert(mode).save(webp, 'WEBP', quality=75)
        print(f'{os.path.basename(path)} -> {os.path.basename(webp)} {(1-os.path.getsize(webp)/os.path.getsize(path))*100:.0f}%')
"
```

## 替换引用

转换后全局替换代码中的 `.png` / `.jpg` → `.webp`：

```bash
find js css index.html -type f -exec sed -i 's/\.png/.webp/g; s/\.jpg/.webp/g' {} +
```

## 格式说明

- 透明 PNG（RGBA）→ WebP 无损
- 普通 PNG/JPG → WebP quality=75
- 保留原始文件，只新增 .webp，部署时两个都上传（Nginx 缓存 30 天）
- 如需新增图片，先放原始格式再跑一次转换
