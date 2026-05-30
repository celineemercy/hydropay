#include <SPI.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ILI9341.h>
#include <XPT2046_Touchscreen.h>
#include <esp_now.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include "qris_qrc.h"

// ====== KONFIGURASI WIFI & BACKEND ======
const char* ssid = "hydropay";
const char* password = "hyrdopay123";

// Ganti dengan IPv4 laptop/server yang menjalankan Docker HydroPay.
const char* serverName = "http://10.197.22.242:8086/api/hardware/transactions";

// ====== PIN LAYAR (Direct Wiring) ======
#define TFT_SCLK 18
#define TFT_MOSI 21
#define TFT_CS   15
#define TFT_DC    2
#define TFT_RST   4

// ====== PIN SENTUH (Direct Wiring) ======
#define T_CLK     5
#define T_DIN     6
#define T_DO      7
#define T_CS      8

// ====== NILAI KALIBRASI LAYAR SENTUH ======
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

void OnDataSent(const wifi_tx_info_t *tx_info, esp_now_send_status_t status) {
  Serial.print("\r\n[ESP-NOW] Status Pengiriman Ke Pump: ");
  Serial.println(status == ESP_NOW_SEND_SUCCESS ? "SUKSES" : "GAGAL");
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

void setup() {
  Serial.begin(115200);
  delay(1000);

  SPI.begin(TFT_SCLK, -1, TFT_MOSI, TFT_CS);
  tft.begin();
  tft.setRotation(1);

  touchSPI.begin(T_CLK, T_DO, T_DIN, T_CS);
  ts.begin(touchSPI);
  ts.setRotation(1);

  tft.fillScreen(ILI9341_BLACK);
  tft.setTextColor(ILI9341_WHITE);
  tft.setTextSize(2);
  tft.setCursor(30, 100);
  tft.print("Menghubungkan ke:");
  tft.setTextColor(ILI9341_YELLOW);
  tft.setCursor(30, 130);
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

  tft.fillScreen(ILI9341_BLACK);
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[INFO] WiFi Terhubung! IP: " + WiFi.localIP().toString());

    tft.setTextColor(ILI9341_GREEN);
    tft.setTextSize(3);
    tft.setCursor(45, 50);
    tft.print("WIFI SUKSES");

    tft.setTextSize(2);
    tft.setTextColor(ILI9341_WHITE);
    tft.setCursor(20, 100);
    tft.print("SSID: ");
    tft.print(ssid);
    tft.setCursor(20, 130);
    tft.print("IP: ");
    tft.print(WiFi.localIP().toString());
  } else {
    Serial.println("\n[WARNING] WiFi Gagal Terhubung! ESP-NOW tetap berjalan.");

    tft.setTextColor(ILI9341_RED);
    tft.setTextSize(3);
    tft.setCursor(55, 50);
    tft.print("WIFI GAGAL");

    tft.setTextSize(2);
    tft.setTextColor(ILI9341_WHITE);
    tft.setCursor(20, 100);
    tft.print("Sistem berjalan di");
    tft.setCursor(20, 130);
    tft.print("Mode Offline.");
  }

  tft.setTextColor(ILI9341_DARKGREY);
  tft.setTextSize(1);
  tft.setCursor(50, 200);
  tft.print("Masuk ke menu utama dalam 10 detik...");

  delay(10000);

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
        x_sum += p.x;
        y_sum += p.y;
        z_sum += p.z;
      }

      int avg_z = z_sum / 10;

      if (avg_z > MIN_PRESSURE) {
        int avg_x = x_sum / 10;
        int avg_y = y_sum / 10;
        int x = map(avg_x, TS_MINX, TS_MAXX, 0, 320);
        int y = map(avg_y, TS_MINY, TS_MAXY, 0, 240);

        if (x > 210 && x < 320 && y > 70 && y < 170) {
          isWaitingForPayment = false;

          tft.fillScreen(ILI9341_BLACK);
          tft.setTextColor(ILI9341_GREEN);
          tft.setTextSize(3);
          tft.setCursor(40, 100);
          tft.print("BAYAR SUKSES!");

          delay(1000);

          glassDetectedSignal = false;
          myData.cmdType = 1;
          myData.volume = pendingVolume;

          esp_err_t result = esp_now_send(receiverMacAddress, (uint8_t *) &myData, sizeof(myData));

          if (result == ESP_OK) {
            isWaitingForGlass = true;
            glassWaitStartTime = millis();
            drawWaitingForGlassScreen();
          } else {
            sendTransactionToBackend(
              pendingAmount,
              "Failed",
              pendingMl,
              "QRIS payment accepted but pump command failed"
            );
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
      tft.fillScreen(ILI9341_BLACK);
      tft.setTextColor(ILI9341_RED);
      tft.setTextSize(3);
      tft.setCursor(30, 90);
      tft.print("WAKTU HABIS!");
      tft.setTextColor(ILI9341_WHITE);
      tft.setTextSize(2);
      tft.setCursor(15, 140);
      tft.print("Gelas tidak diletakkan");

      myData.cmdType = 2;
      myData.volume = 0;
      esp_now_send(receiverMacAddress, (uint8_t *) &myData, sizeof(myData));

      sendTransactionToBackend(
        pendingAmount,
        "Failed",
        pendingMl,
        "QRIS payment accepted but glass was not detected"
      );

      delay(4000);
      drawMenu();
    }

    return;
  }

  if (isWaiting) {
    return;
  }

  if (ts.touched()) {
    long x_sum = 0, y_sum = 0, z_sum = 0;

    for (int i = 0; i < 10; i++) {
      TS_Point p = ts.getPoint();
      x_sum += p.x;
      y_sum += p.y;
      z_sum += p.z;
    }

    int avg_z = z_sum / 10;

    if (avg_z > MIN_PRESSURE) {
      int avg_x = x_sum / 10;
      int avg_y = y_sum / 10;
      int x = map(avg_x, TS_MINX, TS_MAXX, 0, 320);
      int y = map(avg_y, TS_MINY, TS_MAXY, 0, 240);

      if (x > 10 && x < 150 && y > 70 && y < 170) {
        pendingSeconds = 10;
        pendingVolume = 10000.0 / MS_PER_ML;
        pendingAmount = 5000;
        pendingMl = 300;
        drawQRIS("00020101021126610014COM.GO-JEK.WWW01189360091437219972490210G7219972490303UMI51440014ID.CO.QRIS.WWW0215ID10265222989040303UMI5204829953033605802ID5925CELINE MERCY TAASIRINGAN,6006MANADO61059511462070703A0163041B99", "300 mL");
        isWaitingForPayment = true;
      } else if (x > 170 && x < 310 && y > 70 && y < 170) {
        pendingSeconds = 30;
        pendingVolume = 30000.0 / MS_PER_ML;
        pendingAmount = 10000;
        pendingMl = 1000;
        drawQRIS("00020101021126610014COM.GO-JEK.WWW01189360091437219972490210G7219972490303UMI51440014ID.CO.QRIS.WWW0215ID10265222989040303UMI5204829953033605802ID5925CELINE MERCY TAASIRINGAN,6006MANADO61059511462070703A0163041B99", "1 Liter");
        isWaitingForPayment = true;
      }

      delay(300);
    }
  }
}

