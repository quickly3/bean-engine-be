import { Command, CommandRunner, Option } from 'nest-commander';
import { AuthService } from 'src/service/auth/auth.service';

@Command({
  name: 'user',
  description:
    '账号管理命令入口。使用 `npm run cli -- user -c <command>` 执行具体子命令。',
})
export class UserCommand extends CommandRunner {
  constructor(private readonly authService: AuthService) {
    super();
  }

  async run(_passedParam: string[], options?: any): Promise<void> {
    void _passedParam;

    switch (options?.command) {
      // npm run cli -- user -- -c create -u admin -p 123456 -n 管理员
      case 'create':
        await this.createUser(options);
        break;
      // npm run cli -- user -- -c list
      case 'list':
        await this.listUsers();
        break;
      // npm run cli -- user -- -c passwd -u admin -p 654321
      case 'passwd':
        await this.resetPassword(options);
        break;
      default:
        this.printRuntimeGuide();
        break;
    }
  }

  @Option({
    flags: '-c, --command [command]',
    description: '要执行的子命令：create | list | passwd',
  })
  getSubCommand(val: string): string {
    return val;
  }

  @Option({
    flags: '-u, --username [username]',
    description: '用户名',
  })
  getUsername(val: string): string {
    return val;
  }

  @Option({
    flags: '-p, --password [password]',
    description: '密码（明文传入，服务端 scrypt 哈希后存储）',
  })
  getPassword(val: string): string {
    return val;
  }

  @Option({
    flags: '-n, --nickname [nickname]',
    description: '昵称（可选）',
  })
  getNickname(val: string): string {
    return val;
  }

  private printRuntimeGuide() {
    console.log('UserCommand 运行说明:');
    console.log('  npm run cli -- user -c <command>');
    console.log('');
    console.log('可用子命令:');
    console.log(
      '  create               创建账号，需 -u <用户名> -p <密码>，可选 -n <昵称>',
    );
    console.log('  list                 查看所有账号');
    console.log('  passwd               重置密码，需 -u <用户名> -p <新密码>');
    console.log('');
    console.log('示例:');
    console.log('  npm run cli -- user -c create -u admin -p 123456 -n 管理员');
    console.log('  npm run cli -- user -c list');
    console.log('  npm run cli -- user -c passwd -u admin -p 654321');
  }

  private async createUser(options: any) {
    if (!options?.username || !options?.password) {
      console.log('请通过 -u <用户名> -p <密码> 指定账号信息');
      return;
    }
    try {
      const user = await this.authService.createUser(
        options.username,
        options.password,
        options.nickname,
      );
      console.log('账号创建成功:', user);
    } catch (err: any) {
      console.error('账号创建失败:', err?.message || err);
    }
  }

  private async listUsers() {
    const users = await this.authService.listUsers();
    if (!users.length) {
      console.log('暂无账号，可通过 create 子命令创建');
      return;
    }
    console.table(users);
  }

  private async resetPassword(options: any) {
    if (!options?.username || !options?.password) {
      console.log('请通过 -u <用户名> -p <新密码> 指定账号信息');
      return;
    }
    try {
      const user = await this.authService.resetPassword(
        options.username,
        options.password,
      );
      console.log('密码重置成功:', user);
    } catch (err: any) {
      console.error('密码重置失败:', err?.message || err);
    }
  }
}
