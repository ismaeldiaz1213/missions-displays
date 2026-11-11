// Every email the site sends, in Spanish and English, wrapped in one branded layout.
// Plain text is always sent alongside the HTML.

export type Lang = 'es' | 'en';

export interface Rendered { subject: string; text: string; html: string }

const NAVY = '#1E3A8A';
const BLUE = '#2563EB';
const INK = '#0F172A';
const MUTED = '#64748B';

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

/** Paragraphs (blank-line separated) → HTML, with single newlines kept as line breaks. */
const paragraphs = (text: string) =>
  text.trim().split(/\n{2,}/).map((p) => `<p style="margin:0 0 14px;line-height:1.6">${escape(p).replace(/\n/g, '<br>')}</p>`).join('');

const layout = (lang: Lang, body: string, button?: { label: string; url: string }) => `<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#F4F7FB;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:${INK}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F7FB;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #E2E8F0">
<tr><td style="background:${NAVY};padding:20px 28px;color:#fff;font-size:18px;font-weight:800">
${lang === 'en' ? 'Missions' : 'Misiones'} · Iglesia Bautista Libertad</td></tr>
<tr><td style="padding:28px;font-size:16px">${body}
${button ? `<p style="margin:24px 0 8px"><a href="${escape(button.url)}" style="display:inline-block;background:${BLUE};color:#fff;text-decoration:none;font-weight:700;padding:13px 26px;border-radius:999px">${escape(button.label)}</a></p>` : ''}
</td></tr>
<tr><td style="padding:16px 28px 24px;color:${MUTED};font-size:13px;border-top:1px solid #E2E8F0">
${lang === 'en'
    ? 'You can reply to this email; a member of our missions team reads every message.'
    : 'Puede responder a este correo; alguien de nuestro equipo de misiones lee cada mensaje.'}
</td></tr></table></td></tr></table></body></html>`;

const textWithButton = (text: string, button?: { label: string; url: string }) =>
  button ? `${text.trim()}\n\n${button.label}: ${button.url}\n` : `${text.trim()}\n`;

const make = (lang: Lang, subject: string, text: string, button?: { label: string; url: string }): Rendered => ({
  subject,
  text: textWithButton(text, button),
  html: layout(lang, paragraphs(text), button),
});

export interface TemplateVars {
  name?: string;
  quarter?: string;
  due?: string;
  url?: string;
  reason?: string;
  missionary?: string;
  details?: string;
  subject?: string;
  body?: string;
  stage?: 'before' | 'due' | 'after';
}

type Template = (lang: Lang, v: TemplateVars) => Rendered;

