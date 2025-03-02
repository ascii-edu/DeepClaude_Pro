//! Configuration management for the application.
//!
//! This module handles loading and managing configuration settings from files
//! and environment variables. It includes pricing configurations for different
//! AI model providers and server settings.

use serde::{Deserialize, Serialize};
use std::path::Path;
use dotenv::dotenv;
use std::env;

/// Root configuration structure containing all application settings.
///
/// This structure is typically loaded from a TOML configuration file
/// and provides access to all configurable aspects of the application.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Config {
    pub server: ServerConfig,
    pub auth: AuthConfig,
    pub pricing: PricingConfig,
}

/// Server-specific configuration settings.
///
/// Contains settings related to the HTTP server, such as the
/// host address and port number to bind to.
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct ServerConfig {
    pub host: String,
    pub port: u16,
}

/// Pricing configuration for all supported AI models.
///
/// Contains pricing information for different AI model providers
/// and their various models, used for usage cost calculation.
#[derive(Debug, Clone, Deserialize, Serialize, Default)]
pub struct PricingConfig {
    pub deepseek: DeepSeekPricing,
    pub anthropic: AnthropicPricing,
}

/// DeepSeek-specific pricing configuration.
///
/// Contains pricing rates for different aspects of DeepSeek API usage,
/// including cached and non-cached requests.
#[derive(Debug, Clone, Deserialize, Serialize, Default)]
pub struct DeepSeekPricing {
    pub input_cache_hit_price: f64,
    pub input_cache_miss_price: f64,
    pub output_price: f64,
}

/// Anthropic-specific pricing configuration.
///
/// Contains pricing information for different Claude model variants
/// and their associated costs.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct AnthropicPricing {
    pub claude_3_sonnet: ModelPricing,
    pub claude_3_haiku: ModelPricing,
    pub claude_3_opus: ModelPricing,
}

/// Generic model pricing configuration.
///
/// Contains detailed pricing information for a specific model,
/// including input, output, and caching costs.
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct ModelPricing {
    pub input_price: f64,             // per million tokens
    pub output_price: f64,            // per million tokens
    pub cache_write_price: f64,       // per million tokens
    pub cache_read_price: f64,        // per million tokens
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct AuthConfig {
    pub api_key: String,
    pub deepseek_api_key: String,
    pub anthropic_api_key: String,
}

impl Config {
    /// Loads configuration from the default config file.
    ///
    /// Attempts to load and parse the configuration from 'config.toml'.
    /// Falls back to default values if the file cannot be loaded or parsed.
    ///
    /// # Returns
    ///
    /// * `anyhow::Result<Self>` - The loaded configuration or an error if loading fails
    ///
    /// # Errors
    ///
    /// Returns an error if:
    /// - The config file cannot be read
    /// - The TOML content cannot be parsed
    /// - The parsed content doesn't match the expected structure
    pub fn load() -> anyhow::Result<Self> {
        dotenv().ok();
        
        // 尝试从配置文件加载
        let config_result = config::Config::builder()
            .add_source(config::File::from(Path::new("config.toml")))
            .build()
            .and_then(|config| config.try_deserialize());

        // 如果配置文件加载失败，使用环境变量
        match config_result {
            Ok(config) => Ok(config),
            Err(_) => Ok(Config {
                server: ServerConfig {
                    host: "127.0.0.1".to_string(),
                    port: env::var("PORT")
                        .unwrap_or_else(|_| "8000".to_string())
                        .parse()
                        .unwrap_or(8000),
                },
                auth: AuthConfig {
                    api_key: env::var("API_KEY").unwrap_or_default(),
                    deepseek_api_key: env::var("DEEPSEEK_API_KEY").unwrap_or_default(),
                    anthropic_api_key: env::var("ANTHROPIC_API_KEY").unwrap_or_default(),
                },
                pricing: PricingConfig::default(),
            })
        }
    }
}

// 为 AnthropicPricing 实现 Default trait
impl Default for AnthropicPricing {
    fn default() -> Self {
        Self {
            claude_3_sonnet: ModelPricing {
                input_price: 3.0,
                output_price: 15.0,
                cache_write_price: 3.75,
                cache_read_price: 0.30,
            },
            claude_3_haiku: ModelPricing {
                input_price: 0.80,
                output_price: 4.0,
                cache_write_price: 1.0,
                cache_read_price: 0.08,
            },
            claude_3_opus: ModelPricing {
                input_price: 15.0,
                output_price: 75.0,
                cache_write_price: 18.75,
                cache_read_price: 1.50,
            },
        }
    }
}

/// Provides default configuration values.
///
/// These defaults are used when a configuration file is not present
/// or when specific values are not provided in the config file.
impl Default for Config {
    fn default() -> Self {
        Self {
            server: ServerConfig {
                host: "127.0.0.1".to_string(),
                port: 3000,
            },
            pricing: PricingConfig::default(),
            auth: AuthConfig {
                api_key: "".to_string(),
                deepseek_api_key: "".to_string(),
                anthropic_api_key: "".to_string(),
            }
        }
    }
}
