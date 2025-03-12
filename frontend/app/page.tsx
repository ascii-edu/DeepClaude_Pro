"use client"

import Image from "next/image"
import Link from "next/link"
import { usePostHog } from "../providers/posthog"
import { Button } from "../components/ui/button"
import { Card } from "../components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../components/ui/collapsible"
import { ArrowRight, Zap, Lock, Settings2, Code2, Sparkles, Github, Megaphone, ChevronDown } from "lucide-react"

export default function LandingPage() {
  const posthog = usePostHog()
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <section className="flex-grow-0 relative min-h-screen flex flex-col items-center justify-center px-4">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-pattern-combined" />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/20" />
        
        {/* Announcement Banner */}
        <div className="relative mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary backdrop-blur border border-primary/10 hover:border-primary/20 transition-colors whitespace-nowrap overflow-hidden">
            <div className="absolute inset-0 shimmer" />
            <Megaphone className="h-3.5 w-3.5 relative z-10" />
            <span className="relative z-10">
              升级版本DeepClaude，支持OpenAI格式，可以自由配置OpenAI格式的DeepSeek R1和Claude 3.5 Sonnet的API
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="relative space-y-8 text-center max-w-[600px]">
          <div className="animate-float">
            <Image
              src="/deepclaude.png"
              alt="DeepClaude Logo"
              width={200}
              height={200}
              className="mx-auto"
              priority
            />
          </div>
          
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/80">
            DeepClaude
          </h1>
          
          <p className="max-w-[600px] text-lg sm:text-xl text-muted-foreground">
          通过统一的应用程序编程接口（API）和聊天界面，利用 DeepSeek R1 的推理能力以及 Claude 的创造力和代码生成能力。
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/chat" onClick={() => {
              posthog.capture('cta_click', {
                location: 'hero',
                target: 'chat',
                timestamp: new Date().toISOString()
              })
            }}>
              <Button size="lg" className="group">
                试试DeepClaude对话
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link href="/docs" onClick={() => {
              posthog.capture('cta_click', {
                location: 'hero',
                target: 'docs',
                timestamp: new Date().toISOString()
              })
            }}>
              <Button variant="outline" size="lg" className="group">
                <Code2 className="mr-2 h-4 w-4" />
                API文档
              </Button>
            </Link>
            <a 
              href="https://github.com/yuanhang110/DeepClaude_Pro" 
              target="_blank" 
              rel="noopener noreferrer"
              onClick={() => {
                posthog.capture('cta_click', {
                  location: 'hero',
                  target: 'github',
                  timestamp: new Date().toISOString()
                })
              }}
            >
              <Button variant="outline" size="lg" className="group">
                <Github className="mr-2 h-4 w-4" />
                在Github上查看
              </Button>
            </a>
          </div>
          
          <div className="flex items-center justify-center text-sm text-muted-foreground mt-2">
            <span className="flex items-center mr-1">免费开源的项目</span>
          </div>
        </div>
        
        {/* Scroll Indicator */}
        <button 
          onClick={() => {
            document.getElementById('features')?.scrollIntoView({ 
              behavior: 'smooth',
              block: 'start'
            })
          }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce cursor-pointer"
        >
          <ArrowRight className="h-6 w-6 rotate-90 text-muted-foreground" />
        </button>
      </section>

      <main className="flex-grow">
        {/* Features Grid */}
        <section id="features" className="relative py-20 px-4 bg-gradient-to-b from-background to-background/95">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-pattern-combined opacity-50" />
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12">
              项目特点
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Performance */}
              <Card 
                className="p-6 bg-card/50 backdrop-blur border-muted hover:border-primary/50 transition-colors"
                onClick={() => {
                  posthog.capture('feature_view', {
                    feature: 'zero_latency',
                    timestamp: new Date().toISOString()
                  })
                }}
              >
                <div className="space-y-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">0 延迟</h3>
                  <p className="text-muted-foreground">
                  由用 Rust 语言编写的高性能流式应用程序编程接口（API）提供支持，以单一流的形式实现 R1 的思维链CoT即时回复，随后紧跟 Claude 的回复。
                  </p>
                </div>
              </Card>

              {/* Security */}
              <Card className="p-6 bg-card/50 backdrop-blur border-muted hover:border-primary/50 transition-colors">
                <div className="space-y-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Lock className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">隐私 & 安全</h3>
                  <p className="text-muted-foreground">
                    您的数据在端到端的安全性和本地API密钥管理下保持私密。
                  </p>
                </div>
              </Card>

              {/* Configuration */}
              <Card className="p-6 bg-card/50 backdrop-blur border-muted hover:border-primary/50 transition-colors">
                <div className="space-y-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Settings2 className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">高度可配置</h3>
                  <p className="text-muted-foreground">
                    自定义API和界面以满足您的需求。
                  </p>
                </div>
              </Card>

              {/* Open Source */}
              <Card className="p-6 bg-card/50 backdrop-blur border-muted hover:border-primary/50 transition-colors">
                <div className="space-y-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Code2 className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">开源</h3>
                  <p className="text-muted-foreground">
                    免费且开源的代码库。贡献、修改和部署，随您所愿。
                  </p>
                </div>
              </Card>

              {/* AI Integration */}
              <Card className="p-6 bg-card/50 backdrop-blur border-muted hover:border-primary/50 transition-colors">
                <div className="space-y-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">双AI力量</h3>
                  <p className="text-muted-foreground">
                    结合DeepSeek R1的推理能力和Claude的创造力和代码生成能力。
                  </p>
                </div>
              </Card>

              {/* Managed BYOK API */}
              <Card className="p-6 bg-card/50 backdrop-blur border-muted hover:border-primary/50 transition-colors">
                <div className="space-y-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <svg 
                      className="h-6 w-6 text-primary"
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    >
                      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold">托管BYOK API</h3>
                  <p className="text-muted-foreground">
                    使用您的API密钥和我们的托管基础设施，实现完全控制和灵活性。
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 px-4 relative bg-background">
          <div className="relative">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-pattern-combined opacity-50" />
            <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
          </div>
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <h2 className="text-3xl sm:text-4xl font-bold mb-12">
              常见问题
            </h2>
            
            <div className="grid grid-cols-1 gap-6">
              {/* Why R1 + Claude? */}
              <Card className="p-6 bg-card/50 backdrop-blur border-muted hover:border-primary/50 transition-colors">
              <Collapsible>
                <CollapsibleTrigger 
                  className="w-full"
                  onClick={() => {
                    posthog.capture('faq_interaction', {
                      question: 'why_r1_claude',
                      timestamp: new Date().toISOString()
                    })
                  }}
                >
                  <div className="flex items-center justify-between text-left">
                    <h3 className="text-xl font-semibold">为什么 R1 + Claude?</h3>
                    <ChevronDown className="h-5 w-5 transform transition-transform duration-200" />
                  </div>
                </CollapsibleTrigger>
                  <CollapsibleContent className="pt-4 text-left text-muted-foreground">
                    <p className="mb-4">
                    DeepSeek R1的思维链（CoT）追踪展示了深度推理能力，达到了让大语言模型（LLM）出现“元认知”的程度——自我修正、思考极端情况等等。这是一种自然语言形式的准蒙特卡洛树搜索（MCTS） 。 
                    </p>
                    <p className="mb-4">
                    但R1在代码生成、创造力以及对话技巧方面有所欠缺。在这三个方面都表现出色的模型是来自Anthropic公司的Claude 3.5 Sonnet New。那么，我们把它们两者结合起来怎么样呢？兼取两者之长？于是就有了DeepClaude！ 
                    </p>
                    <p>
                      使用DeepClaude，您可以在单个API调用中获得快速流式R1 CoT + Claude模型，使用您自己的API密钥。
                    </p>
                  </CollapsibleContent>
                </Collapsible>
              </Card>

              {/* Is it free? */}
              <Card className="p-6 bg-card/50 backdrop-blur border-muted hover:border-primary/50 transition-colors">
                <Collapsible>
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between text-left">
                      <h3 className="text-xl font-semibold">托管API是免费的吗？</h3>
                      <ChevronDown className="h-5 w-5 transform transition-transform duration-200" />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-4 text-left text-muted-foreground">
                    <p className="mb-4">
                      是的，100%免费，您可以使用自己的密钥。API将DeepSeek和Anthropic的流式API包装在一起。您还可以获得一些便利功能，例如计算组合使用情况和价格以供您使用。我们不保留任何日志，它是完全开源的——您可以自行托管、修改、重新分发，等等。
                    </p>
                    <p>
                      请随意在规模上使用它，我们已经在Asterisk生产中使用它，每天为数百万个令牌提供服务，它还没有让我们失望。像所有美好的事物一样，不要滥用它。
                    </p>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4 relative bg-background">
          <div className="relative">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-pattern-combined opacity-50" />
            <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
          </div>
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <h2 className="text-2xl sm:text-3xl font-bold mb-6">
              开始阅读一些AI内部独白？
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              无需注册。无需信用卡。无需存储数据。
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/chat" onClick={() => {
                posthog.capture('cta_click', {
                  location: 'footer',
                  target: 'chat',
                  timestamp: new Date().toISOString()
                })
              }}>
                <Button size="lg" className="group">
                  试试DeepClaude对话
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link href="/docs" onClick={() => {
                posthog.capture('cta_click', {
                  location: 'footer',
                  target: 'docs',
                  timestamp: new Date().toISOString()
                })
              }}>
                <Button variant="outline" size="lg" className="group">
                  <Code2 className="mr-2 h-4 w-4" />
                  API文档
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full py-8 px-4 border-t border-border/40 bg-background">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center text-sm text-muted-foreground">
            <span className="flex items-center mr-1">一个“好玩”的项目由</span>
            <a 
              href="https://asterisk.so/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-80 transition-opacity flex items-center"
            >
              <Image
                src="/asterisk.png"
                alt="Asterisk Logo"
                width={150}
                height={50}
                className="inline-block"
                style={{ width: '150px', height: 'auto' }}
                quality={100}
              />
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
