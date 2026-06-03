#include <SPI.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ILI9341.h>
#include <XPT2046_Touchscreen.h>
#include <esp_now.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include "qris_qrc.h"

// ====== TEMA WARNA MODERN (RGB565) ======
#define COLOR_BG        0x10A2  // Dark Navy Blue
#define COLOR_CARD      0x18E3  // Lighter Navy (untuk header/aksen)
#define COLOR_BTN_300   0x03EF  // Modern Blue
#define COLOR_BTN_1L    0xE248  // Modern Red/Coral
#define COLOR_SUCCESS   0x05A7  // Modern Green
#define COLOR_TEXT_DIM  0xBDD7  // Light Gray
#define COLOR_WARNING   0xFDA0  // Modern Orange

// ====== KONFIGURASI WIFI & BACKEND ======
const char* ssid = "hydropay";
const char* password = "hyrdopay123";

const char* serverName = "http://10.197.22.242:8086/api/hardware/transactions";
const char* hardwareApiKey = "hydropay_esp32_pakgufi";

// ====== PIN LAYAR & SENTUH ======
#define TFT_SCLK 18
#define TFT_MOSI 21
#define TFT_CS   15
#define TFT_DC    2
#define TFT_RST   4

#define T_CLK     5
#define T_DIN     6
#define T_DO      7
#define T_CS      8

#define TS_MINX 3800
#define TS_MAXX 300
#define TS_MINY 300
#define TS_MAXY 3800
#define MIN_PRESSURE 20

Adafruit_ILI9341 tft = Adafruit_ILI9341(&SPI, TFT_DC, TFT_CS, TFT_RST);
SPIClass touchSPI(FSPI);
XPT2046_Touchscreen ts(T_CS);

bool isWaitingForPayment = false;
bool isWaitingForGlass = false;
bool isWaiting = false;
unsigned long glassWaitStartTime = 0;

uint8_t receiverMacAddress[] = {0x98, 0xA3, 0x16, 0xE5, 0xED, 0x1C};

typedef struct struct_message {
  int cmdType;
  float volume;
} struct_message;

struct_message myData;
esp_now_peer_info_t peerInfo;

const float MS_PER_ML = 11211.6 / 330.0;

volatile bool glassDetectedSignal = false;
int pendingSeconds = 0;
float pendingVolume = 0.0;
int pendingAmount = 0;
int pendingMl = 0;

volatile int espNowDeliveryStatus = -1; // -1: menunggu, 0: sukses, 1: gagal

void OnDataSent(const wifi_tx_info_t *tx_info, esp_now_send_status_t status) {
  Serial.print("\r\n[ESP-NOW] Status Pengiriman Ke Pump: ");
  Serial.println(status == ESP_NOW_SEND_SUCCESS ? "SUKSES" : "GAGAL");
  espNowDeliveryStatus = (status == ESP_NOW_SEND_SUCCESS) ? 0 : 1;
}

void OnDataRecv(const esp_now_recv_info_t *recv_info, const uint8_t *incomingData, int len) {
  struct_message dataMasuk;
  memcpy(&dataMasuk, incomingData, sizeof(dataMasuk));

  if (dataMasuk.cmdType == 3) {
    Serial.println("\n[ESP-NOW] Sinyal dari Pump Diterima: Gelas Terdeteksi!");
    glassDetectedSignal = true;
  }
}

bool ensureWiFiConnected() {
  if (WiFi.status() == WL_CONNECTED) {
    return true;
  }

  Serial.println("[INFO] WiFi terputus, mencoba reconnect...");
  WiFi.disconnect();
  WiFi.begin(ssid, password);

  for (int i = 0; i < 10; i++) {
    if (WiFi.status() == WL_CONNECTED) {
      Serial.println("[INFO] WiFi reconnect sukses. IP: " + WiFi.localIP().toString());
      return true;
    }
    delay(500);
    Serial.print(".");
  }

  Serial.println("\n[ERROR] WiFi reconnect gagal.");
  return false;
}