void drawQRIS(String payload, String selectedOption) {
  tft.fillScreen(ILI9341_WHITE);
  QRCode qrcode;
  uint8_t qrisVersion = 13;
  uint32_t bufferSize = qrcode_getBufferSize(qrisVersion);
  uint8_t *qrcodeData = (uint8_t *)malloc(bufferSize);

  if (qrcodeData == NULL) {
    return;
  }

  if (qrcode_initText(&qrcode, qrcodeData, qrisVersion, 1, payload.c_str()) != 0) {
    free(qrcodeData);
    return;
  }

  int scale = 3;
  int paddingX = 15;
  int paddingY = (240 - (qrcode.size * scale)) / 2;

  for (uint8_t y = 0; y < qrcode.size; y++) {
    for (uint8_t x = 0; x < qrcode.size; x++) {
      if (qrcode_getModule(&qrcode, x, y)) {
        tft.fillRect(paddingX + (x * scale), paddingY + (y * scale), scale, scale, ILI9341_BLACK);
      }
    }
  }

  free(qrcodeData);

  tft.setTextColor(ILI9341_BLACK);
  tft.setTextSize(2);
  tft.setCursor(230, 25);
  tft.print("Pilihan");

  if (selectedOption == "300 mL") {
    tft.setTextColor(ILI9341_BLUE);
  } else {
    tft.setTextColor(ILI9341_MAROON);
  }

  tft.setCursor(230, 45);
  tft.print(selectedOption);

  tft.fillRoundRect(230, 80, 80, 80, 8, ILI9341_BLUE);
  tft.drawRoundRect(230, 80, 80, 80, 8, ILI9341_BLACK);
  tft.setTextColor(ILI9341_WHITE);
  tft.setTextSize(2);
  tft.setCursor(242, 105);
  tft.print("Sudah");
  tft.setCursor(242, 125);
  tft.print("Bayar");
}

