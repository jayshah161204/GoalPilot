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

/**
 * Sends a daily morning brief email at 10:00 AM IST with today's tasks and overdue tasks.
 *
 * @param {object} params
 * @param {string} params.name
 * @param {string} params.email
 * @param {Array} params.todayTasks
 * @param {Array} params.overdueTasks
 */
async function sendDailyBriefEmail ({ name, email, todayTasks = [], overdueTasks = [] }) {
  try {
    const transporter = createTransporter()
    const appUrl = process.env.APP_URL || 'https://goal-pilot-xi.vercel.app'
    const fromAddress = process.env.EMAIL_FROM || '"GoalPilot" <notifications@goalpilot.app>'

    const totalCount = todayTasks.length + overdueTasks.length
    if (totalCount === 0) return false // Nothing to send

    const todayDateFormatted = new Date().toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })

    const subject = overdueTasks.length > 0
      ? `GoalPilot: ${todayTasks.length} task(s) for today, ${overdueTasks.length} overdue`
      : `GoalPilot: ${todayTasks.length} task(s) planned for today`

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 28px 24px; background-color: #0f172a; color: #f8fafc; border-radius: 14px; box-sizing: border-box;">
        <div style="border-bottom: 1px solid #1e293b; padding-bottom: 16px; margin-bottom: 20px;">
          <span style="font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #818cf8;">GoalPilot &bull; Daily Brief</span>
          <h2 style="font-size: 20px; font-weight: 700; margin: 8px 0 0; color: #ffffff;">Good morning, ${name}!</h2>
          <p style="margin: 4px 0 0; font-size: 13px; color: #94a3b8;">Here is your focus snapshot for today (${todayDateFormatted}).</p>
        </div>

        ${todayTasks.length > 0 ? `
        <div style="margin-bottom: 22px;">
          <h3 style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #38bdf8; margin: 0 0 10px;">Due Today (${todayTasks.length})</h3>
          <ul style="margin: 0; padding-left: 18px; color: #e2e8f0; font-size: 14px; line-height: 1.6;">
            ${todayTasks.map(t => `<li style="margin-bottom: 4px;"><strong>${t.title}</strong>${t.priority === 'high' ? ' <span style="color: #f87171; font-size: 11px; font-weight: 700;">[HIGH]</span>' : ''}</li>`).join('')}
          </ul>
        </div>
        ` : ''}

        ${overdueTasks.length > 0 ? `
        <div style="margin-bottom: 24px; background-color: #1e1b2e; border: 1px solid #432857; border-radius: 10px; padding: 14px 16px;">
          <h3 style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #f43f5e; margin: 0 0 8px;">Needs Attention &bull; Overdue (${overdueTasks.length})</h3>
          <ul style="margin: 0; padding-left: 18px; color: #fda4af; font-size: 13px; line-height: 1.6;">
            ${overdueTasks.map(t => `<li style="margin-bottom: 4px;"><strong>${t.title}</strong>${t.dueDate ? ` <span style="color: #fca5a5; font-size: 11px;">(Due ${new Date(t.dueDate).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric' })})</span>` : ''}</li>`).join('')}
          </ul>
        </div>
        ` : ''}

        <div style="text-align: center; margin: 26px 0 18px;">
          <a href="${appUrl}" style="display: inline-block; background-color: #6366f1; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 8px;">Open GoalPilot</a>
        </div>

        <div style="border-top: 1px solid #1e293b; padding-top: 14px; text-align: center;">
          <p style="margin: 0; font-size: 11px; color: #64748b;">This email was sent to ${email} for your daily morning digest.</p>
        </div>
      </div>
    `

    if (transporter) {
      await transporter.sendMail({
        from: fromAddress,
        to: email,
        subject,
        html
      })
      console.log(`[emailService] Daily brief sent to ${email} (${name})`)
      return true
    } else {
      console.log(`[emailService] (Simulation) Daily brief prepared for ${email} (${name}) - ${totalCount} tasks`)
      return true
    }
  } catch (err) {
    console.error('[emailService] Failed to send daily brief email:', err.message)
    return false
  }
}

module.exports = {
  sendWelcomeEmail,
  sendLoginNotificationEmail,
  sendDailyBriefEmail
}
