const getEnv = (key, def = '') => process.env[key] || def

export async function sendSlackNotice(text) {
  try {
    const url = getEnv('SLACK_WEBHOOK_URL', '')
    if (!url || !text) return
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
  } catch {
    void 0
  }
}
