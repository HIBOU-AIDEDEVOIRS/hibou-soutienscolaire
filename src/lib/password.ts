export const MIN_PASSWORD = 6;

/**
 * Client-side check run before asking the backend to change a password.
 * Returns the message to show the student, or null when both fields are fine.
 */
export function passwordIssue(password: string, confirm: string): string | null {
  if (password.trim().length < MIN_PASSWORD) {
    return `Mot de passe trop court : ${MIN_PASSWORD} caractères minimum.`;
  }
  if (password !== confirm) return "Les deux mots de passe ne sont pas identiques.";
  return null;
}

/**
 * Turns a backend password error into something a collégien can act on.
 * `onResetPage` picks the right wording for an expired session: on the reset
 * page the link itself is what expired, in the settings it is the login.
 */
export function friendlyPasswordError(err: unknown, onResetPage = false): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/different from the old password/i.test(msg)) return "Choisis un mot de passe différent de l'ancien.";
  if (/at least 6 characters|too short/i.test(msg) || (/password/i.test(msg) && /character/i.test(msg))) {
    return "Mot de passe trop court : 6 caractères minimum.";
  }
  if (/sensitive operation|please reauthenticate|fresh state/i.test(msg)) {
    return "Reconnecte-toi, puis réessaie de changer ton mot de passe.";
  }
  if (/Auth session missing|invalid grant|expired|Invalid refresh token/i.test(msg)) {
    return onResetPage
      ? "Ton lien a expiré. Demande un nouveau lien de réinitialisation."
      : "Tu n'es plus connecté : reconnecte-toi pour changer ton mot de passe.";
  }
  return msg;
}
