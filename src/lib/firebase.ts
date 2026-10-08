import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyD--el_4Kbn9UM4tH-RIYexq9HeADM0twE",
  authDomain: "gen-lang-client-0062305766.firebaseapp.com",
  projectId: "gen-lang-client-0062305766",
  storageBucket: "gen-lang-client-0062305766.firebasestorage.app",
  messagingSenderId: "412099378603",
  appId: "1:412099378603:web:3af283e5e3423a5d1226ee"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