bool sendTransactionToBackend(int amount, const String& status, int ml, const String& reason) {
  if (!ensureWiFiConnected()) {
    Serial.println("[ERROR] Transaksi tidak terkirim karena WiFi offline.");
    return false;
  }

  HTTPClient http;
  http.setTimeout(5000);
  http.begin(serverName);
  http.addHeader("Content-Type", "application/json");
  if (strlen(hardwareApiKey) > 0) {
    http.addHeader("x-hydropay-device-key", hardwareApiKey);
  }

  String details = reason + " - " + String(ml) + " ml";

  String payload = "{";
  payload += "\"amount\":" + String(amount) + ",";
  payload += "\"status\":\"" + status + "\",";
  payload += "\"details\":\"" + details + "\"";
  payload += "}";

  Serial.println("[INFO] Mengirim transaksi ke Backend:");
  Serial.println(payload);

  int httpResponseCode = http.POST(payload);

  if (httpResponseCode > 0) {
    Serial.print("[INFO] HTTP Response code: ");
    Serial.println(httpResponseCode);
    Serial.println("[INFO] Response Backend:");
    Serial.println(http.getString());

    http.end();
    return httpResponseCode >= 200 && httpResponseCode < 300;
  }

  Serial.print("[ERROR] HTTP Request gagal: ");
  Serial.println(http.errorToString(httpResponseCode).c_str());

  http.end();
  return false;
}

void showMacAddressOnScreen();
void drawMenu();
void drawWaitingForGlassScreen();
void startWaitingScreen(int seconds);
void drawQRIS(String payload, String selectedOption, int amount);

void setup() {
  Serial.begin(115200);
  delay(1000);

  SPI.begin(TFT_SCLK, -1, TFT_MOSI, TFT_CS);
  tft.begin();
  tft.setRotation(1);

  touchSPI.begin(T_CLK, T_DO, T_DIN, T_CS);
  ts.begin(touchSPI);
  ts.setRotation(1);

  // --- SPLASH SCREEN NETWORK ---
  tft.fillScreen(COLOR_BG);
  tft.setTextColor(ILI9341_WHITE);
  tft.setTextSize(2);
  tft.setCursor(60, 100);
  tft.print("Mencari WiFi...");
  tft.setTextColor(COLOR_WARNING);
  tft.setCursor(60, 130);
  tft.print(ssid);

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  Serial.print("[INFO] Menghubungkan ke WiFi");

  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < 15) {
    delay(500);
    Serial.print(".");
    retries++;
  }

  tft.fillScreen(COLOR_BG);
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[INFO] WiFi Terhubung! IP: " + WiFi.localIP().toString());
    
    // Icon Checkmark
    tft.fillCircle(160, 70, 25, COLOR_SUCCESS);
    tft.setTextColor(ILI9341_WHITE);
    tft.setTextSize(3);
    tft.setCursor(150, 60);
    tft.print("v"); 

    tft.setTextSize(2);
    tft.setCursor(80, 120);
    tft.print("Sistem Online");
    
    tft.setTextColor(COLOR_TEXT_DIM);
    tft.setTextSize(1);
    tft.setCursor(105, 145);
    tft.print("IP: "); tft.print(WiFi.localIP().toString());
  } else {
    tft.fillCircle(160, 70, 25, COLOR_BTN_1L);
    tft.setTextColor(ILI9341_WHITE);
    tft.setTextSize(3);
    tft.setCursor(150, 60);
    tft.print("X");

    tft.setTextSize(2);
    tft.setCursor(80, 120);
    tft.print("Mode Offline");
  }

  showMacAddressOnScreen();

  delay(5000); // Ditahan 5 detik agar sempat difoto

  if (esp_now_init() != ESP_OK) {
    Serial.println("[ERROR] Gagal Inisialisasi ESP-NOW");
    return;
  }

  esp_now_register_send_cb(OnDataSent);
  esp_now_register_recv_cb(OnDataRecv);

  memcpy(peerInfo.peer_addr, receiverMacAddress, 6);
  peerInfo.channel = 0;
  peerInfo.encrypt = false;
  esp_now_add_peer(&peerInfo);

  drawMenu();
}

