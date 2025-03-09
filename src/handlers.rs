//! Request handlers for the API endpoints.
//!
//! This module contains the main request handlers and supporting functions
//! for processing chat requests, including both streaming and non-streaming
//! responses. It coordinates between different AI models and handles
//! usage tracking and cost calculations.
use crate::{
    clients::{AnthropicClient, DeepSeekClient},
    config::Config,
    error::{ApiError, Result, SseResponse},
};
use crate::models::{
    request::{ApiRequest, Role},
    response::{
        ApiResponse, AnthropicUsage, Choice, ContentBlock, CombinedUsage,
        DeepSeekUsage, ExternalApiResponse, Message as ResponseMessage,
        OpenAICompatibleResponse, Usage,
    },
};
use crate::clients::anthropic::StreamEvent;
use crate::models::request::Message;
use axum::{
    extract::State,
    response::{sse::Event, IntoResponse},
    Json,
};
use chrono::{Utc, Duration};
use futures::StreamExt;
use std::{sync::Arc, collections::HashMap};
use tokio_stream::wrappers::ReceiverStream;
use crate::clients::deepseek::DEFAULT_MODEL as DEEPSEEK_DEFAULT_MODEL;
use dotenv::dotenv;

/// Application state shared across request handlers.
///
/// Contains configuration that needs to be accessible
/// to all request handlers.
pub struct AppState {
    pub config: Config,
}
impl AppState {
    pub fn new(config: Config) -> Self {
        AppState { config }
    }
}
/// Extracts API tokens from request headers.
///
/// # Arguments
///
/// * `headers` - The HTTP headers containing the API tokens
///
/// # Returns
///
/// * `Result<(String, String)>` - A tuple of (DeepSeek token, Anthropic token)
///
/// # Errors
///
/// Returns `ApiError::MissingHeader` if either token is missing
/// Returns `ApiError::BadRequest` if tokens are malformed
/// 从环境变量中获取API tokens
#[allow(dead_code)]
fn get_env_api_tokens() -> Option<(String, String)> {
    dotenv().ok(); // 确保.env文件被加载
    match (std::env::var("DEEPSEEK_API_KEY"), std::env::var("ANTHROPIC_API_KEY")) {
        (Ok(deepseek), Ok(anthropic)) => Some((deepseek, anthropic)),
        _ => None
    }
}

/// 从Authorization header中提取token
#[allow(dead_code)]
fn extract_bearer_token(headers: &axum::http::HeaderMap) -> Option<String> {
    headers.get("Authorization")
        .and_then(|h| h.to_str().ok())
        .and_then(|h| h.strip_prefix("Bearer "))
        .map(String::from)
}

/// 验证bearer token是否有效
#[allow(dead_code)]
fn validate_bearer_token(token: &str) -> bool {
    // 这里添加您的token验证逻辑
    // 示例中简单判断是否等于环境变量中的值
    std::env::var("API_TOKEN").map(|env_token| token == env_token).unwrap_or(false)
}

/// 修改extract_api_tokens函数以优先使用环境变量
fn extract_api_tokens(
    _headers: &axum::http::HeaderMap,
) -> Result<(String, String)> {
    // 读取.env文件
    let current_dir = std::env::current_dir().unwrap_or_else(|_| std::path::PathBuf::from("."));
    let env_content = std::fs::read_to_string(current_dir.join(".env"))
        .map_err(|e| ApiError::MissingHeader { 
            header: format!("无法读取.env文件: {}", e)
        })?;
    
    // 提取 DEEPSEEK_API_KEY
    let deepseek_token = env_content
        .lines()
        .find(|line| line.starts_with("DEEPSEEK_API_KEY="))
        .and_then(|line| line.split('=').nth(1))
        .map(|value| value.trim().trim_matches('"').to_string())
        .ok_or_else(|| ApiError::MissingHeader { 
            header: "未在.env文件中找到DEEPSEEK_API_KEY".to_string() 
        })?;
    
    // 提取 ANTHROPIC_API_KEY
    let anthropic_token = env_content
        .lines()
        .find(|line| line.starts_with("ANTHROPIC_API_KEY="))
        .and_then(|line| line.split('=').nth(1))
        .map(|value| value.trim().trim_matches('"').to_string())
        .ok_or_else(|| ApiError::MissingHeader { 
            header: "未在.env文件中找到ANTHROPIC_API_KEY".to_string() 
        })?;
    
    Ok((deepseek_token, anthropic_token))
}

