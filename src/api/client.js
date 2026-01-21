import axios from 'axios';

// Replace with your machine's IP address if testing on a real device
const BASE_URL = 'http://10.0.2.2:8000'; // For Android Emulator
// const BASE_URL = 'http://localhost:8000'; // For iOS Simulator
// const BASE_URL = 'http://192.168.x.x:8000'; // For real device (replace with your IP)

const apiClient = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

export { BASE_URL, apiClient };
export default apiClient;
