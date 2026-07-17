// api/_emailTemplates.js
//
// Plantillas de correo para el huésped, en el idioma que seleccionó en
// la página al reservar (guardado dentro de la referencia de pago).
// Los correos internos (anfitrión/co-anfitrión) siempre van en español,
// pero también llevan el enlace al Panel de Información y Reservas.
//
// Variable de entorno necesaria:
//   SITE_URL -> la URL pública de tu sitio, ej. https://tu-sitio.vercel.app
//               (sin barra al final)

const SITE_URL = process.env.SITE_URL || "";

const FOOTER_LABEL = {
  es: "Panel de Información y Reservas",
  en: "Guest Info & Booking Panel",
  fr: "Panneau d'information et de réservation",
  it: "Pannello Informazioni e Prenotazioni",
  de: "Info- und Buchungspanel",
  ru: "Панель информации и бронирований",
};

const FOOTER_TEXT = {
  es: "¿Necesitas algo? Consulta toda la información de tu estadía (contacto, mapa, entrada/salida) en el",
  en: "Need anything? Find all the info about your stay (contact, map, check-in/out) in the",
  fr: "Besoin d'aide ? Retrouvez toutes les infos sur votre séjour (contact, carte, arrivée/départ) sur le",
  it: "Hai bisogno di qualcosa? Trova tutte le info sul tuo soggiorno (contatti, mappa, check-in/out) nel",
  de: "Brauchst du etwas? Alle Infos zu deinem Aufenthalt (Kontakt, Karte, Check-in/out) findest du im",
  ru: "Нужна помощь? Вся информация о проживании (контакты, карта, заезд/выезд) — на",
};

function guideFooter(lang) {
  const l = FOOTER_TEXT[lang] ? lang : "es";
  const link = SITE_URL
    ? `<a href="${SITE_URL}">${FOOTER_LABEL[l]}</a>`
    : FOOTER_LABEL[l];
  return `<hr style="border:none;border-top:1px solid #EBEBEB;margin:20px 0 12px;">
    <p style="font-size:12px;color:#717171;">${FOOTER_TEXT[l]} ${link}.</p>`;
}

