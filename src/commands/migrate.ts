import { Command, Flags } from '@oclif/core';
import inquirer from 'inquirer';
import { execSync } from 'child_process';
import Docker from 'dockerode';
import * as fssync from 'fs';
import * as path from 'path';
import dedent from 'dedent';

export default class Migrate extends Command {
  static description = dedent`
    Migrate your bare-metal app to Docker. This command automates building/pushing images, data syncing, and setting up a staging deployment for safe testing before switching live traffic.
    It checks for existing Docker files and adapts to your project's stack.
  `;

  static examples = [
    `$ harborcli migrate --image myapp:latest
  Builds, pushes, and deploys locally (assumes Docker files exist).
  `,
    `$ harborcli migrate --image myapp:latest --vps user@your-vps-ip --dbType postgres
  Includes DB sync and remote VPS deployment.
  `,
  ];

  static flags = {
    image: Flags.string({
      char: 'i',
      description: 'Docker image name (e.g., username/app:latest)',
      required: true,
    }),
    vps: Flags.string({
      char: 'v',
      description: 'VPS SSH address (e.g., user@ip) for remote deployment',
    }),
    dbType: Flags.string({
      description: 'Database type for syncing (e.g., postgres, mysql)',
      options: ['postgres', 'mysql', 'none'],
      default: 'none',
    }),
    force: Flags.boolean({
      description: 'Force actions without prompts',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(Migrate);

    this.log(dedent`
      ⚓ Starting migration for image: ${flags.image}.
      Why? This ensures a smooth, zero-downtime switch to Docker by testing in parallel.
      Tip: Run \`harborcli generate\` first if you don't have Docker files.
    `);

    // Check for required Docker files
    if (!this.checkDockerFiles()) {
      this.log('⚠️ Missing Docker files. Run \`harborcli generate\` first.');
      return;
    }

    // Step 1: Build and Push Image
    const buildConfirm = flags.force
      ? { build: true }
      : await inquirer.prompt([
          {
            type: 'confirm',
            name: 'build',
            message: 'Build and push the Docker image?',
            default: true,
          },
        ]);

    if (buildConfirm.build) {
      this.log(dedent`
        Building multi-platform image with Buildx...
        Why? Multi-platform support works on any VPS architecture (e.g., amd64/arm64).
      `);
      execSync(
        `docker buildx build --platform linux/amd64,linux/arm64 -t ${flags.image} --push .`,
        { stdio: 'inherit' }
      );
      this.log('✅ Image built and pushed successfully!');
    }

    // Step 2: Data Sync
    if (flags.dbType !== 'none') {
      this.log(dedent`
        Syncing data for ${flags.dbType} database.
        Why? To safely migrate your data without loss—always backup first!
      `);
      const dbDetails = await inquirer.prompt([
        {
          type: 'input',
          name: 'dbName',
          message: 'Database name?',
          default: 'yourdb',
        },
      ]);

      if (flags.dbType === 'postgres') {
        execSync(`pg_dump ${dbDetails.dbName} > db_dump.sql`, {
          stdio: 'inherit',
        });
      } else if (flags.dbType === 'mysql') {
        execSync(`mysqldump ${dbDetails.dbName} > db_dump.sql`, {
          stdio: 'inherit',
        });
      }
      this.log(dedent`
        ✅ Data dumped to db_dump.sql.
        Tip: Import to your Docker DB (e.g., \`psql -f db_dump.sql\` for Postgres).
      `);
    } else {
      this.log('Skipping data sync. Use --dbType to enable.');
    }

    // Step 3: Staging Deployment
    const docker = new Docker();
    this.log('Checking local Docker daemon...');
    await docker.version();  // Verifies Docker is running

    if (flags.vps) {
      this.log(dedent`
        Deploying to VPS at ${flags.vps}.
        TODO: Full SSH integration coming in next steps (using ssh2 for remote commands).
        For now, manually SSH and run \`docker pull ${flags.image}\` then \`docker-compose up -d\`.
      `);
      // Placeholder - we'll add ssh2 in Step 5
    } else {
      this.log(dedent`
        Deploying staging locally.
        Why? Test here before VPS—ensures everything works without risking live users.
      `);
      execSync('docker-compose up -d', { stdio: 'inherit' });
      this.log('✅ Staging deployment running! Test your app on the exposed port.');
    }

    this.log(dedent`
      🎉 Migration steps complete!
      Next: Verify staging, then switch traffic (e.g., update Nginx). Use \`harborcli troubleshoot\` for issues.
    `);
  }

  // Helper: Check for Docker files
  private checkDockerFiles(): boolean {
    const dockerfileExists = fssync.existsSync(path.join('.', 'Dockerfile'));
    const composeExists = fssync.existsSync(
      path.join('.', 'docker-compose.yml')
    );
    return dockerfileExists && composeExists;
  }
}