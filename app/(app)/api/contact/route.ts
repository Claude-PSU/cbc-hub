import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  const { name, email, subject, message } = await req.json();

  if (!name || !email || !subject || !message) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const subjectLabels: Record<string, string> = {
    partnership: "Partnership / Collaboration",
    course: "Course Integration",
    sponsorship: "Sponsorship",
    press: "Press / Media",
    general: "General Inquiry",
  };

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: `"Claude Builder Club Contact" <${process.env.GMAIL_USER}>`,
    to: "claudepsu@gmail.com",
    replyTo: email,
    subject: `[Contact] ${subjectLabels[subject] ?? subject} — ${name}`,
    text: `Name: ${name}\nEmail: ${email}\nSubject: ${subjectLabels[subject] ?? subject}\n\n${message}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#141413;margin-bottom:4px">New contact form submission</h2>
        <p style="color:#b0aea5;font-size:13px;margin-top:0">Claude Builder Club at Penn State</p>
        <hr style="border:none;border-top:1px solid #e8e6dc;margin:16px 0"/>
        <table style="width:100%;font-size:14px;border-collapse:collapse">
          <tr><td style="padding:6px 0;color:#6b6860;width:80px">Name</td><td style="padding:6px 0;color:#141413;font-weight:600">${name}</td></tr>
          <tr><td style="padding:6px 0;color:#6b6860">Email</td><td style="padding:6px 0"><a href="mailto:${email}" style="color:#d97757">${email}</a></td></tr>
          <tr><td style="padding:6px 0;color:#6b6860">Subject</td><td style="padding:6px 0;color:#141413">${subjectLabels[subject] ?? subject}</td></tr>
        </table>
        <hr style="border:none;border-top:1px solid #e8e6dc;margin:16px 0"/>
        <p style="font-size:14px;color:#141413;white-space:pre-wrap">${message}</p>
      </div>
    `,
  });

  return NextResponse.json({ ok: true });
}
