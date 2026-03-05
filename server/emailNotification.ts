const NOTIFY_EMAIL = "kristian.toth277@gmail.com";

function formatTime(date: Date): string {
  return date.toLocaleString("sk-SK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Bratislava",
  });
}

function formatPrice(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",") + " €";
}

export async function sendBookingNotification(booking: {
  id: number;
  facilityName: string;
  sportType: string;
  startTime: Date;
  endTime: Date;
  totalPrice: number;
  userName?: string;
  userEmail?: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log("[Email] RESEND_API_KEY not set, skipping notification");
    return;
  }

  const sportEmoji: Record<string, string> = {
    badminton: "🏸",
    bowling: "🎳",
    table_tennis: "🏓",
    vr: "🥽",
  };
  const emoji = sportEmoji[booking.sportType] ?? "📅";

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #f9f9f9; padding: 24px; border-radius: 12px;">
      <h2 style="color: #cc0000; margin-top: 0;">Nová rezervácia ${emoji}</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; color: #555; width: 140px;"><strong>Zariadenie:</strong></td><td style="padding: 8px 0;">${booking.facilityName}</td></tr>
        <tr><td style="padding: 8px 0; color: #555;"><strong>Začiatok:</strong></td><td style="padding: 8px 0;">${formatTime(booking.startTime)}</td></tr>
        <tr><td style="padding: 8px 0; color: #555;"><strong>Koniec:</strong></td><td style="padding: 8px 0;">${formatTime(booking.endTime)}</td></tr>
        <tr><td style="padding: 8px 0; color: #555;"><strong>Cena:</strong></td><td style="padding: 8px 0; font-weight: bold; color: #cc0000;">${formatPrice(booking.totalPrice)}</td></tr>
        ${booking.userName ? `<tr><td style="padding: 8px 0; color: #555;"><strong>Zákazník:</strong></td><td style="padding: 8px 0;">${booking.userName}</td></tr>` : ""}
        ${booking.userEmail ? `<tr><td style="padding: 8px 0; color: #555;"><strong>Email:</strong></td><td style="padding: 8px 0;"><a href="mailto:${booking.userEmail}">${booking.userEmail}</a></td></tr>` : ""}
        <tr><td style="padding: 8px 0; color: #555;"><strong>ID rezervácie:</strong></td><td style="padding: 8px 0;">#${booking.id}</td></tr>
      </table>
      <p style="margin-top: 20px; font-size: 12px; color: #999;">ZaraMia Sport &amp; Fun · play.zaramia.sk</p>
    </div>
  `;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "ZaraMia <onboarding@resend.dev>",
        to: [NOTIFY_EMAIL],
        subject: `Nová rezervácia #${booking.id} – ${booking.facilityName}`,
        html: htmlBody,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[Email] Resend error:", err);
    } else {
      console.log(`[Email] Notifikácia odoslaná pre rezerváciu #${booking.id}`);
    }
  } catch (err) {
    console.error("[Email] Chyba pri odosielaní:", err);
  }
}
