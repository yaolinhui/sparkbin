import type { Project, GitHubConfig } from '../types';

const API_BASE = 'https://api.github.com';

export class GitHubService {
  private config: GitHubConfig;

  constructor(config: GitHubConfig) {
    this.config = config;
  }

  private getHeaders(): HeadersInit {
    return {
      'Authorization': `Bearer ${this.config.token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    };
  }

  async getData(): Promise<{ projects: Project[] } | null> {
    try {
      const response = await fetch(
        `${API_BASE}/repos/${this.config.owner}/${this.config.repo}/contents/${this.config.filePath}`,
        { headers: this.getHeaders() }
      );

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const data = await response.json();
      const content = atob(data.content);
      return JSON.parse(content);
    } catch (error) {
      console.error('Failed to fetch data from GitHub:', error);
      throw error;
    }
  }

  async saveData(data: { projects: Project[] }, sha?: string): Promise<void> {
    try {
      const content = btoa(JSON.stringify(data, null, 2));

      const body: Record<string, string> = {
        message: `Update projects data - ${new Date().toISOString()}`,
        content,
      };

      if (sha) {
        body.sha = sha;
      }

      const response = await fetch(
        `${API_BASE}/repos/${this.config.owner}/${this.config.repo}/contents/${this.config.filePath}`,
        {
          method: 'PUT',
          headers: this.getHeaders(),
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to save data to GitHub:', error);
      throw error;
    }
  }

  async getFileSha(): Promise<string | undefined> {
    try {
      const response = await fetch(
        `${API_BASE}/repos/${this.config.owner}/${this.config.repo}/contents/${this.config.filePath}`,
        { headers: this.getHeaders() }
      );

      if (response.status === 404) {
        return undefined;
      }

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const data = await response.json();
      return data.sha;
    } catch {
      return undefined;
    }
  }
}

export const githubService = new GitHubService({
  token: '',
  owner: '',
  repo: '',
  filePath: 'data/projects.json',
});

export function initGitHubService(config: GitHubConfig): GitHubService {
  return new GitHubService(config);
}