export const TEMPLATES: Record<string, Template> = {
  /** To a missionary who just sent the page request form. */
  requestReceived: (lang, v) => lang === 'en'
    ? make(lang, 'We received your information',
      `Hello ${v.name},\n\nThank you for sending us your information. Our missions team will review it, and once it's approved we'll email you a link to your own page, where you can sign in and keep it up to date.\n\nWe're grateful for your faithful service on the field and are praying for you.`)
    : make(lang, 'Recibimos su información',
      `Hola ${v.name}:\n\nGracias por enviarnos su información. Nuestro equipo de misiones la revisará y, cuando esté aprobada, le enviaremos un enlace a su propia página, donde podrá entrar y mantenerla al día.\n\nAgradecemos su fiel servicio en el campo y oramos por usted.`),

  /** To the missions inbox when a page request arrives. */
  newRequestAdmin: (_lang, v) => make('es', `Nueva solicitud de página: ${v.missionary}`,
    `${v.missionary} envió el formulario para tener su página.\n\n${v.details ?? ''}`,
    { label: 'Revisar la solicitud', url: v.url ?? '' }),

  /** To a missionary: their page is approved and here is how to sign in. */
  invitation: (lang, v) => lang === 'en'
    ? make(lang, 'Your missionary page is ready',
      `Hello ${v.name},\n\nYour page on our missions site is ready. With the button below you can sign in (no password needed) to see it, update your information, photos and prayer letter, and send us your quarterly reports.\n\nYour changes are published once our team reviews them.`,
      { label: 'Open my page', url: v.url ?? '' })
    : make(lang, 'Su página misionera está lista',
      `Hola ${v.name}:\n\nSu página en nuestro sitio de misiones está lista. Con el botón de abajo puede entrar (no necesita contraseña) para verla, actualizar su información, fotos y carta de oración, y enviarnos sus informes trimestrales.\n\nSus cambios se publican cuando nuestro equipo los revisa.`,
      { label: 'Abrir mi página', url: v.url ?? '' }),

  /** To a missionary: the one-time sign-in link they asked for. */
  signInLink: (lang, v) => lang === 'en'
    ? make(lang, 'Your sign-in link',
      `Hello ${v.name},\n\nUse the button below to sign in to your missionary page. The link works once and expires in a few hours.\n\nIf you didn't ask for it, you can ignore this email.`,
      { label: 'Sign in', url: v.url ?? '' })
    : make(lang, 'Su enlace para entrar',
      `Hola ${v.name}:\n\nUse el botón de abajo para entrar a su página misionera. El enlace funciona una vez y vence en unas horas.\n\nSi usted no lo pidió, puede ignorar este correo.`,
      { label: 'Entrar', url: v.url ?? '' }),

  /** To a missionary: quarterly report reminder (a week before, on the day, a week after). */
  reportReminder: (lang, v) => {
    const subjects = lang === 'en'
      ? { before: `Reminder: your ${v.quarter} report is due ${v.due}`, due: `Your ${v.quarter} report is due today`, after: `We haven't received your ${v.quarter} report yet` }
      : { before: `Recordatorio: su informe del ${v.quarter} vence el ${v.due}`, due: `Hoy vence su informe del ${v.quarter}`, after: `Aún no recibimos su informe del ${v.quarter}` };
    const text = lang === 'en'
      ? `Hello ${v.name},\n\nWe'd love to hear how the Lord is working through your ministry. Please send us your report for ${v.quarter}, due ${v.due}: a PDF if you have one, and any comments or prayer requests.\n\nNo updates this quarter? Sign in and press "I have no updates" and we won't send more reminders for this quarter.`
      : `Hola ${v.name}:\n\nNos encantaría saber cómo el Señor está obrando por medio de su ministerio. Por favor envíenos su informe del ${v.quarter}, que vence el ${v.due}: un PDF si lo tiene, y cualquier comentario o petición de oración.\n\n¿No tiene novedades este trimestre? Entre y pulse "No tengo novedades" y no le enviaremos más recordatorios por este trimestre.`;
    return make(lang, subjects[v.stage ?? 'before'], text, { label: lang === 'en' ? 'Send my report' : 'Enviar mi informe', url: v.url ?? '' });
  },

  /** To a missionary after they send a report from their page. */
  reportReceived: (lang, v) => lang === 'en'
    ? make(lang, `Thank you: we received your ${v.quarter} report`,
      `Hello ${v.name},\n\nThank you for your report for ${v.quarter}. Our team will read it and pray for the requests you shared.`)
    : make(lang, `Gracias: recibimos su informe del ${v.quarter}`,
      `Hola ${v.name}:\n\nGracias por su informe del ${v.quarter}. Nuestro equipo lo leerá y orará por las peticiones que compartió.`),

  /** To the missions inbox when a missionary sends a report or says "no updates". */
  reportReceivedAdmin: (_lang, v) => make('es', `Informe del ${v.quarter}: ${v.missionary}`,
    `${v.missionary} ${v.details ?? 'envió su informe.'}`, { label: 'Ver en el panel', url: v.url ?? '' }),

  /** To the missions inbox when a missionary submits changes to their page. */
  editSubmittedAdmin: (_lang, v) => make('es', `Cambios para aprobar: ${v.missionary}`,
    `${v.missionary} envió cambios a su página. No se publican hasta que alguien los apruebe.`,
    { label: 'Revisar los cambios', url: v.url ?? '' }),

  /** To a missionary: their changes are live. */
  editApproved: (lang, v) => lang === 'en'
    ? make(lang, 'Your page changes are live', `Hello ${v.name},\n\nWe published the changes you sent. Thank you for keeping your page up to date!`,
      { label: 'See my page', url: v.url ?? '' })
    : make(lang, 'Sus cambios ya están publicados', `Hola ${v.name}:\n\nPublicamos los cambios que nos envió. ¡Gracias por mantener su página al día!`,
      { label: 'Ver mi página', url: v.url ?? '' }),

  /** To a missionary: their changes need something before publishing. */
  editRejected: (lang, v) => lang === 'en'
    ? make(lang, 'Your page changes need a small fix',
      `Hello ${v.name},\n\nThank you for your changes. Before we publish them, our team asks:\n\n${v.reason}\n\nYour changes are saved: sign in, adjust them, and send them again.`,
      { label: 'Open my page', url: v.url ?? '' })
    : make(lang, 'Sus cambios necesitan un pequeño ajuste',
      `Hola ${v.name}:\n\nGracias por sus cambios. Antes de publicarlos, nuestro equipo le pide:\n\n${v.reason}\n\nSus cambios están guardados: entre, ajústelos y envíelos de nuevo.`,
      { label: 'Abrir mi página', url: v.url ?? '' }),

  /** Mass or one-off email written by an admin. {nombre} / {name} become the recipient's name. */
  custom: (lang, v) => {
    const fill = (s: string) => s.replace(/\{(nombre|name)\}/gi, v.name ?? '');
    return make(lang, fill(v.subject ?? ''), fill(v.body ?? ''));
  },
};

export const render = (template: string, lang: Lang, vars: TemplateVars): Rendered => {
  const t = TEMPLATES[template];
  if (!t) throw new Error(`Unknown email template "${template}"`);
  return t(lang, vars);
};
