const PROVIDERS = [
  { id: "smsa", name: "سمسا", envKey: "SMSA_API_KEY" },
  { id: "aramex", name: "أرامكس", envKey: "ARAMEX_API_KEY" },
  { id: "spl", name: "البريد السعودي / سبل", envKey: "SPL_API_KEY" },
  { id: "dhl", name: "DHL", envKey: "DHL_API_KEY" },
];

const json = (response, status, body) => response.status(status).json(body);

function configuredProviders() {
  return PROVIDERS.map((provider) => ({
    id: provider.id,
    name: provider.name,
    configured: Boolean(process.env[provider.envKey]),
    envKey: provider.envKey,
  }));
}

function parseBody(request) {
  if (!request.body) return {};
  if (typeof request.body === "string") {
    try {
      return JSON.parse(request.body);
    } catch (error) {
      return {};
    }
  }
  return request.body;
}

export default async function handler(request, response) {
  if (request.method === "GET") {
    return json(response, 200, {
      ok: true,
      providers: configuredProviders(),
      actions: ["rates", "track", "create-shipment"],
    });
  }

  if (request.method !== "POST") {
    response.setHeader("Allow", "GET, POST");
    return json(response, 405, {
      ok: false,
      message: "طريقة الطلب غير مدعومة",
    });
  }

  const body = parseBody(request);
  const provider = String(body.provider || "").trim().toLowerCase();
  const action = String(body.action || "").trim().toLowerCase();
  const providerConfig = PROVIDERS.find((item) => item.id === provider);

  if (!providerConfig) {
    return json(response, 400, {
      ok: false,
      message: "اختر شركة شحن صحيحة",
      providers: configuredProviders(),
    });
  }

  if (!process.env[providerConfig.envKey]) {
    return json(response, 501, {
      ok: false,
      message: `أضف ${providerConfig.envKey} في Vercel قبل تفعيل ${providerConfig.name}`,
    });
  }

  return json(response, 501, {
    ok: false,
    provider,
    action,
    message:
      "تم تجهيز مدخل الشحن. الخطوة التالية هي ربط طلبات هذه الشركة حسب وثائقها الرسمية.",
  });
}
