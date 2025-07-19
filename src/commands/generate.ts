import { Command, Flags } from '@oclif/core';
import * as fs from 'fs/promises';
import * as path from 'path';
import inquirer from 'inquirer';

export default class Generate extends Command {
  static description =
    'Generate Dockerfile and Docker Compose files for your app. This command creates customizable templates based on your tech stack, helping you start containerization quickly.';

  static examples = [
    `$ harborcli generate --stack node-prisma
Generates files for a Node.js/Prisma app.
`,
  ];

  static flags = {
    stack: Flags.string({
      char: 's',
      description: 'Tech stack (e.g., node-prisma, react, python)',
      options: ['node-prisma', 'react', 'python'],
      default: 'node-prisma',
    }),
    output: Flags.string({
      char: 'o',
      description: 'Output directory',
      default: '.',
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(Generate);

    this.log(
      `🚀 Generating Docker files for stack: ${flags.stack}. This will create a Dockerfile and docker-compose.yml tailored to your app.`
    );
    this.log(
      'Why? These files define how your app is built and run in containers, ensuring portability and consistency.'
    );

    // Interactive prompts for customization (informative)
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
        message: 'What is your app entrypoint? (e.g., dist/server.js)',
        default: 'dist/server.js',
      },
    ]);

    // Generate Dockerfile content (tailored to node-prisma by default)
    let dockerfileContent = `
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
    `.trim();

    // Basic stack variations (expand later)
    if (flags.stack === 'react') {
      dockerfileContent = '# TODO: React-specific Dockerfile';
    } else if (flags.stack === 'python') {
      dockerfileContent = '# TODO: Python-specific Dockerfile';
    }

    // Write Dockerfile
    const dockerfilePath = path.join(flags.output, 'Dockerfile');
    await fs.writeFile(dockerfilePath, dockerfileContent);
    this.log(`✅ Dockerfile generated at: ${dockerfilePath}`);

    // Generate docker-compose.yml (simple example)
    const composeContent = `
version: '3.8'
services:
  app:
    build: .
    ports:
      - "${answers.port}:${answers.port}"
    environment:
      - NODE_ENV=production
    `.trim();

    const composePath = path.join(flags.output, 'docker-compose.yml');
    await fs.writeFile(composePath, composeContent);
    this.log(`✅ docker-compose.yml generated at: ${composePath}`);

    this.log(
      '🎉 Files ready! Next steps: Review them, then run `docker build -t your-app .` to build your image.'
    );
    this.log(
      'Tip: Customize the generated files as needed for your specific setup.'
    );
  }
}