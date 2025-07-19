import { Command, Flags } from '@oclif/core';
import inquirer from 'inquirer';
import Docker from 'dockerode';
import dedent from 'dedent';

export default class Troubleshoot extends Command {
  static description = dedent`
    Troubleshoot Docker issues in your migrated app. 
    This command checks containers, logs, ports, and common problems, then suggests fixes. 
    Run it after deployment to diagnose why something might be broken.
  `;

  static examples = [
    `$ harborcli troubleshoot
  Lists containers and checks for issues interactively.
  `,
    `$ harborcli troubleshoot --container myapp
  Focuses on a specific container.
  `,
  ];

  static flags = {
    container: Flags.string({
      char: 'c',
      description: 'Specific container name to troubleshoot',
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(Troubleshoot);

    this.log(dedent`
      🛠️ Starting troubleshooting session.
      Why? Docker issues like port conflicts or crashes are common— this guides you through checks and fixes.
      Tip: Ensure Docker is running before proceeding.
    `);

    const docker = new Docker();

    // Step 1: List and Select Container
    const containers = await docker.listContainers({ all: true });
    if (containers.length === 0) {
      this.log('⚠️ No containers found. Start your app with \`docker-compose up\`.');
      return;
    }

    let targetContainerId = flags.container;
    if (!targetContainerId) {
      const choices = containers.map((c) => ({
        name: `${c.Names[0]} (${c.Status})`,
        value: c.Id,
      }));
      const answers = await inquirer.prompt([
        {
          type: 'list',
          name: 'containerId',
          message: 'Select a container to troubleshoot:',
          choices,
        },
      ]);
      targetContainerId = answers.containerId;
    }

    if (!targetContainerId) {
      this.log('No container selected. Exiting.');
      return;
    }
    const container = docker.getContainer(targetContainerId);

    // Step 2: Basic Stats and Checks
    const inspect = await container.inspect();
    this.log(dedent`
      📊 Container Stats:
      - Name: ${inspect.Name}
      - Status: ${inspect.State.Status}
      - Ports: ${JSON.stringify(inspect.NetworkSettings.Ports)}
      - Image: ${inspect.Config.Image}
    `);

    if (inspect.State.Status !== 'running') {
      this.log(dedent`
        ⚠️ Issue Detected: Container is not running (${inspect.State.Status}).
        Why? Could be a crash or misconfiguration.
        Suggested Fix: Check logs with \`docker logs ${targetContainerId.slice(0, 12)}\` or restart with \`docker restart ${targetContainerId.slice(0, 12)}\`.
      `);
    }

    // Step 3: Log Check
    const confirmLogs = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'checkLogs',
        message: 'View recent logs?',
        default: true,
      },
    ]);

    if (confirmLogs.checkLogs) {
      const logs = await container.logs({
        stdout: true,
        stderr: true,
        tail: 20,  // Last 20 lines
      });
      this.log(dedent`
        📜 Recent Logs:
        ${logs.toString()}
        Tip: Look for errors like "port in use" or "DB connection failed".
      `);
    }

    // Step 4: Common Issue Checks (e.g., Port Conflict)
    this.log('Running common checks...');
    if (inspect.NetworkSettings.Ports && Object.keys(inspect.NetworkSettings.Ports).length > 0) {
      this.log('✅ Ports seem configured.');
    } else {
      this.log(dedent`
        ⚠️ Issue: No ports exposed.
        Suggested Fix: Add EXPOSE in Dockerfile or ports in docker-compose.yml.
      `);
    }


    this.log(dedent`
      🎉 Troubleshooting complete!
      If issues persist, try \`docker stats\` for resource usage or search errors online.
      For app-specific help (e.g., Prisma errors), check your app docs.
    `);
  }
}