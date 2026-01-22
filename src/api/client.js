import axios from 'axios';

// Replace with your machine's IP address if testing on a real device
const BASE_URL = 'https://server.sevabazar.com/'; // For real device (replace with your IP)

const apiClient = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

export { BASE_URL, apiClient };
export default apiClient;
