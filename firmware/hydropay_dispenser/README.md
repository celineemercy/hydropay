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
const char* serverName = "http://10.197.22.242:8086/api/hardware/transactions";
```

The firmware sends:

- `Success` after the water filling countdown finishes.
- `Failed` if the pump command fails or the glass is not detected before timeout.

