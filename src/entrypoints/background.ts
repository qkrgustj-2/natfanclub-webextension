export default defineBackground(() => {
  const VERIFY_ENDPOINT =
    'https://natfanclub-backend-809989871890.asia-southeast1.run.app/domain_verify';
  const VERIFY_TIMEOUT_MS = 8000;

  async function verifyDomain(url: string) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS);

    try {
      const response = await fetch(VERIFY_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Verify request failed: ${response.status}`);
      }

      return response.json();
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error('Verify request timeout');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  browser.runtime.onMessage.addListener((message: unknown) => {
    if (!message || typeof message !== 'object') return;

    const payload = message as { type?: string; url?: string };
    if (payload.type !== 'verify-url' || !payload.url) return;

    return verifyDomain(payload.url);
  });
});