void loop() {
  if (isWaitingForPayment) {
    if (ts.touched()) {
      long x_sum = 0, y_sum = 0, z_sum = 0;

      for (int i = 0; i < 10; i++) {
        TS_Point p = ts.getPoint();
        x_sum += p.x; y_sum += p.y; z_sum += p.z;
      }
      int avg_z = z_sum / 10;

      if (avg_z > MIN_PRESSURE) {
        int avg_x = x_sum / 10;
        int avg_y = y_sum / 10;
        int x = map(avg_x, TS_MINX, TS_MAXX, 0, 320);
        int y = map(avg_y, TS_MINY, TS_MAXY, 0, 240);

        // Kordinat tombol "Sudah Bayar" yang baru
        if (x > 180 && x < 310 && y > 150 && y < 220) {
          isWaitingForPayment = false;

          tft.fillScreen(COLOR_BG);
          tft.fillCircle(160, 100, 35, COLOR_SUCCESS);
          tft.setTextColor(ILI9341_WHITE);
          tft.setTextSize(3);
          tft.setCursor(75, 160);
          tft.print("PEMBAYARAN");
          tft.setCursor(100, 190);
          tft.print("SUKSES");

          sendTransactionToBackend(pendingAmount, "Success", pendingMl, "QRIS payment accepted");
          delay(1000);

          // === LOGIKA FEEDBACK ESP-NOW UI ===
          glassDetectedSignal = false;
          myData.cmdType = 1;
          myData.volume = pendingVolume;

          espNowDeliveryStatus = -1;

          tft.fillScreen(COLOR_BG);
          tft.setTextColor(ILI9341_WHITE);
          tft.setTextSize(2);
          tft.setCursor(40, 100);
          tft.print("Menghubungi Pompa...");

          esp_err_t result = esp_now_send(receiverMacAddress, (uint8_t *) &myData, sizeof(myData));

          if (result == ESP_OK) {
            unsigned long waitStart = millis();
            while (espNowDeliveryStatus == -1 && millis() - waitStart < 1000) {
              delay(10);
            }

            if (espNowDeliveryStatus == 0) {
              tft.setTextColor(COLOR_SUCCESS);
              tft.setTextSize(3);
              tft.setCursor(80, 130);
              tft.print("BERHASIL!");
              delay(1500);

              isWaitingForGlass = true;
              glassWaitStartTime = millis();
              drawWaitingForGlassScreen();
            } else {
              tft.setTextColor(COLOR_BTN_1L);
              tft.setTextSize(2);
              tft.setCursor(65, 130);
              tft.print("GAGAL TERHUBUNG");
              tft.setTextSize(1);
              tft.setTextColor(COLOR_TEXT_DIM);
              tft.setCursor(85, 160);
              tft.print("(Pastikan pompa menyala)");

              sendTransactionToBackend(pendingAmount, "Failed", pendingMl, "Pompa tidak merespons");
              delay(3000);
              drawMenu();
            }
          } else {
            tft.setTextColor(COLOR_BTN_1L);
            tft.setCursor(60, 130);
            tft.print("ERROR ESP-NOW");
            delay(2000);
            drawMenu();
          }
        }
        delay(300);
      }
    }
    return;
  }

  if (isWaitingForGlass) {
    if (glassDetectedSignal) {
      glassDetectedSignal = false;
      isWaitingForGlass = false;
      startWaitingScreen(pendingSeconds);
    } else if (millis() - glassWaitStartTime > 60000) {
      isWaitingForGlass = false;
      tft.fillScreen(COLOR_BG);
      tft.setTextColor(COLOR_BTN_1L);
      tft.setTextSize(3);
      tft.setCursor(50, 90);
      tft.print("WAKTU HABIS!");
      
      tft.setTextColor(COLOR_TEXT_DIM);
      tft.setTextSize(2);
      tft.setCursor(35, 130);
      tft.print("Gelas tidak diletakkan");

      myData.cmdType = 2;
      myData.volume = 0;
      esp_now_send(receiverMacAddress, (uint8_t *) &myData, sizeof(myData));

      sendTransactionToBackend(pendingAmount, "Failed", pendingMl, "Timeout");
      delay(3000);
      drawMenu();
    }
    return;
  }

  if (isWaiting) return;

  if (ts.touched()) {
    long x_sum = 0, y_sum = 0, z_sum = 0;
    for (int i = 0; i < 10; i++) {
      TS_Point p = ts.getPoint();
      x_sum += p.x; y_sum += p.y; z_sum += p.z;
    }
    int avg_z = z_sum / 10;

    if (avg_z > MIN_PRESSURE) {
      int avg_x = x_sum / 10;
      int avg_y = y_sum / 10;
      int x = map(avg_x, TS_MINX, TS_MAXX, 0, 320);
      int y = map(avg_y, TS_MINY, TS_MAXY, 0, 240);

      // Area Tombol 300mL
      if (x > 20 && x < 150 && y > 70 && y < 200) {
        pendingSeconds = 10;
        pendingVolume = 10000.0 / MS_PER_ML;
        pendingAmount = 5000;
        pendingMl = 300;
        drawQRIS("00020101021126610014COM.GO-JEK.WWW01189360091437219972490210G7219972490303UMI51440014ID.CO.QRIS.WWW0215ID10265222989040303UMI5204829953033605802ID5925CELINE MERCY TAASIRINGAN,6006MANADO61059511462070703A0163041B99", "300 mL", pendingAmount);
        isWaitingForPayment = true;
      } 
      // Area Tombol 1 Liter
      else if (x > 170 && x < 300 && y > 70 && y < 200) {
        pendingSeconds = 30;
        pendingVolume = 30000.0 / MS_PER_ML;
        pendingAmount = 10000;
        pendingMl = 1000;
        drawQRIS("00020101021126610014COM.GO-JEK.WWW01189360091437219972490210G7219972490303UMI51440014ID.CO.QRIS.WWW0215ID10265222989040303UMI5204829953033605802ID5925CELINE MERCY TAASIRINGAN,6006MANADO61059511462070703A0163041B99", "1 Liter", pendingAmount);
        isWaitingForPayment = true;
      }
      delay(300);
    }
  }
}