const T = {
  es: {
    confirmSubject: "Tu reserva está confirmada",
    confirmTitle: "¡Tu reserva está confirmada!",
    confirmGreeting: (name) => `Hola ${name}, gracias por tu pago. Tu estadía en el apartaestudio (Los Robles, Maneiro) quedó confirmada para:`,
    guestsLine: (n) => `Huéspedes: ${n}`,
    codeLine: (code) => `Tu código de reserva es <strong>${code}</strong> — guárdalo, es tu referencia para cualquier consulta o cambio sobre tu estadía.`,
    confirmClosing: "Pronto Juan (nuestro co-anfitrión en la isla) se pondrá en contacto contigo para coordinar los detalles de tu llegada. ¡Nos vemos pronto en Margarita!",

    cancelSubject: (code) => `Tu reserva ${code} fue cancelada`,
    cancelTitle: "Tu reserva fue cancelada",
    cancelGreeting: (name, code, dates) => `Hola ${name}, te confirmamos que tu reserva <strong>${code}</strong> para las fechas ${dates} ha sido cancelada.`,
    cancelRefund: (percent, usd) => `Según nuestra política de cancelación, te corresponde un reembolso del <strong>${percent}%</strong> del monto pagado (aproximadamente <strong>$${usd} USD</strong> a la tasa de cambio actual), que procesaremos a la brevedad.`,
    cancelClosing: "Si tienes alguna pregunta, puedes escribirnos por WhatsApp.",

    changeSubject: (code) => `Tu reserva ${code} cambió de fechas`,
    changeTitle: "Tu reserva cambió de fechas",
    changeGreeting: (name, code) => `Hola ${name}, te confirmamos que tu reserva <strong>${code}</strong> ahora queda para las siguientes fechas:`,
    changeClosing: "Si esto no era lo que esperabas, por favor contáctanos lo antes posible.",
  },
  en: {
    confirmSubject: "Your booking is confirmed",
    confirmTitle: "Your booking is confirmed!",
    confirmGreeting: (name) => `Hi ${name}, thank you for your payment. Your stay at the apartment-studio (Los Robles, Maneiro) is confirmed for:`,
    guestsLine: (n) => `Guests: ${n}`,
    codeLine: (code) => `Your booking code is <strong>${code}</strong> — keep it, it's your reference for any question or change about your stay.`,
    confirmClosing: "Juan (our co-host on the island) will reach out soon to coordinate your arrival details. See you soon in Margarita!",

    cancelSubject: (code) => `Your booking ${code} was cancelled`,
    cancelTitle: "Your booking was cancelled",
    cancelGreeting: (name, code, dates) => `Hi ${name}, we confirm that your booking <strong>${code}</strong> for ${dates} has been cancelled.`,
    cancelRefund: (percent, usd) => `Per our cancellation policy, you're entitled to a <strong>${percent}%</strong> refund of the amount paid (approximately <strong>$${usd} USD</strong> at the current exchange rate), which we'll process shortly.`,
    cancelClosing: "If you have any questions, feel free to message us on WhatsApp.",

    changeSubject: (code) => `Your booking ${code} changed dates`,
    changeTitle: "Your booking dates changed",
    changeGreeting: (name, code) => `Hi ${name}, we confirm your booking <strong>${code}</strong> now stands for the following dates:`,
    changeClosing: "If this wasn't expected, please contact us as soon as possible.",
  },
  fr: {
    confirmSubject: "Votre réservation est confirmée",
    confirmTitle: "Votre réservation est confirmée !",
    confirmGreeting: (name) => `Bonjour ${name}, merci pour votre paiement. Votre séjour dans l'appart-studio (Los Robles, Maneiro) est confirmé pour :`,
    guestsLine: (n) => `Voyageurs : ${n}`,
    codeLine: (code) => `Votre code de réservation est <strong>${code}</strong> — conservez-le, c'est votre référence pour toute question ou modification concernant votre séjour.`,
    confirmClosing: "Juan (notre co-hôte sur l'île) vous contactera bientôt pour coordonner les détails de votre arrivée. À bientôt à Margarita !",

    cancelSubject: (code) => `Votre réservation ${code} a été annulée`,
    cancelTitle: "Votre réservation a été annulée",
    cancelGreeting: (name, code, dates) => `Bonjour ${name}, nous confirmons que votre réservation <strong>${code}</strong> pour ${dates} a été annulée.`,
    cancelRefund: (percent, usd) => `Selon notre politique d'annulation, vous avez droit à un remboursement de <strong>${percent}%</strong> du montant payé (environ <strong>$${usd} USD</strong> au taux de change actuel), que nous traiterons rapidement.`,
    cancelClosing: "Pour toute question, n'hésitez pas à nous écrire sur WhatsApp.",

    changeSubject: (code) => `Votre réservation ${code} a changé de dates`,
    changeTitle: "Les dates de votre réservation ont changé",
    changeGreeting: (name, code) => `Bonjour ${name}, nous confirmons que votre réservation <strong>${code}</strong> est désormais fixée aux dates suivantes :`,
    changeClosing: "Si ce n'était pas prévu, merci de nous contacter dès que possible.",
  },
  it: {
    confirmSubject: "La tua prenotazione è confermata",
    confirmTitle: "La tua prenotazione è confermata!",
    confirmGreeting: (name) => `Ciao ${name}, grazie per il tuo pagamento. Il tuo soggiorno nell'appartamento monolocale (Los Robles, Maneiro) è confermato per:`,
    guestsLine: (n) => `Ospiti: ${n}`,
    codeLine: (code) => `Il tuo codice di prenotazione è <strong>${code}</strong> — conservalo, è il tuo riferimento per qualsiasi domanda o modifica sul tuo soggiorno.`,
    confirmClosing: "Juan (il nostro co-host sull'isola) ti contatterà presto per coordinare i dettagli del tuo arrivo. Ci vediamo presto a Margarita!",

    cancelSubject: (code) => `La tua prenotazione ${code} è stata cancellata`,
    cancelTitle: "La tua prenotazione è stata cancellata",
    cancelGreeting: (name, code, dates) => `Ciao ${name}, ti confermiamo che la tua prenotazione <strong>${code}</strong> per ${dates} è stata cancellata.`,
    cancelRefund: (percent, usd) => `Secondo la nostra politica di cancellazione, hai diritto a un rimborso del <strong>${percent}%</strong> dell'importo pagato (circa <strong>$${usd} USD</strong> al tasso di cambio attuale), che elaboreremo a breve.`,
    cancelClosing: "Per qualsiasi domanda, scrivici pure su WhatsApp.",

    changeSubject: (code) => `La tua prenotazione ${code} ha cambiato date`,
    changeTitle: "Le date della tua prenotazione sono cambiate",
    changeGreeting: (name, code) => `Ciao ${name}, ti confermiamo che la tua prenotazione <strong>${code}</strong> ora è fissata per le seguenti date:`,
    changeClosing: "Se non te lo aspettavi, contattaci il prima possibile.",
  },
  de: {
    confirmSubject: "Deine Buchung ist bestätigt",
    confirmTitle: "Deine Buchung ist bestätigt!",
    confirmGreeting: (name) => `Hallo ${name}, danke für deine Zahlung. Dein Aufenthalt im Apartment-Studio (Los Robles, Maneiro) ist bestätigt für:`,
    guestsLine: (n) => `Gäste: ${n}`,
    codeLine: (code) => `Dein Buchungscode lautet <strong>${code}</strong> — bewahre ihn auf, er ist deine Referenz für Fragen oder Änderungen zu deinem Aufenthalt.`,
    confirmClosing: "Juan (unser Co-Gastgeber auf der Insel) meldet sich bald, um die Details deiner Ankunft zu koordinieren. Bis bald auf Margarita!",

    cancelSubject: (code) => `Deine Buchung ${code} wurde storniert`,
    cancelTitle: "Deine Buchung wurde storniert",
    cancelGreeting: (name, code, dates) => `Hallo ${name}, wir bestätigen, dass deine Buchung <strong>${code}</strong> für ${dates} storniert wurde.`,
    cancelRefund: (percent, usd) => `Gemäß unserer Stornierungsbedingungen steht dir eine Rückerstattung von <strong>${percent}%</strong> des bezahlten Betrags zu (ca. <strong>$${usd} USD</strong> zum aktuellen Wechselkurs), die wir zeitnah bearbeiten.`,
    cancelClosing: "Bei Fragen schreib uns gerne auf WhatsApp.",

    changeSubject: (code) => `Deine Buchung ${code} hat neue Daten`,
    changeTitle: "Die Daten deiner Buchung haben sich geändert",
    changeGreeting: (name, code) => `Hallo ${name}, wir bestätigen, dass deine Buchung <strong>${code}</strong> nun für folgende Daten gilt:`,
    changeClosing: "Falls das unerwartet kommt, kontaktiere uns bitte so schnell wie möglich.",
  },
  ru: {
    confirmSubject: "Ваше бронирование подтверждено",
    confirmTitle: "Ваше бронирование подтверждено!",
    confirmGreeting: (name) => `Здравствуйте, ${name}! Спасибо за оплату. Ваше проживание в апартаменте-студии (Лос-Роблес, Манейро) подтверждено на:`,
    guestsLine: (n) => `Гостей: ${n}`,
    codeLine: (code) => `Ваш код бронирования: <strong>${code}</strong> — сохраните его, это ваш номер для любых вопросов или изменений по проживанию.`,
    confirmClosing: "Хуан (наш ко-хозяин на острове) скоро свяжется с вами, чтобы согласовать детали заезда. До скорой встречи на Маргарите!",

    cancelSubject: (code) => `Бронирование ${code} отменено`,
    cancelTitle: "Ваше бронирование отменено",
    cancelGreeting: (name, code, dates) => `Здравствуйте, ${name}! Подтверждаем, что бронирование <strong>${code}</strong> на ${dates} отменено.`,
    cancelRefund: (percent, usd) => `Согласно нашей политике отмены, вам полагается возврат <strong>${percent}%</strong> от уплаченной суммы (примерно <strong>$${usd} USD</strong> по текущему курсу), который мы обработаем в ближайшее время.`,
    cancelClosing: "По любым вопросам пишите нам в WhatsApp.",

    changeSubject: (code) => `Даты бронирования ${code} изменены`,
    changeTitle: "Даты вашего бронирования изменены",
    changeGreeting: (name, code) => `Здравствуйте, ${name}! Подтверждаем, что бронирование <strong>${code}</strong> теперь действует на следующие даты:`,
    changeClosing: "Если это не то, что вы ожидали, пожалуйста, свяжитесь с нами как можно скорее.",
  },
};