void drawMenu() {
  tft.fillScreen(ILI9341_BLACK);
  tft.setTextColor(ILI9341_WHITE);
  tft.setTextSize(2);
  tft.setCursor(65, 20);
  tft.print("Pilih Jumlah Air");
  tft.drawFastHLine(0, 50, 320, ILI9341_DARKGREY);

  tft.fillRoundRect(20, 80, 120, 80, 10, ILI9341_BLUE);
  tft.drawRoundRect(20, 80, 120, 80, 10, ILI9341_WHITE);
  tft.setCursor(50, 110);
  tft.setTextColor(ILI9341_WHITE);
  tft.print("300 mL");

  tft.fillRoundRect(180, 80, 120, 80, 10, ILI9341_MAROON);
  tft.drawRoundRect(180, 80, 120, 80, 10, ILI9341_WHITE);
  tft.setCursor(210, 110);
  tft.setTextColor(ILI9341_WHITE);
  tft.print("1 Liter");
}

void drawWaitingForGlassScreen() {
  tft.fillScreen(ILI9341_BLACK);
  tft.setTextColor(ILI9341_ORANGE);
  tft.setTextSize(2);
  tft.setCursor(45, 80);
  tft.print("SILAKAN LETAKKAN");
  tft.setCursor(65, 110);
  tft.print("GELAS ANDA...");

  tft.setTextSize(1);
  tft.setTextColor(ILI9341_DARKGREY);
  tft.setCursor(55, 200);
  tft.print("Maksimal waktu tunggu: 1 Menit");
}

void startWaitingScreen(int seconds) {
  isWaiting = true;
  tft.fillScreen(ILI9341_BLACK);
  tft.setTextColor(ILI9341_YELLOW);
  tft.setTextSize(3);
  tft.setCursor(65, 70);
  tft.print("PROSES ISI");

  for (int i = seconds; i > 0; i--) {
    tft.fillRect(120, 130, 80, 50, ILI9341_BLACK);
    tft.setTextColor(ILI9341_CYAN);
    tft.setTextSize(5);

    if (i >= 10) {
      tft.setCursor(130, 130);
    } else {
      tft.setCursor(145, 130);
    }

    tft.print(i);
    delay(1000);
  }

  sendTransactionToBackend(
    pendingAmount,
    "Success",
    pendingMl,
    "QRIS payment accepted and water dispensed"
  );

  isWaiting = false;
  drawMenu();
}
