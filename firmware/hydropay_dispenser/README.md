# HydroPay Dispenser Firmware

Open `hydropay_dispenser.ino` from Arduino IDE.

Before compiling, place your existing `qris_qrc.h` file in this same folder:

```text
firmware/hydropay_dispenser/
|-- hydropay_dispenser.ino
`-- qris_qrc.h
```

Update these values before uploading to the ESP32:

```cpp
const char* ssid = "hydropay";
const char* password = "hyrdopay123";
const char* serverName = "https://your-hydropay-project.vercel.app/api/hardware/transactions";
const char* hardwareApiKey = "replace-with-your-device-key";
```

The firmware sends:

- `Success` after the water filling countdown finishes.
- `Failed` if the pump command fails or the glass is not detected before timeout.

