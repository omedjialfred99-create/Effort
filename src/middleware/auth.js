import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'clinique-effort-super-secret-jwt-key-2026';

export function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Non authentifié' });
  }
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || req.user.password_setup || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès refusé' });
    }
    next();
  };
}
