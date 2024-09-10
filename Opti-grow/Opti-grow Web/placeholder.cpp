#include <DHT.h>
#include <Wire.h>
#include <Adafruit_LiquidCrystal.h>
#include <Keypad.h>
#include <WiFi.h>
#include <HTTPClient.h>

// Define GPIO pins
#define DHTPIN 15            // DHT22 data pin connected to GPIO15
#define SOIL_MOISTURE_PIN 34  // Soil moisture sensor connected to GPIO34 (Analog)
#define NPK_SENSOR_PIN 35     // NPK sensor connected to GPIO35 (Analog)

// WiFi and Google Sheets settings
const char* ssid = "YOUR_SSID";
const char* password = "YOUR_PASSWORD";
const char* googleScriptURL = "YOUR_WEB_APP_URL";  // Replace with your Google Apps Script URL

// LCD setup (Adafruit LiquidCrystal library)
Adafruit_LiquidCrystal lcd(0);  // Default I2C address is 0x27 for most 16x2 LCDs

// Keypad setup (4x4 matrix)
const byte ROWS = 4;
const byte COLS = 4;
char keys[ROWS][COLS] = {
  {'1', '2', '3', 'A'},
  {'4', '5', '6', 'B'},
  {'7', '8', '9', 'C'},
  {'*', '0', '#', 'D'}
};
byte rowPins[ROWS] = {25, 26, 27, 14};
byte colPins[COLS] = {32, 33, 13, 12};

Keypad keypad = Keypad(makeKeymap(keys), rowPins, colPins, ROWS, COLS);

// System control variable
bool systemOn = false;

// Sensor configurations
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

// Variables to store sensor data
float humidity, temperature, soilMoisture, npkValue;

// Retry limits for sensors
const int maxRetries = 3;

// Time intervals
const unsigned long dataSendInterval = 10000; // 10 seconds
unsigned long lastSendTime = 0;

// Calibration values for NPK sensor
const float NPK_MIN_VALUE = 0; // Minimum analog reading for 0 concentration
const float NPK_MAX_VALUE = 4095; // Maximum analog reading for maximum concentration
const float NPK_MAX_CONCENTRATION = 1000; // Maximum concentration in desired units

// ********************* Helper Functions *********************

// Initialize the LCD display
void initializeLCD() {
  lcd.begin(16, 2);  // Initialize a 16x2 LCD
  lcd.setBacklight(LOW); // Turn on the backlight
  lcd.setCursor(0, 0);
  lcd.print("System OFF");
}

// Initialize the DHT sensor
void initializeSensors() {
  dht.begin();
}

// Connect to WiFi
void connectToWiFi() {
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
  }
  Serial.println("Connected to WiFi");
}

// Read DHT22 values with error handling
bool readDHT22(float &humidity, float &temperature) {
  for (int attempt = 0; attempt < maxRetries; attempt++) {
    humidity = dht.readHumidity();
    temperature = dht.readTemperature();
    if (!isnan(humidity) && !isnan(temperature)) {
      return true;
    }
    Serial.println("DHT22 reading failed. Retrying...");
    delay(1000);
  }
  Serial.println("DHT22 sensor failed after retries.");
  return false;
}

// Read Soil Moisture sensor with error handling
float readSoilMoisture() {
  int value = analogRead(SOIL_MOISTURE_PIN);
  if (value == 0 || value >= 4095) {
    Serial.println("Soil moisture sensor error: abnormal reading detected.");
    return -1;
  }
  return value;
}

// Read NPK Sensor with error handling and calibration
float readNPK() {
  int value = analogRead(NPK_SENSOR_PIN);
  if (value == 0 || value >= 4095) {
    Serial.println("NPK sensor error: abnormal reading detected.");
    return -1;
  }
  return mapAnalogToConcentration(value);
}

// Convert analog reading to nutrient concentration
float mapAnalogToConcentration(int analogValue) {
  return (analogValue - NPK_MIN_VALUE) * (NPK_MAX_CONCENTRATION / (NPK_MAX_VALUE - NPK_MIN_VALUE));
}

// Display sensor values on the LCD screen
void displayValuesOnLCD(float temperature, float humidity, float soilMoisture, float npkValue) {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Temp: ");
  lcd.print(temperature);
  lcd.print("C");
  
  lcd.setCursor(0, 1);
  lcd.print("Hum: ");
  lcd.print(humidity);
  lcd.print("%");
  delay(2000);
  
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Soil: ");
  lcd.print(soilMoisture != -1 ? String(soilMoisture) : "Error");
  
  lcd.setCursor(0, 1);
  lcd.print("NPK: ");
  lcd.print(npkValue != -1 ? String(npkValue) : "Error");
  delay(2000);
}

// Send sensor data to Google Sheets via WiFi
void sendDataToGoogleSheets(float temperature, float humidity, float soilMoisture, float npkValue) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(googleScriptURL);

    // Simplified JSON data
    String jsonData = String(temperature) + "," + 
                      String(humidity) + "," + 
                      String(soilMoisture) + "," + 
                      String(npkValue);
    
    http.addHeader("Content-Type", "application/json");
    int httpResponseCode = http.POST(jsonData);

    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.println("HTTP Response code: " + String(httpResponseCode));
      Serial.println("Response: " + response);
    } else {
      Serial.println("Error in sending POST request");
    }

    http.end();
  } else {
    Serial.println("WiFi not connected");
  }
}

// Read all sensors with error handling
void readAllSensors() {
  if (!readDHT22(humidity, temperature)) {
    Serial.println("Failed to get valid DHT22 readings.");
  }

  soilMoisture = readSoilMoisture();
  if (soilMoisture == -1) {
    Serial.println("Failed to get valid soil moisture reading.");
  }

  npkValue = readNPK();
  if (npkValue == -1) {
    Serial.println("Failed to get valid NPK reading.");
  }
}

// Power on the system
void powerOnSystem() {
  systemOn = true;
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("System ON");
  Serial.println("System turned ON");
}

// Power off the system
void powerOffSystem() {
  systemOn = false;
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("System OFF");
  Serial.println("System turned OFF");
}

// ********************* Main Code *********************

void setup() {
  // Initialize Serial Monitor
  Serial.begin(115200);

  // Initialize sensors
  initializeSensors();

  // Initialize the LCD display
  initializeLCD();

  // Connect to WiFi
  connectToWiFi();

  // Set ADC resolution for ESP32 analog pins (12-bit)
  analogReadResolution(12);
}

void loop() {
  // Read keypad input
  char key = keypad.getKey();

  if (key) {
    Serial.print("Key Pressed: ");
    Serial.println(key);
    
    switch (key) {
      case '1':  // Turn system ON
        powerOnSystem();
        break;
        
      case '2':  // Turn system OFF
        powerOffSystem();
        break;
        
      case '3':  // Display sensor data on LCD
        if (systemOn) {
          readAllSensors();
          displayValuesOnLCD(temperature, humidity, soilMoisture, npkValue);
        } else {
          Serial.println("System is OFF. Cannot display sensor data.");
        }
        break;

      default:
        Serial.println("Invalid key. No action taken.");
        break;
    }
  }

  // If the system is ON, perform sensor readings and other operations
  if (systemOn) {
    readAllSensors();  // Continuously read sensors when system is on
    
    unsigned long currentTime = millis();
    if (currentTime - lastSendTime >= dataSendInterval) {
      sendDataToGoogleSheets(temperature, humidity, soilMoisture, npkValue);
      lastSendTime = currentTime;  // Update the last send time
    }
  }

  delay(2000);  // Delay to prevent overwhelming the system
}
