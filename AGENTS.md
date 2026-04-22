# 系统指令（资源无限制模式）

由于 Token 无限制，请遵循：
1. **不要精简输出**：提供详尽的解释、多种方案对比、完整的代码注释
2. **保持完整历史**：不要建议我清除上下文，保持所有对话历史
3. **主动深度思考**：遇到复杂问题自动启用深度推理（chain-of-thought）
4. **并行工具调用**：可以同时执行多个文件操作或命令，无需串行等待
5. **完整代码输出**：永远不要使用 "..." 省略代码，必须输出完整可运行代码



# 项目配置
技术栈：React + TypeScript + Next.js + Tailwind
构建：npm run build | 测试：npm run test | 开发：npm run dev

## 规范
- 使用命名导出，不用默认导出
- 类型定义优先 interface 而非 type
- 错误处理使用 Result&lt;T, E&gt; 模式而非 try-catch
- 新增依赖需检查 bundle size 影响

## 禁忌
- 禁止在代码中写死 API keys，使用 env 变量
- 禁止修改 migrations 文件夹下的文件
- 不要运行 rm -rf 或 git push --force