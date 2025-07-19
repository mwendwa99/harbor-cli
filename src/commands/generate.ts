import { Command, Flags } from '@oclif/core';
import * as fs from 'fs/promises';
import * as fssync from 'fs'; 
import * as path from 'path';
import inquirer from 'inquirer';
import dedent from 'dedent';  

export default class Generate extends Command {
  static description = dedent`
    Generate or enhance Dockerfile and Docker Compose files for your app. 
    This command first checks if files exist in your project. If not, it auto-detects your tech stack (e.g., from package.json or requirements.txt) and creates customized templates.
  `;

  static examples = [
    `$ harborcli generate
Auto-detects stack and generates files if none exist.
`,
    `$ harborcli generate --stack node-prisma --force
Forces generation even if files exist.
`,
  ];

  static flags = {
    stack: Flags.string({
      char: 's',
      description: 'Force a tech stack (e.g., node-prisma, python, react). Overrides auto-detection.',
      options: ['node-prisma', 'python', 'react'],
    }),
    output: Flags.string({
      char: 'o',
      description: 'Output directory',
      default: '.',
    }),
    force: Flags.boolean({
      char: 'f',
      description: 'Force overwrite if files exist',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(Generate);

    this.log(dedent`
      🚀 Starting generation in directory: ${flags.output}.
      Why? Docker files are essential for containerizing your app— this command makes it easy by checking your project and customizing based on what it finds.
    `);

    // Step 1: Auto-detect stack if not specified
    let detectedStack = flags.stack;
    if (!detectedStack) {
      detectedStack = this.detectStack(flags.output);
      this.log(`🔍 Auto-detected stack: ${detectedStack || 'unknown'}.`);
      if (!detectedStack) {
        const answers = await inquirer.prompt([
          {
            type: 'list',
            name: 'stack',
            message: 'Could not auto-detect stack. Choose one:',
            choices: ['node-prisma', 'python', 'react', 'other'],
          },
        ]);
        detectedStack = answers.stack;
      }
    }

    // Step 2: Check for existing files
    const dockerfilePath = path.join(flags.output, 'Dockerfile');
    const composePath = path.join(flags.output, 'docker-compose.yml');
    const dockerfileExists = fssync.existsSync(dockerfilePath);
    const composeExists = fssync.existsSync(composePath);

    if ((dockerfileExists || composeExists) && !flags.force) {
      this.log(dedent`
        ⚠️ Existing files found: ${dockerfileExists ? 'Dockerfile' : ''} ${composeExists ? 'docker-compose.yml' : ''}.
        Why check? To avoid overwriting your custom work!
      `);
      const confirm = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'overwrite',
          message: 'Overwrite existing files?',
          default: false,
        },
      ]);
      if (!confirm.overwrite) {
        this.log('Generation skipped. Use --force to override.');
        return;
      }
    }

    // Step 3: Interactive prompts for customization
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'port',
        message: 'What port does your app run on? (e.g., 3000)',
        default: '3000',
      },
      {
        type: 'input',
        name: 'entrypoint',
        message: 'What is your app entrypoint? (e.g., dist/server.js for Node, app.py for Python)',
        default: detectedStack === 'python' ? 'app.py' : 'dist/server.js',
      },
    ]);

    // Step 4: Generate content based on detected/specified stack
    let dockerfileContent = this.generateDockerfileContent(
      detectedStack,
      answers
    );
    await fs.writeFile(dockerfilePath, dockerfileContent);
    this.log(`✅ Dockerfile generated/updated at: ${dockerfilePath}`);

    let composeContent = this.generateComposeContent(detectedStack, answers);
    await fs.writeFile(composePath, composeContent);
    this.log(`✅ docker-compose.yml generated/updated at: ${composePath}`);

    this.log(dedent`
      🎉 Files ready! Review them for your project.
      Next steps: Run \`docker build -t your-app .\` to test the image.
      Tip: If detection was wrong, use --stack to specify.
    `);
  }

  // Helper: Auto-detect stack by checking project files
  private detectStack(outputDir: string): string | undefined {
    if (fssync.existsSync(path.join(outputDir, 'package.json'))) {
      return 'node-prisma';  // Assume Node; could check for prisma in deps later
    }
    if (fssync.existsSync(path.join(outputDir, 'requirements.txt'))) {
      return 'python';
    }
    if (fssync.existsSync(path.join(outputDir, 'package.json')) && fssync.existsSync(path.join(outputDir, 'src/index.js'))) {  // Rough React check
      return 'react';
    }
    return undefined;
  }

  // Helper: Generate Dockerfile content based on stack
  private generateDockerfileContent(
    stack: string | null | undefined,
    answers: { port: string; entrypoint: string }
  ): string {
    if (stack === 'node-prisma') {
      return dedent`
        FROM node:20 AS builder
        WORKDIR /app
        COPY package*.json ./
        RUN npm ci
        COPY . .
        RUN npx prisma generate
        RUN npm run build

        FROM node:20-slim
        WORKDIR /app
        COPY --from=builder /app/dist ./dist
        COPY --from=builder /app/node_modules ./node_modules
        COPY --from=builder /app/prisma ./prisma
        ENV NODE_ENV=production
        EXPOSE ${answers.port}
        CMD ["node", "${answers.entrypoint}"]
      `;
    } else if (stack === 'python') {
      return dedent`
        FROM python:3.10-slim
        WORKDIR /app
        COPY requirements.txt ./
        RUN pip install -r requirements.txt
        COPY . .
        EXPOSE ${answers.port}
        CMD ["python", "${answers.entrypoint}"]
      `;
    } else if (stack === 'react') {
      return dedent`
        FROM node:20 AS builder
        WORKDIR /app
        COPY package*.json ./
        RUN npm ci
        COPY . .
        RUN npm run build

        FROM nginx:alpine
        COPY --from=builder /app/build /usr/share/nginx/html
        EXPOSE ${answers.port}
        CMD ["nginx", "-g", "daemon off;"]
      `;
    } else {
      return dedent`
        # Default/generic Dockerfile - customize me!
        FROM alpine
        WORKDIR /app
        COPY . .
        EXPOSE ${answers.port}
        CMD ["echo", "Hello from generic app"]
      `;
    }
  }

  // Helper: Generate docker-compose.yml content
  private generateComposeContent(
    stack: string | null | undefined,
    answers: { port: string; entrypoint: string }
  ): string {
    return dedent`
      version: '3.8'
      services:
        app:
          build: .
          ports:
            - "${answers.port}:${answers.port}"
          environment:
            - NODE_ENV=production  # Adjust for your stack (e.g., PYTHON_ENV for Python)
    `;
  }
}