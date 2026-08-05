import { browser } from '$app/environment';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
	apiKey: 'AIzaSyB6iRU3ltlrq6BD3uRLqyahmixaneTcT6M',
	authDomain: 'aliyot-signups.firebaseapp.com',
	projectId: 'aliyot-signups',
	storageBucket: 'aliyot-signups.firebasestorage.app',
	messagingSenderId: '1034038430434',
	appId: '1:1034038430434:web:5aef189b3943dd9a06acbb'
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = browser ? getAuth(app) : null;
