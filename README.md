<div align="center">
  # DeepClaude_Pro 🐬🧠
  <img src="frontend/public/deepclaude.png" width="300">
  借助统一的应用程序编程接口（API）和聊天界面，发挥深度求索（DeepSeek）R1的推理能力以及Claude的创造力和代码生成能力。
  [![Rust](https://img.shields.io/badge/rust-v1.75%2B-orange)](https://www.rust-lang.org/)
  [![API状态](https://img.shields.io/badge/API-稳定-绿色)](https://deepclaude.asterisk.so)
  [快速入门](#快速入门) • [功能特性](#功能特性) • [API使用方法](#api使用方法) • [文档说明](#文档说明) • [自主托管](#自主托管) • [贡献代码](#贡献代码)
</div>

## 目录
- [概述](#概述)
- [功能特性](#功能特性)
- [为什么选择R1和克劳德？](#为什么选择r1和克劳德)
- [快速入门](#快速入门)
  - [先决条件](#先决条件)
  - [安装步骤](#安装步骤)
  - [配置方法](#配置方法)
- [API使用方法](#api使用方法)
  - [基本示例](#基本示例)
  - [流式传输示例](#流式传输示例)
- [配置选项](#配置选项)
- [自主托管](#自主托管)
- [安全性](#安全性)
- [贡献代码](#贡献代码)
- [许可证](#许可证)
- [鸣谢](#鸣谢)

## 概述
DeepClaude是一个高性能的大语言模型（LLM）推理API，它将深度求索R1的思维链（CoT）推理能力与人工智能公司Anthropic的克劳德模型在创造力和代码生成方面的优势相结合。它提供了一个统一的接口，让你在完全掌控自己的API密钥和数据的同时，充分利用这两个模型的优势。

## 功能特性
🚀 **零延迟** - 由高性能的Rust API驱动，先由R1的思维链提供即时响应，随后在单个流中呈现克劳德的回复  
🔒 **私密且安全** - 采用端到端的安全措施，进行本地API密钥管理。你的数据将保持私密  
⚙️ **高度可配置** - 可自定义API和接口的各个方面，以满足你的需求  
🌟 **开源** - 免费的开源代码库。你可以根据自己的意愿进行贡献、修改和部署  
🤖 **双人工智能能力** - 将深度求索R1的推理能力与克劳德的创造力和代码生成能力相结合  
🔑 **自带密钥管理的API** - 在我们的托管基础设施中使用你自己的API密钥，实现完全掌控

## 为什么选择R1和Claude？
深度求索R1的思维链轨迹展示了深度推理能力，达到了大语言模型能够进行“元认知”的程度——能够自我纠正、思考边缘情况，并以自然语言进行准蒙特卡洛树搜索。

然而，R1在代码生成、创造力和对话技巧方面有所欠缺。claude 3.5 sonnet版本在这些领域表现出色，是完美的补充。DeepClaude结合了这两个模型，以提供：
- R1卓越的推理和问题解决能力
- 克劳德出色的代码生成和创造力
- 单次API调用即可实现快速的流式响应
- 使用你自己的API密钥实现完全掌控

## 快速入门
### 先决条件
- Rust 1.75或更高版本
- 深度求索API密钥
- Anthropic API密钥

### 安装步骤
1. 克隆存储库：
   ```bash
   git clone https://github.com/getasterisk/deepclaude.git
   cd deepclaude
   ```
2. 构建项目：
   ```bash
   cargo build --release
   ```

### 配置方法
在项目根目录中创建一个`config.toml`文件：
```toml
[server]
host = "127.0.0.1"
port = 3000

[pricing]
# 配置用于使用情况跟踪的定价设置
```

## API使用方法
请参阅[API文档](https://deepclaude.chat)

### 基本示例
```python
import requests

response = requests.post(
    "http://127.0.0.1:1337/",
    headers={
        "X-DeepSeek-API-Token": "<你的深度求索API密钥>",
        "X-Anthropic-API-Token": "<你的Anthropic API密钥>"
    },
    json={
        "messages": [
            {"role": "user", "content": "单词“strawberry”中有多少个“r”？"}
        ]
    }
)

print(response.json())
```

### 流式传输示例
```python
import asyncio
import json
import httpx

async def stream_response():
    async with httpx.AsyncClient() as client:
        async with client.stream(
            "POST",
            "http://127.0.0.1:1337/",
            headers={
                "X-DeepSeek-API-Token": "<你的深度求索API密钥>",
                "X-Anthropic-API-Token": "<你的Anthropic API密钥>"
            },
            json={
                "stream": True,
                "messages": [
                    {"role": "user", "content": "单词“strawberry”中有多少个“r”？"}
                ]
            }
        ) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                if line:
                    if line.startswith('data: '):
                        data = line[6:]
                        try:
                            parsed_data = json.loads(data)
                            if 'content' in parsed_data:
                                content = parsed_data.get('content', '')[0]['text']
                                print(content, end='', flush=True)
                            else:
                                print(data, flush=True)
                        except json.JSONDecodeError:
                            pass

if __name__ == "__main__":
    asyncio.run(stream_response())
```

## 配置选项
API支持通过请求体进行广泛的配置：
```json
{
  "stream": false,
  "verbose": false,
  "system": "可选的系统提示",
  "messages": [...],
  "deepseek_config": {
    "headers": {},
    "body": {}
  },
  "anthropic_config": {
    "headers": {},
    "body": {}
  }
}
```

## 自主托管
DeepClaude可以在你自己的基础设施上进行自主托管。请按照以下步骤操作：
1. 配置环境变量或`config.toml`文件
2. 构建Docker镜像或从源代码编译
3. 部署到你首选的托管平台

## 安全性
- 不存储或记录数据
- 采用自带密钥（BYOK）架构
- 定期进行安全审计和更新

## 贡献代码
我们欢迎贡献！请参阅我们的[贡献指南](CONTRIBUTING.md)，了解有关以下方面的详细信息：
- 行为准则
- 开发流程
- 提交拉取请求
- 报告问题