import { initializeApp, type FirebaseOptions } from '@firebase/app'
import { getAuth } from '@firebase/auth'

const config: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  ...(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ? { messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID } : {}),
}

const configured = Boolean(config.apiKey && config.authDomain && config.projectId && config.appId)
export const firebaseAuth = configured ? getAuth(initializeApp(config)) : null
export const firebaseAuthConfigured = configured