/// Calculates the cost of DeepSeek API usage.
///
/// # Arguments
///
/// * `input_tokens` - Number of input tokens processed
/// * `output_tokens` - Number of output tokens generated
/// * `_reasoning_tokens` - Number of tokens used for reasoning
/// * `cached_tokens` - Number of tokens retrieved from cache
/// * `config` - Configuration containing pricing information
///
/// # Returns
///
/// The total cost in dollars for the API usage
fn calculate_deepseek_cost(
    input_tokens: u32,
    output_tokens: u32,
    _reasoning_tokens: u32,
    cached_tokens: u32,
    config: &Config,
) -> f64 {
    let cache_hit_cost = (cached_tokens as f64 / 1_000_000.0) * config.pricing.deepseek.input_cache_hit_price;
    let cache_miss_cost = ((input_tokens - cached_tokens) as f64 / 1_000_000.0) * config.pricing.deepseek.input_cache_miss_price;
    let output_cost = (output_tokens as f64 / 1_000_000.0) * config.pricing.deepseek.output_price;
    
    cache_hit_cost + cache_miss_cost + output_cost
}

/// Calculates the cost of Anthropic API usage.
///
/// # Arguments
///
/// * `model` - The specific Claude model used
/// * `input_tokens` - Number of input tokens processed
/// * `output_tokens` - Number of output tokens generated
/// * `cache_write_tokens` - Number of tokens written to cache
/// * `cache_read_tokens` - Number of tokens read from cache
/// * `config` - Configuration containing pricing information
///
/// # Returns
///
/// The total cost in dollars for the API usage
fn calculate_anthropic_cost(
    model: &str,
    input_tokens: u32,
    output_tokens: u32,
    cache_write_tokens: u32,
    cache_read_tokens: u32,
    config: &Config,
) -> f64 {
    let pricing = if model.contains("claude-3-5-sonnet") {
        &config.pricing.anthropic.claude_3_sonnet
    } else if model.contains("claude-3-5-haiku") {
        &config.pricing.anthropic.claude_3_haiku
    } else if model.contains("claude-3-opus") {
        &config.pricing.anthropic.claude_3_opus
    } else {
        &config.pricing.anthropic.claude_3_sonnet // default to sonnet pricing
    };

    let input_cost = (input_tokens as f64 / 1_000_000.0) * pricing.input_price;
    let output_cost = (output_tokens as f64 / 1_000_000.0) * pricing.output_price;
    let cache_write_cost = (cache_write_tokens as f64 / 1_000_000.0) * pricing.cache_write_price;
    let cache_read_cost = (cache_read_tokens as f64 / 1_000_000.0) * pricing.cache_read_price;

    input_cost + output_cost + cache_write_cost + cache_read_cost
}

/// Formats a cost value as a dollar amount string.
///
/// # Arguments
///
/// * `cost` - The cost value to format
///
/// # Returns
///
/// A string representing the cost with 3 decimal places and $ prefix
pub(crate) fn format_cost(cost: f64) -> String {
    format!("${:.2}", cost)
}

/// Main handler for chat requests.
///
/// Routes requests to either streaming or non-streaming handlers
/// based on the request configuration.
///
/// # Arguments
///
/// * `state` - Application state containing configuration
/// * `headers` - HTTP request headers
/// * `request` - The parsed chat request
///
/// # Returns
///
/// * `Result<Response>` - The API response or an error
pub async fn handle_chat(
    state: State<Arc<AppState>>,
    headers: axum::http::HeaderMap,
    Json(request): Json<ApiRequest>,
) -> Result<axum::response::Response> {
    if request.stream {
        let stream_response = chat_stream(state, headers, Json(request)).await?;
        Ok(stream_response.into_response())
    } else {
        let json_response = chat(state, headers, Json(request)).await?;
        Ok(json_response.into_response())
    }
}

