/**
 * Ürün kararıyla kapatılmış, kodu duran yollar.
 *
 * <p>Burası "ölü kod" dosyası değil — silinmesi değil, BEKLETİLMESİ
 * kararlaştırılmış akışların tek anahtarı. Bir akışı iki ayrı çağrı yerinde
 * ayrı ayrı yorum satırına almak, birinin açık unutulmasıyla biter; o yüzden
 * anahtar tek ve ikisi de buradan okuyor.
 */

/**
 * Misafir hesabın e-posta + parola ile kalıcı hesaba yükseltilmesi.
 *
 * <p>🔴 <b>2026-09-20 itibarıyla KAPALI (sahibin kararı).</b> Kapatılan şey
 * arayüz: iki giriş noktası da bu bayrağa bakıyor —
 * {@code settings/profile-edit} içindeki "E-posta ekle" kartı ve
 * {@code useAccountPrompt}'un 5. başarılı sonuçtan sonra çıkardığı uyarı.
 * Sunucu ucu ({@code POST /api/users/me/upgrade}) ve {@code /register?upgrade=1}
 * ekranı olduğu gibi duruyor; geri açmak bunu {@code true} yapmaktır.
 *
 * <p><b>Neden.</b> Yükseltme sunucuda aynı satıra e-posta ve parola yazarken
 * {@code external_provider_id}'yi de NULL'lıyor — yani hesabı cihaza bağlayan
 * {@code device_key} bağı kopuyor ve o andan sonra hesaba tek giriş yolu
 * e-posta + parola oluyor. O e-posta ise doğrulanmıyor: teyit postası yok,
 * adres güvenle alınıyor. Adresini yanlış yazan kullanıcı bunu ancak başka
 * bir cihazda fark eder ve parola sıfırlama postası da sahibi olmadığı bir
 * adrese gider — hesabı, galerisi ve kredileri erişilemez kalır.
 *
 * <p>Yani bugünkü hâliyle akış, kullanıcıya güvenlik vaat edip karşılığında
 * tek kurtarma yolunu (cihaz kimliği) elinden alıyor. E-posta doğrulaması
 * (GAPS P1-10) geldiğinde açılacak.
 */
export const GUEST_EMAIL_UPGRADE_ENABLED = false;
