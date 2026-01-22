import axios from 'axios';

// // Replace with your machine's IP address if testing on a real device
// const BASE_URL = 'http://10.0.2.2:8000'; // For Android Emulator
// // const BASE_URL = 'http://localhost:8000'; // For iOS Simulator
const BASE_URL = 'https://server.sevabazar.com/';
const loginDriver = async (phone, password) => {
    try {
        const response = await axios.post(`${BASE_URL}/driver/login`, {
            phone,
            password,
        });
        return response.data;
    } catch (error) {
        if (error.response) {
            throw error.response.data;
        }
        throw new Error('Something went wrong. Please try again.');
    }
};

const registerDriver = async (formData) => {
    try {
        const response = await axios.post(`${BASE_URL}/driver/register`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    } catch (error) {
        if (error.response) {
            throw error.response.data;
        }
        throw new Error('Something went wrong. Please try again.');
    }
};

export { loginDriver, registerDriver };
