"use client"

import { useState, useEffect, useCallback, useMemo, memo } from "react"
import { usePostHog } from "../providers/posthog"
import debounce from "lodash/debounce"
import { Settings2, RotateCcw, Save, Download } from "lucide-react"
import { useToast } from "./ui/use-toast"
import { Button } from "./ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Form, FormControl, FormField, FormItem, FormLabel } from "./ui/form"
import { Textarea } from "./ui/textarea"
import { Input } from "./ui/input"
import { useForm } from "react-hook-form"

// 添加后端API基础URL
const API_BASE_URL = 'http://127.0.0.1:1337';

interface SettingsFormValues {
  model: string
  systemPrompt: string
  apiKey: string
  port: string
  deepseekApiKey: string
  anthropicApiKey: string
  deepseekApiUrl: string
  anthropicApiUrl: string
  claudeOpenaiTypeApiUrl: string
  claudeDefaultModel: string
  deepseekDefaultModel: string
  deepseekHeaders: { key: string; value: string }[]
  deepseekBody: { key: string; value: string }[]
  anthropicHeaders: { key: string; value: string }[]
  anthropicBody: { key: string; value: string }[]
  mode: string
}

interface SettingsProps {
  onSettingsChange: (settings: { deepseekApiToken: string; anthropicApiToken: string }) => void
}

