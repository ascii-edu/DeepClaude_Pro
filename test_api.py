import requests
import json

# API 端点
api_url = "https://api.gptsapi.net/v1/messages"

# API 密钥
api_key = "sk-HU5D6cRfZXmNGNzlbOuX2GwBrSml3mokC8oa0Tgf40B2qk6h"

# 构建请求头
headers = {
    "x-api-key": api_key,
    "authorization": f"Bearer {api_key}",
    "anthropic-version": "2023-06-01",
    "content-type": "application/json",
    "accept": "text/event-stream",
}

# 构建请求体
data = {
    "model": "claude-3-5-sonnet-20240620",
    "messages": [{"role": "user", "content": "Hello, how are you?"}],
    "stream": True,
}

# 打印请求信息，便于调试
print(f"请求URL: {api_url}")
print(f"请求头: {json.dumps(headers, indent=2)}")
print(f"请求体: {json.dumps(data, indent=2)}")

try:
    # 发送请求
    response = requests.post(api_url, headers=headers, json=data, stream=True)

    # 打印响应状态码
    print(f"响应状态码: {response.status_code}")

    if response.status_code == 200:
        # 处理流式响应
        print("收到流式响应:")
        for line in response.iter_lines():
            if line:
                print(line.decode("utf-8"))
    else:
        # 打印错误信息
        print(f"错误响应: {response.text}")
except Exception as e:
    print(f"请求发生错误: {e}")
