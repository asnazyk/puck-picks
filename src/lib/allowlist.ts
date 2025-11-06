export function getAllowlist(){const raw=process.env.ALLOWED_EMAILS||'';return new Set(raw.split(',').map(s=>s.trim().toLowerCase()).filter(Boolean))}
