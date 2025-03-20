import requests
import json

# API 端点
api_url = "https://xxxx/v1/chat/completions"

# API 密钥
api_key = "xxxx"

# 构建请求头
headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}

# 构建请求体 (OpenAI 格式)
data = {
    "model": "claude-3-5-sonnet-20240620",
    "messages": [{"role": "user", "content": "你好，请用中文回答：今天天气怎么样？"}],
    "temperature": 0.7,
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
                decoded_line = line.decode("utf-8")
                if decoded_line.startswith("data: "):
                    content = decoded_line[6:]  # 移除 'data: ' 前缀
                    if content == "[DONE]":
                        print("响应完成")
                    else:
                        try:
                            json_content = json.loads(content)
                            if (
                                "choices" in json_content
                                and len(json_content["choices"]) > 0
                            ):
                                choice = json_content["choices"][0]
                                if "delta" in choice and "content" in choice["delta"]:
                                    print(
                                        choice["delta"]["content"], end="", flush=True
                                    )
                        except json.JSONDecodeError:
                            print(f"无法解析JSON: {content}")
    else:
        # 打印错误信息
        print(f"错误响应: {response.text}")
except Exception as e:
    print(f"请求发生错误: {e}")
