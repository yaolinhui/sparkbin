import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import type { ReactNode } from 'react';

interface SafeMarkdownProps {
  content: string;
  className?: string;
}

/**
 * 安全的 Markdown 渲染组件
 *
 * 使用 rehype-sanitize 过滤危险 HTML，防止 XSS 攻击
 * 支持标准 Markdown 语法，但禁用原始 HTML 和危险属性
 */
export function SafeMarkdown({ content, className }: SafeMarkdownProps): ReactNode {
  return (
    <div className={className}>
      <ReactMarkdown
      rehypePlugins={[rehypeSanitize]}
      skipHtml={true}  // 完全跳过 HTML 标签
      components={{
        // 自定义链接组件，防止钓鱼攻击
        a: ({ node, ...props }) => {
          void node;
          return (
            <a
              {...props}
              target="_blank"
              rel="noopener noreferrer nofollow"
              onClick={() => {
                // 外部链接处理（已移除调试日志）
              }}
            />
          );
        },
        // 禁用危险元素
        script: () => null,
        iframe: () => null,
        object: () => null,
        embed: () => null,
        form: () => null,
        input: () => null,
        textarea: () => null,
      }}
    >
      {content}
      </ReactMarkdown>
    </div>
  );
}

export default SafeMarkdown;