// ==========================================
// FUNGSI UI (MENU & TAMPILAN)
// ==========================================
void drawMenu() {
  tft.fillScreen(COLOR_BG);
  
  // Header
  tft.fillRoundRect(10, 10, 300, 45, 8, COLOR_CARD);
  tft.setTextColor(ILI9341_WHITE);
  tft.setTextSize(2);
  // (320 - 192)/2 = 64
  tft.setCursor(64, 25);
  tft.print("PILIH KAPASITAS");

  // Tombol 300 mL (X:20, Lebar:130. Tengah X = 85)
  tft.fillRoundRect(20, 75, 130, 125, 12, COLOR_BTN_300);
  tft.drawRoundRect(20, 75, 130, 125, 12, ILI9341_WHITE);
  
  // Icon / Grafis kecil di dalam tombol
  tft.fillRoundRect(70, 95, 30, 40, 4, ILI9341_WHITE); // Visual gelas
  tft.fillRoundRect(75, 110, 20, 20, 2, COLOR_BTN_300); // Isi air
  
  tft.setTextColor(ILI9341_WHITE);
  tft.setTextSize(2);
  tft.setCursor(49, 160); // Centered (85 - 36)
  tft.print("300 mL");

  // Tombol 1 Liter (X:170, Lebar:130. Tengah X = 235)
  tft.fillRoundRect(170, 75, 130, 125, 12, COLOR_BTN_1L);
  tft.drawRoundRect(170, 75, 130, 125, 12, ILI9341_WHITE);
  
  // Icon botol
  tft.fillRoundRect(225, 90, 20, 45, 4, ILI9341_WHITE); 
  tft.fillRect(230, 85, 10, 10, ILI9341_WHITE);
  tft.fillRoundRect(230, 105, 10, 25, 2, COLOR_BTN_1L);

  tft.setCursor(193, 160); // Centered (235 - 42)
  tft.print("1 Liter");
}

