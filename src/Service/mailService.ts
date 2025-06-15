import { Resend } from 'resend';

const sendMail = (name: string, mail: string, subject: string, comment: string) => {
    console.log('Sending email with Resend...');
    const resend = new Resend(process.env.RESEND_API_KEY || '');
    console.log(process.env.RESEND_API_KEY || '');
    if (!mail || !subject || !comment) {
        console.log('Missing required parameters: from, subject, or html');
    }
    resend.emails.send({
        from: 'contact@missouzakaria.com',
        to: 'xlooon1miss@gmail.com',
        subject: `[Portfolio] ${subject}`,
        replyTo: mail,
        html: `
            <h2>New Contact Form Submission</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${mail}</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <p><strong>Message:</strong><br/>${comment}</p>
            `,
    }).then((response) => {
        console.log('Email sent successfully:', response);
    }
    ).catch((error) => {
        console.error('Error sending email:', error);
    }
    );

};
export default sendMail;