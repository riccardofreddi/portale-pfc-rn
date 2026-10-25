package com.portalepfcrn
import expo.modules.ReactActivityDelegateWrapper

import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

    override fun getMainComponentName(): String? = "PortalePFCRN"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        createNotificationChannel()
    }

    /**
     * v4.118 — IL CANALE GIUSTO, A PROCESSO AVVIATO.
     *
     * Prima qui nasceva il canale "pfc-notifications" ("Avvisi Portale
     * PFC"), che NESSUNO usava: il server e il manifest puntano a
     * "pfc-alerts-v2", che nasceva solo da JavaScript e solo dopo il
     * permesso. Conseguenza reale: alla PRIMA notifica dopo l'install
     * (o senza permesso), il canale giusto non esisteva ancora e Android
     * usava il canale di riserva con importanza normale: niente popup,
     * niente vibrazione, e nelle impostazioni di sistema comparivano
     * DUE canali di cui uno morto.
     *
     * Ora:
     * - "pfc-alerts-v2" ("Avvisi del portale", IMPORTANCE_HIGH) nasce
     *   QUI, prima ancora che JavaScript parta: la prima push del server
     *   trova sempre il canale giusto (il create fatto poi da JS non
     *   cambia l'importanza di un canale esistente: nessuna gara);
     * - i canali MORTI delle versioni precedenti vengono cancellati:
     *   "pfc-notifications" (mai usato) e "download" (era della funzione
     *   notificaDownload, rimossa come codice morto in v4.118);
     *   deleteNotificationChannel su un canale inesistente è un no-op
     *   silenzioso, quindi nessun problema sulle copie pulite.
     */
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = getSystemService(NotificationManager::class.java)

            val canaleAvvisi = NotificationChannel(
                "pfc-alerts-v2",
                "Avvisi del portale",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Nuovi documenti, messaggi e scadenze dello studio"
                enableVibration(true)
                enableLights(true)
            }
            notificationManager?.createNotificationChannel(canaleAvvisi)

            notificationManager?.deleteNotificationChannel("pfc-notifications")
            notificationManager?.deleteNotificationChannel("download")
        }
    }

    override fun createReactActivityDelegate(): ReactActivityDelegate =
        ReactActivityDelegateWrapper(this, BuildConfig.IS_NEW_ARCHITECTURE_ENABLED, DefaultReactActivityDelegate(this, mainComponentName!!, fabricEnabled = DefaultNewArchitectureEntryPoint.fabricEnabled))
}
