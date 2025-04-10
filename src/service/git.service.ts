import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Octokit } from 'octokit';

@Injectable()
export class GitService {
  constructor(private readonly configService: ConfigService) {}
  // serch repo by name use octokit
  public async searchRepo(params): Promise<any> {
    const { name, page } = params;
    // TODO: use octokit to search repo by userName
    const octokit = new Octokit({
      auth: this.configService.get('github.GITHUB_TOKEN'),
    });
    const per_page = 100;
    const { data } = await octokit.request('GET /search/repositories', {
      q: name,
      order: 'desc',
      per_page,
      page: page || 1,
    });
    return {
      ...data,
      items: data.items.map((d) => {
        return {
          name: d.name,
          description: d.description,
          url: d.html_url,
          stars: d.stargazers_count,
        };
      }),
    };
  }
}
