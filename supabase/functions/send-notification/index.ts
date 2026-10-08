import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const ADMIN_EMAIL = "notipersonales2026@gmail.com";
const FROM_ADDRESS = "onboarding@resend.dev";

interface NotificationRequest {
  type: "registration" | "case_creation";
  userEmail?: string;
  userName?: string;
  userData?: {
    nombre_completo: string;
    cedula: string;
    celular: string;
    direccion: string;
    email: string;
  };
  caseData?: {
    numero_expediente: string;
    titulo: string;
    area_juridica: string;
    documentos: string[];
  };
  recipientEmail?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body: NotificationRequest = await req.json();

    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "RESEND_API_KEY not configured. Email notifications are pending.",
          pending: true,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const results: { recipient: string; success: boolean; error?: string }[] = [];

    if (body.type === "registration") {
      const d = body.userData;

      // 1. Notify admin
      const adminHtml = `
        <h2>Nuevo registro de cliente</h2>
        <p>Se ha registrado un nuevo cliente en LEXACASO:</p>
        <ul>
          <li><strong>Nombre:</strong> ${d?.nombre_completo || "—"}</li>
          <li><strong>Cédula:</strong> ${d?.cedula || "—"}</li>
          <li><strong>Celular:</strong> ${d?.celular || "—"}</li>
          <li><strong>Dirección:</strong> ${d?.direccion || "—"}</li>
          <li><strong>Correo:</strong> ${d?.email || "—"}</li>
        </ul>
        <p>Fecha: ${new Date().toLocaleString("es-CO")}</p>
      `;
      const adminResult = await sendEmail(resendApiKey, ADMIN_EMAIL, "LEXACASO — Nuevo cliente registrado", adminHtml);
      const adminErr = adminResult.ok ? undefined : await adminResult.text();
      results.push({ recipient: ADMIN_EMAIL, success: adminResult.ok, error: adminErr });

      // 2. Send confirmation to client (may fail on free tier if domain not verified)
      if (body.userData?.email) {
        await sleep(500);
        const userHtml = `
          <h2>Confirmación de registro — LEXACASO</h2>
          <p>Su cuenta ha sido creada correctamente.</p>
          <h3>Resumen de sus datos:</h3>
          <ul>
            <li><strong>Nombre:</strong> ${d?.nombre_completo || "—"}</li>
            <li><strong>Cédula:</strong> ${d?.cedula || "—"}</li>
            <li><strong>Celular:</strong> ${d?.celular || "—"}</li>
            <li><strong>Dirección:</strong> ${d?.direccion || "—"}</li>
            <li><strong>Correo:</strong> ${d?.email || "—"}</li>
          </ul>
          <p>Su autorización para el tratamiento de datos personales ha sido registrada (Política v1.0).</p>
          <p>Fecha de registro: ${new Date().toLocaleString("es-CO")}</p>
        `;
        const userResult = await sendEmail(resendApiKey, body.userData.email, "Confirmación de registro — LEXACASO", userHtml);
        const userErr = userResult.ok ? undefined : await userResult.text();
        results.push({ recipient: body.userData.email, success: userResult.ok, error: userErr });
      }
    } else if (body.type === "case_creation") {
      const c = body.caseData;
      const clientEmail = body.recipientEmail || body.userEmail || "";

      // 1. Notify admin
      const adminHtml = `
        <h2>Nuevo expediente creado</h2>
        <p>Se ha creado un nuevo expediente:</p>
        <ul>
          <li><strong>Número:</strong> ${c?.numero_expediente || "—"}</li>
          <li><strong>Título:</strong> ${c?.titulo || "—"}</li>
          <li><strong>Cliente:</strong> ${body.userName || "—"}</li>
          <li><strong>Correo:</strong> ${body.userEmail || "—"}</li>
        </ul>
      `;
      const adminResult = await sendEmail(resendApiKey, ADMIN_EMAIL, "LEXACASO — Nuevo expediente creado", adminHtml);
      const adminErr = adminResult.ok ? undefined : await adminResult.text();
      results.push({ recipient: ADMIN_EMAIL, success: adminResult.ok, error: adminErr });

      // 2. Send constancia to client
      if (clientEmail) {
        await sleep(500);
        const clientHtml = `
          <h2>Constancia de expediente</h2>
          <p>Se ha creado un expediente a su nombre:</p>
          <ul>
            <li><strong>Número:</strong> ${c?.numero_expediente || "—"}</li>
            <li><strong>Título:</strong> ${c?.titulo || "—"}</li>
            <li><strong>Área jurídica:</strong> ${c?.area_juridica || "—"}</li>
            <li><strong>Fecha de registro:</strong> ${new Date().toLocaleString("es-CO")}</li>
          </ul>
          ${c?.documentos && c.documentos.length > 0 ? `
            <h3>Documentos cargados:</h3>
            <ul>${c.documentos.map((doc) => `<li>${doc}</li>`).join("")}</ul>
          ` : "<p>No se cargaron documentos adicionales.</p>"}
          <p>Puede consultar el estado de su caso en la plataforma LEXACASO.</p>
        `;
        const clientResult = await sendEmail(resendApiKey, clientEmail, "LEXACASO — Constancia de expediente creado", clientHtml);
        const clientErr = clientResult.ok ? undefined : await clientResult.text();
        results.push({ recipient: clientEmail, success: clientResult.ok, error: clientErr });
      }
    }

    const allSuccess = results.every((r) => r.success);
    const failed = results.filter((r) => !r.success);

    return new Response(
      JSON.stringify({
        success: allSuccess,
        results,
        partialFailure: failed.length > 0
          ? "Algunos correos no pudieron enviarse. Para enviar a correos que no sean del administrador, verifique un dominio en resend.com/domains."
          : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function sendEmail(apiKey: string, to: string, subject: string, html: string): Promise<Response> {
  const payload = JSON.stringify({ from: FROM_ADDRESS, to, subject, html });
  const headers = {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  let response = await fetch("https://api.resend.com/emails", { method: "POST", headers, body: payload });

  if (!response.ok) {
    await sleep(1000);
    response = await fetch("https://api.resend.com/emails", { method: "POST", headers, body: payload });
  }

  return response;
}