void drawQRIS(String payload, String selectedOption, int amount) {
  tft.fillScreen(ILI9341_WHITE);
  
  // Header Biru untuk QRIS
  tft.fillRect(0, 0, 320, 40, COLOR_BG);
  tft.setTextColor(ILI9341_WHITE);
  tft.setTextSize(2);
  tft.setCursor(15, 12);
  tft.print("Scan QRIS");
  
  tft.setCursor(180, 12);
  tft.print("Rp ");
  tft.print(amount);

  // Generate QR Code di Kiri
  QRCode qrcode;
  uint8_t qrisVersion = 13;
  uint32_t bufferSize = qrcode_getBufferSize(qrisVersion);
  uint8_t *qrcodeData = (uint8_t *)malloc(bufferSize);

  if (qrcodeData != NULL && qrcode_initText(&qrcode, qrcodeData, qrisVersion, 1, payload.c_str()) == 0) {
    int scale = 2; // [PERBAIKAN] Skala diubah jadi 2 agar muat
    int paddingX = 20; 
    int paddingY = 71; // [PERBAIKAN] Posisi Y diturunkan agar rata tengah vertikal
    for (uint8_t y = 0; y < qrcode.size; y++) {
      for (uint8_t x = 0; x < qrcode.size; x++) {
        if (qrcode_getModule(&qrcode, x, y)) {
          tft.fillRect(paddingX + (x * scale), paddingY + (y * scale), scale, scale, ILI9341_BLACK);
        }
      }
    }
    free(qrcodeData);
  }

  // Info Box di Kanan
  tft.fillRoundRect(170, 60, 130, 70, 8, COLOR_CARD);
  tft.setTextColor(COLOR_TEXT_DIM);
  tft.setTextSize(1);
  tft.setCursor(180, 75);
  tft.print("PILIHAN ANDA:");
  
  tft.setTextColor(ILI9341_WHITE);
  tft.setTextSize(2);
  tft.setCursor(180, 95);
  tft.print(selectedOption);

  // Tombol Sudah Bayar di Kanan Bawah
  tft.fillRoundRect(170, 145, 130, 75, 10, COLOR_SUCCESS);
  tft.drawRoundRect(170, 145, 130, 75, 10, COLOR_BG);
  
  tft.setTextColor(ILI9341_WHITE);
  tft.setTextSize(2);
  tft.setCursor(205, 165); // Centered dlm tombol
  tft.print("SUDAH");
  tft.setCursor(205, 185);
  tft.print("BAYAR");
}

void drawWaitingForGlassScreen() {
  tft.fillScreen(COLOR_BG);
  
  // Icon Gelas Menunggu
  tft.drawRect(130, 60, 60, 80, ILI9341_WHITE);
  tft.drawRect(129, 59, 62, 82, ILI9341_WHITE);
  tft.drawLine(145, 75, 145, 120, COLOR_TEXT_DIM);
  tft.drawLine(160, 85, 160, 120, COLOR_TEXT_DIM);
  tft.drawLine(175, 70, 175, 120, COLOR_TEXT_DIM);

  tft.setTextColor(COLOR_WARNING);
  tft.setTextSize(2);
  tft.setCursor(65, 160);
  tft.print("LETAKKAN GELAS");
  
  tft.setTextSize(1);
  tft.setTextColor(COLOR_TEXT_DIM);
  tft.setCursor(75, 200);
  tft.print("Sensor mendeteksi dalam 1 Menit");
}

void startWaitingScreen(int seconds) {
  isWaiting = true;
  tft.fillScreen(COLOR_BG);
  
  tft.setTextColor(ILI9341_WHITE);
  tft.setTextSize(3);
  tft.setCursor(65, 50);
  tft.print("PROSES ISI");

  for (int i = seconds; i > 0; i--) {
    // Bersihkan angka lama
    tft.fillRoundRect(110, 110, 100, 80, 12, COLOR_CARD);
    
    tft.setTextColor(COLOR_BTN_300);
    tft.setTextSize(6);
    
    // Perataan tengah untuk angka satuan vs puluhan
    if (i >= 10) {
      tft.setCursor(125, 125);
    } else {
      tft.setCursor(145, 125);
    }
    tft.print(i);
    delay(1000);
  }
  isWaiting = false;
  drawMenu();
}

// ==========================================
// FUNGSI UNTUK MENAMPILKAN MAC ADDRESS
// ==========================================
void showMacAddressOnScreen() {
  uint8_t mac[6];
  WiFi.macAddress(mac);

  char macPart1[] = "uint8_t receiverMacAddress[] = ";
  char macPart2[50];

  sprintf(macPart2, "{0x%02X, 0x%02X, 0x%02X, 0x%02X, 0x%02X, 0x%02X};",
          mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);

  tft.setTextColor(COLOR_TEXT_DIM);
  tft.setTextSize(1);
  tft.setCursor(20, 175);
  tft.print("Copy kode ini ke ESP32 Pump (Receiver):");

  tft.setTextColor(ILI9341_CYAN);
  tft.setCursor(20, 195);
  tft.print(macPart1);

  tft.setTextColor(ILI9341_YELLOW);
  tft.setCursor(20, 210);
  tft.print(macPart2);
}
