const nodemailer = require('nodemailer')

/**
 * Creates an SMTP transporter based on available environment variables.
 * Falls back safely if SMTP is not configured.
 */
const createTransporter = () => {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    })
  }

  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASS) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASS
      }
    })
  }

  return null
}

/**
 * Sends a welcome email to newly registered users with their account details.
 *
 * @param {object} params
 * @param {string} params.name
 * @param {string} params.email
 */
async function sendWelcomeEmail ({ name, email }) {
  try {
    const transporter = createTransporter()
    const appUrl = process.env.APP_URL || 'https://goal-pilot-xi.vercel.app'
    const fromAddress = process.env.EMAIL_FROM || '"GoalPilot AI" <notifications@goalpilot.app>'

    const html = `
      <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background-color: #0d1520; color: #f1f5f9; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; width: 48px; height: 48px; background: linear-gradient(135deg, #6366F1, #8B5CF6); border-radius: 12px; line-height: 48px; font-size: 24px;">⚡</div>
          <h1 style="font-size: 24px; font-weight: 800; margin: 12px 0 4px; color: #ffffff;">Welcome to GoalPilot!</h1>
          <p style="color: #94a3b8; font-size: 14px; margin: 0;">Your AI-Powered Personal Productivity Assistant</p>
        </div>

        <div style="background-color: #162536; border: 1px solid #243b55; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <h3 style="font-size: 15px; font-weight: 700; color: #e2e8f0; margin: 0 0 12px;">Account Credentials:</h3>
          <p style="margin: 6px 0; font-size: 14px; color: #cbd5e1;"><strong>Name:</strong> ${name}</p>
          <p style="margin: 6px 0; font-size: 14px; color: #cbd5e1;"><strong>Login Email:</strong> <span style="color: #818cf8;">${email}</span></p>
          <p style="margin: 6px 0; font-size: 14px; color: #cbd5e1;"><strong>Created At:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
        </div>

        <div style="margin-bottom: 28px;">
          <h4 style="font-size: 14px; font-weight: 700; color: #e2e8f0; margin-bottom: 8px;">Quick Start Features:</h4>
          <ul style="color: #94a3b8; font-size: 13px; padding-left: 20px; line-height: 1.6;">
            <li><strong>AI Coach & Assistant:</strong> Chat to break down complex goals into actionable subtasks.</li>
            <li><strong>Daily Smart Planner:</strong> Get an optimized schedule based on your deadlines & priority.</li>
            <li><strong>Habit Streak Tracker:</strong> Build consistency with interactive heatmaps.</li>
          </ul>
        </div>

        <div style="text-align: center;">
          <a href="${appUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366F1, #8B5CF6); color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 10px; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);">Open GoalPilot Dashboard</a>
        </div>

        <hr style="border: none; border-top: 1px solid #1e293b; margin: 28px 0 16px;" />
        <p style="text-align: center; color: #64748b; font-size: 12px; margin: 0;">GoalPilot • Dhirubhai Ambani University & Adaptyx Project</p>
      </div>
    `

    if (transporter) {
      await transporter.sendMail({
        from: fromAddress,
        to: email,
        subject: '⚡ Welcome to GoalPilot — Account Created',
        html
      })
      console.log(`[emailService] Welcome email sent to ${email}`)
    } else {
      console.log(`[emailService] (Simulation) Welcome email prepared for ${email} (Name: ${name})`)
    }
  } catch (err) {
    console.error('[emailService] Failed to send welcome email:', err.message)
  }
}

/**
 * Sends a login notification email.
 *
 * @param {object} params
 * @param {string} params.name
 * @param {string} params.email
 */
async function sendLoginNotificationEmail ({ name, email }) {
  try {
    const transporter = createTransporter()
    const appUrl = process.env.APP_URL || 'https://goal-pilot-xi.vercel.app'
    const fromAddress = process.env.EMAIL_FROM || '"GoalPilot Security" <security@goalpilot.app>'

    const html = `
      <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 0 auto; padding: 28px 20px; background-color: #0d1520; color: #f1f5f9; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="font-size: 20px; font-weight: 800; color: #ffffff; margin: 0;">⚡ GoalPilot Login Alert</h2>
          <p style="color: #94a3b8; font-size: 13px; margin: 4px 0 0;">New session signed in to your account</p>
        </div>

        <div style="background-color: #162536; border: 1px solid #243b55; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
          <p style="margin: 4px 0; font-size: 13px; color: #cbd5e1;"><strong>User:</strong> ${name}</p>
          <p style="margin: 4px 0; font-size: 13px; color: #cbd5e1;"><strong>Email:</strong> ${email}</p>
          <p style="margin: 4px 0; font-size: 13px; color: #cbd5e1;"><strong>Time:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
        </div>

        <p style="color: #94a3b8; font-size: 13px; text-align: center;">If this was you, no action is needed. Keep up the high productivity!</p>
        <div style="text-align: center; margin-top: 18px;">
          <a href="${appUrl}" style="display: inline-block; background: #2563EB; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 13px; padding: 10px 22px; border-radius: 8px;">Go to Dashboard</a>
        </div>
      </div>
    `

    if (transporter) {
      await transporter.sendMail({
        from: fromAddress,
        to: email,
        subject: '🔒 New Login to GoalPilot Account',
        html
      })
      console.log(`[emailService] Login notification sent to ${email}`)
    } else {
      console.log(`[emailService] (Simulation) Login notification prepared for ${email}`)
    }
  } catch (err) {
    console.error('[emailService] Failed to send login notification:', err.message)
  }
}

module.exports = {
  sendWelcomeEmail,
  sendLoginNotificationEmail
}
