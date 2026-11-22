export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export interface MailAdapter {
  readonly name: string;
  send(message: MailMessage): Promise<{ delivered: boolean; providerId?: string }>;
}
