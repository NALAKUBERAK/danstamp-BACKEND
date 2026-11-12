import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { User } from '../user/entities/user.entity';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly config: ConfigService) {}

  async sendPasswordReset(email: string, resetUrl: string): Promise<void> {
    const transporter = this.createSmtpTransport();
    const from = this.config.get<string>('MAIL_FROM');
    if (!from) {
      throw new ServiceUnavailableException('El envío de correo no está configurado');
    }

    try {
      await transporter.sendMail({
        from,
        to: email,
        subject: 'Restablece tu contraseña',
        text: `Usa este enlace para restablecer tu contraseña. El enlace vence en 30 minutos:\n\n${resetUrl}\n\nSi no solicitaste el cambio, ignora este correo.`,
      });
    } catch (error) {
      this.logger.error(
        'Falló el envío del correo de recuperación',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  assertSmtpConfigured(): void {
    if (!this.config.get<string>('MAIL_FROM')) {
      throw new ServiceUnavailableException('El envío de correo no está configurado');
    }
    this.createSmtpTransport();
  }

  async notifyUser(user: User, subject: string, message: string): Promise<void> {
    const emailEnabled = this.config.get<string>('NOTIFICATIONS_EMAIL_ENABLED') === 'true';
    const whatsappEnabled =
      this.config.get<string>('NOTIFICATIONS_WHATSAPP_ENABLED') === 'true';
    const tasks: Promise<void>[] = [];

    if (emailEnabled) {
      tasks.push(this.sendEmail(user.email, subject, message));
    }
    if (whatsappEnabled) {
      tasks.push(this.sendWhatsApp(user.telefono, message));
    }

    if (tasks.length === 0) {
      this.logger.warn(`Notificación no enviada para usuario ${user.id_usuario}: canales deshabilitados`);
      return;
    }

    const results = await Promise.allSettled(tasks);
    const failures = results.filter(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );
    for (const failure of failures) {
      this.logger.error(
        `Falló un canal de notificación para usuario ${user.id_usuario}`,
        failure.reason instanceof Error ? failure.reason.stack : String(failure.reason),
      );
    }
    if (failures.length > 0) this.logger.error('Una o más notificaciones no pudieron entregarse');
  }

  private async sendEmail(to: string, subject: string, message: string): Promise<void> {
    const transporter = this.createSmtpTransport();
    const from = this.config.get<string>('MAIL_FROM');
    if (!from) {
      throw new ServiceUnavailableException('El envío de correo no está configurado');
    }
    await transporter.sendMail({ from, to, subject, text: message });
  }

  private async sendWhatsApp(phone: number, message: string): Promise<void> {
    const token = this.config.get<string>('WHATSAPP_ACCESS_TOKEN');
    const phoneNumberId = this.config.get<string>('WHATSAPP_PHONE_NUMBER_ID');
    const countryCode = this.config.get<string>('WHATSAPP_DEFAULT_COUNTRY_CODE');
    if (!token || !phoneNumberId || !countryCode) {
      throw new ServiceUnavailableException('WhatsApp Cloud API no está configurada');
    }

    const normalizedPhone = String(phone).replace(/\D/g, '');
    const recipient = normalizedPhone.startsWith(countryCode)
      ? normalizedPhone
      : `${countryCode}${normalizedPhone}`;
    const apiVersion = this.config.get<string>('WHATSAPP_API_VERSION', 'v21.0');
    const response = await fetch(
      `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: recipient,
          type: 'text',
          text: { body: message },
        }),
        signal: AbortSignal.timeout(10_000),
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(`WhatsApp API respondió ${response.status}: ${errorBody}`);
      throw new ServiceUnavailableException('Falló la entrega de WhatsApp');
    }
  }

  private createSmtpTransport(): nodemailer.Transporter {
    const host = this.config.get<string>('MAIL_HOST');
    const user = this.config.get<string>('MAIL_USER');
    const password = this.config.get<string>('MAIL_PASSWORD');
    const port = Number(this.config.get<string>('MAIL_PORT', '587'));
    if (!host || !user || !password || !Number.isInteger(port) || port < 1 || port > 65535) {
      throw new ServiceUnavailableException('El envío de correo no está configurado');
    }

    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      requireTLS: port !== 465,
      auth: { user, pass: password },
    });
  }
}
