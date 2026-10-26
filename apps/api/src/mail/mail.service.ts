import { Injectable, Logger } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/env';

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

/**
 * Envoi d'emails transactionnels.
 *
 * - développement / tests : Mailpit local (aucun email ne quitte le VPS) ;
 * - préproduction / production : API HTTPS du fournisseur (Brevo par défaut),
 *   jamais SMTP sortant sur le port 25 (bloqué par la plupart des hébergeurs).
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  async send(message: MailMessage): Promise<void> {
    if (env.MAIL_TRANSPORT === 'mailpit' || env.MAIL_TRANSPORT === 'smtp') {
      await this.sendSmtp(message);
      return;
    }

    if (env.MAIL_PROVIDER === 'brevo') {
      await this.sendBrevo(message);
      return;
    }

    throw new Error(
      `Fournisseur email "${env.MAIL_PROVIDER}" non implémenté. Configurer MAIL_PROVIDER et MAIL_API_KEY.`,
    );
  }

  private getTransporter(): Transporter {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: false,
        ...(env.SMTP_USER && env.SMTP_PASSWORD
          ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } }
          : {}),
      });
    }
    return this.transporter;
  }

  private async sendSmtp(message: MailMessage): Promise<void> {
    const info = await this.getTransporter().sendMail({
      from: env.MAIL_FROM,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
    this.logger.log(
      `Email accepté par le transporteur local (${info.messageId ?? 'sans identifiant'})`,
    );
  }

  private async sendBrevo(message: MailMessage): Promise<void> {
    if (!env.MAIL_API_KEY) {
      throw new Error('MAIL_API_KEY manquante pour le fournisseur Brevo');
    }

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': env.MAIL_API_KEY,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: parseFrom(env.MAIL_FROM),
        to: [{ email: message.to }],
        subject: message.subject,
        textContent: message.text,
        htmlContent: message.html,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      this.logger.error(`Échec Brevo (${response.status}) ${body.slice(0, 200)}`);
      throw new Error("Échec de l'envoi de l'email");
    }
  }
}

function parseFrom(value: string): { name: string; email: string } {
  const match = /^(.*)<(.+)>$/.exec(value.trim());
  if (match) {
    return { name: (match[1] ?? '').trim() || 'Immo Manager', email: (match[2] ?? '').trim() };
  }
  return { name: 'Immo Manager', email: value.trim() };
}

export function buildVerificationEmail(params: {
  fullName: string;
  link: string;
  expiresInMinutes: number;
}): MailMessage {
  const { fullName, link, expiresInMinutes } = params;
  const subject = 'Confirmez votre adresse email — Immo Manager';
  const text = [
    `Bonjour ${fullName},`,
    '',
    'Merci d’avoir créé votre compte Immo Manager.',
    `Pour confirmer votre adresse email, ouvrez ce lien : ${link}`,
    '',
    `Ce lien expire dans ${expiresInMinutes} minutes et ne peut être utilisé qu’une fois.`,
    'Si vous n’êtes pas à l’origine de cette demande, ignorez simplement ce message.',
    '',
    'L’équipe Immo Manager',
  ].join('\n');

  return {
    to: '',
    subject,
    text,
    html: emailLayout(
      subject,
      `<p>Bonjour ${escapeHtml(fullName)},</p>
       <p>Merci d’avoir créé votre compte <strong>Immo Manager</strong>.</p>
       <p><a class="button" href="${link}">Confirmer mon adresse email</a></p>
       <p class="muted">Ce lien expire dans ${expiresInMinutes} minutes et ne peut être utilisé qu’une fois.</p>
       <p class="muted">Si vous n’êtes pas à l’origine de cette demande, ignorez ce message.</p>`,
    ),
  };
}

export function buildPasswordResetEmail(params: {
  fullName: string;
  link: string;
  expiresInMinutes: number;
}): MailMessage {
  const { fullName, link, expiresInMinutes } = params;
  const subject = 'Réinitialisation de votre mot de passe — Immo Manager';
  const text = [
    `Bonjour ${fullName},`,
    '',
    'Vous avez demandé la réinitialisation de votre mot de passe.',
    `Lien de réinitialisation : ${link}`,
    '',
    `Ce lien expire dans ${expiresInMinutes} minutes et ne peut être utilisé qu’une fois.`,
    'Si vous n’êtes pas à l’origine de cette demande, aucune action n’est nécessaire.',
    '',
    'L’équipe Immo Manager',
  ].join('\n');

  return {
    to: '',
    subject,
    text,
    html: emailLayout(
      subject,
      `<p>Bonjour ${escapeHtml(fullName)},</p>
       <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
       <p><a class="button" href="${link}">Choisir un nouveau mot de passe</a></p>
       <p class="muted">Ce lien expire dans ${expiresInMinutes} minutes et ne peut être utilisé qu’une fois.</p>
       <p class="muted">Si vous n’êtes pas à l’origine de cette demande, aucune action n’est nécessaire.</p>`,
    ),
  };
}

export function buildLoginAlertEmail(params: {
  fullName: string;
  at: string;
  device: string;
}): MailMessage {
  const subject = 'Nouvelle connexion à votre compte — Immo Manager';
  const text = [
    `Bonjour ${params.fullName},`,
    '',
    `Une connexion à votre compte a eu lieu le ${params.at}.`,
    `Appareil : ${params.device}`,
    '',
    'Si vous êtes à l’origine de cette connexion, aucune action n’est nécessaire.',
    'Sinon, changez immédiatement votre mot de passe.',
    '',
    'L’équipe Immo Manager',
  ].join('\n');

  return {
    to: '',
    subject,
    text,
    html: emailLayout(
      subject,
      `<p>Bonjour ${escapeHtml(params.fullName)},</p>
       <p>Une connexion à votre compte a eu lieu le <strong>${escapeHtml(params.at)}</strong>.</p>
       <p>Appareil : ${escapeHtml(params.device)}</p>
       <p class="muted">Si vous n’êtes pas à l’origine de cette connexion, changez immédiatement votre mot de passe.</p>`,
    ),
  };
}

function emailLayout(subject: string, content: string): string {
  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(subject)}</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f6f7f9; margin: 0; padding: 32px 16px; color: #1f2937; }
      .card { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #e5e7eb; }
      .brand { font-size: 13px; letter-spacing: .12em; text-transform: uppercase; color: #0f766e; font-weight: 600; margin-bottom: 20px; }
      a.button { display: inline-block; background: #0f766e; color: #ffffff !important; text-decoration: none; padding: 12px 20px; border-radius: 10px; font-weight: 600; margin: 12px 0; }
      .muted { color: #6b7280; font-size: 13px; }
      p { line-height: 1.6; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="brand">Immo Manager</div>
      ${content}
    </div>
  </body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
