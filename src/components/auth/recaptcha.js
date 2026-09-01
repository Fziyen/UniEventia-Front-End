import { useEffect, useRef, useState } from "react";

const siteKey = process.env.REACT_APP_RECAPTCHA_SITE_KEY || "";
const scriptId = "google-recaptcha-v3";

export function useRecaptcha(action) {
  const [unavailable, setUnavailable] = useState(!siteKey);
  const scriptPromise = useRef(null);

  useEffect(() => {
    if (!siteKey) return undefined;

    const loadScript = () => {
      if (window.grecaptcha) return Promise.resolve(window.grecaptcha);

      const existingScript = document.getElementById(scriptId);
      if (existingScript) {
        return new Promise((resolve, reject) => {
          existingScript.addEventListener(
            "load",
            () => resolve(window.grecaptcha),
            {
              once: true,
            },
          );
          existingScript.addEventListener("error", reject, { once: true });
        });
      }

      const script = document.createElement("script");
      script.id = scriptId;
      script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
      script.async = true;
      script.defer = true;

      return new Promise((resolve, reject) => {
        script.onload = () => resolve(window.grecaptcha);
        script.onerror = reject;
        document.head.appendChild(script);
      });
    };

    scriptPromise.current = loadScript()
      .then((captcha) => {
        if (!captcha) throw new Error("Google reCAPTCHA did not load.");
        setUnavailable(false);
        return captcha;
      })
      .catch((error) => {
        setUnavailable(true);
        throw error;
      });

    return () => {
      scriptPromise.current = null;
    };
  }, []);

  const getToken = async () => {
    if (!siteKey) {
      throw new Error("Google reCAPTCHA is not configured for this frontend.");
    }

    const captcha = await scriptPromise.current;
    await new Promise((resolve) => captcha.ready(resolve));
    return captcha.execute(siteKey, { action });
  };

  return { getToken, unavailable };
}
