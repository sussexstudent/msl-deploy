import chalk from 'chalk';
import {Command, flags} from '@oclif/command'
import { readAsync, path } from 'fs-jetpack';
import { deploy } from './deploy';

class MslDeploy extends Command {
  static description = 'Automated MSL Site deployment';
  static args = [
    {
      name: 'deploymentPayload',
      required: true,
    }
  ];

  static flags = {
    username: flags.string({char: 'u', description: 'deploy username'}),
    password: flags.string({char: 'p', description: 'deploy password'}),
  }

  async run() {
    const {args, flags} = this.parse(MslDeploy)


    const username = flags.username || process.env.MSL_DEPLOY_USERNAME;
    const password = flags.password || process.env.MSL_DEPLOY_PASSWORD;

    const payload = await readAsync(path(args.deploymentPayload), 'json');

    if (username === undefined || password === undefined) {
      console.log(chalk.red('auth details not set'));
      return;
    }

    deploy({
      username, password
    }, payload);

  }
}

export = MslDeploy
