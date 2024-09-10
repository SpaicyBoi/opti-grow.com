const SHEET_ID = '1tN4ODw1qAeHdQGpJSHL4K5zji52rdSEhxKxPabiIK3U';  // Replace with your actual Google Sheet ID
const API_KEY = 'https://script.google.com/macros/s/AKfycby4K54NXK4gHgO2Zho3l1JaicaFMYi3shVGbTVH0DjONTxcMsoAqYFcge3CLMTHdgeV0A/exec';    // Replace with your actual Google API Key
const RANGE = 'Sheet1!A2:E2';             // Adjust to cover the timestamp and the other 4 variables

async function fetchData() {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${RANGE}?key=${API_KEY}`;
    
    try {
        const response = await fetch(url);

        // Check if the response status is not OK (200)
        if (!response.ok) {
            throw new Error(`Failed to fetch data: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data && data.values && data.values.length > 0) {
            const values = data.values[0]; // Get the first row of data
            
            // Ignore the timestamp (values[0]) and map the next 4 columns
            const temperature = values[1]; // Temperature
            const humidity = values[2]; // Humidity
            const soilMoisture = values[3]; // Soil Moisture
            const npkValue = values[4]; // NPK Value

            // Check if all sensor data is available
            if (!temperature || !humidity || !soilMoisture || !npkValue) {
                throw new Error('Incomplete data received from Google Sheets');
            }

            // Update the HTML elements with the fetched data
            document.getElementById('temperature').textContent = temperature;
            document.getElementById('humidity').textContent = humidity;
            document.getElementById('soil-moisture').textContent = soilMoisture;
            document.getElementById('npk').textContent = npkValue;
        } else {
            throw new Error('No data found in the sheet');
        }
    } catch (error) {
        console.error('Error fetching data:', error);
        // Optionally, display the error message on the webpage
        document.getElementById('temperature').textContent = 'Error';
        document.getElementById('humidity').textContent = 'Error';
        document.getElementById('soil-moisture').textContent = 'Error';
        document.getElementById('npk').textContent = 'Error';
    }
}

// Fetch initial data and set interval to update every 10 seconds
fetchData();
setInterval(fetchData, 10000); // Update every 10 seconds
