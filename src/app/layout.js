'use client'
import "./globals.css";
import { Provider } from 'react-redux';
import { store, persistor } from '@/store/store';
import { PersistGate } from "redux-persist/integration/react";
import { initializeApp } from "firebase/app";
import { getApps } from "firebase/app";
import '@splidejs/react-splide/css';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import axios from 'axios';
// import { useSelector } from 'react-redux';

export default function RootLayout({ children }) {
  // const authInfo = useSelector(state => state.auth);

  if (!getApps().length) {
    initializeApp({
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    });
  }


  return (
    <html lang="en">
      <body className={`antialiased`}>
        <Provider store={store}>
          <PersistGate persistor={persistor}>
            {children}
          </PersistGate>
        </Provider>
        {/* Default container: catches toast()/toast.error() calls that don't
            set a containerId (e.g. the login screen). */}
        <ToastContainer position="bottom-right" autoClose={4000} />
        {/* Dedicated containers for the styled helpers in _helpers/toasters.js,
            which route by containerId. */}
        <ToastContainer containerId="info-toast" position="bottom-right" />
        <ToastContainer containerId="error-toast" position="bottom-right" />
      </body>
    </html>
  );
}
