"use client"

import * as React from "react"
import { useRef, useEffect } from "react"
import { Textarea } from "./textarea"
import { Button } from "./button"

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  placeholder?: string
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  placeholder
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 自动调整高度
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }, [value])

  // 处理特殊按键
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget
    const { selectionStart, selectionEnd, value } = textarea

    // 按下 Enter 发送消息
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      onSubmit()
      return
    }

    // 按下 Enter + Shift 换行
    if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault()
      const before = value.slice(0, selectionStart)
      const after = value.slice(selectionEnd)
      onChange(before + "\n" + after)
      // 将光标移动到新行
      setTimeout(() => {
        textarea.setSelectionRange(
          selectionStart + 1,
          selectionStart + 1
        )
      }, 0)
      return
    }

    // 处理代码块自动补全
    if (e.key === "`") {
      const beforeCursor = value.slice(0, selectionStart)
      const afterCursor = value.slice(selectionEnd)
      
      // 三个反引号
      if (beforeCursor.endsWith("``")) {
        e.preventDefault()
        const insertion = "```\n\n```"
        onChange(
          value.slice(0, selectionStart - 2) + insertion + afterCursor
        )
        // 将光标放在代码块中间
        setTimeout(() => {
          textarea.setSelectionRange(
            selectionStart + 2,
            selectionStart + 2
          )
        }, 0)
        return
      }
      
      // 单个反引号
      if (!beforeCursor.endsWith("`")) {
        e.preventDefault()
        const insertion = "``"
        onChange(
          value.slice(0, selectionStart) + insertion + afterCursor
        )
        // 将光标放在反引号中间
        setTimeout(() => {
          textarea.setSelectionRange(
            selectionStart + 1,
            selectionStart + 1
          )
        }, 0)
      }
    }
  }

  return (
    <div className="flex gap-2">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="flex-1 min-h-[40px] max-h-[200px] py-2 resize-none overflow-y-auto"
      />
      <Button 
        onClick={onSubmit}
        className="h-[40px] px-4 self-end"
      >
        发送
      </Button>
    </div>
  )
} 