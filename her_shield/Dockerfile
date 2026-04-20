# 使用 Nginx 作为基础镜像
FROM nginx:alpine

# 设置维护者信息
LABEL maintainer="她盾团队"
LABEL description="她盾 - 职场性别权益守护智能体"

# 删除 Nginx 默认配置
RUN rm -rf /usr/share/nginx/html/*

# 复制项目文件到 Nginx 目录
COPY . /usr/share/nginx/html

# 复制自定义 Nginx 配置（可选）
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# 暴露 80 端口
EXPOSE 80

# 启动 Nginx
CMD ["nginx", "-g", "daemon off;"]