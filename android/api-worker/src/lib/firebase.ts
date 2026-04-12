export interface FirebaseUserRecord {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | undefined;
  photoURL: string | undefined;
  disabled: boolean;
}

export interface FirebaseVerifyResult {
  user: FirebaseUserRecord;
}

export interface FirebaseSignInResult {
  idToken: string;
  email: string;
  displayName?: string;
  localId: string;
  emailVerified?: boolean;
}

export async function verifyFirebaseToken(
  idToken: string,
  apiKey: string
): Promise<FirebaseUserRecord> {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Firebase token verification failed: ${response.status} - ${error}`);
  }

  const data = await response.json() as { users?: FirebaseUserRecord[] };
  
  if (!data.users || data.users.length === 0) {
    throw new Error('Invalid Firebase token: no user found');
  }

  return data.users[0];
}

export async function signInWithEmailPassword(
  email: string,
  password: string,
  apiKey: string
): Promise<FirebaseSignInResult> {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );

  if (!response.ok) {
    const error = await response.json() as { error?: { message: string } };
    throw new Error(error?.error?.message || `Firebase sign-in failed: ${response.status}`);
  }

  return response.json() as Promise<FirebaseSignInResult>;
}

export async function signUpWithEmailPassword(
  email: string,
  password: string,
  displayName: string,
  apiKey: string
): Promise<FirebaseSignInResult> {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, displayName, returnSecureToken: true }),
    }
  );

  if (!response.ok) {
    const error = await response.json() as { error?: { message: string } };
    throw new Error(error?.error?.message || `Firebase sign-up failed: ${response.status}`);
  }

  return response.json() as Promise<FirebaseSignInResult>;
}

export async function sendPasswordResetEmail(
  email: string,
  apiKey: string
): Promise<void> {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestType: 'PASSWORD_RESET', email }),
    }
  );

  if (!response.ok) {
    const error = await response.json() as { error?: { message: string } };
    throw new Error(error?.error?.message || `Firebase password reset failed: ${response.status}`);
  }
}

export function getFirebaseApiKey(env: { FIREBASE_API_KEY?: string }): string {
  if (!env.FIREBASE_API_KEY) {
    throw new Error('FIREBASE_API_KEY is not configured');
  }
  return env.FIREBASE_API_KEY;
}