// =====================================================================
//  Réglages du site — à remplir une seule fois (voir GUIDE.md, étape 3)
// =====================================================================
window.SAT_CONFIG = {
  // Supabase > Project Settings > API > Project URL
  SUPABASE_URL: "https://ewsgzxjwaeglswioqhiu.supabase.co",

  // Supabase > Project Settings > API > "anon public" key
  // (cette clé est faite pour être publique : la sécurité vient des règles
  //  de la base de données, pas du secret de cette clé)
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3c2d6eGp3YWVnbHN3aW9xaGl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2MTUwNTgsImV4cCI6MjEwNzE5MTA1OH0.vOx8kpgYl0p_Ny07C9JCKWJn3MG4zoFocyFPosA1Sb0",

  // Domaine fictif utilisé pour transformer un identifiant ("clementine")
  // en adresse de connexion ("clementine@eleves.satmath.app").
  // Aucun e-mail n'est jamais envoyé. Ne pas changer après avoir créé des élèves.
  LOGIN_DOMAIN: "eleves.satmath.app",

  // Nom affiché sur les solutions et le panneau de révision
  TUTOR_NAME: "Thomas"
};
