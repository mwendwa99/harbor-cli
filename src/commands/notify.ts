import { Command, Flags } from '@oclif/core';
import inquirer from 'inquirer';
import nodemailer from 'nodemailer';
import dedent from 'dedent';

export default class Notify extends Command {
  static description = dedent`
    Set up and send email notifications for migration events.
    This command configures SMTP details and tests sending alerts (e.g., for success/failure).
    Why? Get instant updates without manual checks—useful for live apps.
  `;

  static examples = [
    `$ harborcli notify --to your@email.com --subject "Migration Update"
  Sends a test email with your configured SMTP.
  `,
    `$ harborcli notify --config
  Interactively sets up SMTP details (stored in env vars).
  `,
  ];

  static flags = {
    config: Flags.boolean({
      description: 'Configure SMTP settings interactively',
      default: false,
    }),
    to: Flags.string({
      description: 'Recipient email address',
    }),
    subject: Flags.string({
      description: 'Email subject',
      default: 'HarborCLI Notification',
    }),
    message: Flags.string({
      description: 'Email body message',
      default: 'Test notification from HarborCLI.',
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(Notify);

    this.log(dedent`
      📧 Email Notification Setup.
      Why? Alerts keep you informed about migrations (e.g., success or errors).
      Security Tip: Never hardcode credentials—use env vars.
    `);

    // Step 1: Configure SMTP if requested or missing
    if (flags.config || !process.env.SMTP_HOST) {
      const configAnswers = await inquirer.prompt([
        {
          type: 'input',
          name: 'host',
          message: 'SMTP Host? (e.g., smtp.gmail.com)',
          default: 'smtp.gmail.com',
        },
        {
          type: 'input',
          name: 'port',
          message: 'SMTP Port? (e.g., 587 for TLS)',
          default: '587',
        },
        {
          type: 'input',
          name: 'user',
          message: 'SMTP Username? (e.g., your email)',
        },
        {
          type: 'password',
          name: 'pass',
          message: 'SMTP Password? (or app password for Gmail)',
        },
      ]);

      // Instruct user to set env vars (for security)
      this.log(dedent`
        ✅ Configuration complete! Set these in your environment:
        export SMTP_HOST=${configAnswers.host}
        export SMTP_PORT=${configAnswers.port}
        export SMTP_USER=${configAnswers.user}
        export SMTP_PASS=${configAnswers.pass}
        Tip: Add to .env file or shell profile for persistence.
        Why env vars? Keeps creds secure and out of code.
      `);
      return;  // Exit after config to avoid sending without vars set
    }

    // Step 2: Validate Config
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      this.log('⚠️ Missing SMTP credentials. Run with --config first.');
      return;
    }

    // Step 3: Send Test Email
    if (!flags.to) {
      const toAnswer = await inquirer.prompt([
        {
          type: 'input',
          name: 'to',
          message: 'Recipient email?',
        },
      ]);
      flags.to = toAnswer.to;
    }

    this.log(`Sending test email to ${flags.to}...`);

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: false,  // Use true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    try {
      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: flags.to,
        subject: flags.subject,
        text: flags.message,
      });
      this.log(dedent`
        ✅ Email sent successfully!
        Check your inbox for "${flags.subject}".
      `);
    } catch (error) {
      const err = error as Error;
      this.log(dedent`
        ❌ Error sending email: ${err.message}
        Suggested Fix: Verify SMTP details (run --config) or check provider settings (e.g., Gmail app password).
      `);
    }

    this.log(dedent`
      🎉 Notification setup done!
      Integrate: Call this from other commands (e.g., after \`migrate\`) for auto-alerts.
    `);
  }
}