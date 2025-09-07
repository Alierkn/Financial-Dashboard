import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

// =================================================================================
// ÖNEMLİ: Firebase Yapılandırması
// =================================================================================
// Bu uygulamayı kullanmak için kendi Firebase projenizi kurmanız ve
// yapılandırma ayrıntılarını aşağıya doldurmanız gerekir.
//
// 1. Firebase Konsolu'na gidin: https://console.firebase.google.com/
// 2. Yeni bir proje oluşturun veya mevcut bir projeyi seçin.
// 3. Proje ayarlarına gidin (dişli simgesine tıklayın).
// 4. "Genel" sekmesinde, "Uygulamalarınız" altında, yeni bir Web uygulaması oluşturun
//    veya mevcut olanı bulun.
// 5. `firebaseConfig` nesnesini bulun ve değerlerini buraya kopyalayın.
// =================================================================================
const firebaseConfig = {
  apiKey: "AIzaSyCSU0uhNCAiQvyvLM5uZxvOJi7TN34H5hQ",
  authDomain: "financialdashboard-4b23e.firebaseapp.com",
  projectId: "financialdashboard-4b23e",
  storageBucket: "financialdashboard-4b23e.firebasestorage.app",
  messagingSenderId: "734257592555",
  appId: "1:734257592555:web:c7bff06aef0de1361f26ae",
  measurementId: "G-LMELYRSPNE"
};


// Bu kontrol, Firebase yapılandırmasının doldurulup doldurulmadığını belirler.
// Bu değerler değiştirilene kadar uygulama bir kurulum ekranı gösterecektir.
export const isFirebaseConfigured = !!firebaseConfig.projectId && firebaseConfig.projectId !== 'your-project-id';

// Firebase'i yalnızca henüz başlatılmamışsa başlatın.
// DÜZELTME: Başlatma işlemi artık `isFirebaseConfigured` kontrolünün DIŞINDA
// gerçekleşiyor. Bu, uygulamanın çökmesini önler ve bunun yerine
// yapılandırma yanlışsa Firebase SDK'sının kendi hatalarını vermesini sağlar.
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Hizmetleri başlatın. Artık null olmayacaklar.
const auth = firebase.auth();
const googleProvider = new firebase.auth.GoogleAuthProvider();
const db = firebase.firestore();

// --- DÜZELTME: Oturum kalıcılığını açıkça ayarlayın ---
// Bu, oturumlar arasında verilerin kaydedilmemesi sorununun temel çözümüdür.
// Varsayılan olarak, Firebase oturumu sürdürmelidir, ancak bazen bu belirli
// ortamlarda başarısız olabilir. Kalıcılığı açıkça `LOCAL` olarak ayarlamak,
// kullanıcının tarayıcı penceresini veya sekmesini kapattıktan sonra oturumunun
// açık kalmasını sağlar. Geri döndüklerinde, uygulama onları tanıyacak ve
// kayıtlı verilerini yükleyerek "sıfırdan başlama" sorununu önleyecektir.
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
  .catch((error) => {
    // Bu hata kısıtlayıcı ortamlarda (ör. özel tarama,
    // devre dışı bırakılmış üçüncü taraf çerezleri) meydana gelebilir. Bunu günlüğe kaydetmek, kalıcılık başarısız olursa hata ayıklamaya yardımcı olur.
    console.error("Firebase Auth: Could not set session persistence.", error);
  });

// Başlatılan hizmetleri dışa aktarın.
export { auth, googleProvider, db, firebase };