// 使用memo优化KeyValuePairFields组件
const KeyValuePairFields = memo(({ 
  name,
  label,
  initialValue,
  onChange
}: { 
  name: "deepseekHeaders" | "deepseekBody" | "anthropicHeaders" | "anthropicBody"
  label: string 
  initialValue: Array<{key: string, value: string}>
  onChange: (pairs: Array<{key: string, value: string}>) => void
}) => {
  // 使用完全独立的状态管理键值对
  const [pairs, setPairs] = useState<Array<{key: string, value: string}>>(() => {
    return initialValue && initialValue.length > 0 
      ? initialValue.map(pair => ({ key: pair.key || "", value: pair.value || "" }))
      : [{ key: "", value: "" }];
  });
  
  // 当初始值变化时更新本地状态
  useEffect(() => {
    if (initialValue && initialValue.length > 0) {
      setPairs(initialValue.map(pair => ({ key: pair.key || "", value: pair.value || "" })));
    }
  }, [initialValue]);
  
  // 所有状态更改都通过这个函数处理，确保通知父组件
  const updatePairs = useCallback((newPairs: Array<{key: string, value: string}>) => {
    setPairs(newPairs);
    onChange(newPairs);
  }, [onChange]);
  
  // 处理键的变化
  const handleKeyChange = useCallback((index: number, newKey: string) => {
    const newPairs = [...pairs];
    newPairs[index] = { ...newPairs[index], key: newKey };
    updatePairs(newPairs);
  }, [pairs, updatePairs]);
  
  // 处理值的变化
  const handleValueChange = useCallback((index: number, newValue: string) => {
    const newPairs = [...pairs];
    newPairs[index] = { ...newPairs[index], value: newValue };
    updatePairs(newPairs);
  }, [pairs, updatePairs]);
  
  // 删除一对
  const handleRemove = useCallback((index: number) => {
    if (pairs.length > 1) {
      const newPairs = [...pairs];
      newPairs.splice(index, 1);
      updatePairs(newPairs);
    }
  }, [pairs, updatePairs]);
  
  // 添加一对
  const handleAdd = useCallback(() => {
    updatePairs([...pairs, { key: "", value: "" }]);
  }, [pairs, updatePairs]);

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">{label}</div>
      <div className="space-y-2">
        {pairs.map((pair, index) => (
          <div key={`${name}-${index}`} className="flex gap-2">
            <Input
              placeholder="Key"
              value={pair.key}
              onChange={(e) => handleKeyChange(index, e.target.value)}
            />
            <Input
              placeholder="Value"
              value={pair.value}
              onChange={(e) => handleValueChange(index, e.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => handleRemove(index)}
            >
              ×
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={handleAdd}
        >
          添加 {label}
        </Button>
      </div>
    </div>
  );
});

// 为了避免React开发模式下的警告，添加displayName
KeyValuePairFields.displayName = "KeyValuePairFields";

export function Settings({ onSettingsChange }: SettingsProps) {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()
  const posthog = usePostHog()
  
  const form = useForm<SettingsFormValues>({
    defaultValues: {
      model: "",
      systemPrompt: "You are a helpful AI assistant who excels at reasoning and responds in Markdown format. For code snippets, you wrap them in Markdown codeblocks with it's language specified.",
      apiKey: "",
      port: "1337",
      deepseekApiKey: "",
      anthropicApiKey: "",
      deepseekApiUrl: "",
      anthropicApiUrl: "",
      claudeOpenaiTypeApiUrl: "",
      claudeDefaultModel: "",
      deepseekDefaultModel: "",
      deepseekHeaders: [{ key: "", value: "" }],
      deepseekBody: [{ key: "", value: "" }],
      anthropicHeaders: [{ key: "anthropic-version", value: "2023-06-01" }],
      anthropicBody: [{ key: "", value: "" }],
      mode: "normal"
    }
  })

  // 添加独立的键值对状态
  const [deepseekHeaders, setDeepseekHeaders] = useState<Array<{key: string, value: string}>>([
    { key: "", value: "" }
  ]);
  const [deepseekBody, setDeepseekBody] = useState<Array<{key: string, value: string}>>([
    { key: "", value: "" }
  ]);
  const [anthropicHeaders, setAnthropicHeaders] = useState<Array<{key: string, value: string}>>([
    { key: "anthropic-version", value: "2023-06-01" }
  ]);
  const [anthropicBody, setAnthropicBody] = useState<Array<{key: string, value: string}>>([
    { key: "", value: "" }
  ]);
  
  // 更新useEffect以加载本地存储的设置到独立状态
  useEffect(() => {
    const savedSettings = localStorage.getItem('deepclaude-settings')
    if (savedSettings) {
      const settings = JSON.parse(savedSettings)
      form.reset(settings)
      
      // 更新独立的键值对状态
      if (settings.deepseekHeaders) setDeepseekHeaders(settings.deepseekHeaders);
      if (settings.deepseekBody) setDeepseekBody(settings.deepseekBody);
      if (settings.anthropicHeaders) setAnthropicHeaders(settings.anthropicHeaders);
      if (settings.anthropicBody) setAnthropicBody(settings.anthropicBody);
      
      onSettingsChange({
        deepseekApiToken: settings.deepseekApiKey,
        anthropicApiToken: settings.anthropicApiKey
      })
    }
  }, [form, onSettingsChange])
  
  // 创建一个居中的toast函数
  const centerToast = useCallback((props: any) => {
    toast({
      ...props,
      className: "fixed top-4 left-1/2 transform -translate-x-1/2 z-[200] max-w-[25%] w-fit", // 限制宽度为屏幕的1/4
    });
  }, [toast]);
  
  // 修改保存设置函数，将独立状态合并到表单数据中
  const saveSettings = async (values: Omit<SettingsFormValues, 'deepseekHeaders' | 'deepseekBody' | 'anthropicHeaders' | 'anthropicBody'>) => {
    try {
      // 合并表单值和独立状态
      const completeValues = {
        ...values,
        deepseekHeaders,
        deepseekBody,
        anthropicHeaders,
        anthropicBody
      };
      
      const response = await fetch(`${API_BASE_URL}/v1/env/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          variables: {
            API_KEY: values.apiKey,
            PORT: values.port,
            DEEPSEEK_API_KEY: values.deepseekApiKey,
            ANTHROPIC_API_KEY: values.anthropicApiKey,
            DEEPSEEK_OPENAI_TYPE_API_URL: values.deepseekApiUrl,
            ANTHROPIC_API_URL: values.anthropicApiUrl,
            CLAUDE_OPENAI_TYPE_API_URL: values.claudeOpenaiTypeApiUrl,
            CLAUDE_DEFAULT_MODEL: values.claudeDefaultModel,
            DEEPSEEK_DEFAULT_MODEL: values.deepseekDefaultModel,
            MODE: values.mode,
          }
        })
      });

      if (!response.ok) {
        throw new Error('保存设置失败');
      }

      centerToast({
        title: "设置已保存",
        description: "所有环境变量已成功更新",
      })

      // 保存到localStorage
      localStorage.setItem('deepclaude-settings', JSON.stringify(completeValues))
      
      // 通知父组件设置已更改
      onSettingsChange({
        deepseekApiToken: values.deepseekApiKey,
        anthropicApiToken: values.anthropicApiKey
      })
    } catch (error) {
      console.error('保存设置失败:', error)
      centerToast({
        title: "错误",
        description: "保存设置失败，请重试",
        variant: "destructive"
      })
    }
  }
  
  // 更新重置函数以重置独立状态
  const handleReset = () => {
    form.reset({
      systemPrompt: "You are a helpful AI assistant who excels at reasoning and responds in Markdown format. For code snippets, you wrap them in Markdown codeblocks with it's language specified.",
      apiKey: "",
      port: "1337",
      deepseekApiKey: "",
      anthropicApiKey: "",
      deepseekApiUrl: "",
      anthropicApiUrl: "",
      claudeOpenaiTypeApiUrl: "",
      claudeDefaultModel: "",
      deepseekDefaultModel: "",
      deepseekHeaders: [],
      deepseekBody: [],
      anthropicHeaders: [],
      anthropicBody: [],
      mode: "normal"
    })
    
    // 重置独立状态
    setDeepseekHeaders([{ key: "", value: "" }]);
    setDeepseekBody([{ key: "", value: "" }]);
    setAnthropicHeaders([{ key: "anthropic-version", value: "2023-06-01" }]);
    setAnthropicBody([{ key: "", value: "" }]);
    
    localStorage.removeItem('deepclaude-settings')
    onSettingsChange({
      deepseekApiToken: "",
      anthropicApiToken: ""
    })

    // Track settings reset
    posthog.capture('settings_reset', {
      timestamp: new Date().toISOString()
    })

    centerToast({
      description: "Settings reset to defaults",
      duration: 2000,
    })
  }

  // 加载环境变量并填充到表单中
  const loadEnvVariables = async () => {
    try {
      centerToast({
        title: "正在获取环境变量",
        description: "请稍候...",
        duration: 2000,
      });
      
      const response = await fetch(`${API_BASE_URL}/v1/env/variables`);
      if (!response.ok) {
        throw new Error('获取环境变量失败');
      }
      
      const data = await response.json();
      console.log('获取到的环境变量:', data);
      
      if (data.status === 'success' && data.variables) {
        // 将环境变量填充到对应的表单字段中
        const variables = data.variables;
        
        // 创建一个新的表单值对象
        const newFormValues: Partial<SettingsFormValues> = {
          apiKey: variables.API_KEY || '',
          port: variables.PORT || '1337',
          deepseekApiKey: variables.DEEPSEEK_API_KEY || '',
          anthropicApiKey: variables.ANTHROPIC_API_KEY || '',
          deepseekApiUrl: variables.DEEPSEEK_OPENAI_TYPE_API_URL || '',
          anthropicApiUrl: variables.ANTHROPIC_API_URL || '',
          claudeOpenaiTypeApiUrl: variables.CLAUDE_OPENAI_TYPE_API_URL || '',
          claudeDefaultModel: variables.CLAUDE_DEFAULT_MODEL || '',
          deepseekDefaultModel: variables.DEEPSEEK_DEFAULT_MODEL || '',
          mode: variables.MODE || 'normal',
        };
        
        console.log('准备设置表单值:', newFormValues);
        
        // 使用reset方法一次性更新所有表单值
        form.reset(newFormValues);
        
        // 更新独立的键值对状态
        // 这里可以根据需要进行扩展
        
        centerToast({
          title: "环境变量已加载",
          description: "已将环境变量填充到表单中",
          duration: 3000,
        });
        
        // 通知父组件API密钥已更改
        if (newFormValues.deepseekApiKey || newFormValues.anthropicApiKey) {
          onSettingsChange({
            deepseekApiToken: newFormValues.deepseekApiKey || '',
            anthropicApiToken: newFormValues.anthropicApiKey || ''
          });
        }
      } else {
        centerToast({
          title: "警告",
          description: "获取到的环境变量格式不正确",
          variant: "destructive",
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('加载环境变量失败:', error);
      centerToast({
        title: "错误",
        description: "加载环境变量失败，请重试",
        variant: "destructive"
      });
    }
  };

  // 移除错误处理器 - 在加载配置按钮上
  useEffect(() => {
    // 捕获并抑制可能的React错误
    const originalConsoleError = console.error;
    console.error = (...args) => {
      const message = args[0] || '';
      if (typeof message === 'string' && message.includes('changing an uncontrolled input')) {
        // 忽略控制组件相关的错误
        return;
      }
      originalConsoleError.apply(console, args);
    };
    
    return () => {
      console.error = originalConsoleError;
    };
  }, []);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <div className="absolute top-4 right-4 z-[100]">
          <Button 
            variant="outline" 
            className="cursor-pointer bg-muted/30"
          >
            <Settings2 className="h-4 w-4" />
            设置
          </Button>
          {!form.getValues("deepseekApiKey") || !form.getValues("anthropicApiKey") ? (
            <div className="absolute top-[48px] right-0 bg-muted text-muted-foreground px-4 py-2 rounded-lg text-sm border border-border before:content-[''] before:absolute before:top-[-6px] before:right-6 before:w-3 before:h-3 before:bg-muted before:border-l before:border-t before:border-border before:rotate-45">
              配置API密钥以开始
            </div>
          ) : null}
        </div>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto z-[150]">
        <SheetHeader className="mb-6">
          <div className="h-8" /> {/* Spacer for close button */}
          <div className="flex flex-row items-center justify-between mt-2">
            <SheetTitle>设置</SheetTitle>
            <div className="flex gap-2 items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="bg-muted/30 text-blue-500 hover:text-blue-500/80"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                重置
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const data = form.getValues()
                  localStorage.setItem('deepclaude-settings', JSON.stringify(data))
                  onSettingsChange({
                    deepseekApiToken: data.deepseekApiKey,
                    anthropicApiToken: data.anthropicApiKey
                  })
                  centerToast({
                    variant: "success",
                    description: "Settings saved to local storage",
                    duration: 2000,
                  })
                }}
                className="bg-muted/30 text-green-500 hover:text-green-500/80"
              >
                <Save className="h-4 w-4 mr-2" />
                保存
              </Button>
            </div>
          </div>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(saveSettings)} className="space-y-6 pt-6">

            <div className="space-y-6">
              <h3 className="text-lg font-medium">环境变量</h3>
              <div className="mb-4 flex justify-start space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={loadEnvVariables}
                  className="bg-muted/30 text-blue-500 hover:text-blue-500/80"
                >
                  <Download className="h-4 w-4 mr-2" />
                  获取
                </Button>
                <Button
                  type="submit"
                  className="bg-green-500 text-white hover:bg-green-600"
                >
                  <Save className="h-4 w-4 mr-2" />
                  保存环境变量
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    form.reset()
                    localStorage.removeItem('deepclaude-settings')
                    centerToast({
                      title: "设置已重置",
                      description: "所有设置已恢复默认值",
                    })
                  }}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  重置
                </Button>
              </div>
              <FormField
                control={form.control}
                name="apiKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>API密钥</FormLabel>
                    <FormControl>
                      <Input placeholder="输入API密钥" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="port"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>端口</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="1337" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>模式</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <select
                          className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                          value={field.value || "normal"}
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(value);
                            console.log("模式已更改为:", value);
                          }}
                        >
                          <option value="normal">普通模式 (仅思考内容)</option>
                          <option value="full">完整模式 (仅结果内容)</option>
                        </select>
                      </div>
                    </FormControl>
                    <div className="text-xs text-muted-foreground mt-1">
                      普通模式: 仅将DeepSeek的思考内容传递给Claude<br/>
                      完整模式: 将DeepSeek不包括思考内容的最终结果传给Claude
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="deepseekApiKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>DeepSeek API密钥</FormLabel>
                  <FormControl>
                    <Input placeholder="输入DeepSeek API密钥" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="anthropicApiKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Anthropic API密钥</FormLabel>
                  <FormControl>
                    <Input placeholder="输入Anthropic API密钥" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="deepseekApiUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>DeepSeek API URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://ark.cn-beijing.volces.com/api/v3/chat/completions" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="anthropicApiUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Anthropic API URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://api.gptsapi.net/v1/messages" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="claudeOpenaiTypeApiUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Claude OpenAI格式 API URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://api.gptsapi.net/v1/messages" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="claudeDefaultModel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Claude默认模型</FormLabel>
                  <FormControl>
                    <Input placeholder="wild-3-7-sonnet-20250219" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="deepseekDefaultModel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>DeepSeek默认模型</FormLabel>
                  <FormControl>
                    <Input placeholder="deepseek-r1-250120" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-sm font-medium">DeepSeek 配置</h4>
                <KeyValuePairFields 
                  name="deepseekHeaders" 
                  label="Headers" 
                  initialValue={deepseekHeaders}
                  onChange={setDeepseekHeaders}
                />
                <KeyValuePairFields 
                  name="deepseekBody" 
                  label="Body" 
                  initialValue={deepseekBody}
                  onChange={setDeepseekBody}
                />
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Anthropic 配置</h4>
                <KeyValuePairFields 
                  name="anthropicHeaders" 
                  label="Headers" 
                  initialValue={anthropicHeaders}
                  onChange={setAnthropicHeaders}
                />
                <KeyValuePairFields 
                  name="anthropicBody" 
                  label="Body" 
                  initialValue={anthropicBody}
                  onChange={setAnthropicBody}
                />
              </div>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
