/**
 * @format
 */

import {AppRegistry} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App from './App';
import {name as appName} from './app.json';

// v4.58: handler radice per i push arrivati a processo spento. Le push del
// portale hanno sempre il blocco "notification" (Android le mostra da solo
// anche a app chiusa), ma con questo handler anche eventuali futuri messaggi
// solo-data verrebbero consegnati senza perdere nulla.
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('[PFC] push in background/kill:', remoteMessage?.data);
});

AppRegistry.registerComponent(appName, () => App);
