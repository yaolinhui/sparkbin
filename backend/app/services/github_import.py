import base64
import httpx
from typing import Optional, List, Dict, Any
from datetime import datetime

from ..config import get_settings
from ..encryption import get_encryption_manager
from .ai_proxy import AIProxyService


class GitHubImportService:
    """GitHub 仓库导入服务：抓取仓库内容 + AI 解析"""

    API_BASE = "https://api.github.com"

    def __init__(self, access_token: str):
        self.access_token = access_token
        self.headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }

    async def list_repos(self, per_page: int = 30, page: int = 1) -> List[Dict[str, Any]]:
        """获取用户仓库列表"""
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{self.API_BASE}/user/repos",
                headers=self.headers,
                params={
                    "sort": "updated",
                    "direction": "desc",
                    "per_page": per_page,
                    "page": page,
                },
                timeout=30.0,
            )
            if resp.status_code == 401:
                raise ValueError("GitHub token invalid or expired")
            if resp.status_code == 403:
                raise ValueError("GitHub API rate limit exceeded")
            if resp.status_code != 200:
                raise ValueError(f"GitHub API error: {resp.status_code}")

            repos = resp.json()
            return [
                {
                    "id": r["id"],
                    "name": r["name"],
                    "full_name": r["full_name"],
                    "description": r.get("description") or "",
                    "language": r.get("language") or "",
                    "stars": r.get("stargazers_count", 0),
                    "forks": r.get("forks_count", 0),
                    "updated_at": r.get("updated_at", ""),
                }
                for r in repos
            ]

    async def fetch_repo_data(self, owner: str, repo: str) -> Dict[str, Any]:
        """抓取仓库完整数据"""
        async with httpx.AsyncClient() as client:
            # 1. 仓库基本信息
            repo_resp = await client.get(
                f"{self.API_BASE}/repos/{owner}/{repo}",
                headers=self.headers,
                timeout=30.0,
            )
            if repo_resp.status_code != 200:
                raise ValueError(f"Failed to fetch repo: {repo_resp.status_code}")
            repo_info = repo_resp.json()

            # 2. README 内容
            readme_content = ""
            readme_resp = await client.get(
                f"{self.API_BASE}/repos/{owner}/{repo}/readme",
                headers=self.headers,
                timeout=30.0,
            )
            if readme_resp.status_code == 200:
                readme_data = readme_resp.json()
                if readme_data.get("content"):
                    readme_content = base64.b64decode(readme_data["content"]).decode("utf-8", errors="ignore")

            # 3. Open issues 数量
            open_issues_count = repo_info.get("open_issues_count", 0)

            # 4. 最新 release
            latest_release = None
            release_resp = await client.get(
                f"{self.API_BASE}/repos/{owner}/{repo}/releases/latest",
                headers=self.headers,
                timeout=30.0,
            )
            if release_resp.status_code == 200:
                rel = release_resp.json()
                latest_release = {
                    "tag_name": rel.get("tag_name"),
                    "name": rel.get("name"),
                    "published_at": rel.get("published_at"),
                }

            return {
                "name": repo_info.get("name", ""),
                "full_name": repo_info.get("full_name", ""),
                "description": repo_info.get("description") or "",
                "topics": repo_info.get("topics", []),
                "language": repo_info.get("language") or "",
                "stars": repo_info.get("stargazers_count", 0),
                "forks": repo_info.get("forks_count", 0),
                "open_issues": open_issues_count,
                "created_at": repo_info.get("created_at", ""),
                "pushed_at": repo_info.get("pushed_at", ""),
                "latest_release": latest_release,
                "readme": readme_content,
                "readme_length": len(readme_content),
            }

    @staticmethod
    def _build_ai_prompt(repo_data: Dict[str, Any]) -> str:
        """构建 AI 解析 Prompt"""
        readme = repo_data["readme"]
        # 截断 README 到 4000 字符（控制 token 消耗）
        readme_excerpt = readme[:4000] if len(readme) > 4000 else readme

        latest_release = repo_data.get("latest_release")
        release_info = f"Latest Release: {latest_release['tag_name']} ({latest_release['name']})" if latest_release else "No releases yet"

        return f"""Analyze the following GitHub repository and determine which stage of the Vibe/Indie Hacker workflow it is currently in.

Repository: {repo_data['name']}
Description: {repo_data['description']}
Topics: {', '.join(repo_data['topics'])}
Primary Language: {repo_data['language']}
Stars: {repo_data['stars']}, Forks: {repo_data['forks']}
Open Issues: {repo_data['open_issues']}
Created: {repo_data['created_at']}
Last Pushed: {repo_data['pushed_at']}
{release_info}

README excerpt:
{readme_excerpt}

Based on the repository information, provide the following analysis in Chinese:

【项目标题】从仓库名或 README 中提取一个简洁的项目标题（不超过 30 字）
【核心痛点】这个项目解决的核心痛点是什么？（100 字以内）
【原始想法】项目最初的想法/灵感来源（100 字以内）
【阶段判断】从以下六个阶段中选择一个最匹配的：IDEA / VALIDATE / PROTOTYPE / SHIP / GROW / MONETIZE
【置信度】1-10 的整数，表示你对阶段判断的信心

Rules for stage determination:
- IDEA: Only has README/docs, no substantial code, no releases
- VALIDATE: Has README with clear problem/solution, some discussion/issues, but MVP not built yet
- PROTOTYPE: Has working code, commits are active, but no official release yet
- SHIP: Has at least one release/tag, publicly available
- GROW: Has significant user traction (stars > 50 or active community), iterating based on feedback
- MONETIZE: Has clear monetization strategy, sponsors, or commercial license

Respond ONLY in the following format:
标题：xxx
痛点：xxx
想法：xxx
阶段：xxx
置信度：x
"""

    async def analyze_repo(self, repo_data: Dict[str, Any], db=None) -> Dict[str, Any]:
        """调用 AI 解析仓库内容"""
        prompt = self._build_ai_prompt(repo_data)

        # 使用默认 AI 提供商进行解析
        from ..database import SessionLocal
        from ..models import AIProvider
        _db = db or SessionLocal()
        try:
            ai_service = AIProxyService(_db)
            active_config = ai_service.get_active_config(AIProvider.DEEPSEEK)
        finally:
            if db is None:
                _db.close()
        if not active_config:
            raise ValueError("No active AI provider configured")

        # 非流式调用，获取完整响应
        messages = [{"role": "user", "content": prompt}]
        response_text = ""
        _db2 = db or SessionLocal()
        try:
            ai_service = AIProxyService(_db2)
            async for chunk in ai_service.chat_completion(messages, provider=active_config.provider):
                response_text += chunk
        finally:
            if db is None:
                _db2.close()

        # 解析 AI 响应
        result = self._parse_ai_response(response_text)
        result["readme_excerpt"] = repo_data["readme"][:500] if len(repo_data["readme"]) > 500 else repo_data["readme"]
        result["metadata"] = {
            "language": repo_data["language"],
            "stars": repo_data["stars"],
            "forks": repo_data["forks"],
            "open_issues": repo_data["open_issues"],
        }
        return result

    @staticmethod
    def _parse_ai_response(text: str) -> Dict[str, Any]:
        """解析 AI 响应文本"""
        lines = text.strip().split("\n")
        result = {
            "title": "",
            "pain_point": "",
            "original_idea": "",
            "suggested_stage": "idea",
            "confidence": 5,
        }

        for line in lines:
            line = line.strip()
            if line.startswith("标题：") or line.startswith("标题:"):
                result["title"] = line.split("：", 1)[-1].split(":", 1)[-1].strip()
            elif line.startswith("痛点：") or line.startswith("痛点:"):
                result["pain_point"] = line.split("：", 1)[-1].split(":", 1)[-1].strip()
            elif line.startswith("想法：") or line.startswith("想法:"):
                result["original_idea"] = line.split("：", 1)[-1].split(":", 1)[-1].strip()
            elif line.startswith("阶段：") or line.startswith("阶段:"):
                stage = line.split("：", 1)[-1].split(":", 1)[-1].strip().lower()
                valid_stages = ["idea", "validate", "prototype", "ship", "grow", "monetize"]
                if stage in valid_stages:
                    result["suggested_stage"] = stage
            elif line.startswith("置信度：") or line.startswith("置信度:"):
                try:
                    conf = int(line.split("：", 1)[-1].split(":", 1)[-1].strip())
                    result["confidence"] = max(1, min(10, conf))
                except ValueError:
                    pass

        # Fallback：如果标题为空，用仓库名
        if not result["title"]:
            result["title"] = "Imported Project"

        return result


def get_github_import_service(access_token: str) -> GitHubImportService:
    return GitHubImportService(access_token)