function getT(lang) {
  return T[lang] || T.es;
}

function confirmationEmail({ lang, guestName, dates, guests, bookingCode }) {
  const t = getT(lang);
  const html = `
    <h2>${t.confirmTitle}</h2>
    <p>${t.confirmGreeting(guestName)}</p>
    <p><strong>${dates}</strong></p>
    ${guests ? `<p>${t.guestsLine(guests)}</p>` : ""}
    ${bookingCode ? `<p>${t.codeLine(bookingCode)}</p>` : ""}
    <p>${t.confirmClosing}</p>
    ${guideFooter(lang)}
  `;
  return { subject: t.confirmSubject, html };
}

function cancellationEmail({ lang, guestName, bookingCode, dates, refundPercent, refundUSD }) {
  const t = getT(lang);
  const html = `
    <h2>${t.cancelTitle}</h2>
    <p>${t.cancelGreeting(guestName, bookingCode, dates)}</p>
    <p>${t.cancelRefund(refundPercent, refundUSD)}</p>
    <p>${t.cancelClosing}</p>
    ${guideFooter(lang)}
  `;
  return { subject: t.cancelSubject(bookingCode), html };
}

function dateChangeEmail({ lang, guestName, bookingCode, newDates }) {
  const t = getT(lang);
  const html = `
    <h2>${t.changeTitle}</h2>
    <p>${t.changeGreeting(guestName, bookingCode)}</p>
    <p><strong>${newDates}</strong></p>
    <p>${t.changeClosing}</p>
    ${guideFooter(lang)}
  `;
  return { subject: t.changeSubject(bookingCode), html };
}

module.exports = { confirmationEmail, cancellationEmail, dateChangeEmail, guideFooter };
