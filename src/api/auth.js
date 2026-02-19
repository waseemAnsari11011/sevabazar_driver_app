import axios from 'axios';

import { BASE_URL } from './client';

const loginDriver = async (phone, password, deviceToken = null, deviceType = null) => {
    try {
        const response = await axios.post(`${BASE_URL}driver/login`, {
            phone,
            password,
            deviceToken,
            deviceType,
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
        const response = await axios.post(`${BASE_URL}driver/register`, formData, {
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
