// Initialize the map
const map = L.map('map').setView([26.9124, 75.7873], 12); // Default to Jaipur

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

let marker;

// Add a click event listener on the map
map.on('click', async function (e) {
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;

    // Update latitude and longitude inputs
    document.getElementById('latitude').value = lat;
    document.getElementById('longitude').value = lng;

    // Add or move the marker
    if (marker) {
        map.removeLayer(marker);
    }
    marker = L.marker([lat, lng]).addTo(map);

    // Fetch location name using reverse geocoding (Nominatim)
    const geocodeUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;

    try {
        const response = await fetch(geocodeUrl);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const data = await response.json();
        if (data.display_name) {
            document.getElementById('location').value = data.display_name;
        } else {
            document.getElementById('location').value = "Location not found";
        }
    } catch (error) {
        console.error("Error fetching location data:", error);
        document.getElementById('location').value = "Error fetching location";
    }
});

// Handle location input change to fetch coordinates
document.getElementById('location').addEventListener('change', function () {
    const locationName = this.value;
    const searchUrl = `https://nominatim.openstreetmap.org/search?q=${locationName}&format=jsonv2`;

    fetch(searchUrl)
        .then(response => response.json())
        .then(data => {
            if (data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lng = parseFloat(data[0].lon);

                // Update latitude and longitude inputs
                document.getElementById('latitude').value = lat;
                document.getElementById('longitude').value = lng;

                // Update the map view and marker
                map.setView([lat, lng], 12);
                if (marker) {
                    map.removeLayer(marker);
                }
                marker = L.marker([lat, lng]).addTo(map);
            } else {
                alert("Location not found!");
            }
        })
        .catch(error => console.error("Error fetching location data:", error));
});

// Handle latitude and longitude input changes to update the map
document.getElementById('latitude').addEventListener('change', updateMapFromLatLng);
document.getElementById('longitude').addEventListener('change', updateMapFromLatLng);

function updateMapFromLatLng() {
    const lat = parseFloat(document.getElementById('latitude').value);
    const lng = parseFloat(document.getElementById('longitude').value);

    if (!isNaN(lat) && !isNaN(lng)) {
        map.setView([lat, lng], 12);

        if (marker) {
            map.removeLayer(marker);
        }
        marker = L.marker([lat, lng]).addTo(map);

        // Reverse geocode to update location name
        const geocodeUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
        fetch(geocodeUrl)
            .then(response => response.json())
            .then(data => {
                if (data.display_name) {
                    document.getElementById('location').value = data.display_name;
                }
            })
            .catch(error => console.error("Error fetching reverse geocode data:", error));
    }
}

document.getElementById('submit-btn').addEventListener('click', async function () {
    const lat = parseFloat(document.getElementById('latitude').value);
    const lng = parseFloat(document.getElementById('longitude').value);
    const powerRequired = parseFloat(document.getElementById('power-required').value) * 1000; // Convert kWh to W
    const efficiency = 0.8; // 80% efficiency

    if (isNaN(lat) || isNaN(lng) || isNaN(powerRequired)) {
        alert("Please enter valid latitude, longitude, and power required values.");
        return;
    }

    const endpoint = "https://power.larc.nasa.gov/api/temporal/monthly/point";
    const queryParams = {
        parameters: "ALLSKY_SFC_SW_DWN", // Solar radiation parameter
        community: "SB",
        latitude: lat,
        longitude: lng,
        start: "2021",
        end: "2022",
        format: "JSON",
    };

    const url = `${endpoint}?${Object.entries(queryParams)
        .map(([key, value]) => `${key}=${value}`)
        .join("&")}`;

    const timestamp = new Date().toLocaleString();      

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const data = await response.json();

        // Extract solar radiation values
        const monthlyData = data.properties.parameter.ALLSKY_SFC_SW_DWN;
        const values = Object.values(monthlyData);

        // Calculate the average solar radiation
        const sum = values.reduce((acc, val) => acc + val, 0);
        const avgSolarRadiation = sum / values.length;

        // Calculate the area required
        const areaRequired = powerRequired / (avgSolarRadiation * 1000 * efficiency);

        // Display the results in a pop-up with proper units
        alert(
            `Results:
            \n1. Average Solar Radiation: ${avgSolarRadiation.toFixed(2)} kWh/m²/day
            \n2. Required Area: ${areaRequired.toFixed(2)} m² (to generate ${powerRequired / 1000} kWh/day)
            \n\nThe Data is updated from NASA API
            \nAPI Timestamp \nLast updated on ${timestamp}`
        );
    } catch (error) {
        console.error("Error fetching solar radiation data:", error);
        alert("Failed to fetch solar radiation data. Please try again later.");
    }
});


