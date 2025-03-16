//! 工具函数模块
//!
//! 包含各种辅助函数，用于处理环境变量、文件读取等通用功能。

/// 获取MODE环境变量，决定DeepSeek和Claude之间的交互模式
/// 
/// 返回值:
/// - "normal": 只将DeepSeek的推理内容传递给Claude（默认）
/// - "full": 将DeepSeek的最终结果都传递给Claude
pub fn get_mode() -> String {
    tracing::debug!("尝试从.env文件读取MODE变量");
    
    // 从.env文件读取
    let current_dir = match std::env::current_dir() {
        Ok(dir) => dir,
        Err(e) => {
            tracing::error!("无法获取当前目录: {}", e);
            return "normal".to_string(); // 如果无法获取当前目录，返回默认值
        }
    };
    
    let env_path = current_dir.join(".env");
    tracing::debug!("尝试从.env文件读取: {:?}", env_path);
    
    // 读取.env文件内容
    let env_content = match std::fs::read_to_string(&env_path) {
        Ok(content) => content,
        Err(e) => {
            tracing::error!("无法读取.env文件: {}", e);
            return "normal".to_string(); // 如果无法读取.env文件，返回默认值
        }
    };
    
    // 解析.env文件，查找MODE变量
    for line in env_content.lines() {
        let line = line.trim();
        if !line.is_empty() && !line.starts_with('#') {
            if let Some(pos) = line.find('=') {
                let key = line[..pos].trim();
                if key == "MODE" {
                    let value = line[pos + 1..].trim();
                    // 去除可能的引号
                    let value = value.trim_matches('"').trim_matches('\'');
                    tracing::info!("从.env文件读取到MODE={}", value);
                    return value.to_string();
                }
            }
        }
    }
    
    // 如果没找到，返回默认值
    tracing::info!("在.env文件中未找到MODE变量，使用默认值MODE=normal");
    "normal".to_string()
}

/// 从.env文件中读取指定的环境变量
/// 
/// # 参数
/// 
/// * `key` - 要读取的环境变量名
/// * `default` - 如果环境变量不存在时的默认值
/// 
/// # 返回值
/// 
/// 环境变量的值，如果不存在则返回默认值
pub fn get_env_var(key: &str, default: &str) -> String {
    // 首先尝试从环境变量获取
    if let Ok(value) = std::env::var(key) {
        tracing::debug!("从系统环境变量读取到{}={}", key, value);
        return value;
    }
    
    tracing::debug!("系统环境变量中未找到{}，尝试从.env文件读取", key);
    
    // 如果环境变量中没有，尝试从.env文件读取
    let current_dir = match std::env::current_dir() {
        Ok(dir) => dir,
        Err(e) => {
            tracing::error!("无法获取当前目录: {}", e);
            return default.to_string(); // 如果无法获取当前目录，返回默认值
        }
    };
    
    let env_path = current_dir.join(".env");
    
    // 读取.env文件内容
    let env_content = match std::fs::read_to_string(&env_path) {
        Ok(content) => content,
        Err(e) => {
            tracing::error!("无法读取.env文件: {}", e);
            return default.to_string(); // 如果无法读取.env文件，返回默认值
        }
    };
    
    // 解析.env文件，查找指定的环境变量
    for line in env_content.lines() {
        let line = line.trim();
        if !line.is_empty() && !line.starts_with('#') {
            if let Some(pos) = line.find('=') {
                let var_key = line[..pos].trim();
                if var_key == key {
                    let value = line[pos + 1..].trim();
                    // 去除可能的引号
                    let value = value.trim_matches('"').trim_matches('\'');
                    tracing::debug!("从.env文件读取到{}={}", key, value);
                    return value.to_string();
                }
            }
        }
    }
    
    // 如果都没找到，返回默认值
    tracing::debug!("未找到{}环境变量，使用默认值{}={}", key, key, default);
    default.to_string()
} 