/// Handler for non-streaming chat requests.
///
/// Processes the request through both AI models sequentially,
/// combining their responses and tracking usage.
///
/// # Arguments
///
/// * `state` - Application state containing configuration
/// * `headers` - HTTP request headers
/// * `request` - The parsed chat request
///
/// # Returns
///
/// * `Result<Json<ApiResponse>>` - The combined API response or an error
pub(crate) async fn chat(
    State(state): State<Arc<AppState>>,
    headers: axum::http::HeaderMap,
    Json(request): Json<ApiRequest>,
) -> Result<Json<OpenAICompatibleResponse>> {
    // Validate system prompt
    if !request.validate_system_prompt() {
        return Err(ApiError::InvalidSystemPrompt);
    }

    // Extract API tokens
    let (deepseek_token, anthropic_token) = extract_api_tokens(&headers)?;

    // Initialize clients
    let deepseek_client = DeepSeekClient::new(deepseek_token);
    let anthropic_client = AnthropicClient::new(anthropic_token);

    // Get messages with system prompt
    let messages = request.get_messages_with_system();

    // Call DeepSeek API
    let deepseek_response = deepseek_client.chat(messages.clone(), &request.deepseek_config).await?;
    
    // Store response metadata
    let _deepseek_status: u16 = 200;
    let _deepseek_headers: HashMap<String, String> = HashMap::new(); // Headers not available when using high-level chat method

    // Extract reasoning content and wrap in thinking tags
    let reasoning_content = deepseek_response
        .choices
        .first()
        .and_then(|c| c.message.reasoning_content.as_ref())
        .ok_or_else(|| ApiError::DeepSeekError { 
            message: "No reasoning content in response".to_string(),
            type_: "missing_content".to_string(),
            param: None,
            code: None
        })?;

    let thinking_content = format!("<thinking>\n{}\n</thinking>", reasoning_content);

    // Add thinking content to messages for Anthropic
    let mut anthropic_messages = messages;
    anthropic_messages.push(Message {
        role: Role::Assistant,
        content: thinking_content.clone(),
    });

    // Call Anthropic API
    let anthropic_response = anthropic_client.chat(
        anthropic_messages,
        request.get_system_prompt().map(String::from),
        &request.anthropic_config
    ).await?;
    
    // Store response metadata
    let _anthropic_status: u16 = 200;
    let _anthropic_headers: HashMap<String, String> = HashMap::new(); // Headers not available when using high-level chat method

    // Calculate usage costs
    let deepseek_cost = calculate_deepseek_cost(
        deepseek_response.usage.input_tokens,
        deepseek_response.usage.output_tokens,
        deepseek_response.usage.output_details.reasoning,
        deepseek_response.usage.input_details.cached,
        &state.config,
    );

    let anthropic_cost = calculate_anthropic_cost(
        &anthropic_response.model,
        anthropic_response.usage.input_tokens,
        anthropic_response.usage.output_tokens,
        anthropic_response.usage.cache_creation_input_tokens,
        anthropic_response.usage.cache_read_input_tokens,
        &state.config,
    );

    // Combine thinking content with Anthropic's response
    let mut content = Vec::new();
    
    // Add thinking block first
    content.push(ContentBlock::text(thinking_content));
    
    // Add Anthropic's response blocks
    content.extend(anthropic_response.content.clone().into_iter()
        .map(ContentBlock::from_anthropic));

    // Build response with captured headers
    let _response = ApiResponse {
        created: Utc::now(),
        content: vec![ContentBlock {
            content_type: "text".to_string(),
            text: content.into_iter().map(|c| c.text).collect::<Vec<_>>().join(""),
        }],
        deepseek_response: request.verbose.then(|| ExternalApiResponse {
            status: 200,
            headers: HashMap::new(),
            body: serde_json::Value::Null,
        }),
        anthropic_response: request.verbose.then(|| ExternalApiResponse {
            status: 200,
            headers: HashMap::new(),
            body: serde_json::to_value(&anthropic_response).unwrap_or_default(),
        }),
        combined_usage: CombinedUsage {
            total_cost: format_cost(deepseek_cost + anthropic_cost),
            deepseek_usage: DeepSeekUsage::default(),
            anthropic_usage: AnthropicUsage {
                input_tokens: anthropic_response.usage.input_tokens,
                output_tokens: anthropic_response.usage.output_tokens,
                cached_write_tokens: anthropic_response.usage.cache_creation_input_tokens,
                cached_read_tokens: anthropic_response.usage.cache_read_input_tokens,
                total_tokens: anthropic_response.usage.input_tokens + anthropic_response.usage.output_tokens,
                total_cost: format_cost(anthropic_cost),
            },
        },
    };

    // 获取北京时间戳
    let beijing_timestamp = (Utc::now() + Duration::hours(8)).timestamp();

    // 修改返回部分
    let response = OpenAICompatibleResponse {
        id: uuid::Uuid::new_v4().to_string(),
        object: "chat.completion".to_string(),
        created: beijing_timestamp,
        model: format!("{}_{}", DEEPSEEK_DEFAULT_MODEL, anthropic_response.model),
        choices: vec![Choice {
            index: 0,
            message: ResponseMessage {
                role: "assistant".to_string(),
                content: anthropic_response.content.iter()
                    .map(|c| c.text.clone())
                    .collect::<Vec<_>>()
                    .join(""),
                reasoning_content: Some(reasoning_content.clone()),
            },
            finish_reason: "stop".to_string(),
        }],
        usage: Usage {
            prompt_tokens: anthropic_response.usage.input_tokens,
            completion_tokens: anthropic_response.usage.output_tokens,
            total_tokens: anthropic_response.usage.input_tokens + anthropic_response.usage.output_tokens,
        },
    };

    // 直接返回OpenAI兼容格式，不要转换为ApiResponse
    Ok(Json(response))
}

