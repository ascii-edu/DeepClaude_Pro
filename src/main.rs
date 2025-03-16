//! DeepClaude - A high-performance LLM inference API and Chat UI that integrates DeepSeek R1's CoT reasoning traces with Anthropic Claude models..
//!
//! This application provides a REST API for chat interactions that:
//! - Processes messages through DeepSeek R1 for reasoning
//! - Uses Anthropic's Claude for final responses
//! - Supports both streaming and non-streaming responses
//! - Tracks token usage and costs
//! - Provides detailed usage statistics
//!
//! The API requires authentication tokens for both services and
//! supports custom configuration through a TOML config file.

mod clients;
mod config;
mod error;
mod handlers;
mod models;
mod utils;

use crate::{config::Config, handlers::AppState};
use axum::routing::{post, get, Router};
use std::{net::SocketAddr, sync::Arc};
use tower_http::{
    cors::{Any, CorsLayer},
    trace::TraceLayer,
};
use tracing_subscriber::fmt::time::FormatTime;
use chrono::Utc;
use dotenv::dotenv;

/// Application entry point.
///
/// Sets up logging, loads configuration, and starts the HTTP server
/// with the configured routes and middleware.
///
/// # Returns
///
/// * `anyhow::Result<()>` - Ok if server starts successfully, Err otherwise
///
/// # Errors
///
/// Returns an error if:
/// - Logging setup fails
/// - Server address binding fails
/// - Server encounters a fatal error while running
#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // 自定义时间格式化器，使用北京时间
    struct BeijingTime;

    impl FormatTime for BeijingTime {
        fn format_time(&self, w: &mut tracing_subscriber::fmt::format::Writer<'_>) -> std::fmt::Result {
            // 北京时间是UTC+8
            let beijing_time = (Utc::now() + chrono::Duration::hours(8)).format("%Y-%m-%dT%H:%M:%S%.3f%:z");
            write!(w, "{}", beijing_time)
        }
    }

    // 设置日志格式，使用自定义时间格式化器
    let format = tracing_subscriber::fmt::format()
        .with_level(true)
        .with_target(true)
        .with_thread_ids(true)
        .with_timer(BeijingTime);

    // 明确设置日志级别，不依赖环境变量
    let env_filter = tracing_subscriber::EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| "deepclaude=debug,tower_http=debug".into());

    tracing_subscriber::fmt()
        .with_env_filter(env_filter)
        .event_format(format)
        .init();

    // Load configuration
    let config = Config::load().unwrap_or_else(|_| {
        tracing::warn!("Failed to load config.toml, using default configuration");
        Config::default()
    });

    // Create application state
    let state = Arc::new(AppState::new(config.clone()));

    // Set up CORS
    let cors = CorsLayer::new()
        .allow_methods(Any)
        .allow_headers(Any)
        .allow_origin(Any);

    // Build router
    let app = Router::new()
        .route("/v1/chat/completions", post(handlers::handle_chat))
        .route("/v1/env/update", post(handlers::update_env_variables))
        .route("/v1/env/variables", get(handlers::get_env_variables))
        .layer(TraceLayer::new_for_http())
        .layer(cors)
        .with_state(state);

    // 加载环境变量
    dotenv().ok();
    
    // 设置默认值
    if std::env::var("PORT").is_err() {
        std::env::set_var("PORT", "1337");
    }
    
    // 获取端口
    let port = utils::get_env_var("PORT", "1337")
        .parse::<u16>()
        .unwrap_or(1337);

    // 获取并记录当前MODE设置
    let mode = utils::get_mode();
    tracing::info!("当前运行模式: {}", mode);
    if mode == "full" {
        tracing::info!("已启用完整模式，DeepSeek的结果内容将传递给Claude");
    } else {
        tracing::info!("已启用普通模式，仅DeepSeek的推理内容将传递给Claude");
    }

    // Get host and port from config
    let addr: SocketAddr = format!("{}:{}", config.server.host, port)
        .parse()
        .expect("Invalid host/port configuration");

    tracing::info!("Starting server on {}", addr);

    // Start server
    axum::serve(
        tokio::net::TcpListener::bind(&addr).await?,
        app.into_make_service(),
    )
    .await?;

    Ok(())
}
