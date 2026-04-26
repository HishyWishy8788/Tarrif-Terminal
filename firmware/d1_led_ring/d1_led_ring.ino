// Tariff D1 LED — onboard WS2812 driven by serial commands.
//
// Target: Seeed Studio SenseCAP Indicator (ESP32-S3).
// The device has 1 onboard WS2812 RGB LED hardwired to GPIO 4
// (GPIO_RMT_LED in Seeed's BSP). No external wiring needed.
//
// Serial protocol (115200 8N1):
//   Single ASCII char terminated by newline. Newline + '\r' are tolerated.
//     'G' -> green   (no PENDING intents)
//     'Y' -> yellow  (Watch alert)
//     'R' -> red     (Alert / breaking)
//     'P' -> ping    (replies "PONG" — used by the daemon's heartbeat)
//   Any other char is ignored.

#include <Adafruit_NeoPixel.h>

#define LED_PIN   4
#define NUM_LEDS  1
#define BAUD      115200
#define BRIGHTNESS 80   // 0-255; keep modest so the LED isn't blinding on stage

Adafruit_NeoPixel pixel(NUM_LEDS, LED_PIN, NEO_GRB + NEO_KHZ800);

static void setColor(uint8_t r, uint8_t g, uint8_t b) {
  pixel.setPixelColor(0, pixel.Color(r, g, b));
  pixel.show();
}

void setup() {
  Serial.begin(BAUD);
  pixel.begin();
  pixel.setBrightness(BRIGHTNESS);

  // Boot self-test: red, yellow, green flash so user sees power-on
  setColor(255, 0, 0); delay(180);
  setColor(255, 180, 0); delay(180);
  setColor(0, 255, 0); delay(180);
  setColor(0, 0, 0);   delay(80);

  // Idle until daemon connects: solid green
  setColor(0, 255, 0);
  Serial.println("READY tariff-d1");
}

void loop() {
  if (Serial.available() <= 0) return;
  int c = Serial.read();
  switch (c) {
    case 'G': setColor(0, 255, 0);    Serial.println("OK G"); break;
    case 'Y': setColor(255, 180, 0);  Serial.println("OK Y"); break;
    case 'R': setColor(255, 0, 0);    Serial.println("OK R"); break;
    case 'P': Serial.println("PONG"); break;
    default: break;  // swallow newlines, CR, junk
  }
}