/// Handler for streaming chat requests.
///
/// Processes the request through both AI models sequentially,
/// streaming their responses as Server-Sent Events.
///
/// # Arguments
///
/// * `state` - Application state containing configuration
/// * `headers` - HTTP request headers
/// * `request` - The parsed chat request
///
/// # Returns
///
/// * `Result<SseResponse>` - A stream of Server-Sent Events or an error
pub(crate) async fn chat_stream(
    State(state): State<Arc<AppState>>,
    headers: axum::http::HeaderMap,
    Json(request): Json<ApiRequest>,
) -> Result<SseResponse> {
    // 验证系统提示
    if !request.validate_system_prompt() {
        return Err(ApiError::InvalidSystemPrompt);
    }

    // 提取API令牌
    let (deepseek_token, anthropic_token) = extract_api_tokens(&headers)?;

    // 初始化客户端
    let deepseek_client = DeepSeekClient::new(deepseek_token);
    let anthropic_client = AnthropicClient::new(anthropic_token);

    // 获取带系统提示的消息
    let messages = request.get_messages_with_system();

    // 创建通道，使用正确的类型
    let (tx, rx) = tokio::sync::mpsc::channel::<std::result::Result<Event, std::convert::Infallible>>(100);
    let stream = ReceiverStream::new(rx);

    // 启动异步任务处理流式响应
    tokio::spawn(async move {
        // 首先获取 DeepSeek 的推理内容
        let mut deepseek_stream = deepseek_client.chat_stream(messages.clone(), &request.deepseek_config);
        let mut reasoning_content = String::new();
        let stream_id = uuid::Uuid::new_v4().to_string();
        let created = chrono::Utc::now().timestamp();
        let mut last_event_time = Utc::now();
        let heartbeat_interval = Duration::seconds(15);
        
        // 发送角色事件
        let role_event = serde_json::json!({
            "id": stream_id,
            "object": "chat.completion.chunk",
            "created": created,
            "model": DEEPSEEK_DEFAULT_MODEL,
            "choices": [{
                "index": 0,
                "delta": {
                    "role": "assistant"
                },
                "finish_reason": null
            }]
        }).to_string();
        
        if let Err(e) = tx.send(Ok(Event::default().data(role_event))).await {
            tracing::error!("发送角色事件失败: {}", e);
            return;
        }
        
        // 流式输出 DeepSeek 的推理内容
        let mut has_reasoning = false;
        while let Some(result) = deepseek_stream.next().await {
            if let Ok(response) = result {
                if let Some(choice) = response.choices.first() {
                    if let Some(reasoning) = &choice.delta.reasoning_content {
                        if !reasoning.is_empty() {
                            // 记录已经处理过的推理内容，避免重复
                            reasoning_content.push_str(reasoning);
                            has_reasoning = true;
                            
                            // 发送推理内容事件（流式）
                            let reasoning_event = serde_json::json!({
                                "id": uuid::Uuid::new_v4().to_string(),
                                "object": "chat.completion.chunk",
                                "created": chrono::Utc::now().timestamp(),
                                "model": DEEPSEEK_DEFAULT_MODEL,
                                "choices": [{
                                    "index": 0,
                                    "delta": {
                                        "content": null,
                                        "reasoning_content": reasoning,
                                        "role": "assistant"
                                    },
                                    "finish_reason": null,
                                    "content_filter_results": {
                                        "hate": {"filtered": false},
                                        "self_harm": {"filtered": false},
                                        "sexual": {"filtered": false},
                                        "violence": {"filtered": false}
                                    }
                                }],
                                "system_fingerprint": "",
                                "usage": {
                                    "prompt_tokens": response.usage.as_ref().map_or(0, |u| u.input_tokens),
                                    "completion_tokens": response.usage.as_ref().map_or(0, |u| u.output_tokens),
                                    "total_tokens": response.usage.as_ref().map_or(0, |u| u.total_tokens)
                                }
                            }).to_string();
                            
                            if let Err(e) = tx.send(Ok(Event::default().data(reasoning_event))).await {
                                tracing::error!("发送推理内容事件失败: {}", e);
                                return;
                            }
                            last_event_time = Utc::now();
                        }
                    }
                }
            }
        }

        // 将推理内容添加到消息中，但使用系统消息，确保 Anthropic 不会再次输出它
        let mut anthropic_messages = messages.clone();
        if has_reasoning && !reasoning_content.trim().is_empty() {
            anthropic_messages.push(Message {
                role: Role::System,
                content: format!("以下是之前的推理过程，仅供参考，不要在回复中重复这些内容: {}", reasoning_content),
            });
        }

        // 获取 Anthropic 的流式响应
        let mut anthropic_stream = anthropic_client.chat_stream(
            anthropic_messages,
            request.get_system_prompt().map(String::from),
            &request.anthropic_config
        );

        let mut content_buffer = String::new();
        
        // 处理 Anthropic 的流式响应
        while let Some(result) = anthropic_stream.next().await {
            match result {
                Ok(response) => {
                    // 检查是否需要发送心跳
                    let now = Utc::now();
                    if now - last_event_time > heartbeat_interval {
                        // 发送符合 JSON 格式的心跳事件
                        let heartbeat_event = serde_json::json!({
                            "id": uuid::Uuid::new_v4().to_string(),
                            "object": "chat.completion.chunk",
                            "created": chrono::Utc::now().timestamp(),
                            "model": DEEPSEEK_DEFAULT_MODEL,
                            "choices": [{
                                "index": 0,
                                "delta": {},
                                "finish_reason": null
                            }],
                            "heartbeat": true
                        }).to_string();
                        
                        if let Err(e) = tx.send(Ok(Event::default().data(heartbeat_event))).await {
                            tracing::error!("发送心跳失败: {}", e);
                            break;
                        }
                        last_event_time = now;
                    }

                    // 处理 Anthropic 的响应内容
                    match response {
                        StreamEvent::ContentBlockDelta { delta, .. } => {
                            if !delta.text.is_empty() {
                                // 添加到内容缓冲区
                                content_buffer.push_str(&delta.text);
                                
                                // 发送普通内容事件
                                let content_event = serde_json::json!({
                                    "id": uuid::Uuid::new_v4().to_string(),
                                    "object": "chat.completion.chunk",
                                    "created": chrono::Utc::now().timestamp(),
                                    "model": DEEPSEEK_DEFAULT_MODEL,
                                    "choices": [{
                                        "index": 0,
                                        "delta": {
                                            "content": delta.text,
                                            "reasoning_content": null,
                                            "role": "assistant"
                                        },
                                        "finish_reason": null,
                                        "content_filter_results": {
                                            "hate": {"filtered": false},
                                            "self_harm": {"filtered": false},
                                            "sexual": {"filtered": false},
                                            "violence": {"filtered": false}
                                        }
                                    }],
                                    "system_fingerprint": "",
                                    "usage": {
                                        "prompt_tokens": 0,
                                        "completion_tokens": delta.text.chars().count() as u32,
                                        "total_tokens": delta.text.chars().count() as u32
                                    }
                                }).to_string();
                                
                                if let Err(e) = tx.send(Ok(Event::default().data(content_event))).await {
                                    tracing::error!("发送内容事件失败: {}", e);
                                    break;
                                }
                                last_event_time = now;
                            }
                        }
                        StreamEvent::MessageStop => {
                            // 发送完成事件
                            let finish_event = serde_json::json!({
                                "id": stream_id,
                                "object": "chat.completion.chunk",
                                "created": created,
                                "model": DEEPSEEK_DEFAULT_MODEL,
                                "choices": [{
                                    "index": 0,
                                    "delta": {},
                                    "finish_reason": "stop",
                                    "content_filter_results": {
                                        "hate": {"filtered": false},
                                        "self_harm": {"filtered": false},
                                        "sexual": {"filtered": false},
                                        "violence": {"filtered": false}
                                    }
                                }],
                                "system_fingerprint": "",
                                "usage": {
                                    "prompt_tokens": 0,
                                    "completion_tokens": content_buffer.chars().count() as u32,
                                    "total_tokens": content_buffer.chars().count() as u32
                                }
                            }).to_string();
                            
                            if let Err(e) = tx.send(Ok(Event::default().data(finish_event))).await {
                                tracing::error!("发送完成事件失败: {}", e);
                            }
                            
                            // 发送 [DONE] 标记作为特殊的 SSE 事件，确保 data 字段包含有效的 JSON
                            let done_data = serde_json::json!({
                                "id": stream_id,
                                "object": "chat.completion.chunk",
                                "created": created,
                                "model": DEEPSEEK_DEFAULT_MODEL,
                                "choices": [],
                                "done": true
                            }).to_string();
                            
                            if let Err(e) = tx.send(Ok(Event::default().event("done").data(done_data))).await {
                                tracing::error!("发送DONE标记失败: {}", e);
                            }
                            break;
                        }
                        _ => {} // 忽略其他类型的事件
                    }
                }
                Err(e) => {
                    tracing::error!("流处理错误: {}", e);
                    // 将错误转换为事件
                    let error_event = serde_json::json!({
                        "id": stream_id,
                        "object": "chat.completion.chunk",
                        "created": created,
                        "model": DEEPSEEK_DEFAULT_MODEL,
                        "choices": [{
                            "index": 0,
                            "delta": {},
                            "finish_reason": "error",
                            "content_filter_results": {
                                "hate": {"filtered": false},
                                "self_harm": {"filtered": false},
                                "sexual": {"filtered": false},
                                "violence": {"filtered": false}
                            }
                        }],
                        "error": {
                            "message": e.to_string(),
                            "type": "server_error",
                            "code": null
                        }
                    }).to_string();
                    
                    if let Err(send_err) = tx.send(Ok(Event::default().data(error_event))).await {
                        tracing::error!("发送错误事件失败: {}", send_err);
                    }
                    break;
                }
            }
        }
        
        // 确保所有流都已关闭
        drop(anthropic_stream);
    });

    Ok(SseResponse::new(stream))
}
