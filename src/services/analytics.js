import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase.js";

export async function getVisitorGeo() {
  try {
    const cached = localStorage.getItem("gdVisitorGeo");
    if (cached) return JSON.parse(cached);

    const res = await fetch("https://ipwho.is/");
    const data = await res.json();

    const geo = {
      city: data.city || "",
      country: data.country || "",
      countryCode: data.country_code || "",
      latitude: Number(data.latitude || 0),
      longitude: Number(data.longitude || 0),
      timezone: data.timezone?.id || "",
    };

    localStorage.setItem("gdVisitorGeo", JSON.stringify(geo));
    return geo;
  } catch {
    return {
      city: "",
      country: "",
      countryCode: "",
      latitude: 0,
      longitude: 0,
      timezone: "",
    };
  }
}

export async function trackFunnelStep(step, extra = {}) {
  try {
    const visitorId = localStorage.getItem("gdVisitorId");
    if (!visitorId) return;

    const eventTime = Date.now();

    await setDoc(
      doc(db, "funnelEvents", `${visitorId}-${step}-${eventTime}`),
      {
        visitorId,
        step,
        createdAtMs: eventTime,
        createdAt: serverTimestamp(),
        path: window.location.pathname || "/",
        ...extra,
      },
      { merge: true },
    );
  } catch {}
}
