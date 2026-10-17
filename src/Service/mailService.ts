import { Resend } from 'resend';
export default async function sendMail(name: string, mail: string, subject: string, comment: string) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_FROM_EMAIL;
  if (!key || !from) throw new Error('MAIL_NOT_CONFIGURED');
  const { data, error } = await new Resend(key).emails.send({
    from, to: ['missouzakaria03@gmail.com'], replyTo: mail,
    subject: `[Portfolio] ${subject}`,
    text: `New portfolio enquiry\n\nName: ${name}\nEmail: ${mail}\nSubject: ${subject}\n\n${comment}`,
  });
  if (error || !data?.id) throw new Error('MAIL_DELIVERY_FAILED');
  return data.id;
}
