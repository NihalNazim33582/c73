import firebase from 'firebase'
require('@firebase/firestore')

var firebaseConfig = {
    apiKey: "AIzaSyDwnCkUg962mUojs2kXLs5H3hazQmocukE",
    authDomain: "willy-libary-app.firebaseapp.com",
    projectId: "willy-libary-app",
    storageBucket: "willy-libary-app.appspot.com",
    messagingSenderId: "850347410965",
    appId: "1:850347410965:web:c24ce1cff890fe1398f01c"
  };

  firebase.initializeApp(firebaseConfig);
  export default firebase.firestore();